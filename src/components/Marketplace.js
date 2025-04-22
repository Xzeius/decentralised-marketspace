// Marketplace.js

import Navbar from "./Navbar";
import NFTTile from "./NFTTile";
import MarketplaceJSON from "../Marketplace.json";
import axios from "axios";
import { useState, useEffect } from "react";
import { resolveIPFSUrl } from "../utils";

export default function Marketplace() {
    const [data, updateData] = useState([]);
    const [dataFetched, updateFetched] = useState(false);
    const [isWalletConnected, setIsWalletConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Check if wallet is connected
    async function checkWalletConnection() {
        try {
            if (!window.ethereum) {
                console.log("MetaMask not installed");
                setIsLoading(false);
                return false;
            }
            
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length > 0) {
                console.log("Wallet is connected:", accounts[0]);
                setIsWalletConnected(true);
                setIsLoading(false);
                return true;
            } else {
                console.log("No wallet connected");
                setIsWalletConnected(false);
                setIsLoading(false);
                return false;
            }
        } catch (error) {
            console.error("Error checking wallet connection:", error);
            setIsLoading(false);
            return false;
        }
    }

    async function getAllNFTs() {
        try {
            const ethers = require("ethers");

            // First check if wallet is connected
            const isConnected = await checkWalletConnection();
            if (!isConnected) {
                console.log("Wallet not connected, cannot fetch NFTs");
                return;
            }

            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();

            const contract = new ethers.Contract(MarketplaceJSON.address, MarketplaceJSON.abi, signer);
            const transaction = await contract.getAllNFTs();

            const items = await Promise.all(transaction.map(async (i) => {
                try {
                    const tokenURI = await contract.tokenURI(i.tokenId);
                    console.log("Raw token URI:", tokenURI);

                    const resolvedURI = resolveIPFSUrl(tokenURI);
                    console.log("Resolved IPFS URL:", resolvedURI);

                    const meta = (await axios.get(resolvedURI)).data;
                    console.log("Fetched metadata:", meta);

                    const price = ethers.utils.formatUnits(i.price.toString(), 'ether');

                    // Store the raw image URL from metadata
                    const rawImageUrl = meta.image;
                    console.log("Raw image URL:", rawImageUrl);
                    
                    // Resolve the image URL only once
                    const resolvedImageUrl = resolveIPFSUrl(rawImageUrl);
                    console.log("Resolved image URL:", resolvedImageUrl);

                    const item = {
                        price,
                        tokenId: i.tokenId.toNumber(),
                        seller: i.seller,
                        owner: i.owner,
                        image: resolvedImageUrl, // Use the properly resolved URL
                        name: meta.name,
                        description: meta.description,
                    };

                    console.log("Final NFT data for UI:", item);
                    return item;
                } catch (err) {
                    console.warn("Error loading metadata for token:", i.tokenId.toString(), err);
                    return null;
                }
            }));

            const filteredItems = items.filter(item => item !== null);
            updateData(filteredItems);
            updateFetched(true);
        } catch (error) {
            console.error("Error fetching NFTs:", error);
        }
    }

    // Listen for wallet connection changes
    useEffect(() => {
        if (window.ethereum) {
            checkWalletConnection();
            
            // Set up listeners for wallet connection changes
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length > 0) {
                    setIsWalletConnected(true);
                    getAllNFTs();
                } else {
                    setIsWalletConnected(false);
                    updateData([]);
                    updateFetched(false);
                }
            });
        } else {
            setIsLoading(false);
        }
    }, []);

    // Fetch NFTs when wallet is connected
    useEffect(() => {
        if (isWalletConnected && !dataFetched) {
            getAllNFTs();
        }
    }, [isWalletConnected, dataFetched]);

    return (
        <div>
            <Navbar />
            <div className="flex flex-col place-items-center mt-20">
                <div className="md:text-xl font-bold text-white">Featured Listings</div>
                
                {isLoading ? (
                    <div className="text-white mt-10">Loading...</div>
                ) : !isWalletConnected ? (
                    <div className="text-white mt-10">Please connect your wallet to view available listings</div>
                ) : data.length === 0 ? (
                    <div className="text-white mt-10">No items found in the marketplace</div>
                ) : (
                    <div className="flex mt-5 justify-between flex-wrap max-w-screen-xl text-center">
                        {data.map((value, index) => (
                            <NFTTile data={value} key={index} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
