// SPDX-License-Identifier: MIT

pragma solidity >=0.6.2 <0.8.0;
pragma abicoder v2;

import "./exchange-v2/ExchangeV2.sol";
import "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";

/*
 *  This contract implementes the ExchangeV2 contract and expects the transfer proxy to have the following interfaces
 *  INftTransferProxy IERC20TransferProxy IRoyaltiesProvider
 */
contract Exchanger is Initializable, ExchangeV2 {
    function initialize(address transferProxy) public initializer {
        __ExchangeV2_init(INftTransferProxy(transferProxy), IERC20TransferProxy(transferProxy), 0, address(this), IRoyaltiesProvider(transferProxy));
    }
}
