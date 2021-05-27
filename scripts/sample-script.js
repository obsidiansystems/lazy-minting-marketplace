const {ethers, upgrades} = require("hardhat");

/*
 * The domain as defined here: https://eips.ethereum.org/EIPS/eip-712
 * is a way of making structs with the same fields and types only work within the domain.
 *
 * All the domain fields are optional but this particular contract we are interacting with
 * needs a domain with the chain id and contract address present.
 *
 * This helper creates the domain object given the chain id and the contracts deployment address
 *
 * IMPORTANT names are defined in the standard and shouldn't be changed
 */
const mkDomain = (cid, addr) => {
  return { name: "Exchange",
           version: "2",
           chainId: cid,
           verifyingContract: addr
         };
};

/*
 * This is a specification of our "Order" structured data
 * structured data is part of EIP-712 and allows us to
 * sign just structures instead of full transactions
 * and then recover the signer for validation
 *
 * https://eips.ethereum.org/EIPS/eip-712
 */
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
/*
 * These are smaller aliases for the very long ethers.utils version
 *
 * hash is for readible utf8, it first converts it to bytes then keccak256s the bytes, if the string is already readible hex, just used keccak256
 *
 * bytes4 slices a hexstring and makes it 4 bytes long
 */
const hash = (something) => ethers.utils.id(something);
const bytes4 = (something) => ethers.utils.hexDataSlice(something, 0, 4);

// NOTE Used on things that are HexString_like_ so that includes utf8 text that is already hex...
/*
 * More aliases, keccak256 does a keccak256 hash on some input hex or bytes
 *
 * abi is named to match the analogous namespace in solidity code: "abi.encode"
 */
const keccak256 = x => ethers.utils.keccak256(x);
const abi = ethers.utils.defaultAbiCoder;

/*
 * These type hashes are part of EIP-712
 *
 * they are hashStructs: A specific description of our structures: name, fieldnames, and types
 * which are then keccak256d
 *
 * https://eips.ethereum.org/EIPS/eip-712
 */
const domainTypeHash = hash("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
const assetTypeTypeHash = hash("AssetType(bytes4 assetClass,bytes data)");
const assetTypeHash = hash("Asset(AssetType assetType,uint256 value)AssetType(bytes4 assetClass,bytes data)");
const orderTypeHash = hash("Order(address maker,Asset makeAsset,address taker,Asset takeAsset,uint256 salt,uint256 start,uint256 end,bytes4 dataType,bytes data)Asset(AssetType assetType,uint256 value)AssetType(bytes4 assetClass,bytes data)");

/*
 * Early on it was hard to pin down why certain verification failed within the rarible smart contracts using EIP-712
 *
 * These implement the hashing logic according to the 712 spec for our various typed structs
 *
 * https://eips.ethereum.org/EIPS/eip-712
 */
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

/*
 * See hardhat tutorial and docs for more details about these scripts
 *
 * https://hardhat.org/getting-started/
 * https://hardhat.org/tutorial/
 */

async function main() {
  // Grab 2 signers
  const [owner01, owner02] = await ethers.getSigners();

  /* Get a representation of our ERC1155
   *
   * The exchange contract will eventually call into this contract to swap (N)FTs
   *
   * NOTE this contract (like all of the ones we deploy) are upgradeable
   * https://docs.openzeppelin.com/upgrades-plugins/1.x/
   */
  const ERC1155 = await hre.ethers.getContractFactory("ERC1155Upgradeable");

  /*
   * We deploy via proxy all our contracts, this is required to be able to utilize upgradable contracts
   */
  const erc1155 = await upgrades.deployProxy(ERC1155, []);
  await erc1155.deployed();

  /* The transfer proxy allows us to control the logic for various assets being traded/bought/sold
   * this will directly call into the individual asset's contracts
   */
  const TransferProxy = await hre.ethers.getContractFactory("TransferProxy");

  const transferProxy = await upgrades.deployProxy(TransferProxy, []);
  await transferProxy.deployed();

  /*
   * The exchanger is our _main_ contract, it is the one we talk to but requires at deploy/init time the
   * other contracts it will need to fulfil its goals (which we have simplified to just the transfer proxy)
   */
  const ExchangeV2 = await hre.ethers.getContractFactory("Exchanger");

  const exchangeV2 = await upgrades.deployProxy(ExchangeV2, [transferProxy.address]);
  await exchangeV2.deployed();

  /*
   * Here we lay out an example transaction to test the contract
   * we specify a sell order (order1) and a buy order (order2)
   *
   * They are mirrors of eachother and that is paramount to the matching process working on-chain
   *
   * These are again typed structs (EIP-712)
   * that we will sign so they can be verified (and/or lazy minted) at the time of sale
   *
   * https://eips.ethereum.org/EIPS/eip-712
   */
  order1 = {
    maker: owner01.address,
    makeAsset: {
      assetType: { assetClass: bytes4(hash("ERC1155")), data: abi.encode(["address", "uint"], [erc1155.address, 3]) },
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
      assetType: { assetClass: bytes4(hash("ERC1155")), data: abi.encode(["address", "uint"], [erc1155.address, 3]) },
      value: 1,
    },
    salt: 1,
    start: 0,
    end: 0,
    dataType: bytes4("0xffffffff"),
    data: 0x00,
  };

  // We get the network so we can properly assemble the domain
  const network = await ethers.getDefaultProvider("http://127.0.0.1:8545/").getNetwork();

  console.log("Contract deployed to:", exchangeV2.address);
  console.log("Chain Id", network.chainId);

  const domain = mkDomain(network.chainId, exchangeV2.address);

  console.log(domain);
  console.log("Domain separator", hashDomain(domain));
  console.log("LibDomain separator", ethers.utils._TypedDataEncoder.hashDomain(domain));

  /*
   * This signing call is using the V4 version of the RPC Call eth_signTypedData
   */
  const sign1 = await owner01._signTypedData(domain, orderType, order1);
  const sign2 = await owner02._signTypedData(domain, orderType, order2);

  // Checking our work here to make sure we understand the validation/hashing process for EIP-712
  console.log("Signature", sign2);

  console.log("Hash1", hashOrder(order1));
  console.log("Hash2", hashOrder(order2));

  console.log("Digest 1", ethers.utils._TypedDataEncoder.hash(domain, orderType, order1));
  console.log("Digest 2", ethers.utils._TypedDataEncoder.hash(domain, orderType, order2));


  /*
   * Perform the asset exchange, the orders are matched, minted and traded with ethereum being provided to sastify the buy order assets
   */
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
