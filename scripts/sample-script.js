const {ethers, upgrades} = require("hardhat");

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

const mkDomain = (cid, addr) => {
  return { name: "Exchange",
           version: "2",
           chainId: cid,
           verifyingContract: addr
         };
};

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

// NOTE Only used for hashing text TODO name hashText or hashUtf8
const hash = (something) => ethers.utils.id(something);
const bytes4 = (something) => ethers.utils.hexDataSlice(something, 0, 4);

// NOTE Used on things that are HexString_like_ so that includes utf8 text that is already hex...
const keccak256 = x => ethers.utils.keccak256(x);
const abi = ethers.utils.defaultAbiCoder;

const domainTypeHash = hash("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
const assetTypeTypeHash = hash("AssetType(bytes4 assetClass,bytes data)");
const assetTypeHash = hash("Asset(AssetType assetType,uint256 value)AssetType(bytes4 assetClass,bytes data)");
const orderTypeHash = hash("Order(address maker,Asset makeAsset,address taker,Asset takeAsset,uint256 salt,uint256 start,uint256 end,bytes4 dataType,bytes data)Asset(AssetType assetType,uint256 value)AssetType(bytes4 assetClass,bytes data)");

const hashAssetType = at => {
  return keccak256(abi.encode(["bytes32", "bytes4", "bytes32"]
                                                  , [ assetTypeTypeHash
                                                    , at.assetClass
                                                    , keccak256(at.data)
                                                    ]
                                                 ));
};

const hashAsset = a => {
  return keccak256(abi.encode(["bytes32", "bytes32", "uint"]
                                                  ,[assetTypeHash, hashAssetType(a.assetType), a.value]
                                                 ));
};

const hashDomain = d => {
  return keccak256(abi.encode(["bytes32", "bytes32", "bytes32", "uint256", "address"]
                                                       , [ domainTypeHash
                                                       , hash(d.name)
                                                       , hash(d.version)
                                                       , d.chainId
                                                       , d.verifyingContract
                                                       ]));
}

const hashOrder = order => {
  return keccak256(abi.encode([ "bytes32"
                                                   , "address"
                                                   , "bytes32" // After hashing
                                                   , "address"
                                                   , "bytes32"
                                                   , "uint256"
                                                   , "uint256"
                                                   , "uint256"
                                                   , "bytes4"
                                                   , "bytes32"
                                                  ]
                                                  , [ orderTypeHash
                                                      , order.maker
                                                    , hashAsset(order.makeAsset)
                                                      , order.taker
                                                      , hashAsset(order.takeAsset)
                                                      , order.salt
                                                      , order.start
                                                      , order.end
                                                      , order.dataType
                                                      , keccak256(order.data)
                                                    ]));
};

async function main() {
  const [owner01, owner02] = await ethers.getSigners();

  // We get the contract to deploy
  const ExchangeV2 = await hre.ethers.getContractFactory("Exchanger");

  const exchangeV2 = await upgrades.deployProxy(ExchangeV2, []); // , [owner01.address, owner01.address, 0, owner01.address, owner01.address]);
  await exchangeV2.deployed();

  order1 = {
    maker: owner01.address,
    makeAsset: {
      assetType: { assetClass: bytes4(hash("ERC1155")), data: abi.encode(["address", "uint"], [owner01.address, 3]) },
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
    dataType: bytes4("0xffffffff"),
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
      assetType: { assetClass: bytes4(hash("ERC1155")), data: abi.encode(["address", "uint"], [owner01.address, 3]) },
      value: 1,
    },
    salt: 1,
    start: 0,
    end: 0,
    dataType: bytes4("0xffffffff"),
    data: 0x00,
  };

  const network = await ethers.getDefaultProvider("http://127.0.0.1:8545/").getNetwork();

  console.log("Contract deployed to:", exchangeV2.address);
  console.log("Chain Id", network.chainId);

  const domain = mkDomain(network.chainId, exchangeV2.address);

  console.log(domain);
  console.log("Domain separator", hashDomain(domain));
  console.log("LibDomain separator", ethers.utils._TypedDataEncoder.hashDomain(domain));

  const sign1 = await owner01._signTypedData(domain, orderType, order1);
  const sign2 = await owner02._signTypedData(domain, orderType, order2);

  console.log("Signature", sign2);
  // console.log("Domain'", ethers.utils._TypedDataEncoder.encode(domain, orderType, order2));
  // console.log("Domain", ethers.utils._TypedDataEncoder.encode(domain));
  // console.log("Domain", ethers.utils._TypedDataEncoder.encode(domain));


  console.log("Hash1", hashOrder(order1));
  console.log("Hash2", hashOrder(order2));

  console.log("Digest 1", ethers.utils._TypedDataEncoder.hash(domain, orderType, order1));
  console.log("Digest 2", ethers.utils._TypedDataEncoder.hash(domain, orderType, order2));


  await exchangeV2.connect(owner02).matchOrders(order1, sign1, order2, sign2, { value: 2 });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
