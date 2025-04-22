import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import logo from '../logo_3.png';
import fullLogo from '../full_logo.png';

function Navbar() {
  const [connected, toggleConnect] = useState(false);
  const [currAddress, updateAddress] = useState('0x');
  const location = useLocation();

  async function getAddress() {
    const ethers = require("ethers");
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const addr = await signer.getAddress();
    updateAddress(addr);
  }

  function updateButton() {
    const ethereumButton = document.querySelector('.enableEthereumButton');
    if (ethereumButton) {
      ethereumButton.textContent = "Connected";
      ethereumButton.classList.remove("hover:bg-blue-70", "bg-blue-500");
      ethereumButton.classList.add("hover:bg-green-70", "bg-green-500");
    }
  }

  async function connectWebsite() {
    if (!window.ethereum) {
      alert("MetaMask is not installed. Please install it to use this feature.");
      return;
    }

    try {
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
        updateButton();
        getAddress();
        toggleConnect(true);
      }
    } catch (error) {
      console.error("Error connecting to MetaMask:", error);
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
          updateButton();
        }
      } catch (error) {
        console.error("Error checking wallet connection:", error);
      }
    };

    checkConnection();

    window.ethereum.on('accountsChanged', () => window.location.reload());
    window.ethereum.on('chainChanged', () => window.location.reload());
  }, []);

  const navItems = [
    { name: "Browse Listings", path: "/" },
    { name: "Sell an Item", path: "/sellNFT" },
    { name: "My Account", path: "/profile" }
  ];

  return (
    <div>
      <nav className="w-screen">
        <ul className="flex items-end justify-between py-3 bg-transparent text-white pr-5">
          <li className="flex items-end ml-5 pb-2">
            <Link to="/">
              <div className="inline-block font-bold text-xl ml-2">
                AGUA Marketspace
              </div>
            </Link>
          </li>
          <li className="w-2/6">
            <ul className="lg:flex justify-between font-bold mr-10 text-lg">
              {navItems.map((item) => (
                <li
                  key={item.path}
                  className={`p-2 ${location.pathname === item.path ? 'border-b-2' : 'hover:border-b-2 hover:pb-0'}`}
                >
                  <Link to={item.path}>{item.name}</Link>
                </li>
              ))}
              <li>
                <button
                  className="enableEthereumButton bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded text-sm"
                  onClick={connectWebsite}
                >
                  {connected ? "Connected" : "Connect Wallet"}
                </button>
              </li>
            </ul>
          </li>
        </ul>
      </nav>
      <div className="text-white font-bold text-right mr-10 text-sm">
        {currAddress !== "0x"
          ? `Connected to ${currAddress.substring(0, 15)}...`
          : "Not Connected. Please login to view your items"}
      </div>
    </div>
  );
}

export default Navbar;
