const { assert } = require("chai")
const { network, deployments, ethers, getNamedAccounts } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("BasicNFT Unit Tests", function () {
          let basicNft, deployer
          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer
              await deployments.fixture(["basicnft"])
              basicNft = await ethers.getContract("BasicNFT")
          })

          describe("constructor", function () {
              it("initializes correctly", async function () {
                  const name = await basicNft.name()
                  const symbol = await basicNft.symbol()
                  const tokenCounter = await basicNft.getTokenCounter()
                  assert.equal(tokenCounter.toString(), "0")
                  assert.equal(name, "Doge")
                  assert.equal(symbol, "Dog")
              })
          })

          describe("mint nft", function () {
              beforeEach(async function () {
                  tx = await basicNft.mintNft()
                  txResponse = await tx.wait(1)
              })
              it("Allows users to mint nft, updates counter and URI correctly", async function () {
                  const tokenCounter = await basicNft.getTokenCounter()
                  const tokenURI = await basicNft.tokenURI(0)
                  assert.equal(tokenCounter.toString(), "1")
                  assert.equal(tokenURI, await basicNft.TOKEN_URI())
              })

              it("shows the correct balance and owner of NFT", async function () {
                  const owner = await basicNft.ownerOf("0")
                  const deployerBalance = await basicNft.balanceOf(deployer)
                  assert.equal(deployerBalance.toString(), "1")
                  assert.equal(owner, deployer)
              })
          })
      })
