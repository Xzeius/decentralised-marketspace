import Navbar from "./Navbar";
import { useParams } from 'react-router-dom';
import MarketplaceJSON from "../Marketplace.json";
import axios from "axios";
import { useState } from "react";
import { resolveIPFSUrl } from "../utils";

export default function ItemPage() {
    const [data, updateData] = useState({});
    const [dataFetched, updateDataFetched] = useState(false);
    const [message, updateMessage] = useState("");
    const [currAddress, updateCurrAddress] = useState("0x");

    async function getItemData(tokenId) {
        const ethers = require("ethers");
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const addr = await signer.getAddress();

        let contract = new ethers.Contract(MarketplaceJSON.address, MarketplaceJSON.abi, signer);

        let tokenURI = await contract.tokenURI(tokenId);
        tokenURI = resolveIPFSUrl(tokenURI);

        const listedToken = await contract.getListedTokenForId(tokenId);
        let meta = await axios.get(tokenURI);
        meta = meta.data;

        const item = {
            price: meta.price,
            tokenId: tokenId,
            seller: listedToken.seller,
            owner: listedToken.owner,
            image: resolveIPFSUrl(meta.image),
            name: meta.name,
            description: meta.description,
            category: meta.category || "general",
        };

        updateData(item);
        updateDataFetched(true);
        updateCurrAddress(addr);
    }

    async function buyItem(tokenId) {
        try {
            const ethers = require("ethers");
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            let contract = new ethers.Contract(MarketplaceJSON.address, MarketplaceJSON.abi, signer);

            const salePrice = ethers.utils.parseUnits(data.price, 'ether');
            updateMessage("Processing your purchase... Please Wait (Up to 5 mins)");
            let transaction = await contract.executeSale(tokenId, { value: salePrice });
            await transaction.wait();

            alert('You successfully purchased this item!');
            updateMessage("");
        } catch (e) {
            alert("Transaction Error: " + e);
        }
    }

    const params = useParams();
    const tokenId = params.tokenId;

    if (!dataFetched) getItemData(tokenId);

    return (
        <div style={{ minHeight: "100vh" }}>
            <Navbar />
            <div className="flex ml-20 mt-20">
                <img src={data.image} alt="" className="w-2/5 rounded-lg shadow-lg" crossOrigin="anonymous" />
                <div className="text-xl ml-20 space-y-8 text-white shadow-2xl rounded-lg border-2 p-5 w-2/5">
                    <div><strong>Name:</strong> {data.name}</div>
                    <div><strong>Description:</strong> {data.description}</div>
                    {data.category && <div><strong>Category:</strong> {data.category}</div>}
                    <div><strong>Price:</strong> {data.price} ETH</div>
                    <div><strong>Seller:</strong> <span className="text-sm">{data.seller}</span></div>

                    <div>
                        {currAddress !== data.owner && currAddress !== data.seller ? (
                            <button
                                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded text-sm"
                                onClick={() => buyItem(tokenId)}
                            >
                                Buy this item
                            </button>
                        ) : (
                            <div className="text-emerald-400 font-semibold">You are the seller of this item</div>
                        )}
                        <div className="text-green text-center mt-3">{message}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
