const { assert, expect } = require("chai")
const {
    network,
    deployment,
    ethers,
    getNamedAccounts,
    deployments,
} = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Nft Marketplace Test", function () {
          let nftMarketplace, basicNft, deployer, player
          const PRICE = ethers.utils.parseEther("0.1")
          const NEW_PRICE = ethers.utils.parseEther("0.25")
          const TOKEN_ID = 0
          beforeEach(async function () {
              const accounts = await ethers.getSigners()
              deployer = accounts[0]
              player = accounts[1]
              await deployments.fixture(["all"])
              nftMarketplace = await ethers.getContract("NftMarketplace")
              basicNft = await ethers.getContract("BasicNFT")
              await basicNft.mintNft()
              await basicNft.approve(nftMarketplace.address, TOKEN_ID)
          })

          describe("listItem", function () {
              it("can only list if not yet listed", async function () {
                  await nftMarketplace.listItem(
                      basicNft.address,
                      TOKEN_ID,
                      PRICE
                  )
                  await expect(
                      nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  ).to.be.revertedWith("NftMarketplace__AlreadyListed")
              })

              it("only owner of nft can list", async function () {
                  const playerConnectedNftMarketplace =
                      await nftMarketplace.connect(player)
                  await expect(
                      playerConnectedNftMarketplace.listItem(
                          basicNft.address,
                          TOKEN_ID,
                          PRICE
                      )
                  ).to.be.revertedWith("NftMarketplace__NotOwner")
              })

              it("listing price must be above zero", async function () {
                  await expect(
                      nftMarketplace.listItem(basicNft.address, TOKEN_ID, 0)
                  ).to.be.revertedWith("NftMarketplace__PriceBelowZero")
              })

              it("owner must have given approval to contract", async function () {
                  await basicNft.approve(ethers.constants.AddressZero, TOKEN_ID)
                  await expect(
                      nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  ).to.be.revertedWith(
                      "NftMarketplace__NotApprovedForMarketplace"
                  )
              })

              it("s_listings updates with new listing", async function () {
                  await nftMarketplace.listItem(
                      basicNft.address,
                      TOKEN_ID,
                      PRICE
                  )
                  const listing = await nftMarketplace.getListing(
                      basicNft.address,
                      TOKEN_ID
                  )
                  assert(listing["price"].toString(), PRICE.toString())
                  assert(
                      listing["seller"].toString(),
                      deployer.address.toString()
                  )
              })

              it("emits event after listing", async function () {
                  await expect(
                      nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  ).to.emit(nftMarketplace, "NftListed")
              })
          })

          describe("buyItem", function () {
              it("cannot buy if not listed", async function () {
                  await expect(
                      nftMarketplace.buyItem(basicNft.address, TOKEN_ID, {
                          value: PRICE,
                      })
                  ).to.be.revertedWith("NftMarketplace__NotListed")
              })

              it("cannot buy if value less than price", async function () {
                  await nftMarketplace.listItem(
                      basicNft.address,
                      TOKEN_ID,
                      PRICE
                  )
                  await expect(
                      nftMarketplace.buyItem(basicNft.address, TOKEN_ID, {
                          value: ethers.utils.parseEther("0.005"),
                      })
                  ).to.be.revertedWith("NftMarketplace__PriceTooLow")
              })

              it("buying nft updates proceeds and transfers nft accordingly", async function () {
                  await nftMarketplace.listItem(
                      basicNft.address,
                      TOKEN_ID,
                      PRICE
                  )
                  const playerConnectedNftMarketplace =
                      await nftMarketplace.connect(player)
                  await playerConnectedNftMarketplace.buyItem(
                      basicNft.address,
                      TOKEN_ID,
                      { value: PRICE }
                  )
                  const newOwner = await basicNft.ownerOf(TOKEN_ID)
                  const deployerProceeds = await nftMarketplace.getProceeds(
                      deployer.address
                  )
                  assert(newOwner.toString() == player.address)
                  assert(deployerProceeds.toString() == PRICE.toString())
              })
          })

          describe("cancelListing", function () {
              it("only owner can cancel", async function () {
                  await nftMarketplace.listItem(
                      basicNft.address,
                      TOKEN_ID,
                      PRICE
                  )
                  const playerConnectedNftMarketplace =
                      await nftMarketplace.connect(player)
                  await expect(
                      playerConnectedNftMarketplace.cancelListing(
                          basicNft.address,
                          TOKEN_ID
                      )
                  ).to.be.revertedWith("NftMarketplace__NotOwner")
              })

              it("only listed nfts can be cancelled", async function () {
                  await expect(
                      nftMarketplace.cancelListing(basicNft.address, TOKEN_ID)
                  ).to.be.revertedWith("NftMarketplace__NotListed")
              })

              it("cancel emits event", async function () {
                  await nftMarketplace.listItem(
                      basicNft.address,
                      TOKEN_ID,
                      PRICE
                  )
                  await expect(
                      nftMarketplace.cancelListing(basicNft.address, TOKEN_ID)
                  ).to.emit(nftMarketplace, "ItemCancelled")
              })
          })

          describe("updateListing", function () {
              it("only owner can update list and nft must already by listed", async function () {
                  await expect(
                      nftMarketplace.updateListing(
                          basicNft.address,
                          TOKEN_ID,
                          PRICE
                      )
                  ).to.be.revertedWith("NftMarketplace__NotListed")
                  await nftMarketplace.listItem(
                      basicNft.address,
                      TOKEN_ID,
                      PRICE
                  )
                  const playerConnectedNftMarketplace =
                      await nftMarketplace.connect(player)
                  await expect(
                      playerConnectedNftMarketplace.updateListing(
                          basicNft.address,
                          TOKEN_ID,
                          PRICE
                      )
                  ).to.be.revertedWith("NftMarketplace__NotOwner")
              })

              it("reverts if new price is 0", async function () {
                  const updatedPrice = ethers.utils.parseEther("0")
                  await nftMarketplace.listItem(
                      basicNft.address,
                      TOKEN_ID,
                      PRICE
                  )
                  await expect(
                      nftMarketplace.updateListing(
                          basicNft.address,
                          TOKEN_ID,
                          updatedPrice
                      )
                  ).to.be.revertedWith("NftMarketplace__PriceBelowZero")
              })

              it("listing price is updated", async function () {
                  await nftMarketplace.listItem(
                      basicNft.address,
                      TOKEN_ID,
                      PRICE
                  )
                  expect(
                      await nftMarketplace.updateListing(
                          basicNft.address,
                          TOKEN_ID,
                          NEW_PRICE
                      )
                  ).to.emit(nftMarketplace, "NftListed")
                  await nftMarketplace.updateListing(
                      basicNft.address,
                      TOKEN_ID,
                      NEW_PRICE
                  )
                  const listing = await nftMarketplace.getListing(
                      basicNft.address,
                      TOKEN_ID
                  )
                  const newPrice = listing["price"]
                  assert(newPrice.toString() == NEW_PRICE.toString())
              })
          })

          describe("withdrawProceeds", function () {
              it("doesn't allow 0 proceed withdrawls", async function () {
                  await expect(
                      nftMarketplace.withdrawProceeds()
                  ).to.be.revertedWith("NftMarketplace__NoProceeds")
              })

              it("nft owner can withdraw proceeds", async function () {
                  await nftMarketplace.listItem(
                      basicNft.address,
                      TOKEN_ID,
                      PRICE
                  )
                  const playerConnectedNftMarketplace =
                      await nftMarketplace.connect(player)
                  await playerConnectedNftMarketplace.buyItem(
                      basicNft.address,
                      TOKEN_ID,
                      { value: PRICE }
                  )
                  const startingBalance = await deployer.getBalance()
                  const proceedsBalance = await nftMarketplace.getProceeds(
                      deployer.address
                  )
                  const txResponse = await nftMarketplace.withdrawProceeds()
                  const transactionReceipt = await txResponse.wait(1)
                  const { gasUsed, effectiveGasPrice } = transactionReceipt
                  const gasCost = gasUsed.mul(effectiveGasPrice)
                  const endingBalance = await deployer.getBalance()
                  assert(
                      startingBalance.add(proceedsBalance).toString() ==
                          endingBalance.add(gasCost).toString()
                  )
              })
          })
      })
