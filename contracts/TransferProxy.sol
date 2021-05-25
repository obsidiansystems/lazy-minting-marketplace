// SPDX-License-Identifier: MIT

pragma solidity >=0.6.2 <0.8.0;
pragma abicoder v2;

import "hardhat/console.sol";

import "@rarible/lib-asset/contracts/LibAsset.sol";

import "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";
import "@rarible/exchange-interfaces/contracts/ITransferProxy.sol";
import "@rarible/exchange-interfaces/contracts/INftTransferProxy.sol";
import "@rarible/exchange-interfaces/contracts/IERC20TransferProxy.sol";

import "@rarible/royalties/contracts/IRoyaltiesProvider.sol";

import "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract TransferProxy is Initializable, INftTransferProxy, IERC20TransferProxy, ITransferProxy, IRoyaltiesProvider {
    function initialize() public initializer
    {
    }

    function getRoyalties(address token, uint tokenId) override external returns (LibPart.Part[] memory)
    {
        // return [LibPart.Part(token, 0)];
        LibPart.Part[] memory arr;
        return arr;
    }

    function erc721safeTransferFrom(IERC721Upgradeable token, address from, address to, uint256 tokenId) override external
    {
        console.log("STUB Transfer 721");
    }

    function erc1155safeTransferFrom(IERC1155Upgradeable token, address from, address to, uint256 id, uint256 value, bytes calldata data) override external
    {
        console.log("STUB Transfer 1155");
    }

    function erc20safeTransferFrom(IERC20Upgradeable token, address from, address to, uint256 value) override external
    {
        console.log("STUB Transfer erc20");
    }

    function transfer(LibAsset.Asset calldata asset, address from, address to) override external
    {
        console.log("STUB Transfer asset");
    }
}
