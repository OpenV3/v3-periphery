import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { ethers } from "ethers";

import { MISC_INFO } from "../../scripts/misc-addresses";
import { getChainId } from "../../scripts/utils";

// Create your module
export default buildModule("UniswapV3Periphery", (m) => {

  const chainId = getChainId();
  // These addresses should be configured per network
  const FACTORY_ADDRESS = MISC_INFO[chainId]?.POOL_FACTORY!
  const WRAPPED_NATIVE = MISC_INFO[chainId]?.WRAPPED_NATIVE!;
  const WRAPPED_NATIVE_SYMBOL = MISC_INFO[chainId]?.WRAPPED_NATIVE_SYMBOL!;

  // Deploy NFTDescriptor library first
  const nftDescriptorLib = m.contract("NFTDescriptor");

  const wrappedNativeBytes = ethers.encodeBytes32String(WRAPPED_NATIVE_SYMBOL);

  const positionDescriptor = m.contract(
    "NonfungibleTokenPositionDescriptor",
    [
      WRAPPED_NATIVE,
      wrappedNativeBytes
    ],
    {
      libraries: {
        NFTDescriptor: nftDescriptorLib
      }
    }
  );

  // Deploy NonfungiblePositionManager
  const nonfungiblePositionManager = m.contract(
    "NonfungiblePositionManager",
    [FACTORY_ADDRESS, WRAPPED_NATIVE, positionDescriptor]
  );

  // Deploy SwapRouter
  const swapRouter = m.contract(
    "SwapRouter",
    [FACTORY_ADDRESS, WRAPPED_NATIVE]
  );

  // Deploy V3Migrator
  const v3Migrator = m.contract(
    "V3Migrator",
    [FACTORY_ADDRESS, WRAPPED_NATIVE, nonfungiblePositionManager]
  );

  // Return all deployed contracts
  return {
    nftDescriptorLib,
    positionDescriptor,
    nonfungiblePositionManager,
    swapRouter,
    v3Migrator
  };
});
