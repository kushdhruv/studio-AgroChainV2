
import type { User, Shipment, ShipmentStatus, Role } from './types';

// This data is no longer used for users.
// User data is managed in Firestore.
export const MOCK_USERS: User[] = [];

// This data is no longer used for shipments.
// Shipment data is managed in Firestore.
export const MOCK_SHIPMENTS: Shipment[] = [];

// This data is no longer used for approvals.
// Approval data is managed in Firestore.
export const PENDING_APPROVALS: { id: string, name: string, role: Role, date: string }[] = [];
