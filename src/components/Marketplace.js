// Marketplace.js

import Navbar from "./Navbar";
import ItemTile from "./ItemTile";
import MarketplaceJSON from "../Marketplace.json";
import axios from "axios";
import { useState, useEffect } from "react";
import { resolveIPFSUrl } from "../utils";
import { Link } from "react-router-dom";

export default function Marketplace() {
    const [data, updateData] = useState([]);
    const [dataFetched, updateFetched] = useState(false);
    const [isWalletConnected, setIsWalletConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [sortOption, setSortOption] = useState("default");

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
            setError(null);
            const ethers = require("ethers");

            // Create a provider that doesn't require wallet connection
            let provider;
            let contract;
            
            if (window.ethereum && await checkWalletConnection()) {
                console.log("Using Web3 provider with connected wallet");
                provider = new ethers.providers.Web3Provider(window.ethereum);
                const signer = provider.getSigner();
                contract = new ethers.Contract(MarketplaceJSON.address, MarketplaceJSON.abi, signer);
            } else {
                console.log("Using fallback JSON-RPC provider");
                // Use direct RPC URL instead of Alchemy provider which might have restrictions
                const rpcUrl = "https://eth-sepolia.public.blastapi.io";
                provider = new ethers.providers.JsonRpcProvider(rpcUrl);
                contract = new ethers.Contract(MarketplaceJSON.address, MarketplaceJSON.abi, provider);
            }

            console.log("Fetching NFTs from contract:", MarketplaceJSON.address);
            const transaction = await contract.getAllNFTs();
            console.log("Retrieved NFTs from contract:", transaction.length);

            if (transaction.length === 0) {
                updateData([]);
                updateFetched(true);
                setIsLoading(false);
                return;
            }

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
            setError("Failed to load marketplace items. Please try again later.");
            // Still mark as fetched to prevent infinite loading state
            updateFetched(true);
        } finally {
            setIsLoading(false);
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
                    // Don't clear data when wallet disconnected
                    // Just refresh data with read-only provider
                    if (dataFetched) {
                        getAllNFTs();
                    }
                }
            });
        } else {
            setIsLoading(false);
        }
        
        // Always fetch NFTs regardless of wallet connection
        getAllNFTs();
    }, []);
    
    // Filter and sort the data
    const filteredData = data
        .filter(item => 
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            item.description.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => {
            if (sortOption === "price-asc") {
                return parseFloat(a.price) - parseFloat(b.price);
            } else if (sortOption === "price-desc") {
                return parseFloat(b.price) - parseFloat(a.price);
            } else if (sortOption === "name") {
                return a.name.localeCompare(b.name);
            } else if (sortOption === "recent") {
                return b.tokenId - a.tokenId;
            }
            return 0;
        });

    return (
        <div className="bg-gradient-to-b from-gray-900 to-black min-h-screen">
            <Navbar />
            <div className="container mx-auto px-4 py-8">
                <div className="flex flex-col items-center">
                    <div className="w-full max-w-6xl">
                        <h1 className="text-3xl md:text-4xl font-bold text-white text-center mb-6">
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                                AGUA Marketplace
                            </span>
                        </h1>
                        
                        {/* Search and sort controls */}
                        {!isLoading && !error && data.length > 0 && (
                            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                                <div className="relative w-full md:w-64">
                                    <input 
                                        type="text" 
                                        placeholder="Search items..." 
                                        className="bg-gray-800 text-white border border-gray-700 rounded-lg w-full py-2 px-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                    <label className="text-gray-300 text-sm">Sort by:</label>
                                    <select 
                                        className="bg-gray-800 text-white border border-gray-700 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={sortOption}
                                        onChange={(e) => setSortOption(e.target.value)}
                                    >
                                        <option value="default">Featured</option>
                                        <option value="price-asc">Price: Low to High</option>
                                        <option value="price-desc">Price: High to Low</option>
                                        <option value="name">Name</option>
                                        <option value="recent">Recently Added</option>
                                    </select>
                                </div>
                                
                                <Link to="/sellItem" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                    List New Item
                                </Link>
                            </div>
                        )}
                        
                        {/* Loading state */}
                        {isLoading ? (
                            <div className="flex items-center justify-center h-64">
                                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
                            </div>
                        ) : error ? (
                            <div className="bg-red-900 bg-opacity-50 text-red-200 p-6 rounded-lg text-center max-w-2xl mx-auto">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <h3 className="text-xl font-bold mb-2">Something went wrong</h3>
                                <p>{error}</p>
                                <button 
                                    onClick={() => getAllNFTs()} 
                                    className="mt-4 bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded-lg transition-colors"
                                >
                                    Try Again
                                </button>
                            </div>
                        ) : filteredData.length === 0 ? (
                            searchTerm ? (
                                <div className="text-center p-10 bg-gray-800 bg-opacity-50 rounded-xl border border-gray-700 max-w-2xl mx-auto">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <h3 className="text-xl text-white font-medium mb-2">No results found</h3>
                                    <p className="text-gray-400 mb-4">We couldn't find any items matching "{searchTerm}"</p>
                                    <button 
                                        onClick={() => setSearchTerm("")} 
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                                    >
                                        Clear Search
                                    </button>
                                </div>
                            ) : (
                                <div className="text-center p-10 bg-gray-800 bg-opacity-50 rounded-xl border border-gray-700 max-w-2xl mx-auto">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                    </svg>
                                    <h3 className="text-xl text-white font-medium mb-2">No items available</h3>
                                    <p className="text-gray-400 mb-4">There are no items listed in the marketplace yet</p>
                                    <Link to="/sellItem" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors inline-block">
                                        List an Item
                                    </Link>
                                </div>
                            )
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {filteredData.map((item, index) => (
                                    <div 
                                        key={index} 
                                        className="border border-gray-700 rounded-xl overflow-hidden bg-gray-800 bg-opacity-40 backdrop-filter backdrop-blur-sm shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
                                    >
                                        <Link to={`/itemPage/${item.tokenId}`}>
                                            <div className="relative aspect-square overflow-hidden">
                                                <img 
                                                    src={item.image} 
                                                    alt={item.name} 
                                                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                                                    loading="lazy"
                                                    crossOrigin="anonymous"
                                                />
                                            </div>
                                            <div className="p-4">
                                                <h3 className="text-lg font-bold text-white mb-1 truncate">{item.name}</h3>
                                                <p className="text-gray-400 text-sm h-10 overflow-hidden">{item.description}</p>
                                                <div className="flex justify-between items-center mt-3">
                                                    <div className="bg-blue-900 bg-opacity-50 px-3 py-1 rounded-lg">
                                                        <p className="text-blue-300 font-medium">{item.price} ETH</p>
                                                    </div>
                                                    <div className="text-xs text-gray-500">#{item.tokenId}</div>
                                                </div>
                                            </div>
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        {/* Wallet connection notice */}
                        {!isWalletConnected && filteredData.length > 0 && (
                            <div className="mt-8 p-4 bg-yellow-900 bg-opacity-30 border border-yellow-700 rounded-lg max-w-2xl mx-auto">
                                <div className="flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-400 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div>
                                        <p className="font-bold text-yellow-300 mb-1">Wallet Not Connected</p>
                                        <p className="text-yellow-200 text-sm">Connect your wallet to buy items or access your account</p>
                                    </div>
                                    <button 
                                        onClick={async () => {
                                            try {
                                                await window.ethereum.request({ method: 'eth_requestAccounts' });
                                                checkWalletConnection();
                                            } catch (err) {
                                                console.error("Failed to connect wallet:", err);
                                            }
                                        }}
                                        className="ml-auto bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded-lg text-sm transition-colors"
                                    >
                                        Connect
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
