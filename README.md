# AGUA Marketspace

A decentralized NFT marketplace running on the Ethereum blockchain where users can buy, sell, and trade unique digital items.

## Features

- **Seamless Trading**: Buy and sell digital items securely on the blockchain
- **Wallet Integration**: Connect your MetaMask wallet to interact with the marketplace
- **User Profiles**: Manage your items, listings, and purchases in one place
- **Secure Transactions**: All transactions are handled through smart contracts
- **Sepolia Testnet Compatible**: Currently deployed on Ethereum's Sepolia testnet

## Tech Stack

- **Frontend**: React.js, Tailwind CSS
- **Blockchain**: Ethereum (Sepolia Testnet)
- **File Storage**: Thirdweb Storage (IPFS)
- **Smart Contracts**: Solidity
- **Development Environment**: Hardhat
- **Authentication**: Web3 wallet connection (MetaMask)

## Getting Started

### Prerequisites

- Node.js (v14+ recommended)
- MetaMask browser extension
- Sepolia testnet ETH (available from faucets)

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/agua-marketspace.git
   cd agua-marketspace
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with the following content:
   ```
   REACT_APP_THIRDWEB_CLIENT_ID=your_thirdweb_client_id
   REACT_APP_MARKETPLACE_ADDRESS=your_deployed_contract_address
   ```

4. Start the development server
   ```bash
   npm start
   ```

### Smart Contract Deployment

1. Compile the smart contract
   ```bash
   npx hardhat compile
   ```

2. Deploy to Sepolia testnet (update hardhat.config.js with your private key first)
   ```bash
   npx hardhat run scripts/deploy.js --network sepolia
   ```

3. Update the contract address in your `.env` file

## Deployment

### Build for Production

```bash 
npm run build
```

This will create a `build` folder with all the production-ready files.

### Deployment Options

- **Vercel**: Connect your GitHub repository to Vercel for automatic deployments
- **Netlify**: Connect your GitHub repository or deploy the build folder directly
- **Firebase**: Deploy using the Firebase CLI with `firebase deploy`

## Usage

1. Connect your MetaMask wallet using the "Connect Wallet" button
2. Browse listings from the homepage
3. View details and purchase items by clicking on them
4. Create your own listings by navigating to "Sell an Item"
5. View your items and manage your listings in "My Account"

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- OpenZeppelin for secure smart contract libraries
- Thirdweb for IPFS storage solutions
- Ethereum community for continuous support and resources
