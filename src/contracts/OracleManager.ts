export const OracleManagerABI = [
  {
    "type": "function",
    "name": "ADMIN_ROLE",
    "inputs": [],
    "outputs": [{ "type": "uint8" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "addOracle",
    "inputs": [
      { "name": "_oracleAddress", "type": "address" },
      { "name": "_metaDataHash", "type": "string" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable",
    "note": "Can only be called by owner or admin role"
  },
  {
    "type": "function",
    "name": "removeOracle",
    "inputs": [{ "name": "_oracleAddress", "type": "address" }],
    "outputs": [],
    "stateMutability": "nonpayable",
    "note": "Can only be called by owner or admin role"
  },
  {
    "type": "function",
    "name": "inactivateOracle",
    "inputs": [{ "name": "_oracleAddress", "type": "address" }],
    "outputs": [],
    "stateMutability": "nonpayable",
    "note": "Can only be called by owner or admin role"
  },
  {
    "type": "function",
    "name": "activateOracle",
    "inputs": [{ "name": "_oracleAddress", "type": "address" }],
    "outputs": [],
    "stateMutability": "nonpayable",
    "note": "Can only be called by owner or admin role"
  },
  {
    "type": "function",
    "name": "verifySignedPayload",
    "inputs": [
      { "name": "payload", "type": "bytes" },
      { "name": "signature", "type": "bytes" }
    ],
    "outputs": [
      { "name": "isValid", "type": "bool" },
      { "name": "signer", "type": "address" }
    ],
    "stateMutability": "view",
    "note": "Can be called by anyone to verify oracle signatures"
  },
  {
    "type": "function",
    "name": "getOracle",
    "inputs": [{ "name": "_oracleAddress", "type": "address" }],
    "outputs": [
      {
        "type": "tuple",
        "components": [
          { "name": "metaDataHash", "type": "string" },
          { "name": "createdAt", "type": "uint256" },
          { "name": "active", "type": "bool" }
        ]
      },
      { "name": "", "type": "address" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isOracle",
    "inputs": [{ "name": "_oracleAddress", "type": "address" }],
    "outputs": [{ "name": "", "type": "bool" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "oracleCount",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "oracleAtIndex",
    "inputs": [{ "name": "index", "type": "uint256" }],
    "outputs": [{ "name": "", "type": "address" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "updateOracle",
    "inputs": [
      { "name": "_oracleAddress", "type": "address" },
      { "name": "_newMetaDataHash", "type": "string" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable",
    "note": "Can only be called by owner or admin role"
  },
  {
    "type": "function",
    "name": "setRegistrationContract",
    "inputs": [{ "name": "_registration", "type": "address" }],
    "outputs": [],
    "stateMutability": "nonpayable",
    "note": "Can only be called by owner or admin role"
  },
  {
    "type": "function",
    "name": "verifySignedHash",
    "inputs": [
      { "name": "hash", "type": "bytes32" },
      { "name": "signature", "type": "bytes" }
    ],
    "outputs": [
      { "name": "", "type": "bool" },
      { "name": "", "type": "address" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "RegistrationContractUpdated",
    "inputs": [
      { "name": "oldAddress", "type": "address", "indexed": true },
      { "name": "newAddress", "type": "address", "indexed": true },
      { "name": "timestamp", "type": "uint256", "indexed": false }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "OracleAdded",
    "inputs": [
      { "name": "oracleAddress", "type": "address", "indexed": true },
      { "name": "metaDataHash", "type": "string", "indexed": false },
      { "name": "timestamp", "type": "uint256", "indexed": false }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "OracleUpdated",
    "inputs": [
      { "name": "oracleAddress", "type": "address", "indexed": true },
      { "name": "oldMetaDataHash", "type": "string", "indexed": false },
      { "name": "newMetaDataHash", "type": "string", "indexed": false },
      { "name": "timestamp", "type": "uint256", "indexed": false }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "OracleRemoved",
    "inputs": [
      { "name": "oracleAddress", "type": "address", "indexed": true },
      { "name": "timestamp", "type": "uint256", "indexed": false }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "OracleInactivate",
    "inputs": [
      { "name": "oracleAddress", "type": "address", "indexed": true },
      { "name": "timestamp", "type": "uint256", "indexed": false }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "OracleActivated",
    "inputs": [
      { "name": "oracleAddress", "type": "address", "indexed": true },
      { "name": "timestamp", "type": "uint256", "indexed": false }
    ],
    "anonymous": false
  }
] as const;
