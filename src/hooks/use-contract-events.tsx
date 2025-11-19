/**
 * Custom hooks for listening to blockchain contract events
 * and automatically syncing with Firestore
 */

import { useEffect } from 'react';
import { useWatchContractEvent } from 'wagmi';
import { useFirestore } from '@/firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { contractAddresses } from '@/contracts/addresses';
import { ShipmentTokenABI } from '@/contracts/ShipmentToken';
import { EscrowPaymentABI } from '@/contracts/EscrowPayment';
import { DisputeManagerABI } from '@/contracts/DisputeManager';
import { useToast } from '@/hooks/use-toast';

/**
 * Listen for ShipmentCreated events and update Firestore
 */
export function useShipmentCreatedEvent() {
  const firestore = useFirestore();
  const { toast } = useToast();

  useWatchContractEvent({
    address: contractAddresses.ShipmentToken,
    abi: ShipmentTokenABI,
    eventName: 'ShipmentCreated',
    onLogs(logs) {
      logs.forEach((log) => {
        const { shipmentId, farmer, tokenId, metaDataHash, timestamp } = (log as any).args;
        if (shipmentId && farmer) {
          // ✅ FIXED: Use shipmentId (bytes32) as document key, not tokenId
          // This ensures consistent mapping between on-chain IDs and Firestore documents
          const firestoreDocId = shipmentId.slice(0, 20);  // Use first 20 chars of shipmentId as doc ID
          const shipmentRef = doc(firestore, 'shipments', firestoreDocId);
          
          updateDoc(shipmentRef, {
            status: 'Pending',
            timeline: [{
              status: 'Pending',
              timestamp: new Date(Number(timestamp) * 1000).toISOString(),
              details: 'Shipment created on-chain',
            }],
          }).catch((error) => {
            if (error.code === 'not-found') {
              // Document doesn't exist yet, create it
              return setDoc(shipmentRef, {
                shipmentIdOnChain: shipmentId,
                tokenIdOnChain: tokenId?.toString(),
                farmerWallet: farmer,
                status: 'Pending',
                timeline: [{
                  status: 'Pending',
                  timestamp: new Date(Number(timestamp) * 1000).toISOString(),
                  details: 'Shipment created on-chain',
                }],
              });
            }
            console.error('Failed to update Firestore with ShipmentCreated event:', error);
          });
        }
      });
    },
  });
}

/**
 * Listen for ShipmentStateChanged events and update Firestore
 */
export function useShipmentStateChangedEvent() {
  const firestore = useFirestore();
  const { toast } = useToast();

  useWatchContractEvent({
    address: contractAddresses.ShipmentToken,
    abi: ShipmentTokenABI,
    eventName: 'ShipmentStateChanged',
    onLogs(logs) {
      logs.forEach((log) => {
        const { shipmentId, newState, timestamp } = (log as any).args;
        if (shipmentId && newState !== undefined) {
          // Map contract state to frontend status
          const stateMap: Record<number, string> = {
            0: 'Pending', // OPEN
            1: 'ReadyForPickup', // ASSIGNED
            2: 'In-Transit', // IN_TRANSIT
            3: 'Delivered', // DELIVERED
            4: 'Delivered', // VERIFIED
            5: 'Delivered', // PAID
            6: 'Disputed', // DISPUTED
            7: 'Cancelled', // CANCELLED
          };

          const newStatus = stateMap[Number(newState)] || 'Pending';
          
          // ✅ FIXED: Use consistent document ID (first 20 chars of shipmentId)
          const firestoreDocId = shipmentId.slice(0, 20);
          const shipmentRef = doc(firestore, 'shipments', firestoreDocId);
          
          updateDoc(shipmentRef, {
            status: newStatus,
            timeline: [{
              status: newStatus,
              timestamp: new Date(Number(timestamp) * 1000).toISOString(),
              details: `Shipment state changed to ${newStatus} on-chain`,
            }],
          }).catch((error) => {
            console.error('Failed to update Firestore with ShipmentStateChanged event:', error);
          });
        }
      });
    },
  });
}

/**
 * Listen for PaymentDeposited events
 */
export function usePaymentDepositedEvent() {
  const firestore = useFirestore();
  const { toast } = useToast();

  useWatchContractEvent({
    address: contractAddresses.EscrowPayment,
    abi: EscrowPaymentABI,
    eventName: 'PaymentDeposited',
    onLogs(logs) {
      logs.forEach((log) => {
        const { shipmentId, payer, token, amount, farmer, transporter, farmerBps, transporterBps, platformBps, timestamp } = (log as any).args;
        if (shipmentId) {
          // ✅ FIXED: Use consistent document ID (first 20 chars of shipmentId)
          const firestoreDocId = shipmentId.slice(0, 20);
          const shipmentRef = doc(firestore, 'shipments', firestoreDocId);
          
          updateDoc(shipmentRef, {
            status: 'AwaitingPayment',
            payment: {
              payer,
              token,
              amount: amount?.toString(),
              farmer,
              transporter,
              farmerBps,
              transporterBps,
              platformBps,
              depositedAt: new Date(Number(timestamp) * 1000).toISOString(),
            },
            timeline: [{
              status: 'AwaitingPayment',
              timestamp: new Date(Number(timestamp) * 1000).toISOString(),
              details: `Payment of ${amount?.toString()} tokens deposited by ${payer}`,
            }],
          }).catch((error) => {
            console.error('Failed to update Firestore with PaymentDeposited event:', error);
          });
        }
      });
    },
  });
}

/**
 * Listen for DisputeRaised events
 */
export function useDisputeRaisedEvent() {
  const firestore = useFirestore();
  const { toast } = useToast();

  useWatchContractEvent({
    address: contractAddresses.DisputeManager,
    abi: DisputeManagerABI,
    eventName: 'DisputeRaised',
    onLogs(logs) {
      logs.forEach((log) => {
        const { disputeId, shipmentId, raisedBy, timestamp } = (log as any).args;
        if (disputeId && shipmentId && raisedBy) {
          // Update shipment status to Disputed
          const shipmentRef = doc(firestore, 'shipments', shipmentId.toString().slice(0, 20));
          
          updateDoc(shipmentRef, {
            status: 'Disputed',
            timeline: [
              {
                status: 'Disputed',
                timestamp: new Date(Number(timestamp) * 1000).toISOString(),
                details: `Dispute #${disputeId} raised by ${raisedBy}`,
              },
            ],
          }).catch((error) => {
            console.error('Failed to update Firestore with DisputeRaised event:', error);
          });

          // Create or update dispute document
          const disputeRef = doc(firestore, 'disputes', disputeId.toString());
          
          setDoc(disputeRef, {
            disputeIdOnChain: Number(disputeId),
            shipmentIdOnChain: shipmentId.toString(),
            raiserWallet: raisedBy.toString(),
            status: 'Open',
            createdAt: new Date(Number(timestamp) * 1000).toISOString(),
          }, { merge: true }).catch((error) => {
            console.error('Failed to create dispute document in Firestore:', error);
          });
        }
      });
    },
  });
}

/**
 * Combined hook that listens to all relevant contract events
 * Use this in your main layout or app component
 */
export function useContractEvents() {
  useShipmentCreatedEvent();
  useShipmentStateChangedEvent();
  usePaymentDepositedEvent();
  useDisputeRaisedEvent();
}
