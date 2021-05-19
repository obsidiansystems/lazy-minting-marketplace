// SPDX-License-Identifier: MIT

pragma solidity >=0.6.2 <0.8.0;
pragma abicoder v2;

import "./exchange-v2/ExchangeV2.sol";
import "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";

contract Exchanger is Initializable, ExchangeV2 {
    function initialize(address memory erc1155) public initializer {
        __ExchangeV2_init(INftTransferProxy(erc1155), IERC20TransferProxy(address(this)), 0, address(this), IRoyaltiesProvider(address(this)));
    }
}
