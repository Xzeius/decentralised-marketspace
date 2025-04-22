import Navbar from "./Navbar";
import { useParams } from 'react-router-dom';
import MarketplaceJSON from "../Marketplace.json";
import axios from "axios";
import { useState, useEffect } from "react";
import NFTTile from "./NFTTile";
import { resolveIPFSUrl } from "../utils";

export default function Profile() {
    const [data, setData] = useState([]);
    const [dataFetched, setDataFetched] = useState(false);
    const [address, setAddress] = useState("0x");
    const [totalPrice, setTotalPrice] = useState("0");
    const [isWalletConnected, setIsWalletConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedNFT, setSelectedNFT] = useState(null);
    const [resellPrice, setResellPrice] = useState("");
    const [isReselling, setIsReselling] = useState(false);

    const params = useParams();
    const tokenId = params.tokenId;

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

    useEffect(() => {
        if (window.ethereum) {
            checkWalletConnection().then(connected => {
                if (connected && !dataFetched) {
                    getNFTData();
                }
            });
            
            // Set up listeners for wallet connection changes
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length > 0) {
                    setIsWalletConnected(true);
                    setDataFetched(false); // Reset to fetch data for the new account
                    getNFTData();
                } else {
                    setIsWalletConnected(false);
                    setData([]);
                    setDataFetched(false);
                }
            });
        } else {
            setIsLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function getNFTData() {
        try {
            // First check if wallet is connected
            const isConnected = await checkWalletConnection();
            if (!isConnected) {
                console.log("Wallet not connected, cannot fetch NFTs");
                return;
            }

            const ethers = require("ethers");
            let sumPrice = 0;

            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            const addr = await signer.getAddress();

            const contract = new ethers.Contract(MarketplaceJSON.address, MarketplaceJSON.abi, signer);
            const transactions = await contract.getMyNFTs();

            const items = await Promise.all(transactions.map(async i => {
                try {
                    const tokenURI = await contract.tokenURI(i.tokenId);
                    console.log("Raw token URI:", tokenURI);

                    const resolvedURI = resolveIPFSUrl(tokenURI);
                    console.log("Resolved IPFS URL:", resolvedURI);

                    const meta = (await axios.get(resolvedURI)).data;
                    console.log("Fetched metadata:", meta);

                    const price = ethers.utils.formatUnits(i.price.toString(), 'ether');
                    sumPrice += parseFloat(price);

                    // Store the raw image URL from metadata
                    const rawImageUrl = meta.image;
                    console.log("Raw image URL:", rawImageUrl);
                    
                    // Resolve the image URL only once
                    const resolvedImageUrl = resolveIPFSUrl(rawImageUrl);
                    console.log("Resolved image URL:", resolvedImageUrl);

                    return {
                        price,
                        tokenId: i.tokenId.toNumber(),
                        seller: i.seller,
                        owner: i.owner,
                        image: resolvedImageUrl,
                        name: meta.name,
                        description: meta.description,
                        currentlyListed: i.currentlyListed
                    };
                } catch (err) {
                    console.error("Error loading metadata for token:", i.tokenId.toString(), err);
                    return null;
                }
            }));

            const filteredItems = items.filter(item => item !== null);
            setData(filteredItems);
            setDataFetched(true);
            setAddress(addr);
            setTotalPrice(sumPrice.toPrecision(3));
        } catch (error) {
            console.error("Error fetching NFT data:", error);
        }
    }

    async function sellNFT(tokenId, price) {
        try {
            setIsReselling(true);
            const ethers = require("ethers");
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();

            const contract = new ethers.Contract(MarketplaceJSON.address, MarketplaceJSON.abi, signer);
            
            const listingPrice = await contract.getListPrice();
            
            // Convert price from ETH to wei
            const priceInWei = ethers.utils.parseUnits(price, 'ether');
            
            // Call the resellToken function
            const transaction = await contract.resellToken(
                tokenId,
                priceInWei,
                { value: listingPrice }
            );
            
            await transaction.wait();
            
            alert(`NFT listed for sale at ${price} ETH`);
            setSelectedNFT(null);
            setResellPrice("");
            
            // Refresh NFT data
            setDataFetched(false);
            await getNFTData();
            
        } catch (error) {
            console.error("Error selling NFT:", error);
            alert("Error listing NFT: " + error.message);
        } finally {
            setIsReselling(false);
        }
    }

    return (
        <div className="profileClass" style={{ minHeight: "100vh" }}>
            <Navbar />
            <div className="profileClass">
                {isLoading ? (
                    <div className="text-white text-center mt-20">Loading...</div>
                ) : !isWalletConnected ? (
                    <div className="text-white text-center mt-20">Please connect your wallet to view your items</div>
                ) : (
                    <>
                        <div className="flex text-center flex-col mt-11 md:text-2xl text-white">
                            <div className="mb-5">
                                <h2 className="font-bold">Wallet Address</h2>
                                {address}
                            </div>
                        </div>
                        <div className="flex flex-row text-center justify-center mt-10 md:text-2xl text-white">
                            <div>
                                <h2 className="font-bold">My Items</h2>
                                {data.length} items
                            </div>
                            <div className="ml-20">
                                <h2 className="font-bold">Total Value</h2>
                                {totalPrice} ETH
                            </div>
                        </div>
                        
                        {selectedNFT && (
                            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                                <div className="bg-gray-800 p-6 rounded-lg w-96">
                                    <h2 className="text-xl font-bold text-white mb-4">List Item for Sale: {selectedNFT.name}</h2>
                                    <div className="mb-4">
                                        <img 
                                            src={selectedNFT.image} 
                                            alt={selectedNFT.name} 
                                            className="w-32 h-32 mx-auto rounded object-cover"
                                            crossOrigin="anonymous"
                                        />
                                    </div>
                                    <div className="mb-4">
                                        <label className="block text-white text-sm font-bold mb-2">
                                            Price (ETH)
                                        </label>
                                        <input 
                                            type="number" 
                                            step="0.000000001"
                                            value={resellPrice} 
                                            onChange={(e) => setResellPrice(e.target.value)}
                                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-800" 
                                            placeholder="Enter price in ETH"
                                        />
                                    </div>
                                    <div className="flex justify-between">
                                        <button 
                                            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                                            onClick={() => {
                                                setSelectedNFT(null);
                                                setResellPrice("");
                                            }}
                                            disabled={isReselling}
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                                            onClick={() => sellNFT(selectedNFT.tokenId, resellPrice)}
                                            disabled={!resellPrice || isReselling}
                                        >
                                            {isReselling ? "Processing..." : "List for Sale"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        <div className="flex flex-col text-center items-center mt-11 text-white">
                            <h2 className="font-bold">My Listings & Purchases</h2>
                            <div className="flex justify-center flex-wrap max-w-screen-xl">
                                {data.map((nft, index) => (
                                    <div key={index} className="border-2 ml-12 mt-5 mb-12 flex flex-col items-center rounded-lg w-48 md:w-72 shadow-2xl transition-transform hover:scale-105">
                                        <img
                                            src={nft.image}
                                            alt={nft.name || "Item Image"}
                                            className="w-72 h-80 rounded-lg object-cover"
                                            crossOrigin="anonymous"
                                        />
                                        <div className="text-white w-full p-2 bg-gradient-to-t from-[#454545] to-transparent rounded-lg pt-5 -mt-20">
                                            <strong className="text-xl">{nft.name}</strong>
                                            <p className="text-sm text-gray-300 mt-1 truncate">{nft.description}</p>
                                            <p className="text-xs mt-1">Price: {nft.price} ETH</p>
                                            
                                            {/* Status indicator */}
                                            {nft.currentlyListed ? (
                                                <div className="bg-yellow-600 rounded-full px-2 py-1 text-xs mt-2 mb-2">
                                                    Currently for sale
                                                </div>
                                            ) : (
                                                <div className="bg-emerald-800 rounded-full px-2 py-1 text-xs mt-2 mb-2">
                                                    In your possession
                                                </div>
                                            )}
                                            
                                            {/* Show sell button only for items not currently listed */}
                                            {!nft.currentlyListed && (
                                                <button 
                                                    className="mt-2 w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded text-sm"
                                                    onClick={() => {
                                                        setSelectedNFT(nft);
                                                        setResellPrice("");
                                                    }}
                                                >
                                                    Sell
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-10 text-xl">
                                {data.length === 0 && "You don't have any items yet. Browse the marketplace to buy some!"}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
