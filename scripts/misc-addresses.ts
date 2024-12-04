import { SupportedChainId } from "./chains";

type Address = `0x${string}`;

export interface MiscInfo {
  POOL_FACTORY: Address; // the UniswapV3Factory
  WRAPPED_NATIVE: Address;
  WRAPPED_NATIVE_SYMBOL: string;
}

export const MISC_INFO: Partial<Record<SupportedChainId, MiscInfo>> = {
  [SupportedChainId.INK_SEPOLIA]: {
      POOL_FACTORY: "0xcfEA11557Bc9cB71bc6916e09fC8493D668b8d53",
      WRAPPED_NATIVE: "0x4200000000000000000000000000000000000006",
      WRAPPED_NATIVE_SYMBOL: "WETH9",
  },
};
