

import { validateAllContractsDeployed, isValidContractAddress } from '@/lib/contract-validation';

type ContractAddresses = {
  [key: string]: `0x${string}`;
};

// ==============================================================================================
// IMPORTANT: Replace the placeholder addresses below with your actual deployed contract addresses
// from your local Anvil node.
//
// You can get these addresses from the output of your deployment script (e.g., `forge script`).
// ==============================================================================================
export const contractAddresses: ContractAddresses = {
  Registration: '0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e',
  OracleManager: '0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0',
  ShipmentToken: '0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82',
  DisputeManager: '0x0B306BF915C4d645ff596e518fAf3F9669b97016',
  EscrowPayment: '0x9A676e781A523b5d0C0e43731313A708CB607508',
} as const;

// Validate all contract addresses on module load
if (typeof window !== 'undefined') {
  const validation = validateAllContractsDeployed();
  if (!validation.valid && validation.missing.length > 0) {
    console.warn(
      `⚠️ Some contracts are not deployed: ${validation.missing.join(', ')}\n` +
      `Please update contractAddresses in src/contracts/addresses.ts with deployed addresses.`
    );
  }
}

/**
 * Helper function to get contract address with validation
 */
export function getContractAddress(contractName: string): `0x${string}` | null {
  const address = contractAddresses[contractName];
  if (!address) {
    console.error(`Contract ${contractName} not found in contractAddresses`);
    return null;
  }
  
  if (!isValidContractAddress(address)) {
    console.error(`Invalid contract address for ${contractName}: ${address}`);
    return null;
  }
  
  return address;
}

// You can add more contract addresses here as you deploy them
// e.g. Escrow: '0x...'
