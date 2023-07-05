// Custom
export * from './generated/custom';
export type { GPv2Order } from './generated/custom/ComposableCoW';
export { default as GPv2SettlementAbi } from './abis/GPv2Settlement.json';
export { default as ComposableCoWAbi } from './abis/ComposableCoW.json';
export { default as vCowAbi } from './abis/vCow.json';
export { default as SignatureVerifierMuxerAbi } from './abis/SignatureVerifierMuxer.json';
export { default as MerkleDropAbi } from './abis/MerkleDrop.json';
export { default as TokenDistroAbi } from './abis/TokenDistro.json';

// Legacy
export type {
  ArgentWalletContract,
  ArgentWalletDetector,
  EnsPublicResolver,
  EnsRegistrar,
  Erc20,
  Erc721,
  Erc1155,
  Weth,
  UniswapInterfaceMulticall,
} from './generated/legacy';

export type { Erc20Interface } from './generated/legacy/Erc20';

// EthFlow
export type { CoWSwapEthFlow } from './generated/ethflow';
export { default as ethFlowBarnJson } from '@cowprotocol/ethflowcontract/networks.barn.json';
export { default as ethFlowProdJson } from '@cowprotocol/ethflowcontract/networks.prod.json';

// Legacy ABIs
export { default as ArgentWalletContractAbi } from './abis-legacy/argent-wallet-contract.json';
export { default as ArgentWalletDetectorAbi } from './abis-legacy/argent-wallet-detector.json';
export { default as CoWSwapEthFlowJson } from '@cowprotocol/ethflowcontract/artifacts/CoWSwapEthFlow.sol/CoWSwapEthFlow.json';
export { default as Eip2612Abi } from './abis-legacy/eip_2612.json';
export { default as EnsPublicResolverAbi } from './abis-legacy/ens-public-resolver.json';
export { default as EnsAbi } from './abis-legacy/ens-registrar.json';
export { default as Erc1155Abi } from './abis-legacy/erc1155.json';
export { default as Erc20Abi } from './abis-legacy/erc20.json';
export { default as Erc20Bytes32Abi } from './abis-legacy/erc20_bytes32.json';
export { default as Erc721Abi } from './abis-legacy/erc721.json';
export { default as WethAbi } from './abis-legacy/weth.json';
