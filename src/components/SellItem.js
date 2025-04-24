import Navbar from "./Navbar";
import { useState, useEffect } from "react";
import { uploadFileToIPFS, uploadJSONToIPFS } from "../thirdwebStorage";
import Marketplace from '../Marketplace.json';
import { useLocation } from "react-router";

export default function SellItem() {
    const [formParams, updateFormParams] = useState({ name: '', description: '', price: '' });
    const [fileURL, setFileURL] = useState(null);
    const [previewURL, setPreviewURL] = useState(null);
    const ethers = require("ethers");
    const [message, updateMessage] = useState('');
    const location = useLocation();
    const [isWalletConnected, setIsWalletConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [isListing, setIsListing] = useState(false);

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

    // Check wallet connection on component mount
    useEffect(() => {
        checkWalletConnection();
        
        // Listen for account changes
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length > 0) {
                    setIsWalletConnected(true);
                } else {
                    setIsWalletConnected(false);
                }
            });
        } else {
            setIsLoading(false);
        }
    }, []);

    // Handle image upload
    async function OnChangeFile(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            setIsUploading(true);
            updateMessage("Uploading image... please wait");
            
            // Create local preview
            const localPreview = URL.createObjectURL(file);
            setPreviewURL(localPreview);
            
            const response = await uploadFileToIPFS(file);
            if (response.success === true) {
                console.log("Uploaded image to Thirdweb: ", response.thirdwebURL);
                setFileURL(response.thirdwebURL);
                updateMessage("");
            }
        } catch (e) {
            console.log("Error during file upload", e);
            updateMessage("Image upload failed. Please try again.");
        } finally {
            setIsUploading(false);
        }
    }

    // Upload metadata to IPFS
    async function uploadMetadataToIPFS() {
        const { name, description, price } = formParams;
        if (!name || !description || !price || !fileURL) {
            updateMessage("Please fill all the fields!");
            return -1;
        }

        const itemJSON = { name, description, price, image: fileURL };

        try {
            const response = await uploadJSONToIPFS(itemJSON);
            if (response.success === true) {
                console.log("Uploaded metadata to Thirdweb: ", response.thirdwebURL);
                return response.thirdwebURL;
            }
        } catch (e) {
            console.log("Error uploading metadata:", e);
        }
    }

    async function listItem(e) {
        e.preventDefault();

        if (!isWalletConnected) {
            updateMessage("Please connect your wallet first!");
            return;
        }

        try {
            setIsListing(true);
            updateMessage("Preparing your item...");
            
            const metadataURL = await uploadMetadataToIPFS();
            if (metadataURL === -1) {
                setIsListing(false);
                return;
            }

            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();

            updateMessage("Listing your item (takes a few moments)... please wait");

            const contract = new ethers.Contract(Marketplace.address, Marketplace.abi, signer);
            const price = ethers.utils.parseUnits(formParams.price, 'ether');
            let listingPrice = await contract.getListPrice();
            listingPrice = listingPrice.toString();

            const transaction = await contract.createToken(metadataURL, price, { value: listingPrice });
            await transaction.wait();

            alert("Successfully listed your item!");
            updateMessage("");
            updateFormParams({ name: '', description: '', price: '' });
            setPreviewURL(null);
            setFileURL(null);
            window.location.replace("/");
        } catch (e) {
            console.error("Listing error:", e);
            updateMessage("Something went wrong during listing. Please try again.");
        } finally {
            setIsListing(false);
        }
    }

    return (
        <div className="bg-gradient-to-b from-gray-900 to-black min-h-screen">
            <Navbar />
            <div className="container mx-auto px-4 py-8">
                <div className="flex flex-col items-center justify-center">
                    <h1 className="text-3xl font-bold text-white mb-8">List an Item for Sale</h1>
                    
                    {isLoading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                        </div>
                    ) : !isWalletConnected ? (
                        <div className="bg-gray-800 bg-opacity-50 backdrop-filter backdrop-blur-sm rounded-xl py-8 px-6 max-w-md shadow-lg border border-gray-700 text-center">
                            <h3 className="font-bold text-2xl text-blue-400 mb-4">
                                Connect Your Wallet
                            </h3>
                            <p className="mb-6 text-gray-300">You need to connect your wallet to list items for sale.</p>
                            <button 
                                onClick={async () => {
                                    try {
                                        await window.ethereum.request({ method: 'eth_requestAccounts' });
                                        checkWalletConnection();
                                    } catch (err) {
                                        console.error("Failed to connect wallet:", err);
                                    }
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105"
                            >
                                Connect Wallet
                            </button>
                        </div>
                    ) : (
                        <div className="w-full max-w-2xl">
                            <div className="bg-gray-800 bg-opacity-40 backdrop-filter backdrop-blur-sm rounded-xl shadow-lg border border-gray-700 overflow-hidden">
                                <div className="p-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* Left side - Preview */}
                                        <div className="flex flex-col items-center">
                                            <div className="w-full aspect-square bg-gray-700 rounded-lg overflow-hidden border-2 border-dashed border-gray-600 flex items-center justify-center mb-4">
                                                {previewURL ? (
                                                    <img
                                                        src={previewURL}
                                                        alt="Item preview"
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="text-center p-4">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                        <p className="text-gray-400 text-sm">Image preview will appear here</p>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="w-full">
                                                <label className="flex flex-col items-center px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-colors duration-200">
                                                    <span className="mt-2 text-base leading-normal">
                                                        {isUploading ? 'Uploading...' : (fileURL ? 'Change Image' : 'Select Image')}
                                                    </span>
                                                    <input type="file" className="hidden" onChange={OnChangeFile} disabled={isUploading} />
                                                </label>
                                            </div>
                                        </div>
                                        
                                        {/* Right side - Form */}
                                        <div>
                                            <form>
                                                <div className="mb-4">
                                                    <label className="block text-blue-400 text-sm font-medium mb-2">Item Name</label>
                                                    <input 
                                                        className="bg-gray-700 text-white shadow border border-gray-600 rounded-lg w-full py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                                                        type="text" 
                                                        placeholder="Enter item name" 
                                                        value={formParams.name} 
                                                        onChange={e => updateFormParams({ ...formParams, name: e.target.value })} 
                                                    />
                                                </div>
                                                <div className="mb-4">
                                                    <label className="block text-blue-400 text-sm font-medium mb-2">Description</label>
                                                    <textarea 
                                                        className="bg-gray-700 text-white shadow border border-gray-600 rounded-lg w-full py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                                                        rows="4" 
                                                        placeholder="Describe your item" 
                                                        value={formParams.description} 
                                                        onChange={e => updateFormParams({ ...formParams, description: e.target.value })}
                                                    ></textarea>
                                                </div>
                                                <div className="mb-4">
                                                    <label className="block text-blue-400 text-sm font-medium mb-2">Price (ETH)</label>
                                                    <div className="relative">
                                                        <input 
                                                            className="bg-gray-700 text-white shadow border border-gray-600 rounded-lg w-full py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                                                            type="number" 
                                                            step="0.01" 
                                                            placeholder="0.05" 
                                                            value={formParams.price} 
                                                            onChange={e => updateFormParams({ ...formParams, price: e.target.value })}
                                                        />
                                                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                                            <span className="text-gray-400">ETH</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {message && (
                                                    <div className={`p-3 rounded-lg mb-4 text-sm ${message.includes("failed") || message.includes("Please fill") ? "bg-red-900 bg-opacity-50 text-red-300" : "bg-blue-900 bg-opacity-50 text-blue-300"}`}>
                                                        {message}
                                                    </div>
                                                )}
                                                
                                                <button 
                                                    onClick={listItem} 
                                                    disabled={isUploading || isListing || !fileURL}
                                                    className={`w-full py-3 px-4 rounded-lg font-bold text-white transition-all duration-200 transform hover:scale-105 ${isUploading || isListing || !fileURL ? 'bg-gray-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                                                >
                                                    {isListing ? (
                                                        <div className="flex items-center justify-center">
                                                            <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                                                            Listing Item...
                                                        </div>
                                                    ) : "List Item"}
                                                </button>
                                            </form>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mt-6 text-sm text-gray-400 text-center">
                                <p>Listing an item will require ETH for gas fees and the marketplace listing fee</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
