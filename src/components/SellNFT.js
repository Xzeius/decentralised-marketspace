import Navbar from "./Navbar";
import { useState } from "react";
import { uploadFileToIPFS, uploadJSONToIPFS } from "../thirdwebStorage";
import Marketplace from '../Marketplace.json';
import { useLocation } from "react-router";

export default function SellNFT() {
    const [formParams, updateFormParams] = useState({ name: '', description: '', price: '' });
    const [fileURL, setFileURL] = useState(null);
    const ethers = require("ethers");
    const [message, updateMessage] = useState('');
    const location = useLocation();

    function disableButton() {
        const listButton = document.getElementById("list-button");
        listButton.disabled = true;
        listButton.style.backgroundColor = "grey";
        listButton.style.opacity = 0.3;
    }

    function enableButton() {
        const listButton = document.getElementById("list-button");
        listButton.disabled = false;
        listButton.style.backgroundColor = "#A500FF";
        listButton.style.opacity = 1;
    }

    // Handle image upload
    async function OnChangeFile(e) {
        const file = e.target.files[0];
        try {
            disableButton();
            updateMessage("Uploading image.. please don't click anything!");
            const response = await uploadFileToIPFS(file);
            if (response.success === true) {
                enableButton();
                updateMessage("");
                console.log("Uploaded image to Thirdweb: ", response.thirdwebURL);
                setFileURL(response.thirdwebURL);
            }
        } catch (e) {
            console.log("Error during file upload", e);
            enableButton();
            updateMessage("Image upload failed.");
        }
    }

    // Upload metadata to IPFS
    async function uploadMetadataToIPFS() {
        const { name, description, price } = formParams;
        if (!name || !description || !price || !fileURL) {
            updateMessage("Please fill all the fields!");
            return -1;
        }

        const nftJSON = { name, description, price, image: fileURL };

        try {
            const response = await uploadJSONToIPFS(nftJSON);
            if (response.success === true) {
                console.log("Uploaded metadata to Thirdweb: ", response.thirdwebURL);
                return response.thirdwebURL;
            }
        } catch (e) {
            console.log("Error uploading metadata:", e);
        }
    }

    async function listNFT(e) {
        e.preventDefault();

        try {
            const metadataURL = await uploadMetadataToIPFS();
            if (metadataURL === -1) return;

            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();

            disableButton();
            updateMessage("Listing your item (takes a few moments).. please don't click anything!");

            const contract = new ethers.Contract(Marketplace.address, Marketplace.abi, signer);
            const price = ethers.utils.parseUnits(formParams.price, 'ether');
            let listingPrice = await contract.getListPrice();
            listingPrice = listingPrice.toString();

            const transaction = await contract.createToken(metadataURL, price, { value: listingPrice });
            await transaction.wait();

            alert("Successfully listed your item!");
            enableButton();
            updateMessage("");
            updateFormParams({ name: '', description: '', price: '' });
            window.location.replace("/");
        } catch (e) {
            console.error("Upload error:", e);
            updateMessage("Something went wrong during listing.");
            enableButton();
        }
    }

    return (
        <div>
            <Navbar />
            <div className="flex flex-col place-items-center mt-10" id="nftForm">
                <form className="bg-white shadow-md rounded px-8 pt-4 pb-8 mb-4">
                    <h3 className="text-center font-bold text-purple-500 mb-8">
                        List an Item for Sale
                    </h3>
                    <div className="mb-4">
                        <label className="block text-purple-500 text-sm font-bold mb-2">Item Name</label>
                        <input className="shadow border rounded w-full py-2 px-3" type="text" placeholder="Enter item name" value={formParams.name} onChange={e => updateFormParams({ ...formParams, name: e.target.value })} />
                    </div>
                    <div className="mb-6">
                        <label className="block text-purple-500 text-sm font-bold mb-2">Description</label>
                        <textarea className="shadow border rounded w-full py-2 px-3" rows="4" placeholder="Describe your item" value={formParams.description} onChange={e => updateFormParams({ ...formParams, description: e.target.value })}></textarea>
                    </div>
                    <div className="mb-6">
                        <label className="block text-purple-500 text-sm font-bold mb-2">Price (in ETH)</label>
                        <input className="shadow border rounded w-full py-2 px-3" type="number" step="0.01" placeholder="0.05" value={formParams.price} onChange={e => updateFormParams({ ...formParams, price: e.target.value })} />
                    </div>
                    <div className="mb-6">
                        <label className="block text-purple-500 text-sm font-bold mb-2">Upload Image</label>
                        <input type="file" onChange={OnChangeFile} />
                    </div>
                    <div className="text-red-500 text-center mb-4">{message}</div>
                    <button onClick={listNFT} className="font-bold w-full bg-purple-500 text-white rounded p-2 shadow-lg" id="list-button">
                        List Item
                    </button>
                </form>
            </div>
        </div>
    );
}
