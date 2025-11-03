
export const RegistrationABI = [
  {
    "type": "enum",
    "name": "Role",
    "values": ["UNREGISTERED", "FARMER", "TRANSPORTER", "INDUSTRY", "GOVT_AUTHORITY", "ADMIN", "ORACLE"]
  },
  {
    "type": "enum",
    "name": "KYCStatus",
    "values": ["NONE", "PENDING", "VERIFIED", "SUSPENDED", "REVOKED"]
  },
  {
    "type": "function",
    "name": "addKYCSigner",
    "inputs": [{ "name": "_signer", "type": "address" }],
    "outputs": [],
    "stateMutability": "nonpayable",
    "note": "Can only be called by contract owner"
  },
  {
    "type": "function",
    "name": "registerTrustedParticipant",
    "inputs": [
      { "name": "_addr", "type": "address" },
      { "name": "_role", "type": "uint8" },
      { "name": "_metaDataHash", "type": "string" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable",
    "note": "Owner only. For registering ORACLE, ADMIN, GOVT_AUTHORITY roles with VERIFIED status"
  },
  {
    "type": "function",
    "name": "registerParticipant",
    "inputs": [
      { "name": "_role", "type": "uint8" },
      { "name": "_metaDataHash", "type": "string" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable",
    "note": "Public function for self-registration of FARMER, TRANSPORTER, INDUSTRY roles with PENDING status"
  },
  {
    "type": "function",
    "name": "getParticipant",
    "inputs": [{ "name": "_addr", "type": "address" }],
    "outputs": [
      { "name": "role", "type": "uint8" },
      { "name": "kyc", "type": "uint8" },
      { "name": "metadataHash", "type": "string" },
      { "name": "createdAt", "type": "uint256" },
      { "name": "updatedAt", "type": "uint256" },
      { "name": "active", "type": "bool" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isKycVerified",
    "inputs": [{ "name": "_account", "type": "address" }],
    "outputs": [{ "type": "bool" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "kycAttestation",
    "inputs": [{
      "name": "params",
      "type": "tuple",
      "components": [
        { "name": "participant", "type": "address" },
        { "name": "role", "type": "uint8" },
        { "name": "metaDataHash", "type": "string" },
        { "name": "timestamp", "type": "uint256" },
        { "name": "nonce", "type": "uint256" },
        { "name": "signature", "type": "bytes" }
      ]
    }],
    "outputs": [],
    "stateMutability": "nonpayable",
    "note": "Can only be called by accounts with ORACLE role"
  },
  {
    "type": "function",
    "name": "updateMetaData",
    "inputs": [
      { "name": "_metaDataHash", "type": "string" },
      { "name": "isCritical", "type": "bool" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable",
    "note": "Can be called by any active participant, critical updates will set KYC to PENDING"
  },
  {
    "type": "event",
    "name": "ParticipantRegistered",
    "inputs": [
      { "name": "account", "type": "address", "indexed": true },
      { "name": "role", "type": "uint8", "indexed": false }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "KycStatusUpdated",
    "inputs": [
      { "name": "account", "type": "address", "indexed": true },
      { "name": "verified", "type": "bool", "indexed": false },
      { "name": "timestamp", "type": "uint256", "indexed": false}
    ],
    "anonymous": false
  }
];
