const hre = require("hardhat");

// struct Order {
//     address maker;
//     LibAsset.Asset makeAsset;
//     address taker;
//     LibAsset.Asset takeAsset;
//     uint salt;
//     uint start;
//     uint end;
//     bytes4 dataType;
//     bytes data;
// }

const orderType = {
  Order: [
    { name: "maker", type: "address" },
    { name: "makeAsset", type: "Asset" },
    { name: "taker", type: "address" },
    { name: "takeAsset", type: "Asset" },
    { name: "salt", type: "uint256" },
    { name: "start", type: "uint256" },
    { name: "end", type: "uint256" },
    { name: "dataType", type: "bytes4" },
    { name: "data", type: "bytes" },
  ],
  Asset: [
    { name: "assetType", type: "AssetType" },
    { name: "value", type: "uint256" },
  ],
  AssetType: [
    { name: "assetClass", type: "bytes4" },
    { name: "data", type: "bytes" },
  ],
};

async function main() {
  // We get the contract to deploy
  const ExchangeV2 = await hre.ethers.getContractFactory("ExchangeV2");
  const exchangeV2 = await ExchangeV2.deploy();
  await exchangeV2.deployed();

  const [owner01, owner02] = await ethers.getSigners();

  // console.log("HEY!!!");
  // console.log("HEY!!!", ethers.utils.keccak256([0x12, 0x34]));
  // console.log(
  //   "HEY!!!",
  //   ethers.utils.keccak256(ethers.utils.toUtf8Bytes("ETH"))
  // );
  // console.log(ethers.utils.id("ETH"));

  console.log(ethers.utils.id("ETH"));
  temp = ethers.utils.id("ETH");

  const hash = (something) => ethers.utils.id(something);
  const bytes4 = (something) => ethers.utils.hexDataSlice(something, 0, 4);

  console.log(bytes4(temp, 0, 4));

  order1 = {
    maker: owner01.address,
    makeAsset: {
      assetType: { assetClass: bytes4(hash("ETH")), data: owner01.address },
      value: 1,
    },
    taker: owner02.address,
    takeAsset: {
      assetType: { assetClass: bytes4(hash("ETH")), data: owner02.address },
      value: 2,
    },
    salt: 1,
    start: 0,
    end: 0,
    dataType: bytes4(hash("whatever")),
    data: 0x00,
  };

  order2 = {
    maker: owner02.address,
    makeAsset: {
      assetType: { assetClass: bytes4(hash("ETH")), data: owner02.address },
      value: 2,
    },
    taker: owner01.address,
    takeAsset: {
      assetType: { assetClass: bytes4(hash("ETH")), data: owner01.address },
      value: 1,
    },
    salt: 1,
    start: 0,
    end: 0,
    dataType: bytes4(hash("whatever")),
    data: 0x00,
  };

  sign1 = await owner01._signTypedData({}, orderType, order1);
  sign2 = await owner02._signTypedData({}, orderType, order2);

  console.log(
    ethers.utils.recoverAddress(
      ethers.utils._TypedDataEncoder.hash({}, orderType, order1),
      sign1
    )
  );
  console.log(owner01.address);
  console.log("-----------------------------");
  console.log(
    ethers.utils.recoverAddress(
      ethers.utils._TypedDataEncoder.hash({}, orderType, order2),
      sign2
    )
  );
  console.log(owner02.address);
  await exchangeV2.matchOrders(order1, sign1, order1, sign1);

  console.log("Contract deployed to:", exchangeV2.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
