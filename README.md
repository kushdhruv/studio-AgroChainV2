# AgriChain Frontend Application

Modern, type-safe Next.js application for the AgriChain agricultural supply chain platform.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Server runs on http://localhost:9002
```

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- Firebase account (for Firestore)
- Pinata account (for IPFS storage)
- MetaMask or compatible wallet

## ⚙️ Environment Configuration

Create `.env.local` file:

```env
# Blockchain RPC
NEXT_PUBLIC_CHAIN_RPC=http://127.0.0.1:8545

# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Pinata (IPFS)
PINATA_JWT=your_pinata_jwt
NEXT_PUBLIC_PINATA_GATEWAY=https://gateway.pinata.cloud

# Google Genkit (AI)
GOOGLE_GENAI_API_KEY=your_genai_key
```

## 🏗️ Architecture

### **Tech Stack**
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **UI**: Tailwind CSS + ShadCN UI components
- **State**: React Context API
- **Forms**: React Hook Form + Zod
- **Blockchain**: wagmi + viem
- **Database**: Firebase Firestore
- **Storage**: IPFS (Pinata)
- **AI**: Google Genkit (Gemini)

### **Project Structure**

```
src/
├── app/                    # Next.js pages (App Router)
│   ├── (auth)/            # Authentication pages
│   ├── (app)/             # Protected app pages
│   │   └── dashboard/     # Role-based dashboards
│   └── providers.tsx      # App-level providers
├── components/             # React components
│   ├── admin/             # Admin components
│   ├── auth/              # Authentication forms
│   ├── blockchain/        # Wallet connection
│   ├── dashboard/         # Dashboard layouts
│   ├── oracle/            # Oracle operations
│   ├── shipments/         # Shipment management
│   └── ui/                # ShadCN UI components
├── contracts/              # Contract ABIs (TypeScript)
├── firebase/              # Firebase integration
├── hooks/                 # Custom React hooks
│   └── use-contract-events.tsx  # Event listeners
├── lib/                   # Utilities
│   ├── oracle-signature.ts     # Oracle signing utilities
│   ├── types.ts               # TypeScript types
│   └── actions.ts              # Server actions
└── ai/                    # Google Genkit AI flows
```

---

## 🎯 Key Features

### **1. Multi-Role Authentication**
- Role-based registration (Farmer, Transporter, Industry, Government, Oracle)
- Password-based login
- Wallet connection for blockchain operations
- Session persistence

### **2. Role-Based Dashboards**

#### **Farmer Dashboard**
- Create shipments with images
- Track active and past shipments
- View payment status
- Manage profile and KYC

#### **Transporter Dashboard**
- Browse marketplace for available shipments
- Accept transport assignments
- Track active deliveries
- View earnings history

#### **Industry Dashboard**
- Browse marketplace
- Make offers on shipments
- Deposit escrow payments
- Track incoming shipments
- View payment history

#### **Oracle Dashboard**
- View pending KYC approvals
- Attach weighment data to shipments
- Sign proofs and attestations
- Manage verification queue

#### **Government Dashboard**
- Oversight dashboard with all shipments
- AI-powered anomaly detection
- Fraud detection analysis
- Compliance monitoring

#### **Admin Dashboard**
- Manage platform participants
- Register oracles
- Approve/deny registrations
- System configuration

---

### **3. Blockchain Integration**

#### **Event Listeners**
Automatic synchronization between blockchain and Firestore:

- `ShipmentCreated` → Creates Firestore shipment document
- `ShipmentStateChanged` → Updates shipment status
- `PaymentDeposited` → Records payment information
- `DisputeRaised` → Creates dispute document

**Location**: `src/hooks/use-contract-events.tsx`

#### **Transaction Flow**
1. User initiates action
2. Upload to IPFS (if needed)
3. Sign message (if oracle)
4. Submit transaction to blockchain
5. Wait for confirmation
6. Update Firestore only after success

This prevents data inconsistency.

#### **Oracle Signature Generation**
**Location**: `src/lib/oracle-signature.ts`

Utilities for:
- Generating payload hashes matching contract encoding
- Signing with wallet extension (development)
- Backend API signing (production)

---

### **4. Data Management**

#### **Firebase Firestore**
Stores:
- User profiles and KYC status
- Shipment tracking data
- Dispute evidence
- Oracle registry metadata

#### **IPFS (Pinata)**
Stores:
- Shipment images
- Dispute evidence files
- Oracle verification data
- Metadata hashes

---

## 🔧 Key Components

### **CreateShipmentForm**
**Location**: `src/components/shipments/CreateShipmentForm.tsx`

**Flow**:
1. Upload image to IPFS
2. Create Firestore document (temporary ID)
3. Call `createShipment()` on contract
4. Wait for transaction confirmation
5. Update Firestore with confirmed data

### **AttachWeighmentDialog**
**Location**: `src/components/oracle/AttachWeighmentDialog.tsx`

**Flow**:
1. Oracle enters weight data
2. Upload weighment details to IPFS
3. Generate payload hash (matches contract)
4. Request signature from oracle wallet
5. Call `attachWeighment()` on contract
6. Wait for confirmation
7. Update Firestore timeline

### **RaiseDisputeDialog**
**Location**: `src/components/shipments/ShipmentDetailsClient.tsx`

**Flow**:
1. User provides dispute reason
2. Upload evidence to IPFS
3. Call `raiseDispute()` on contract
4. Wait for transaction receipt
5. Parse `DisputeRaised` event to get dispute ID
6. Create Firestore dispute document with actual ID

---

## 🔐 Security Implementation

### **Transaction Safety**
- All contract writes wait for confirmation
- Firestore updates only after successful transactions
- Error handling prevents partial updates
- Rollback logic for failed transactions

### **Oracle Signing**
- Payload hash generation matches contract exactly
- Signature verification before submission
- Nonce-based replay protection
- Timestamp validation

### **Access Control**
- KYC verification checks before operations
- Role-based UI rendering
- Wallet connection validation
- Contract-level permission enforcement

---

## 📡 API Integration

### **Blockchain RPC**
- Default: `http://127.0.0.1:8545` (Anvil)
- Configurable via `NEXT_PUBLIC_CHAIN_RPC`
- Supports any Ethereum-compatible chain

### **IPFS (Pinata)**
- Upload files via `uploadToIPFS()` action
- Store JSON data via `uploadJsonToIPFS()` action
- Gateway URL configurable

### **Firebase**
- Firestore for real-time data
- Firebase Auth for user management
- Automatic offline support

---

## 🎨 UI Components

Built with **ShadCN UI**:
- Accessible, customizable components
- Dark mode support
- Responsive design
- Type-safe props

Key components:
- Cards, Tables, Forms
- Dialogs, Toasts, Alerts
- Sidebar navigation
- Dashboard layouts

---

## 🧪 Development

### **Run Development Server**
```bash
npm run dev
```

### **Type Checking**
```bash
npm run typecheck
```

### **Linting**
```bash
npm run lint
```

### **Build Production**
```bash
npm run build
npm start
```

---

## 🔄 State Management

### **Authentication State**
- Location: `src/firebase/provider.tsx`
- Uses Firebase Auth + Firestore user profiles
- Persisted in localStorage

### **Shipment State**
- Real-time Firestore queries
- Automatic updates from blockchain events
- Optimistic UI updates

### **Blockchain State**
- wagmi hooks for wallet connection
- Transaction status tracking
- Event subscription for real-time updates

---

## 📦 Key Dependencies

```json
{
  "next": "^15.5.6",
  "react": "^18.3.1",
  "wagmi": "^2.19.0",
  "viem": "^2.38.5",
  "firebase": "^11.10.0",
  "tailwindcss": "^3.4.1",
  "zod": "^3.24.2",
  "react-hook-form": "^7.54.2"
}
```

---

## 🐛 Troubleshooting

### **Wallet Connection Issues**
- Ensure MetaMask or compatible wallet is installed
- Check RPC URL configuration
- Verify network matches contract deployment

### **Transaction Failures**
- Check user has sufficient gas
- Verify contract addresses are correct
- Ensure user has required permissions (KYC, role)

### **Firebase Errors**
- Verify Firebase config in `.env.local`
- Check Firestore security rules
- Ensure Firebase project is active

### **IPFS Upload Failures**
- Verify Pinata JWT token
- Check file size limits
- Ensure network connectivity

---

## 📝 Code Quality

- TypeScript strict mode enabled
- ESLint configuration
- Prettier formatting (recommended)
- Component-based architecture
- Reusable custom hooks

---

## 🚀 Deployment

### **Vercel (Recommended)**
1. Push to GitHub
2. Import to Vercel
3. Configure environment variables
4. Deploy

### **Firebase Hosting**
```bash
npm run build
firebase deploy
```

### **Other Platforms**
- Any Node.js hosting platform
- Configure environment variables
- Ensure SSR is supported (Next.js requirement)

---

## 📚 Additional Resources

- **Next.js Docs**: https://nextjs.org/docs
- **wagmi Docs**: https://wagmi.sh
- **ShadCN UI**: https://ui.shadcn.com
- **Firebase Docs**: https://firebase.google.com/docs

---

**Last Updated**: 2024  
**Next.js Version**: 15.5.6  
**License**: [Your License]
