import Navbar from "./Navbar";
import { useParams } from 'react-router-dom';
import MarketplaceJSON from "../Marketplace.json";
import axios from "axios";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { resolveIPFSUrl } from "../utils";

export default function Profile() {
    const [data, setData] = useState([]);
    const [dataFetched, setDataFetched] = useState(false);
    const [address, setAddress] = useState("0x");
    const [isWalletConnected, setIsWalletConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("myItems");

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
                    getItemData();
                }
            });
            
            // Set up listeners for wallet connection changes
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length > 0) {
                    setIsWalletConnected(true);
                    setDataFetched(false); // Reset to fetch data for the new account
                    getItemData();
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

    async function getItemData() {
        try {
            // First check if wallet is connected
            const isConnected = await checkWalletConnection();
            if (!isConnected) {
                console.log("Wallet not connected, cannot fetch items");
                return;
            }

            const ethers = require("ethers");

            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            const addr = await signer.getAddress();
            setAddress(addr);
            
            console.log("Current user address:", addr);

            const contract = new ethers.Contract(MarketplaceJSON.address, MarketplaceJSON.abi, signer);
            console.log("Marketplace contract address:", MarketplaceJSON.address);
            
            // Get all NFTs from the marketplace
            const allMarketItems = await contract.getAllNFTs();
            console.log("Total marketplace items:", allMarketItems.length);
            
            // Get owned NFTs 
            const myItems = await contract.getMyNFTs();
            console.log("User owned items:", myItems.length);

            // Store purchase dates in local storage
            let purchaseDates = {};
            try {
                const storedDates = localStorage.getItem('itemPurchaseDates');
                if (storedDates) {
                    purchaseDates = JSON.parse(storedDates);
                }
            } catch (error) {
                console.error("Error loading purchase dates from localStorage:", error);
            }

            // Process items owned by the user
            const items = await Promise.all(myItems.map(async i => {
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

                    const tokenId = i.tokenId.toNumber();
                    
                    // If we don't have a purchase date for this item yet, set it to now
                    if (!purchaseDates[tokenId] && !i.currentlyListed) {
                        purchaseDates[tokenId] = new Date().toISOString();
                    }

                    return {
                        price,
                        tokenId,
                        seller: i.seller,
                        owner: i.owner,
                        image: resolvedImageUrl,
                        name: meta.name,
                        description: meta.description,
                        currentlyListed: i.currentlyListed,
                        purchaseDate: purchaseDates[tokenId] || null
                    };
                } catch (err) {
                    console.error("Error loading metadata for token:", i.tokenId.toString(), err);
                    return null;
                }
            }));

            // Save updated purchase dates
            try {
                localStorage.setItem('itemPurchaseDates', JSON.stringify(purchaseDates));
            } catch (error) {
                console.error("Error saving purchase dates to localStorage:", error);
            }

            const filteredItems = items.filter(item => item !== null);
            setData(filteredItems);
            setDataFetched(true);
            setIsLoading(false);
        } catch (error) {
            console.error("Error fetching item data:", error);
            setIsLoading(false);
        }
    }

    // Format ethereum address to be more readable
    const formatAddress = (address) => {
        if (!address) return "";
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    };
    
    // Format date to a readable format
    const formatDate = (dateString) => {
        if (!dateString) return "Unknown date";
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString(undefined, { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
        } catch (e) {
            return "Unknown date";
        }
    };

    return (
        <div className="profileClass bg-gradient-to-b from-gray-900 to-black" style={{ minHeight: "100vh" }}>
            <Navbar />
            <div className="profileClass">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64 mt-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                ) : !isWalletConnected ? (
                    <div className="text-center mt-20 p-10">
                        <div className="text-3xl text-white font-bold mb-6">Connect Your Wallet</div>
                        <p className="text-gray-400 mb-8">Please connect your wallet to view your NFT collection</p>
                        <div className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200">
                            Connect Wallet
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex text-center flex-col mt-8 md:mt-11">
                            <div className="bg-gray-800 bg-opacity-50 backdrop-filter backdrop-blur-sm rounded-xl py-6 px-4 mx-auto max-w-md shadow-lg border border-gray-700">
                                <h2 className="font-bold text-xl text-blue-400 mb-2">Wallet Address</h2>
                                <div className="text-white text-opacity-90 flex items-center justify-center">
                                    <div className="bg-gray-700 py-2 px-4 rounded-lg">
                                        {address}
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex justify-center mt-10">
                            <div className="tabs flex border-b border-gray-700 w-4/5 max-w-4xl">
                                <button 
                                    className={`px-6 py-3 mr-2 transition-all duration-300 text-lg rounded-t-lg ${activeTab === 'myItems' ? 'text-white border-b-2 border-blue-500 font-bold bg-gray-800 bg-opacity-50' : 'text-white hover:text-blue-400 hover:bg-gray-800 hover:bg-opacity-30'}`}
                                    onClick={() => setActiveTab('myItems')}
                                >
                                    My Items
                                </button>
                                <button 
                                    className={`px-6 py-3 mr-2 transition-all duration-300 text-lg rounded-t-lg ${activeTab === 'myListings' ? 'text-white border-b-2 border-blue-500 font-bold bg-gray-800 bg-opacity-50' : 'text-white hover:text-blue-400 hover:bg-gray-800 hover:bg-opacity-30'}`}
                                    onClick={() => setActiveTab('myListings')}
                                >
                                    Active Listings
                                </button>
                            </div>
                        </div>
                        
                        <div className="flex flex-col text-center items-center mt-8 text-white">
                            {activeTab === 'myItems' && (
                                <div className="w-4/5 max-w-4xl">
                                    <h2 className="font-bold text-2xl mb-6 text-blue-400 shadow-text">Items in My Collection</h2>
                                    {data.filter(item => !item.currentlyListed).length === 0 ? (
                                        <div className="mt-10 p-10 bg-gray-800 bg-opacity-30 rounded-xl border border-gray-700">
                                            <div className="text-xl mb-4">You don't have any items in your collection yet</div>
                                            <Link to="/" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-colors duration-200">
                                                Browse Marketplace
                                            </Link>
                                        </div>
                                    ) : (
                                        <div className="flex justify-center flex-wrap gap-6">
                                            {data.filter(item => !item.currentlyListed).map((item, index) => (
                                                <Link to={`/itemPage/${item.tokenId}`} key={index}>
                                                    <div className="border border-gray-700 mt-5 mb-5 flex flex-col items-center rounded-xl w-64 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 bg-gray-800 bg-opacity-40 backdrop-filter backdrop-blur-sm overflow-hidden">
                                                        <div className="relative w-full h-64 overflow-hidden">
                                                            <img
                                                                src={item.image}
                                                                alt={item.name || "Item Image"}
                                                                className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                                                                crossOrigin="anonymous"
                                                                loading="lazy"
                                                            />
                                                        </div>
                                                        <div className="w-full p-4 bg-gradient-to-t from-gray-900 via-gray-800 to-transparent">
                                                            <strong className="text-xl block mb-2 text-white">{item.name}</strong>
                                                            <p className="text-sm text-gray-300 mb-3 h-10 overflow-hidden">{item.description}</p>
                                                            <div className="flex justify-between items-center">
                                                                <div className="bg-blue-900 bg-opacity-50 rounded-lg px-3 py-1">
                                                                    <p className="text-sm font-medium text-blue-300">Price: {item.price} ETH</p>
                                                                </div>
                                                                <div className="text-xs text-gray-400">#{item.tokenId}</div>
                                                            </div>
                                                            <p className="text-xs mt-3 text-gray-400 flex items-center justify-end">
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                </svg>
                                                                {formatDate(item.purchaseDate)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'myListings' && (
                                <div className="w-4/5 max-w-4xl">
                                    <h2 className="font-bold text-2xl mb-6 text-blue-400 shadow-text">Active Listings</h2>
                                    {data.filter(item => item.currentlyListed).length === 0 ? (
                                        <div className="mt-10 p-10 bg-gray-800 bg-opacity-30 rounded-xl border border-gray-700">
                                            <div className="text-xl mb-4">You don't have any active listings</div>
                                            <Link to="/sellNFT" className="inline-block bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition-colors duration-200">
                                                List an Item
                                            </Link>
                                        </div>
                                    ) : (
                                        <div className="flex justify-center flex-wrap gap-6">
                                            {data.filter(item => item.currentlyListed).map((item, index) => (
                                                <Link to={`/itemPage/${item.tokenId}`} key={index}>
                                                    <div className="border border-gray-700 mt-5 mb-5 flex flex-col items-center rounded-xl w-64 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 bg-gray-800 bg-opacity-40 backdrop-filter backdrop-blur-sm overflow-hidden">
                                                        <div className="absolute top-2 right-2 bg-green-600 text-xs text-white px-2 py-1 rounded-full">
                                                            Listed
                                                        </div>
                                                        <div className="relative w-full h-64 overflow-hidden">
                                                            <img
                                                                src={item.image}
                                                                alt={item.name || "Item Image"}
                                                                className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                                                                crossOrigin="anonymous"
                                                                loading="lazy"
                                                            />
                                                        </div>
                                                        <div className="w-full p-4 bg-gradient-to-t from-gray-900 via-gray-800 to-transparent">
                                                            <strong className="text-xl block mb-2 text-white">{item.name}</strong>
                                                            <p className="text-sm text-gray-300 mb-3 h-10 overflow-hidden">{item.description}</p>
                                                            <div className="flex justify-between items-center">
                                                                <div className="bg-green-900 bg-opacity-50 rounded-lg px-3 py-1">
                                                                    <p className="text-sm font-medium text-green-300">Listed: {item.price} ETH</p>
                                                                </div>
                                                                <div className="text-xs text-gray-400">#{item.tokenId}</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
