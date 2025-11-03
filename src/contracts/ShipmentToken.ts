export const ShipmentTokenABI = [
  {
    "type": "function",
    "name": "ROLE_FARMER",
    "inputs": [],
    "outputs": [{ "type": "uint8" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "ROLE_TRANSPORTER",
    "inputs": [],
    "outputs": [{ "type": "uint8" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "ROLE_INDUSTRY",
    "inputs": [],
    "outputs": [{ "type": "uint8" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "createShipment",
    "inputs": [
      { "name": "_shipmentId", "type": "bytes32" },
      { "name": "_metaDataHash", "type": "string" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable",
    "note": "Can only be called by KYC verified farmers"
  },
  {
    "type": "function",
    "name": "assignTransporter",
    "inputs": [
      { "name": "_shipmentId", "type": "bytes32" },
      { "name": "_transporter", "type": "address" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setIndustry",
    "inputs": [
      { "name": "_shipmentId", "type": "bytes32" },
      { "name": "_industry", "type": "address" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "updateShipmentState",
    "inputs": [
      {
        "name": "input",
        "type": "tuple",
        "components": [
          { "name": "shipmentId", "type": "bytes32" },
          { "name": "newState", "type": "uint8" },
          { "name": "timestamp", "type": "uint256" },
          { "name": "nonce", "type": "uint256" },
          { "name": "signature", "type": "bytes" }
        ]
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "approve",
    "inputs": [
      { "name": "to", "type": "address" },
      { "name": "tokenId", "type": "uint256" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getWeighments",
    "inputs": [{ "name": "_shipmentId", "type": "bytes32" }],
    "outputs": [
      {
        "type": "tuple[]",
        "components": [
          { "name": "weighKg", "type": "uint256" },
          { "name": "weighHash", "type": "string" },
          { "name": "oracle", "type": "address" },
          { "name": "timestamp", "type": "uint256" }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getShipment",
    "inputs": [{ "name": "_shipmentId", "type": "bytes32" }],
    "outputs": [
      {
        "type": "tuple",
        "components": [
          { "name": "shipmentId", "type": "bytes32" },
          { "name": "tokenId", "type": "uint256" },
          { "name": "metaDataHash", "type": "string" },
          { "name": "state", "type": "uint8" },
          { "name": "transporter", "type": "address" },
          { "name": "farmer", "type": "address" },
          { "name": "industry", "type": "address" },
          { "name": "proofHash", "type": "string[]" },
          { "name": "createdAt", "type": "uint256" },
          { "name": "updatedAt", "type": "uint256" }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getFarmerShipments",
    "inputs": [{ "name": "farmer", "type": "address" }],
    "outputs": [{ "name": "", "type": "bytes32[]" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getTransporterShipments",
    "inputs": [{ "name": "transporter", "type": "address" }],
    "outputs": [{ "name": "", "type": "bytes32[]" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getIndustryShipments",
    "inputs": [{ "name": "industry", "type": "address" }],
    "outputs": [{ "name": "", "type": "bytes32[]" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getWeighmentCount",
    "inputs": [{ "name": "_shipmentId", "type": "bytes32" }],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getWeighments",
    "inputs": [{ "name": "_shipmentId", "type": "bytes32" }],
    "outputs": [
      {
        "type": "tuple[]",
        "components": [
          { "name": "weighKg", "type": "uint256" },
          { "name": "weighHash", "type": "string" },
          { "name": "oracle", "type": "address" },
          { "name": "timestamp", "type": "uint256" },
          { "name": "nonce", "type": "uint256" }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getLastWeighment",
    "inputs": [{ "name": "_shipmentId", "type": "bytes32" }],
    "outputs": [
      {
        "type": "tuple",
        "components": [
          { "name": "weighKg", "type": "uint256" },
          { "name": "weighHash", "type": "string" },
          { "name": "oracle", "type": "address" },
          { "name": "timestamp", "type": "uint256" },
          { "name": "nonce", "type": "uint256" }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isShipmentVerified",
    "inputs": [{ "name": "_shipmentId", "type": "bytes32" }],
    "outputs": [{ "name": "", "type": "bool" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "attachProof",
    "inputs": [
      {
        "name": "input",
        "type": "tuple",
        "components": [
          { "name": "shipmentId", "type": "bytes32" },
          { "name": "proofType", "type": "uint8" },
          { "name": "proofHash", "type": "string" },
          { "name": "timestamp", "type": "uint256" },
          { "name": "nonce", "type": "uint256" },
          { "name": "signature", "type": "bytes" }
        ]
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable",
    "note": "Can only be called by registered oracles"
  },
  {
    "type": "function",
    "name": "attachWeighment",
    "inputs": [
      {
        "name": "input",
        "type": "tuple",
        "components": [
          { "name": "shipmentId", "type": "bytes32" },
          { "name": "weighKg", "type": "uint256" },
          { "name": "weighHash", "type": "string" },
          { "name": "timestamp", "type": "uint256" },
          { "name": "nonce", "type": "uint256" },
          { "name": "signature", "type": "bytes" }
        ]
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable",
    "note": "Can only be called by registered oracles"
  },
  {
    "type": "function",
    "name": "setIndustry",
    "inputs": [
      { "name": "_shipmentId", "type": "bytes32" },
      { "name": "_industry", "type": "address" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable",
    "note": "Can be called by farmer, requires industry to be KYC verified and have INDUSTRY role"
  },
  {
    "type": "function",
    "name": "assignTransporter",
    "inputs": [
      { "name": "_shipmentId", "type": "bytes32" },
      { "name": "_transporter", "type": "address" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable",
    "note": "Can be called by farmer/industry/admin, requires transporter to be KYC verified and have TRANSPORTER role"
  },
  {
    "type": "event",
    "name": "ShipmentCreated",
    "inputs": [
      { "name": "shipmentId", "type": "bytes32", "indexed": true },
      { "name": "creator", "type": "address", "indexed": true }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ProofAttached",
    "inputs": [
      { "name": "shipmentId", "type": "bytes32", "indexed": true },
      { "name": "proofHash", "type": "string", "indexed": false }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "TransporterAssigned",
    "inputs": [
      { "name": "shipmentId", "type": "bytes32", "indexed": true },
      { "name": "transporter", "type": "address", "indexed": true },
      { "name": "assignedBy", "type": "address", "indexed": true },
      { "name": "timestamp", "type": "uint256", "indexed": false }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ShipmentStateChanged",
    "inputs": [
      { "name": "shipmentId", "type": "bytes32", "indexed": true },
      { "name": "newState", "type": "uint8", "indexed": false },
      { "name": "timestamp", "type": "uint256", "indexed": false }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Transfer",
    "inputs": [
      { "name": "from", "type": "address", "indexed": true },
      { "name": "to", "type": "address", "indexed": true },
      { "name": "tokenId", "type": "uint256", "indexed": true }
    ],
    "anonymous": false
  }
];
