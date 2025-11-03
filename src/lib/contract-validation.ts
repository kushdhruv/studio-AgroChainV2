/**
 * Contract address validation utilities
 * Ensures contracts are deployed before allowing interactions
 */

import { contractAddresses } from '@/contracts/addresses';
import { isAddress, getAddress } from 'viem';

/**
 * Validates a contract address format
 */
export function isValidContractAddress(address: string | undefined): boolean {
  if (!address) return false;
  try {
    return isAddress(address) && address.match(/^0x[a-fA-F0-9]{40}$/) !== null;
  } catch {
    return false;
  }
}

/**
 * Checks if a contract is deployed (non-zero address)
 */
export function isContractDeployed(address: string | undefined): boolean {
  if (!address) return false;
  const zeroAddress = '0x0000000000000000000000000000000000000000';
  return isValidContractAddress(address) && getAddress(address.toLowerCase()) !== getAddress(zeroAddress);
}

/**
 * Validates all required contracts are deployed
 */
export function validateAllContractsDeployed(): { valid: boolean; missing: string[] } {
  const requiredContracts = [
    'Registration',
    'OracleManager',
    'ShipmentToken',
    'EscrowPayment',
    'DisputeManager',
  ];

  const missing: string[] = [];
  
  for (const contractName of requiredContracts) {
    const address = contractAddresses[contractName];
    if (!isContractDeployed(address)) {
      missing.push(contractName);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Gets contract address with validation
 */
export function getContractAddress(contractName: string): `0x${string}` | null {
  const address = contractAddresses[contractName];
  if (isContractDeployed(address)) {
    return address as `0x${string}`;
  }
  return null;
}

/**
 * Validates contract address before interaction
 */
export function validateContractBeforeInteraction(
  contractName: string,
  address?: `0x${string}`
): { valid: boolean; error?: string } {
  const contractAddr = address || contractAddresses[contractName];
  
  if (!contractAddr) {
    return {
      valid: false,
      error: `${contractName} contract address not configured. Please deploy contracts first.`,
    };
  }

  if (!isValidContractAddress(contractAddr)) {
    return {
      valid: false,
      error: `Invalid ${contractName} contract address: ${contractAddr}`,
    };
  }

  if (!isContractDeployed(contractAddr)) {
    return {
      valid: false,
      error: `${contractName} contract not deployed at ${contractAddr}. Please deploy contracts first.`,
    };
  }

  return { valid: true };
}

