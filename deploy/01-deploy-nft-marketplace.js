const { network } = require("hardhat")
const { developmentChains } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId
    log("---------------------------")
    log("Deploying Contract...")
    const args = []
    const nftMarketplace = await deploy("NftMarketplace", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmation: network.config.blockConfirmations || 1,
    })

    if (
        !developmentChains.includes(network.name) &&
        process.env.ETHERSCAN_API_KEY
    ) {
        log("Verifying...")
        await verify(nftMarketplace.address, args)
    }
    log("Contract Deployed!")
    log("---------------------------")
}

module.exports.tags = ["all", "nftmarketplace"]
