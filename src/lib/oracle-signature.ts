/**
 * Oracle Signature Utilities
 * 
 * This module provides utilities for generating oracle signatures that match
 * the smart contract's expected signature format.
 * 
 * IMPORTANT: Oracles need to sign messages with their private key. In a web app,
 * this typically requires:
 * 1. A backend service that signs messages (oracle has private key on server)
 * 2. A wallet extension that supports signing arbitrary messages (e.g., MetaMask signTypedData)
 * 
 * For production, use a secure backend service. This demo shows the frontend flow.
 */

import { keccak256, encodeAbiParameters, parseAbiParameters, hashMessage, toBytes, type Address, type Hex } from 'viem';

// Extend Window interface for ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}

export interface WeighmentSignatureParams {
  chainId: bigint;
  shipmentId: `0x${string}`;
  weighKg: bigint;
  weighHash: string;
  timestamp: bigint;
  nonce: bigint;
}

export interface ProofSignatureParams {
  chainId: bigint;
  shipmentId: `0x${string}`;
  proofType: number;
  proofHash: string;
  timestamp: bigint;
  nonce: bigint;
}

export interface StateSignatureParams {
  chainId: bigint;
  shipmentId: `0x${string}`;
  newState: number;
  timestamp: bigint;
  nonce: bigint;
}

/**
 * Generate the payload hash for weighment that matches the contract's keccak256 encoding
 * Contract code (ShipmentToken.sol line 296-303):
 * bytes32 payloadHash = keccak256(abi.encode(
 *   block.chainid,
 *   input.shipmentId,
 *   input.weighKg,
 *   keccak256(bytes(input.weighHash)),
 *   input.timestamp,
 *   input.nonce
 * ));
 */
export function generateWeighmentPayloadHash(params: WeighmentSignatureParams): `0x${string}` {
  // Contract does: keccak256(bytes(input.weighHash))
  // Convert string to bytes (UTF-8 encoding) then hash
  const weighHashBytes = keccak256(toBytes(params.weighHash));
  
  const encoded = encodeAbiParameters(
    parseAbiParameters('uint256 chainId, bytes32 shipmentId, uint256 weighKg, bytes32 weighHash, uint256 timestamp, uint256 nonce'),
    [
      params.chainId,
      params.shipmentId as `0x${string}`,
      params.weighKg,
      weighHashBytes,
      params.timestamp,
      params.nonce,
    ]
  );

  return keccak256(encoded);
}

/**
 * Generate the payload hash for proof attachment
 * Contract code (ShipmentToken.sol line 264-271):
 * bytes32 payloadHash = keccak256(abi.encode(
 *   block.chainid,
 *   input.shipmentId,
 *   uint8(input.proofType),
 *   keccak256(bytes(input.proofHash)),
 *   input.timestamp,
 *   input.nonce
 * ));
 */
export function generateProofPayloadHash(params: ProofSignatureParams): `0x${string}` {
  // Contract does: keccak256(bytes(input.proofHash))
  // Convert string to bytes (UTF-8 encoding) then hash
  const proofHashBytes = keccak256(toBytes(params.proofHash));
  
  const encoded = encodeAbiParameters(
    parseAbiParameters('uint256 chainId, bytes32 shipmentId, uint8 proofType, bytes32 proofHash, uint256 timestamp, uint256 nonce'),
    [
      params.chainId,
      params.shipmentId as `0x${string}`,
      Number(params.proofType),
      proofHashBytes,
      params.timestamp,
      params.nonce,
    ]
  );

  return keccak256(encoded);
}

/**
 * Generate the payload hash for state updates
 * Contract code (ShipmentToken.sol line 335-341):
 * bytes32 payloadHash = keccak256(abi.encode(
 *   block.chainid,
 *   input.shipmentId,
 *   uint8(input.newState),
 *   input.timestamp,
 *   input.nonce
 * ));
 */
export function generateStatePayloadHash(params: StateSignatureParams): `0x${string}` {
  const encoded = encodeAbiParameters(
    parseAbiParameters('uint256 chainId, bytes32 shipmentId, uint8 newState, uint256 timestamp, uint256 nonce'),
    [
      params.chainId,
      params.shipmentId as `0x${string}`,
      Number(params.newState),
      params.timestamp,
      params.nonce,
    ]
  );

  return keccak256(encoded);
}

/**
 * Sign a payload hash using wallet's personal_sign
 * This uses the wallet extension (e.g., MetaMask) to sign the message
 * 
 * IMPORTANT: This requires the user to approve in their wallet.
 * The contract uses MessageHashUtils.toEthSignedMessageHash() which adds
 * "\x19Ethereum Signed Message:\n32" prefix, so we need to hash the payloadHash again
 * to match what the contract expects.
 * 
 * @param walletAddress - The oracle's wallet address
 * @param payloadHash - The payload hash to sign (already keccak256'd)
 * @returns The signature bytes
 */
export async function signPayloadHashWithWallet(
  walletAddress: Address,
  payloadHash: `0x${string}`
): Promise<`0x${string}`> {
  if (!window.ethereum) {
    throw new Error('No Ethereum wallet found. Please install MetaMask or another compatible wallet.');
  }

  // The contract uses toEthSignedMessageHash which adds "\x19Ethereum Signed Message:\n32" prefix
  // personal_sign also adds this prefix automatically, but it expects the message as hex string
  // Convert the 32-byte hash to hex string properly
  // personal_sign expects: "\x19Ethereum Signed Message:\n" + len(message) + message (as hex)
  // The contract's toEthSignedMessageHash does the same, so they should match
  
  // For personal_sign with a 32-byte hash:
  // - Remove 0x prefix to get raw hex
  // - MetaMask will convert hex string to bytes, add prefix, then sign
  // This matches contract's toEthSignedMessageHash behavior
  const hashHex = payloadHash.slice(2); // Remove 0x prefix
  
  const signature = await window.ethereum.request({
    method: 'personal_sign',
    params: [`0x${hashHex}`, walletAddress], // Pass as hex string, MetaMask handles the prefix
  }) as string;

  return signature as `0x${string}`;
}

/**
 * Sign payload using backend API (for production use)
 * This is the recommended approach for oracle services
 * 
 * @param apiEndpoint - Your backend API endpoint for oracle signing
 * @param payloadHash - The payload hash to sign
 * @param oracleAddress - The oracle's address (for authentication)
 * @returns The signature bytes
 */
export async function signPayloadHashWithBackend(
  apiEndpoint: string,
  payloadHash: `0x${string}`,
  oracleAddress: Address
): Promise<`0x${string}`> {
  const response = await fetch(`${apiEndpoint}/oracle/sign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      payloadHash,
      oracleAddress,
    }),
  });

  if (!response.ok) {
    throw new Error(`Backend signing failed: ${response.statusText}`);
  }

  const { signature } = await response.json();
  return signature as `0x${string}`;
}

