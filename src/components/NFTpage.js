import Navbar from "./Navbar";
import { useParams } from 'react-router-dom';
import MarketplaceJSON from "../Marketplace.json";
import axios from "axios";
import { useState } from "react";
import { resolveIPFSUrl } from "../utils";

export default function NFTPage() {
    const [data, updateData] = useState({});
    const [dataFetched, updateDataFetched] = useState(false);
    const [message, updateMessage] = useState("");
    const [currAddress, updateCurrAddress] = useState("0x");

    async function getNFTData(tokenId) {
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
        };

        updateData(item);
        updateDataFetched(true);
        updateCurrAddress(addr);
    }

    async function buyNFT(tokenId) {
        try {
            const ethers = require("ethers");
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            let contract = new ethers.Contract(MarketplaceJSON.address, MarketplaceJSON.abi, signer);

            const salePrice = ethers.utils.parseUnits(data.price, 'ether');
            updateMessage("Buying the NFT... Please Wait (Up to 5 mins)");
            let transaction = await contract.executeSale(tokenId, { value: salePrice });
            await transaction.wait();

            alert('You successfully bought the NFT!');
            updateMessage("");
        } catch (e) {
            alert("Transaction Error: " + e);
        }
    }

    const params = useParams();
    const tokenId = params.tokenId;

    if (!dataFetched) getNFTData(tokenId);

    return (
        <div style={{ minHeight: "100vh" }}>
            <Navbar />
            <div className="flex ml-20 mt-20">
                <img src={data.image} alt="" className="w-2/5 rounded-lg shadow-lg" crossOrigin="anonymous" />
                <div className="text-xl ml-20 space-y-8 text-white shadow-2xl rounded-lg border-2 p-5 w-2/5">
                    <div><strong>Name:</strong> {data.name}</div>
                    <div>
                        <strong>Description:</strong> 
                        <div className="mt-2 text-base max-h-32 overflow-y-auto break-words">
                            {data.description}
                        </div>
                    </div>
                    <div><strong>Price:</strong> {data.price} ETH</div>
                    <div>
                        <strong>Current Holder:</strong> 
                        <div className="text-sm mt-1 break-all">{data.owner}</div>
                    </div>
                    <div>
                        <strong>Original Seller:</strong> 
                        <div className="text-sm mt-1 break-all">{data.seller}</div>
                    </div>

                    <div>
                        {currAddress !== data.owner && currAddress !== data.seller ? (
                            <button
                                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded text-sm"
                                onClick={() => buyNFT(tokenId)}
                            >
                                Buy this NFT
                            </button>
                        ) : currAddress === data.owner ? (
                            <div className="text-emerald-400 font-semibold">You are the current holder of this NFT</div>
                        ) : (
                            <div className="text-yellow-300 font-bold">You are the original seller of this NFT</div>
                        )}
                        <div className="text-green text-center mt-3">{message}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
