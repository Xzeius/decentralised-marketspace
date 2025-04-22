import placeholderImage from "../tile.jpeg";
import { Link } from "react-router-dom";

function NFTTile({ data }) {
    const { tokenId, name, description, image } = data;

    const newTo = {
        pathname: `/nftPage/${tokenId}`,
    };

    return (
        <Link to={newTo}>
            <div className="border-2 ml-12 mt-5 mb-12 flex flex-col items-center rounded-lg w-48 md:w-72 shadow-2xl transition-transform hover:scale-105">
                <img
                    src={image}
                    alt={name || "NFT Image"}
                    className="w-72 h-80 rounded-lg object-cover"
                    crossOrigin="anonymous"
                    onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = placeholderImage;
                    }}
                />
                <div className="text-white w-full p-2 bg-gradient-to-t from-[#454545] to-transparent rounded-lg pt-5 -mt-20">
                    <strong className="text-xl">{name}</strong>
                    <p className="text-sm text-gray-300 mt-1 truncate">{description}</p>
                </div>
            </div>
        </Link>
    );
}

export default NFTTile;
