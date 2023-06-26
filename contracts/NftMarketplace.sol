// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

error NftMarketplace__PriceBelowZero();
error NftMarketplace__NotApprovedForMarketplace();
error NftMarketplace__AlreadyListed(address nftAddress, uint256 tokenId);
error NftMarketplace__NotOwner();
error NftMarketplace__NotListed(address nftAddress, uint256 tokenId);
error NftMarketplace__PriceTooLow(
    address nftAddress,
    uint256 tokenId,
    uint256 price
);
error NftMarketplace__NoProceeds();
error NftMarketplace__TransferFailed();

contract NftMarketplace is ReentrancyGuard {
    struct Listing {
        uint256 price;
        address seller;
    }

    event NftListed(
        address indexed seller,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price
    );

    event ItemBought(
        address indexed buyer,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price
    );

    event ItemCancelled(
        address indexed seller,
        address indexed nftAddress,
        uint256 indexed tokenId
    );

    /////////////////
    // Constructor //
    /////////////////

    // constructor(address priceFeedAddress) {
    //     i_priceFeed = AggregatorV3Interface(priceFeedAddress);
    // }

    ///////////////
    // Variables //
    ///////////////

    // NFT Contract Address => NFT Token ID => Listing(price, seller)
    mapping(address => mapping(uint256 => Listing)) private s_listings;

    // Seller Address => Amount Earned
    mapping(address => uint256) private s_proceeds;

    // Chainlink Feed
    // AggregatorV3Interface internal immutable i_priceFeed;

    ///////////////
    // Modifiers //
    ///////////////

    // Check if NFT is already listed
    modifier notListed(
        address nftAddress,
        uint256 tokenId,
        address owner
    ) {
        Listing memory listing = s_listings[nftAddress][tokenId];
        if (listing.price > 0) {
            revert NftMarketplace__AlreadyListed(nftAddress, tokenId);
        }
        _;
    }

    // Check if NFT owner is owned by msg.sender
    modifier checkOwner(
        address nftAddress,
        uint256 tokenId,
        address owner
    ) {
        IERC721 nft = IERC721(nftAddress);
        if (nft.ownerOf(tokenId) != owner) {
            revert NftMarketplace__NotOwner();
        }
        _;
    }

    // Check if NFT is listed for sale
    modifier isListed(address nftAddress, uint256 tokenId) {
        Listing memory listing = s_listings[nftAddress][tokenId];
        if (listing.price <= 0) {
            revert NftMarketplace__NotListed(nftAddress, tokenId);
        }
        _;
    }

    ////////////////////
    // Main Functions //
    ////////////////////

    /**
     * @notice Function to list NFT on marketplace
     * @param nftAddress: Contract address of NFT
     * @param tokenId: Token ID of NFT
     * @param price: Sale price listed for NFT
     * @dev Function receives approval for transfer/sale of NFT (does not escrow)
     */
    function listItem(
        address nftAddress,
        uint256 tokenId,
        uint256 price
    )
        external
        notListed(nftAddress, tokenId, msg.sender)
        checkOwner(nftAddress, tokenId, msg.sender)
    {
        // Check listing price > 0
        if (price <= 0) {
            revert NftMarketplace__PriceBelowZero();
        }

        // Check for approval of ERC721 token (getApproved())
        IERC721 nft = IERC721(nftAddress);
        if (nft.getApproved(tokenId) != address(this)) {
            revert NftMarketplace__NotApprovedForMarketplace();
        }
        s_listings[nftAddress][tokenId] = Listing(price, msg.sender);
        emit NftListed(msg.sender, nftAddress, tokenId, price);
    }

    function buyItem(
        address nftAddress,
        uint256 tokenId
    ) external payable nonReentrant isListed(nftAddress, tokenId) {
        Listing memory listedItem = s_listings[nftAddress][tokenId];
        if (msg.value < listedItem.price) {
            revert NftMarketplace__PriceTooLow(
                nftAddress,
                tokenId,
                listedItem.price
            );
        }
        s_proceeds[listedItem.seller] += msg.value;
        delete (s_listings[nftAddress][tokenId]);

        // Put state changes at the end to avoid reentrancy attacks
        IERC721(nftAddress).safeTransferFrom(
            listedItem.seller,
            msg.sender,
            tokenId
        );
        emit ItemBought(msg.sender, nftAddress, tokenId, listedItem.price);
    }

    function cancelListing(
        address nftAddress,
        uint256 tokenId
    )
        external
        checkOwner(nftAddress, tokenId, msg.sender)
        isListed(nftAddress, tokenId)
    {
        delete (s_listings[nftAddress][tokenId]);
        emit ItemCancelled(msg.sender, nftAddress, tokenId);
    }

    function updateListing(
        address nftAddress,
        uint256 tokenId,
        uint256 newPrice
    )
        external
        isListed(nftAddress, tokenId)
        checkOwner(nftAddress, tokenId, msg.sender)
    {
        if (newPrice <= 0) {
            revert NftMarketplace__PriceBelowZero();
        }
        s_listings[nftAddress][tokenId].price = newPrice;
        emit NftListed(msg.sender, nftAddress, tokenId, newPrice);
    }

    function withdrawProceeds() external {
        uint256 proceeds = s_proceeds[msg.sender];
        if (proceeds <= 0) {
            revert NftMarketplace__NoProceeds();
        }
        s_proceeds[msg.sender] = 0;
        (bool success, ) = payable(msg.sender).call{value: proceeds}("");
        if (!success) {
            revert NftMarketplace__TransferFailed();
        }
    }

    //////////////////////
    // Getter Functions //
    //////////////////////

    function getListing(
        address nftAddress,
        uint256 tokenId
    ) external view returns (Listing memory) {
        return s_listings[nftAddress][tokenId];
    }

    function getProceeds(address seller) external view returns (uint256) {
        return s_proceeds[seller];
    }
}
