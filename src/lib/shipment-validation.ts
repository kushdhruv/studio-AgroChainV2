'use client';

/**
 * Shipment ID Validation Utilities
 * 
 * Enforces canonical representation of shipmentId as 0x-prefixed 32-byte hex (bytes32).
 * This prevents subtle bugs where non-canonical IDs could produce unexpected tokenId values
 * or fail during on-chain calls.
 */

/**
 * Validates that a shipmentId is a proper 0x-prefixed 32-byte hex string.
 * @param shipmentId - The ID to validate
 * @returns true if valid, false otherwise
 */
export function isValidShipmentId(shipmentId: unknown): shipmentId is `0x${string}` {
  if (typeof shipmentId !== 'string') {
    return false;
  }
  // Must start with 0x and have exactly 64 hex chars (32 bytes)
  return /^0x[a-fA-F0-9]{64}$/.test(shipmentId);
}

/**
 * Ensures a shipmentId is valid; throws a descriptive error if not.
 * Use this in frontend code before calling contract functions.
 * 
 * @param shipmentId - The ID to validate
 * @param context - Optional context for error message (e.g., function name)
 * @throws Error if shipmentId is invalid
 * @returns the shipmentId if valid
 */
export function validateShipmentId(
  shipmentId: unknown,
  context?: string
): `0x${string}` {
  if (!isValidShipmentId(shipmentId)) {
    const contextStr = context ? ` in ${context}` : '';
    throw new Error(
      `Invalid shipmentId${contextStr}. Expected 0x-prefixed 32-byte hex string (0x + 64 hex chars), got: ${
        typeof shipmentId === 'string' ? `"${shipmentId}"` : `${typeof shipmentId}`
      }`
    );
  }
  return shipmentId;
}

/**
 * Helper to convert a shipment identifier string (e.g., UUID or short ID) to a canonical bytes32.
 * Uses keccak256 to ensure deterministic 32-byte representation.
 * 
 * Example:
 *   const shipmentId = canonicalizeShipmentId('shipment-uuid-12345');
 *   // Result: 0x1234abcd... (keccak256 hash)
 * 
 * @param identifier - A string identifier (UUID, name, etc.)
 * @returns 0x-prefixed 32-byte hex string
 */
export function canonicalizeShipmentId(identifier: string): `0x${string}` {
  // If already a valid shipmentId, return as-is
  if (isValidShipmentId(identifier)) {
    return identifier;
  }
  
  // Otherwise, hash the identifier to produce a canonical bytes32
  // Note: This requires viem to be imported; adjust import if not available
  const { keccak256, toBytes } = require('viem');
  const hash = keccak256(toBytes(identifier));
  return hash as `0x${string}`;
}
