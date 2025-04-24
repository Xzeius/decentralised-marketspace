import Navbar from "./Navbar";
import { useParams, Link } from 'react-router-dom';
import MarketplaceJSON from "../Marketplace.json";
import axios from "axios";
import { useState, useEffect } from "react";
import { resolveIPFSUrl } from "../utils";

export default function ItemPage() {
    const [data, updateData] = useState({});
    const [dataFetched, updateDataFetched] = useState(false);
    const [message, updateMessage] = useState("");
    const [messageType, setMessageType] = useState("info"); // "info", "error", "success"
    const [currAddress, updateCurrAddress] = useState("0x");
    const [isWalletConnected, setIsWalletConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isBuying, setIsBuying] = useState(false);

    // Check if wallet is connected
    async function checkWalletConnection() {
        try {
            if (!window.ethereum) {
                console.log("MetaMask not installed");
                setIsWalletConnected(false);
                return false;
            }
            
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length > 0) {
                console.log("Wallet is connected:", accounts[0]);
                updateCurrAddress(accounts[0]);
                setIsWalletConnected(true);
                return true;
            } else {
                console.log("No wallet connected");
                setIsWalletConnected(false);
                return false;
            }
        } catch (error) {
            console.error("Error checking wallet connection:", error);
            setIsWalletConnected(false);
            return false;
        }
    }

    async function connectWallet() {
        try {
            if (!window.ethereum) {
                setMessageType("error");
                updateMessage("Please install MetaMask first!");
                return false;
            }
            
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            updateCurrAddress(accounts[0]);
            setIsWalletConnected(true);
            return true;
        } catch (error) {
            console.error("Error connecting wallet:", error);
            setMessageType("error");
            updateMessage("Failed to connect wallet: " + error.message);
            return false;
        }
    }

    async function getItemData(tokenId) {
        try {
            setError(null);
            setIsLoading(true);
            const ethers = require("ethers");
            
            // Create a provider that doesn't require wallet connection
            let provider;
            let contract;
            
            await checkWalletConnection();
            
            if (window.ethereum && isWalletConnected) {
                console.log("Using Web3 provider with connected wallet");
                provider = new ethers.providers.Web3Provider(window.ethereum);
                const signer = provider.getSigner();
                contract = new ethers.Contract(MarketplaceJSON.address, MarketplaceJSON.abi, signer);
                updateCurrAddress(await signer.getAddress());
            } else {
                console.log("Using fallback JSON-RPC provider");
                // Use direct RPC URL instead of Alchemy provider which might have restrictions
                const rpcUrl = "https://eth-sepolia.public.blastapi.io";
                provider = new ethers.providers.JsonRpcProvider(rpcUrl);
                contract = new ethers.Contract(MarketplaceJSON.address, MarketplaceJSON.abi, provider);
            }

            console.log("Fetching item data for token ID:", tokenId);
            let tokenURI = await contract.tokenURI(tokenId);
            tokenURI = resolveIPFSUrl(tokenURI);

            const listedToken = await contract.getListedItemForId(tokenId);
            let meta = await axios.get(tokenURI);
            meta = meta.data;

            // Use ethers to format the price from the contract's BigNumber to string
            const price = ethers.utils.formatUnits(listedToken.price.toString(), 'ether');

            const item = {
                price: price, // Now using price from contract instead of metadata
                tokenId: tokenId,
                seller: listedToken.seller,
                owner: listedToken.owner,
                image: resolveIPFSUrl(meta.image),
                name: meta.name,
                description: meta.description,
                currentlyListed: listedToken.currentlyListed
            };

            console.log("Item data:", item);
            updateData(item);
            updateDataFetched(true);
            setIsLoading(false);
        } catch (e) {
            console.error("Error fetching item data:", e);
            setError("Failed to load item details. Please try again later.");
            setIsLoading(false);
        }
    }

    async function buyItem(tokenId) {
        try {
            if (!isWalletConnected) {
                setMessageType("error");
                updateMessage("Please connect your wallet first!");
                return;
            }
            
            setIsBuying(true);
            setMessageType("info");
            updateMessage("Initiating purchase transaction...");
            
            const ethers = require("ethers");
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            let contract = new ethers.Contract(MarketplaceJSON.address, MarketplaceJSON.abi, signer);

            const salePrice = ethers.utils.parseUnits(data.price, 'ether');
            updateMessage("Buying the item... Please wait and confirm in your wallet");
            let transaction = await contract.executeSale(tokenId, { value: salePrice });
            
            updateMessage("Transaction submitted! Waiting for confirmation...");
            await transaction.wait();

            setMessageType("success");
            updateMessage("Success! You now own this item!");
            setTimeout(() => {
                window.location.reload();
            }, 3000);
        } catch (e) {
            console.error("Buy error:", e);
            setMessageType("error");
            updateMessage("Transaction Error: " + (e.reason || e.message));
        } finally {
            setIsBuying(false);
        }
    }

    // Use effect to check wallet connection and fetch data
    useEffect(() => {
        const fetchData = async () => {
            await checkWalletConnection();
            getItemData(tokenId);
        };
        
        fetchData();
        
        // Add wallet listener
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', async (accounts) => {
                if (accounts.length > 0) {
                    updateCurrAddress(accounts[0]);
                    setIsWalletConnected(true);
                } else {
                    updateCurrAddress("0x");
                    setIsWalletConnected(false);
                }
            });
        }
    }, []);

    const params = useParams();
    const tokenId = params.tokenId;

    // Case-insensitive address comparison helper
    const isSameAddress = (addr1, addr2) => {
        if (!addr1 || !addr2) return false;
        return addr1.toLowerCase() === addr2.toLowerCase();
    };
    
    // Format ethereum address to be more readable
    const formatAddress = (address) => {
        if (!address) return "";
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    };

    return (
        <div className="bg-gradient-to-b from-gray-900 to-black min-h-screen">
            <Navbar />
            
            <div className="container mx-auto px-4 py-8">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64 mt-8">
                        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                ) : error ? (
                    <div className="mx-auto max-w-2xl mt-8">
                        <div className="bg-red-900 bg-opacity-50 text-red-200 p-6 rounded-lg text-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <h3 className="text-xl font-bold mb-2">Something went wrong</h3>
                            <p>{error}</p>
                            <button 
                                onClick={() => getItemData(tokenId)} 
                                className="mt-4 bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded-lg transition-colors"
                            >
                                Try Again
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="max-w-6xl mx-auto">
                        <div className="flex flex-col lg:flex-row mt-8 gap-8">
                            {/* Left side - Image */}
                            <div className="w-full lg:w-1/2">
                                <div className="relative bg-gray-800 bg-opacity-40 rounded-2xl overflow-hidden shadow-2xl border border-gray-700">
                                    <img 
                                        src={data.image} 
                                        alt={data.name} 
                                        className="w-full aspect-square object-contain p-2" 
                                        crossOrigin="anonymous" 
                                    />
                                    <div className="absolute top-4 left-4 bg-blue-900 bg-opacity-70 text-white text-xs px-2 py-1 rounded-full">
                                        #{data.tokenId}
                                    </div>
                                </div>
                                
                                <div className="mt-6 flex justify-between items-center">
                                    <Link 
                                        to="/" 
                                        className="flex items-center text-gray-400 hover:text-blue-400 transition-colors"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                        </svg>
                                        Back to Marketplace
                                    </Link>
                                    
                                    {data.currentlyListed && (
                                        <div className="text-green-500 flex items-center">
                                            <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                                            Listed for Sale
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* Right side - Details */}
                            <div className="w-full lg:w-1/2">
                                <div className="bg-gray-800 bg-opacity-40 backdrop-filter backdrop-blur-sm rounded-2xl p-8 border border-gray-700 shadow-xl">
                                    <h1 className="text-3xl font-bold text-white mb-4">{data.name}</h1>
                                    
                                    <div className="bg-gray-900 bg-opacity-60 rounded-xl p-4 mb-6">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center">
                                                <div className="bg-blue-900 bg-opacity-50 p-3 rounded-lg mr-3">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p className="text-gray-400 text-sm">Current Price</p>
                                                    <p className="text-2xl font-bold text-white">{data.price} ETH</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="mb-6">
                                        <h2 className="text-lg font-semibold text-blue-400 mb-2">Description</h2>
                                        <div className="bg-gray-900 bg-opacity-50 rounded-lg p-4 text-gray-300 break-words whitespace-pre-wrap">
                                            {data.description || "No description provided"}
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                        <div>
                                            <h3 className="text-sm font-medium text-gray-400 mb-1">Owner</h3>
                                            <div className="bg-gray-900 bg-opacity-50 rounded-lg p-3 text-gray-300 flex items-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <span className="truncate" title={data.owner}>
                                                    {isSameAddress(currAddress, data.owner) ? "You" : formatAddress(data.owner)}
                                                </span>
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-medium text-gray-400 mb-1">Seller</h3>
                                            <div className="bg-gray-900 bg-opacity-50 rounded-lg p-3 text-gray-300 flex items-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                                </svg>
                                                <span className="truncate" title={data.seller}>
                                                    {isSameAddress(currAddress, data.seller) ? "You" : formatAddress(data.seller)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {message && (
                                        <div className={`p-4 rounded-lg mb-4 text-sm flex items-start ${
                                            messageType === "error" ? "bg-red-900 bg-opacity-50 text-red-300" : 
                                            messageType === "success" ? "bg-green-900 bg-opacity-50 text-green-300" :
                                            "bg-blue-900 bg-opacity-50 text-blue-300"
                                        }`}>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                {messageType === "error" ? (
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                ) : messageType === "success" ? (
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                ) : (
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                )}
                                            </svg>
                                            <span>{message}</span>
                                        </div>
                                    )}
                                    
                                    <div className="mt-2">
                                        {!isWalletConnected ? (
                                            <button
                                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 flex justify-center items-center"
                                                onClick={connectWallet}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                                </svg>
                                                Connect Wallet to Buy
                                            </button>
                                        ) : isSameAddress(currAddress, data.owner) ? (
                                            <div className="bg-green-900 bg-opacity-20 border border-green-700 text-green-400 font-semibold py-3 px-4 rounded-lg text-center">
                                                <div className="flex items-center justify-center">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    You already own this item
                                                </div>
                                            </div>
                                        ) : isSameAddress(currAddress, data.seller) ? (
                                            <div className="bg-yellow-900 bg-opacity-20 border border-yellow-700 text-yellow-400 font-semibold py-3 px-4 rounded-lg text-center">
                                                <div className="flex items-center justify-center">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    You are the original seller of this item
                                                </div>
                                            </div>
                                        ) : data.currentlyListed ? (
                                            <button
                                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                                onClick={() => buyItem(tokenId)}
                                                disabled={isBuying}
                                            >
                                                {isBuying ? (
                                                    <>
                                                        <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                                                        Processing...
                                                    </>
                                                ) : (
                                                    <>
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                                        </svg>
                                                        Buy for {data.price} ETH
                                                    </>
                                                )}
                                            </button>
                                        ) : (
                                            <div className="bg-gray-800 border border-gray-700 text-gray-400 font-semibold py-3 px-4 rounded-lg text-center">
                                                <div className="flex items-center justify-center">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                    This item is not available for purchase
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
