
export const EscrowPaymentABI = [
  {
    "inputs": [
      { "name": "_platformReceiver", "type": "address" },
      { "name": "_shipmentToken", "type": "address" }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "type": "function",
    "name": "MAX_BPS",
    "inputs": [],
    "outputs": [{"type": "uint16"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "platformAddress",
    "inputs": [],
    "outputs": [{"type": "address"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "shipmentToken",
    "inputs": [],
    "outputs": [{"type": "address"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "cancellationPeriod",
    "inputs": [],
    "outputs": [{"type": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "setPlatformReceiver",
    "inputs": [
      { "name": "_receiver", "type": "address" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable",
    "note": "Can only be called by owner"
  },
  {
    "type": "function",
    "name": "setShipmentToken",
    "inputs": [
      { "name": "_shipmentToken", "type": "address" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable",
    "note": "Emergency function, can only be called by owner"
  },
  {
    "type": "function",
    "name": "setManager",
    "inputs": [
      { "name": "_manager", "type": "address" },
      { "name": "_authorized", "type": "bool" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable",
    "note": "Can only be called by owner"
  },
  {
    "type": "function",
    "name": "setCancellationPeriod",
    "inputs": [
      { "name": "_seconds", "type": "uint256" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable",
    "note": "Can only be called by owner"
  },
  {
    "type": "function",
    "name": "depositPayment",
    "inputs": [
      { "name": "_shipmentId", "type": "bytes32" },
      { "name": "_token", "type": "address" },
      { "name": "_amount", "type": "uint256" },
      { "name": "_farmer", "type": "address" },
      { "name": "_transporter", "type": "address" },
      { "name": "_farmerBps", "type": "uint16" },
      { "name": "_transporterBps", "type": "uint16" },
      { "name": "_platformBps", "type": "uint16" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable",
    "note": "Can be called by anyone (typically industry/payer)"
  },
  {
    "type": "function",
    "name": "holdPayment",
    "inputs": [{ "name": "_shipmentId", "type": "bytes32" }],
    "outputs": [],
    "stateMutability": "nonpayable",
    "note": "Only authorized manager can call this function"
  },
  {
    "type": "function",
    "name": "releasePayment",
    "inputs": [{ "name": "_shipmentId", "type": "bytes32" }],
    "outputs": [],
    "stateMutability": "nonpayable",
    "note": "Can be called by authorized manager or farmer after verification"
  },
  {
    "type": "function",
    "name": "refundPayment",
    "inputs": [{ "name": "_shipmentId", "type": "bytes32" }],
    "outputs": [],
    "stateMutability": "nonpayable",
    "note": "Only authorized manager can call this function"
  },
  {
    "type": "function",
    "name": "cancelByPayer",
    "inputs": [{ "name": "_shipmentId", "type": "bytes32" }],
    "outputs": [],
    "stateMutability": "nonpayable",
    "note": "Can only be called by the original payer within cancellation period"
  },
  {
    "type": "function",
    "name": "getEscrow",
    "inputs": [{ "name": "_shipmentId", "type": "bytes32" }],
    "outputs": [
      {
        "type": "tuple",
        "components": [
          { "name": "token", "type": "address" },
          { "name": "amount", "type": "uint256" },
          { "name": "payer", "type": "address" },
          { "name": "farmer", "type": "address" },
          { "name": "transporter", "type": "address" },
          { "name": "farmerBps", "type": "uint16" },
          { "name": "transporterBps", "type": "uint16" },
          { "name": "platformBps", "type": "uint16" },
          { "name": "status", "type": "uint8" },
          { "name": "createdAt", "type": "uint256" },
          { "name": "updatedAt", "type": "uint256" }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isAuthorizedManager",
    "inputs": [{ "name": "_addr", "type": "address" }],
    "outputs": [{ "type": "bool" }],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "PlatformReceiverUpdated",
    "inputs": [
      { "name": "oldAddress", "type": "address", "indexed": true },
      { "name": "newAddress", "type": "address", "indexed": true },
      { "name": "timestamp", "type": "uint256", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "ShipmentTokenUpdated",
    "inputs": [
      { "name": "oldAddress", "type": "address", "indexed": true },
      { "name": "newAddress", "type": "address", "indexed": true },
      { "name": "timestamp", "type": "uint256", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "ManagerUpdated",
    "inputs": [
      { "name": "manager", "type": "address", "indexed": true },
      { "name": "authorized", "type": "bool", "indexed": false },
      { "name": "timestamp", "type": "uint256", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "PaymentDeposited",
    "inputs": [
      { "name": "shipmentId", "type": "bytes32", "indexed": true },
      { "name": "payer", "type": "address", "indexed": true },
      { "name": "token", "type": "address", "indexed": true },
      { "name": "amount", "type": "uint256", "indexed": false },
      { "name": "farmer", "type": "address", "indexed": false },
      { "name": "transporter", "type": "address", "indexed": false },
      { "name": "farmerBps", "type": "uint16", "indexed": false },
      { "name": "transporterBps", "type": "uint16", "indexed": false },
      { "name": "platformBps", "type": "uint16", "indexed": false },
      { "name": "timestamp", "type": "uint256", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "PaymentHeld",
    "inputs": [
      { "name": "shipmentId", "type": "bytes32", "indexed": true },
      { "name": "timestamp", "type": "uint256", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "PaymentReleased",
    "inputs": [
      { "name": "shipmentId", "type": "bytes32", "indexed": true },
      { "name": "farmerAmount", "type": "uint256", "indexed": false },
      { "name": "transporterAmount", "type": "uint256", "indexed": false },
      { "name": "platformAmount", "type": "uint256", "indexed": false },
      { "name": "timestamp", "type": "uint256", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "PaymentRefunded",
    "inputs": [
      { "name": "shipmentId", "type": "bytes32", "indexed": true },
      { "name": "amount", "type": "uint256", "indexed": false },
      { "name": "timestamp", "type": "uint256", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "PaymentCancelled",
    "inputs": [
      { "name": "shipmentId", "type": "bytes32", "indexed": true },
      { "name": "payer", "type": "address", "indexed": true },
      { "name": "amount", "type": "uint256", "indexed": false },
      { "name": "timestamp", "type": "uint256", "indexed": false }
    ]
  }
] as const;
