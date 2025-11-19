
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { Loader2, Wallet } from 'lucide-react';
import { useAccount, useConnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { Separator } from '@/components/ui/separator';
import { readContract } from 'wagmi/actions';
import { config } from '@/components/blockchain/WagmiProvider';
import { RegistrationABI } from '@/contracts/Registration';
import { getContractAddress } from '@/contracts/addresses';
import { onChainRoleMap } from '@/lib/constants';
import { useFirestore } from '@/firebase';
import { doc, getDoc, getDocs, query, where, collection, updateDoc, setDoc } from 'firebase/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import WalletLogin from '@/components/auth/WalletLogin';
import OracleLogin from '@/components/auth/OracleLogin';

export default function LoginPage() {
  const firebaseAuth = getAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);

  const { connectAsync } = useConnect();
  const { address: connectedAddress, isConnected, chainId } = useAccount();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please provide both email and password.');
      return;
    }
    setLoading(true);
    const toastId = toast.loading('Signing in...');

    try {
      const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
      const user = userCredential.user;
      
      toast.loading('Verifying user profile...', { id: toastId });

      // Search for user by email field (not uid, since uid is now wallet address)
      const usersRef = collection(firestore, 'users');
      const userQuery = query(usersRef, where('email', '==', email));
      const userSnapshot = await getDocs(userQuery);

      if (userSnapshot.empty) {
        toast.error(
          'Authentication successful, but no user profile was found. Please contact an admin to complete your registration.',
          { id: toastId, duration: 6000 }
        );
        await signOut(firebaseAuth);
      } else {
        const userDoc = userSnapshot.docs[0];
        const userData = userDoc.data();
        
        // Store user session in localStorage
        const userSession = {
          uid: userDoc.id,
          role: userData.role,
          name: userData.name,
          email: userData.email,
          walletAddress: userData.walletAddress,
          kycVerified: userData.kycVerified,
        };
        localStorage.setItem('user', JSON.stringify(userSession));
        
        toast.success('Login successful!', { id: toastId });
        
        // Redirect based on role
        const dashboardRoute = getDashboardRoute(userData.role);
        router.push(dashboardRoute);
      }

    } catch (error: any) {
      console.error("Login Error:", error);
      if (error.code && error.code.startsWith('auth/')) {
        toast.error(error.message || 'Invalid email or password.', { id: toastId });
      } else {
        toast.error(error.message || 'An unexpected error occurred.', { id: toastId });
      }
    } finally {
      setLoading(false);
    }
  };

  const getDashboardRoute = (role: string) => {
    // Be resilient to unexpected casing/whitespace in stored role values
    const normalized = (role || '').toString().trim().toLowerCase();
    const map: { [key: string]: string } = {
      // Use the main dashboard page for Farmer/Transporter/Industry roles
      farmer: '/dashboard',
      transporter: '/dashboard',
      industry: '/dashboard',
      // Government has its own oversight page
      government: '/dashboard/oversight',
      oracle: '/dashboard/oracle',
      admin: '/admin',
    };
    return map[normalized] || '/dashboard';
  };

  const handleAdminLogin = async () => {
    setAdminLoading(true);
    const toastId = toast.loading('Initiating Admin Login...');

    try {
      // Step 1: Verify wallet is connected
      let walletAddress = connectedAddress;
      if (!isConnected) {
        toast.loading('Please connect your admin wallet (MetaMask or similar)...', { id: toastId });
        const result = await connectAsync({ connector: injected() });
        walletAddress = result.accounts[0];
      }
      if (!walletAddress) throw new Error("Wallet connection failed or was cancelled.");

      const normalizedAddress = walletAddress.toLowerCase();

      // Step 2: Verify on-chain admin role FIRST (before checking Firestore)
      toast.loading('Verifying admin role on-chain...', { id: toastId });
      const registrationContractAddress = getContractAddress('Registration');
      if (!registrationContractAddress) {
        throw new Error("Registration contract address not configured for this network.");
      }

      const participantData = await readContract(config, {
        abi: RegistrationABI,
        address: registrationContractAddress,
        functionName: 'getParticipant',
        args: [normalizedAddress as `0x${string}`],
        chainId: chainId,
      });

      const [role, , , , , active] = participantData as [bigint, bigint, bigint, string, string, boolean];
      const isAdminOnChain = Number(role) === onChainRoleMap.Admin && active;

      if (!isAdminOnChain) {
        throw new Error(
          "Your wallet is not registered as an active Admin on-chain. " +
          "Please ensure you deployed the smart contracts and registered as Admin."
        );
      }

      // Step 3: Check if admin user exists in Firestore (uid = wallet address after fix)
      toast.loading('Checking admin profile in database...', { id: toastId });
      const usersRef = collection(firestore, 'users');
      
      // Direct lookup: users are now stored with uid = walletAddress
      const adminDocRef = doc(firestore, 'users', normalizedAddress);
      const adminDocSnapshot = await getDoc(adminDocRef);

      let userUID: string;
      let adminData: any;

      if (!adminDocSnapshot.exists()) {
        // AUTO-CREATE ADMIN PROFILE if not found
        toast.loading('First-time admin login detected. Creating admin profile...', { id: toastId });
        
        // Use wallet address as the uid
        userUID = normalizedAddress;
        
        // Create admin profile with default values
        adminData = {
          uid: userUID,
          role: 'Admin',
          name: `Admin ${normalizedAddress.substring(0, 6)}...${normalizedAddress.substring(38)}`,
          email: `admin-${normalizedAddress.substring(2, 8)}@agrichain.com`,
          walletAddress: normalizedAddress,
          kycVerified: true, // Auto-verified since on-chain role is confirmed
          active: true,
          createdAt: new Date(),
          lastWalletLogin: new Date(),
          details: {}, // Empty details for admin
        };

        // Store in Firestore with wallet address as document ID
        const userDocRef = doc(firestore, 'users', userUID);
        await setDoc(userDocRef, adminData);
        
        toast.success('Admin profile created!', { id: toastId, duration: 2000 });
      } else {
        // Admin profile found
        userUID = adminDocSnapshot.id;
        adminData = adminDocSnapshot.data();

        // Step 4: Verify KYC is completed
        if (!adminData.kycVerified) {
          throw new Error(
            "Your KYC verification is pending approval. " +
            "Please wait for approval from the system administrator before logging in."
          );
        }

        // Update last login timestamp
        toast.loading('Updating login session...', { id: toastId });
        const userDocRef = doc(firestore, 'users', userUID);
        await updateDoc(userDocRef, {
          lastWalletLogin: new Date(),
        });
      }

      // Step 5: Store admin session in localStorage (like oracle login does)
      // This allows the Firebase provider to recognize the admin user
      toast.loading('Establishing admin session...', { id: toastId });
      
      const adminSession = {
        uid: userUID,
        role: 'Admin',
        name: adminData.name,
        email: adminData.email,
        walletAddress: adminData.walletAddress,
        kycVerified: adminData.kycVerified,
      };

      // Store in localStorage so Firebase provider recognizes this user
      localStorage.setItem('user', JSON.stringify(adminSession));

      // Step 6: Session is now valid, user will be recognized by the app layout
      toast.success('Admin Login Successful!', { id: toastId, duration: 2000 });
      router.push('/admin');

    } catch (error: any) {
      console.error("Admin Login Error:", error);
      const errorMessage = error?.cause?.shortMessage || error.message || "An unknown error occurred.";
      toast.error(`Admin Login Failed: ${errorMessage}`, { id: toastId, duration: 5000 });
    } finally {
      setAdminLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome Back</CardTitle>
        <CardDescription>Sign in to access your account</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="email" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="email">Email & Password</TabsTrigger>
            <TabsTrigger value="wallet">Wallet Login</TabsTrigger>
            <TabsTrigger value="oracle">Oracle Login</TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="space-y-6">
            <form onSubmit={handleEmailLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="you@example.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <><Loader2 className="animate-spin mr-2" /> Signing in...</> : 'Sign In'}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm">
              Don't have an account?{' '}
              <Link href="/register" className="underline">
                Register
              </Link>
            </div>

            <Separator className="my-6" />

            <div className="space-y-4">
              <Button variant="outline" className="w-full" onClick={handleAdminLogin} disabled={adminLoading}>
                  {adminLoading ? <><Loader2 className="animate-spin mr-2" /> Admin Login in Progress...</> : <><Wallet className="mr-2" /> Login as Admin</>}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="wallet">
            <WalletLogin />
          </TabsContent>

          <TabsContent value="oracle">
            <OracleLogin />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
