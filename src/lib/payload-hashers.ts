'use client';

import { keccak256, toBytes } from 'viem';

/**
 * DEPRECATED: Use generateKycAttestationPayloadHash from oracle-signature.ts instead.
 * 
 * This file previously used EIP-712 typed data hashing, but the smart contract
 * uses keccak256(abi.encode(...)) + toEthSignedMessageHash, so we must use
 * the contract-matching helper from oracle-signature.ts to ensure signatures
 * verify on-chain.
 * 
 * Ref: Registration.sol kycAttestation function
 */

// Re-export from oracle-signature for backward compatibility
export { generateKycAttestationPayloadHash } from './oracle-signature';
