
export const DisputeManagerABI = [
  {
    "type": "enum",
    "name": "DisputeStatus",
    "values": ["NONE", "OPEN", "RESOLVED", "REJECTED"]
  },
  {
    "type": "enum",
    "name": "Resolution",
    "values": ["NONE", "REFUND_PAYER", "RELEASE_FUNDS"]
  },
  {
    "type": "function",
    "name": "setResolver",
    "inputs": [
      { "name": "_resolver", "type": "address" },
      { "name": "_authorized", "type": "bool" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable",
    "note": "Can only be called by contract owner"
  },
  {
    "type": "function",
    "name": "raiseDispute",
    "inputs": [
      { "name": "_shipmentId", "type": "bytes32" },
      { "name": "_evidenceHash", "type": "string" }
    ],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "note": "Can only be called by KYC verified participants"
  },
  {
    "type": "function",
    "name": "addEvidence",
    "inputs": [
      { "name": "_disputeId", "type": "uint256" },
      { "name": "_evidenceHash", "type": "string" },
      { "name": "_oracleSignature", "type": "bytes" },
      { "name": "_oracleSignedHash", "type": "bytes32" }
    ],
    "outputs": [{ "type": "bool" }],
    "stateMutability": "nonpayable",
    "note": "Can only be called by KYC verified participants"
  },
  {
    "type": "function",
    "name": "resolveDispute",
    "inputs": [
      { "name": "_disputeId", "type": "uint256" },
      { "name": "_resolution", "type": "uint8" },
      { "name": "_resolutionNote", "type": "string" }
    ],
    "outputs": [{ "type": "bool" }],
    "stateMutability": "nonpayable",
    "note": "Can only be called by authorized resolvers"
  },
  {
    "type": "function",
    "name": "getDispute",
    "inputs": [{ "name": "_disputeId", "type": "uint256" }],
    "outputs": [
      {
        "type": "tuple",
        "components": [
          { "name": "disputeId", "type": "uint256" },
          { "name": "shipmentId", "type": "bytes32" },
          { "name": "raisedBy", "type": "address" },
          { "name": "status", "type": "uint8" },
          { "name": "resolution", "type": "uint8" },
          { "name": "resolutionNote", "type": "string" },
          { "name": "resolvedBy", "type": "address" },
          { "name": "createdAt", "type": "uint256" },
          { "name": "resolvedAt", "type": "uint256" }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getEvidenceCount",
    "inputs": [{ "name": "_disputeId", "type": "uint256" }],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getEvidenceAtIndex",
    "inputs": [
      { "name": "_disputeId", "type": "uint256" },
      { "name": "index", "type": "uint256" }
    ],
    "outputs": [
      {
        "type": "tuple",
        "components": [
          { "name": "evidenceHash", "type": "string" },
          { "name": "submittedBy", "type": "address" },
          { "name": "timestamp", "type": "uint256" },
          { "name": "oracle", "type": "address" }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "openDisputeForShipment",
    "inputs": [{ "name": "", "type": "bytes32" }],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "DisputeRaised",
    "inputs": [
      { "name": "disputeId", "type": "uint256", "indexed": true },
      { "name": "shipmentId", "type": "bytes32", "indexed": true },
      { "name": "raisedBy", "type": "address", "indexed": true }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "EvidenceAdded",
    "inputs": [
      { "name": "disputeId", "type": "uint256", "indexed": true },
      { "name": "evidenceHash", "type": "string", "indexed": false },
      { "name": "submittedBy", "type": "address", "indexed": true }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "DisputeResolved",
    "inputs": [
      { "name": "disputeId", "type": "uint256", "indexed": true },
      { "name": "resolution", "type": "uint8", "indexed": false },
      { "name": "resolvedBy", "type": "address", "indexed": true }
    ],
    "anonymous": false
  }
] as const;
