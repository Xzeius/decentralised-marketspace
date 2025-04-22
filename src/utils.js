export const resolveIPFSUrl = (url) => {
    if (!url) return "";
  
    // If the URL is already formatted with a gateway, return it as is
    if (url.startsWith("https://nftstorage.link/") || 
        url.startsWith("https://ipfs.io/") || 
        url.startsWith("https://gateway.pinata.cloud/")) {
      return url;
    }
  
    // Strip repeated 'ipfs://'
    let cleaned = url.replace(/(ipfs:\/\/)+/g, "").replace(/^\/+/, "");
  
    const parts = cleaned.split("/");
  
    // If filename is repeated in a nested path, trim it
    if (parts.length >= 2 && parts[parts.length - 2] === parts[parts.length - 1]) {
      parts.pop(); // remove the duplicate filename
    }
  
    return `https://nftstorage.link/ipfs/${parts.join("/")}`;
  };
  