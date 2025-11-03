

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
  // Example: '0x5FbDB2315678afecb367f032d93F642f64180aa3'
  Registration: '0x5FbDB2315678afecb367f032d93F642f64180aa3',

  // Example: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512'
  OracleManager: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',

  // Example: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0'
  ShipmentToken: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',

  // Example: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9'
  DisputeManager: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',

  // Example: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9'
  EscrowPayment: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
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
