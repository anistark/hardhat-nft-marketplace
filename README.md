# Decentralised NFT Marketplace Project using Hardhat Deploy

## Setup:

Install Dependencies: `npm i`
Setup env: `touch .env`

## Deploy:
`node_modules/.bin/hardhat deploy`

## Verify Contract:
`node_modules/.bin/hardhat etherscan-verify --api-url "https://explorer.evm.testnet.shimmer.network/api"`

Inspired from [eugenekhoo1's repo](eugenekhoo1/hardhat-nft-marketplace).

Backend contracts/tests/scripts/deployment

- Create a decentralized NFT Marketplace
    1. `listItem`: List NFTs on marketplace
    2. `buyItem`: Buy NFT
    3. `cancelItem`: Cancel listing
    4. `updateListing`: Update price
    5. `withdrawProceeds`: Withdraw proceeds from sale
