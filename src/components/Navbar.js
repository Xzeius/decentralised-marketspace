import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import aguaLogo from '../AGUA2.png';

function Navbar() {
  const [connected, toggleConnect] = useState(false);
  const [currAddress, updateAddress] = useState('0x');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const location = useLocation();

  async function getAddress() {
    const ethers = require("ethers");
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const addr = await signer.getAddress();
    updateAddress(addr);
  }

  async function connectWebsite() {
    if (!window.ethereum) {
      alert("MetaMask is not installed. Please install it to use this feature.");
      return;
    }

    try {
      setIsConnecting(true);
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });

      if (chainId !== '0xaa36a7') {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xaa36a7' }], // Sepolia chain ID
          });
        } catch (switchError) {
          if (switchError.code === 4902) {
            alert("Sepolia test network is not added to your MetaMask. Please add it manually.");
          } else {
            console.error("Error switching network:", switchError);
            return;
          }
        }
      }

      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts.length > 0) {
        console.log("Connected account:", accounts[0]);
        getAddress();
        toggleConnect(true);
      }
    } catch (error) {
      console.error("Error connecting to MetaMask:", error);
    } finally {
      setIsConnecting(false);
    }
  }

  useEffect(() => {
    if (!window.ethereum) {
      console.log("MetaMask is not available");
      return;
    }

    const checkConnection = async () => {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          console.log("Wallet already connected:", accounts[0]);
          toggleConnect(true);
          getAddress();
        }
      } catch (error) {
        console.error("Error checking wallet connection:", error);
      }
    };

    checkConnection();

    window.ethereum.on('accountsChanged', () => window.location.reload());
    window.ethereum.on('chainChanged', () => window.location.reload());
  }, []);

  // Close mobile menu when location changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  const formatAddress = (address) => {
    if (!address || address === "0x") return "";
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const navItems = [
    { name: "Browse Listings", path: "/" },
    { name: "Sell an Item", path: "/sellItem" },
    { name: "My Account", path: "/profile" }
  ];

  return (
    <div className="sticky top-0 z-50 bg-gray-900 bg-opacity-80 backdrop-filter backdrop-blur-lg shadow-lg border-b border-gray-800">
      {/* Main navbar */}
      <nav className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link to="/" className="flex items-center">
              <img 
                src={aguaLogo} 
                alt="AGUA Marketplace" 
                className="h-40 w-40"
              />
            </Link>
          </div>
          
          {/* Desktop menu */}
          <div className="hidden md:block">
            <div className="flex items-center space-x-4">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200
                    ${location.pathname === item.path 
                      ? 'text-white bg-gray-800 bg-opacity-50' 
                      : 'text-gray-300 hover:text-white hover:bg-gray-700 hover:bg-opacity-50'
                    }`}
                >
                  {item.name}
                </Link>
              ))}
              
              <button
                onClick={connectWebsite}
                disabled={isConnecting}
                className={`
                  px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center
                  ${connected 
                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                  } ${isConnecting ? 'opacity-75 cursor-not-allowed' : 'transform hover:scale-105'}
                `}
              >
                {isConnecting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Connecting...
                  </>
                ) : connected ? (
                  <>
                    <span className="h-2 w-2 bg-green-400 rounded-full mr-2"></span>
                    Connected
                  </>
                ) : (
                  <>
                    <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Connect Wallet
                  </>
                )}
              </button>
            </div>
          </div>
          
          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            {connected && (
              <div className="text-green-400 text-xs font-medium mr-4 flex items-center">
                <span className="h-2 w-2 bg-green-400 rounded-full mr-1"></span>
                {formatAddress(currAddress)}
              </div>
            )}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
            >
              <span className="sr-only">Open main menu</span>
              {isMobileMenuOpen ? (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </nav>
      
      {/* Mobile menu, show/hide based on menu state */}
      <div className={`md:hidden transition-all duration-300 ease-in-out ${isMobileMenuOpen ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gray-800 bg-opacity-95">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                location.pathname === item.path 
                  ? 'bg-gray-900 text-white' 
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              {item.name}
            </Link>
          ))}
          <button
            onClick={connectWebsite}
            disabled={isConnecting}
            className={`w-full mt-2 flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium ${
              connected 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isConnecting ? 'Connecting...' : (connected ? 'Connected' : 'Connect Wallet')}
          </button>
        </div>
      </div>
      
      {/* Address bar for desktop */}
      {connected && (
        <div className="hidden md:block bg-gray-800 py-1 px-4 text-right">
          <div className="container mx-auto">
            <span className="text-gray-400 text-xs font-medium">
              Connected as <span className="text-green-400">{formatAddress(currAddress)}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default Navbar;
