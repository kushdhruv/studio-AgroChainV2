

export type Role = 'Farmer' | 'Transporter' | 'Industry' | 'Government' | 'Admin' | 'Oracle';

export const ROLES: Role[] = ['Farmer', 'Transporter', 'Industry', 'Government', 'Admin', 'Oracle'];

export interface User {
  // Basic Info
  uid: string;
  role: Role;
  name: string;
  email: string;
  mobile?: string;
  avatarUrl?: string;
  walletAddress?: string;

  // KYC and Verification
  kycVerified: boolean;
  details: Partial<FarmerDetails> & Partial<TransporterDetails> & Partial<IndustryDetails> & Partial<GovernmentDetails>;
  // metadataHash?: string; // removed to avoid exposing IPFS hash publicly

  // Volatile property used only for the approval flow
  approvalId?: string;
}

// This is the type for users awaiting KYC approval.
export interface PendingApproval {
    id: string; // The document ID from Firestore, added by useCollection
    userId: string; // The UID of the user
    name: string;
    email: string;
    role: Role;
    walletAddress?: string; // The user's wallet address
    submittedAt: any; // Should be a Firestore Timestamp
    details: any; // The details submitted for KYC
  }

// Specific detail types for user roles
export interface FarmerDetails {
  aadhaarEncrypted?: string;
  farm?: {
    location?: {
      state?: string;
      district?: string;
      village?: string;
      pincode?: string;
      gpsCoordinates?: string;
    };
    land?: {
      totalAreaAcres?: number;
      ownershipType?: 'Owned' | 'Leased' | 'Sharecropping';
    };
  };
  crops?: {
    primaryCrops?: string[];
    croppingSeason?: 'Kharif' | 'Rabi' | 'Zaid';
  };
  waste?: {
    wasteTypes?: string[];
    avgQuantityPerSeasonTonnes?: number;
    currentDisposalMethod?: string;
  };
  licenseCid?: string; // IPFS CID of uploaded license/certificate
}

export interface TransporterDetails {
  aadhaarEncrypted?: string;
  licenseNumber?: string;
  vehicle?: {
    registrationNumber?: string;
    vehicleType?: 'Truck' | 'Tractor' | 'Other';
    capacityTonnes?: number;
  };
  employment?: {
    transportCompanyName?: string;
    serviceAreas?: string[];
    ratePerKm?: number;
  };
  licenseCid?: string; // IPFS CID of uploaded driving license
}

export interface IndustryDetails {
  companyType?: 'Private' | 'Public' | 'Cooperative' | 'FPO';
  incorporationNumber?: string;
  gstNumber?: string;
  operations?: {
    processingCapacityTonnesPerDay?: number;
    wasteRequirements?: {
      wasteTypes?: string[];
      monthlyRequirementTonnes?: number;
    };
  };
  licenseCid?: string; // IPFS CID of uploaded company registration certificate
}

export interface GovernmentDetails {
  authorityType?: 'District' | 'Central' | 'State' | 'Block';
  department?: string;
  jurisdictionArea?: string;
}

// Shipment related types
export type ShipmentStatus = 
  | 'Pending' 
  | 'OfferMade'
  | 'AwaitingPayment'
  | 'ReadyForPickup'
  | 'In-Transit' 
  | 'Claimed'
  | 'Delivered' 
  | 'Verified'
  | 'Cancelled' 
  | 'Disputed';

export interface TimelineEvent {
  status: ShipmentStatus | 'Pending';
  timestamp: string; // Should be an ISO 8601 string
  details: string;
}

export interface LocationPoint {
    lat: number;
    lng: number;
    timestamp: string; // ISO 8601
}

export interface Weighment {
    weight: number;
    timestamp: string; // ISO 8601
    oracle: string; // Oracle's address
}
  
export interface WeighmentProposal {
    id: string; // Firestore document ID
    shipmentId: string;
    shipmentContent: string;
    shipmentOrigin: string;
    shipmentDestination?: string;
    proposedWeight: number;
    proposerAddress: string; // Transporter's address
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string; // ISO 8601
    txHash?: string;
}

export interface Shipment {
  id: string; // Firestore document ID
  shipmentIdOnChain: string; // bytes32 ID on the smart contract
  farmerId: string; // UID of the farmer
  farmerName: string;
  content: string;
  quantity: string;
  origin: string;
  destination?: string;
  status: ShipmentStatus;
  askPrice: number;
  transporterId?: string; // UID of the transporter, or just address
  industryId?: string; // UID of the industry
  imageUrl: string;
  imageHint: string;
  timeline: TimelineEvent[];
  weighments?: Weighment[];
  locationHistory?: LocationPoint[];
  // Optional timestamps set via updateFirestoreStatus extraData
  claimedAt?: string;
  releasedAt?: string;
}

export type DisputeStatus = 'Open' | 'Resolved' | 'Rejected';

export interface Evidence {
  submitterId: string;
  evidenceHash: string;
  timestamp: string;
}

export interface Dispute {
    id: string; // Firestore document ID
    disputeIdOnChain: number;
    shipmentId: string; // Firestore shipment ID
    shipmentIdOnChain: string; // bytes32 shipment ID
    raiserId: string; // UID of the user who raised it
    raiserWallet: string;
    reason: string;
    status: DisputeStatus;
    evidence: Evidence[];
    resolution?: 'REFUND_PAYER' | 'RELEASE_FUNDS';
    resolutionNote?: string;
}
