import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { contractAddresses } from '@/contracts/addresses';
import { ShipmentTokenABI } from '@/contracts/ShipmentToken';

/**
 * Oracle Backend Service - Updates Shipment State to PAID after Escrow Deposit
 * 
 * This endpoint listens for escrow payments and updates the shipment state
 * on the blockchain from VERIFIED to PAID status.
 * 
 * Requirements:
 * - ORACLE_PRIVATE_KEY: Private key of the oracle account
 * - RPC_URL: Anvil/blockchain RPC URL
 * 
 * Flow:
 * 1. Frontend detects escrow deposit
 * 2. Frontend calls this API to trigger state update
 * 3. Backend signs the updateShipmentState transaction with oracle key
 * 4. Transaction is broadcast to blockchain
 * 5. Shipment state changes from VERIFIED (4) to PAID (5)
 */

// Get environment variables
const ORACLE_PRIVATE_KEY = process.env.ORACLE_PRIVATE_KEY;
const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8545';

if (!ORACLE_PRIVATE_KEY) {
  console.warn('⚠️ ORACLE_PRIVATE_KEY not set in environment variables');
}

// Initialize ethers provider and signer
const provider = new ethers.JsonRpcProvider(RPC_URL);
const oracleSigner = ORACLE_PRIVATE_KEY ? new ethers.Wallet(ORACLE_PRIVATE_KEY, provider) : null;

interface UpdateShipmentStateRequest {
  shipmentId: `0x${string}`;
  fromState?: number; // Optional: verify old state before update
  toState: number; // 5 for PAID
  timestamp?: number;
  nonce?: number;
}

interface UpdateShipmentStateResponse {
  success: boolean;
  message: string;
  transactionHash?: string;
  blockNumber?: number;
  error?: string;
}

/**
 * POST /api/oracle/update-shipment-state
 * 
 * Updates shipment state on the blockchain after escrow payment
 * 
 * Request Body:
 * {
 *   "shipmentId": "0x...",
 *   "toState": 5,  // PAID
 *   "timestamp": 1234567890,  // optional
 *   "nonce": 123  // optional
 * }
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<UpdateShipmentStateResponse>> {
  try {
    // Check if oracle signer is configured
    if (!oracleSigner) {
      return NextResponse.json(
        {
          success: false,
          message: 'Oracle service not configured',
          error: 'ORACLE_PRIVATE_KEY environment variable not set',
        },
        { status: 500 }
      );
    }

    // Parse request body
    const body: UpdateShipmentStateRequest = await request.json();
    const { shipmentId, toState, timestamp, nonce } = body;

    // Validation
    if (!shipmentId || !shipmentId.match(/^0x[a-fA-F0-9]{64}$/)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid shipmentId format',
          error: 'shipmentId must be a valid bytes32 hex string',
        },
        { status: 400 }
      );
    }

    if (toState !== 5) {
      return NextResponse.json(
        {
          success: false,
          message: 'Only PAID (5) state updates are supported via this endpoint',
          error: `Requested state: ${toState}`,
        },
        { status: 400 }
      );
    }

    // Create ShipmentToken contract instance
    const shipmentToken = new ethers.Contract(
      contractAddresses.ShipmentToken,
      ShipmentTokenABI,
      oracleSigner
    );

    // Prepare state update parameters
    const currentTimestamp = timestamp || Math.floor(Date.now() / 1000);
    const currentNonce = nonce || Date.now();

    // Create the hash that will be signed (matching contract's updateShipmentState function)
    const stateInput = {
      shipmentId: shipmentId,
      newState: toState, // 5 = PAID
      timestamp: currentTimestamp,
      nonce: currentNonce,
      signature: '0x', // Placeholder, will be replaced
    };

    // Calculate the hash to sign
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const payloadHash = ethers.solidityPackedKeccak256(
      ['uint256', 'bytes32', 'uint8', 'uint256', 'uint256'],
      [
        (await provider.getNetwork()).chainId,
        shipmentId,
        toState,
        currentTimestamp,
        currentNonce,
      ]
    );

    // Sign the hash with oracle private key
    const messageHash = ethers.hashMessage(ethers.getBytes(payloadHash));
    const signature = await oracleSigner.signMessage(ethers.getBytes(payloadHash));

    console.log('🔐 Oracle Signature Created:', {
      shipmentId,
      fromState: 4, // VERIFIED
      toState,
      timestamp: currentTimestamp,
      nonce: currentNonce,
      signature,
      signerAddress: oracleSigner.address,
    });

    // Call the contract's updateShipmentState function
    const tx = await shipmentToken.updateShipmentState({
      shipmentId: shipmentId,
      newState: toState,
      timestamp: currentTimestamp,
      nonce: currentNonce,
      signature: signature,
    });

    // Wait for transaction to be mined
    const receipt = await tx.wait();

    console.log('✅ Shipment State Updated:', {
      transactionHash: receipt?.hash,
      blockNumber: receipt?.blockNumber,
      gasUsed: receipt?.gasUsed.toString(),
    });

    return NextResponse.json(
      {
        success: true,
        message: `Shipment state updated to PAID (5) on-chain`,
        transactionHash: receipt?.hash,
        blockNumber: receipt?.blockNumber,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('❌ Error updating shipment state:', error);

    // Check for specific contract errors
    let errorMessage = error.message || 'Unknown error';

    if (error.reason) {
      errorMessage = error.reason; // Ethers specific error
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to update shipment state on-chain',
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/oracle/update-shipment-state
 * Health check - verify oracle service is running
 */
export async function GET(): Promise<NextResponse> {
  try {
    const isConfigured = !!oracleSigner;
    const network = isConfigured ? await provider.getNetwork() : null;
    const oracleAddress = oracleSigner?.address || 'NOT_CONFIGURED';

    return NextResponse.json(
      {
        status: 'ok',
        service: 'Oracle Shipment State Update Service',
        configured: isConfigured,
        network: {
          name: network?.name,
          chainId: network?.chainId,
          rpcUrl: RPC_URL,
        },
        oracle: {
          address: oracleAddress,
          ready: isConfigured,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'error',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
