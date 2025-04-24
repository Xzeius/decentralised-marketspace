import { Link } from "react-router-dom";
import { useState, useEffect } from "react";

function ItemTile({ data }) {
    const { tokenId, name, description, image, price } = data;
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);
    const defaultImage = "https://placehold.co/400x400/1f2937/d1d5db?text=No+Image";

    // Reset states when data changes
    useEffect(() => {
        setImageLoaded(false);
        setImageError(false);
    }, [data]);

    return (
        <Link to={`/itemPage/${tokenId}`} className="block">
            <div className="border border-gray-700 rounded-xl overflow-hidden bg-gray-800 bg-opacity-40 backdrop-filter backdrop-blur-sm shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="relative aspect-square overflow-hidden">
                    {!imageLoaded && !imageError && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                            <div className="animate-pulse w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                        </div>
                    )}
                    {imageError && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-gray-500">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p className="text-sm">Image unavailable</p>
                        </div>
                    )}
                    <img
                        src={image}
                        alt={name || "Item Image"}
                        className={`w-full h-full object-cover transition-transform duration-500 hover:scale-110 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                        crossOrigin="anonymous"
                        onLoad={() => setImageLoaded(true)}
                        onError={(e) => {
                            e.target.onerror = null;
                            setImageError(true);
                            setImageLoaded(true);
                            e.target.src = defaultImage;
                        }}
                        loading="lazy"
                    />
                    <div className="absolute top-3 left-3">
                        <span className="bg-blue-900 bg-opacity-70 text-white text-xs px-2 py-1 rounded-full">
                            #{tokenId}
                        </span>
                    </div>
                </div>
                <div className="p-4">
                    <h3 className="text-lg font-bold text-white mb-1 truncate">{name}</h3>
                    <p className="text-gray-400 text-sm h-10 overflow-hidden">{description}</p>
                    
                    {price && (
                        <div className="flex justify-between items-center mt-3">
                            <div className="bg-blue-900 bg-opacity-50 px-3 py-1 rounded-lg">
                                <p className="text-blue-300 font-medium">{price} ETH</p>
                            </div>
                            <div className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                <span className="text-xs text-gray-400">View Item</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Link>
    );
}

export default ItemTile;
