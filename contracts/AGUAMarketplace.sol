//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract AGUAMarketplace is ERC721URIStorage {

    using Counters for Counters.Counter;
    //_tokenIds variable has the most recent minted tokenId
    Counters.Counter private _tokenIds;
    //Keeps track of the number of items sold on the marketplace
    Counters.Counter private _itemsSold;
    //owner is the contract address that created the smart contract
    address payable owner;
    //The fee charged by the marketplace to be allowed to list an item
    uint256 listPrice = 0.00000001 ether;

    //The structure to store info about a listed token
    struct ListedItem {
        uint256 tokenId;
        address payable owner;
        address payable seller;
        uint256 price;
        bool currentlyListed;
    }

    //the event emitted when an item is successfully listed
    event ItemListedSuccess (
        uint256 indexed tokenId,
        address owner,
        address seller,
        uint256 price,
        bool currentlyListed
    );

    //This mapping maps tokenId to item info and is helpful when retrieving details about a tokenId
    mapping(uint256 => ListedItem) private idToListedItem;

    constructor() ERC721("AGUAMarketplace", "AGUA") {
        owner = payable(msg.sender);
    }

    function updateListPrice(uint256 _listPrice) public payable {
        require(owner == msg.sender, "Only owner can update listing price");
        listPrice = _listPrice;
    }

    function getListPrice() public view returns (uint256) {
        return listPrice;
    }

    function getLatestIdToListedItem() public view returns (ListedItem memory) {
        uint256 currentTokenId = _tokenIds.current();
        return idToListedItem[currentTokenId];
    }

    function getListedItemForId(uint256 tokenId) public view returns (ListedItem memory) {
        return idToListedItem[tokenId];
    }

    function getCurrentToken() public view returns (uint256) {
        return _tokenIds.current();
    }

    //The first time an item is created, it is listed here
    function createToken(string memory tokenURI, uint256 price) public payable returns (uint) {
        //Increment the tokenId counter, which is keeping track of the number of minted items
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();

        //Mint the item with tokenId newTokenId to the address who called createToken
        _safeMint(msg.sender, newTokenId);

        //Map the tokenId to the tokenURI (which is an IPFS URL with the item metadata)
        _setTokenURI(newTokenId, tokenURI);

        //Helper function to update Global variables and emit an event
        createListedItem(newTokenId, price);

        return newTokenId;
    }

    function createListedItem(uint256 tokenId, uint256 price) private {
        //Make sure the sender sent enough ETH to pay for listing
        require(msg.value == listPrice, "Hopefully sending the correct price");
        //Just sanity check
        require(price > 0, "Make sure the price isn't negative");

        //Update the mapping of tokenId's to Item details, useful for retrieval functions
        idToListedItem[tokenId] = ListedItem(
            tokenId,
            payable(address(this)),
            payable(msg.sender),
            price,
            true
        );

        _transfer(msg.sender, address(this), tokenId);
        //Emit the event for successful transfer. The frontend parses this message and updates the end user
        emit ItemListedSuccess(
            tokenId,
            address(this),
            msg.sender,
            price,
            true
        );
    }
    
    //This will return all the items currently listed to be sold on the marketplace
    function getAllNFTs() public view returns (ListedItem[] memory) {
        uint itemCount = _tokenIds.current();
        
        // First count how many items are currently listed
        uint listedCount = 0;
        for(uint i=0; i < itemCount; i++) {
            if(idToListedItem[i+1].currentlyListed) {
                listedCount++;
            }
        }
        
        // Create an array of the right size
        ListedItem[] memory items = new ListedItem[](listedCount);
        uint currentIndex = 0;
        
        // Populate the array with only listed items
        for(uint i=0; i < itemCount; i++) {
            uint currentId = i + 1;
            ListedItem storage currentItem = idToListedItem[currentId];
            if(currentItem.currentlyListed) {
                items[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }
        
        //the array 'items' has the list of all items in the marketplace
        return items;
    }
    
    //Returns all the items that the current user is owner or seller in
    function getMyNFTs() public view returns (ListedItem[] memory) {
        uint totalItemCount = _tokenIds.current();
        uint itemCount = 0;
        uint currentIndex = 0;
        
        // First, count items where user is the ACTUAL owner (not listed) or is the seller (for listed items)
        for(uint i=0; i < totalItemCount; i++) {
            // Include if:
            // 1. Item is not listed and user is the actual owner (ownerOf function)
            // 2. Item is listed and user is the seller
            if(
                (!idToListedItem[i+1].currentlyListed && ownerOf(i+1) == msg.sender) || 
                (idToListedItem[i+1].currentlyListed && idToListedItem[i+1].seller == msg.sender)
            ) {
                itemCount += 1;
            }
        }

        // Create an array for the filtered items
        ListedItem[] memory items = new ListedItem[](itemCount);
        
        // Populate with filtered items
        for(uint i=0; i < totalItemCount; i++) {
            if(
                (!idToListedItem[i+1].currentlyListed && ownerOf(i+1) == msg.sender) || 
                (idToListedItem[i+1].currentlyListed && idToListedItem[i+1].seller == msg.sender)
            ) {
                uint currentId = i+1;
                ListedItem storage currentItem = idToListedItem[currentId];
                items[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }
        
        return items;
    }

    function executeSale(uint256 tokenId) public payable {
        uint price = idToListedItem[tokenId].price;
        address seller = idToListedItem[tokenId].seller;
        require(msg.value == price, "Please submit the asking price in order to complete the purchase");

        //update the details of the token
        idToListedItem[tokenId].currentlyListed = false; // Set to false as it's now sold
        idToListedItem[tokenId].owner = payable(msg.sender); // Update the owner to the buyer
        _itemsSold.increment();

        //Actually transfer the token to the new owner
        _transfer(address(this), msg.sender, tokenId);
        //approve the marketplace to sell items on your behalf
        approve(address(this), tokenId);

        //Transfer the listing fee to the marketplace creator
        payable(owner).transfer(listPrice);
        //Transfer the proceeds from the sale to the seller of the item
        payable(seller).transfer(msg.value);
    }
} 