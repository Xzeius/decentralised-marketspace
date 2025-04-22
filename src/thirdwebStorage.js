// src/thirdwebStorage.js

import { ThirdwebStorage } from "@thirdweb-dev/storage";

// Get the client ID from environment variables
const clientId = process.env.REACT_APP_THIRDWEB_CLIENT_ID || "8c20c1055d7a8fcf888bad9d8b551767";

const storage = new ThirdwebStorage({ clientId });

/**
 * Uploads a file to IPFS using Thirdweb.
 * This returns a clean IPFS URI.
 */
export async function uploadFileToIPFS(file) {
    try {
        const uri = await storage.upload(file); // No need to add file.name
        return {
            success: true,
            thirdwebURL: uri, // Already correctly formatted
        };
    } catch (error) {
        console.error("File Upload Error:", error);
        return { success: false };
    }
}


/**
 * Uploads a JSON object (metadata) to IPFS using Thirdweb.
 */
export async function uploadJSONToIPFS(jsonObj) {
    try {
        const uri = await storage.upload(jsonObj); // Will handle 'image' internally if it's a File
        return {
            success: true,
            thirdwebURL: uri,
        };
    } catch (error) {
        console.error("Metadata Upload Error:", error);
        return { success: false };
    }
}
