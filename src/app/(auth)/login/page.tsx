'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useFirestore } from '@/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useAccount, useConnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { Separator } from '@/components/ui/separator';
import { DatabaseZap, Loader2 } from 'lucide-react';
import type { User } from '@/lib/types';
import { RegistrationABI } from '@/contracts/Registration';
import { contractAddresses } from '@/contracts/addresses';
import { readContract } from 'wagmi/actions';
import {config} from '@/components/blockchain/WagmiProvider';
import { useAuthState } from '@/lib/auth-state';
import { useSignMessage } from 'wagmi';
import { signInWithCustomToken } from 'firebase/auth';

export default function LoginPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oracleLoading, setOracleLoading] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);

  const { connectAsync } = useConnect();
  const { isConnected, address, chainId } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please provide your email and password.",
      });
      return;
    }
    setLoading(true);
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/dashboard');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message || "Invalid credentials. Please check your email and password.",
      });
      setLoading(false);
    }
  };

  const handleOracleLogin = async () => {
  setOracleLoading(true);
  try {
    // Step 1: Ensure wallet is connected
    let connectedAddress = address;
    if (!isConnected) {
      const result = await connectAsync({ connector: injected() });
      connectedAddress = result.accounts[0];
    }
    if (!connectedAddress) throw new Error('Could not connect wallet.');

    // Step 2: Ask user to sign a message to prove ownership
    const message = `AgriChain Oracle Login\n\nAddress: ${connectedAddress}\nTimestamp: ${Date.now()}`;
    const signature = await signMessageAsync({ message });

    // Step 3: Send address + signature + message to your backend
    const response = await fetch('/api/firebase-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: connectedAddress, signature, message }),
    });

    if (!response.ok) {
      throw new Error('Failed to get Firebase custom token from backend.');
    }

    const { token } = await response.json();

    // Step 4: Login to Firebase using the custom token
    await signInWithCustomToken(auth, token);

    // Step 5: Verify this wallet belongs to an active Oracle in Firestore
    const normalizedAddress = connectedAddress.toLowerCase();
    const oracleRef = doc(firestore, 'oracles', normalizedAddress);
    const oracleSnap = await getDoc(oracleRef);

    if (!oracleSnap.exists() || !oracleSnap.data().active) {
      throw new Error('This wallet address is not registered as an active Oracle.');
    }

    const oracleData = oracleSnap.data();

    // Step 6: Create local profile and update global state
    const oracleUser: User = {
      uid: normalizedAddress,
      role: 'Oracle',
      name: oracleData.name,
      email: `${oracleData.name.toLowerCase().replace(/\s+/g, '')}@oracle.agrichain.com`,
      walletAddress: normalizedAddress,
      kycVerified: true,
      details: {},
    };

    localStorage.setItem('user', JSON.stringify(oracleUser));
    useAuthState.getState().setUser(oracleUser);

    toast({
      title: 'Oracle Login Successful',
      description: `Welcome, ${oracleData.name}.`,
    });

    router.push('/dashboard/oracle');
  } catch (error: any) {
    console.error(error);
    toast({
      variant: 'destructive',
      title: 'Oracle Login Failed',
      description: error.message || 'An unexpected error occurred.',
    });
  } finally {
    setOracleLoading(false);
  }
};


  // Helper to get Firestore user profile if it exists
  async function getFirestoreProfile(uid: string) {
    try {
      const userRef = doc(firestore, 'users', uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        return userSnap.data();
      }
    } catch {}
    return null;
  }

  const handleAdminWalletLogin = async () => {
  setAdminLoading(true);
  try {
    let walletAddress = address;

    // ✅ Step 1: Connect wallet if not already
    if (!isConnected) {
      const result = await connectAsync({ connector: injected() });
      walletAddress = result.accounts[0];
    }

    if (!walletAddress) throw new Error('Could not connect wallet.');

    // ✅ Step 2: Read on-chain admin details
    const detectedChainId = chainId || 31337;
    const participant = await readContract(config, {
      abi: RegistrationABI,
      address: contractAddresses.Registration,
      functionName: 'getParticipant',
      args: [walletAddress],
      chainId: detectedChainId,
    });

    const ptArr = Array.isArray(participant) ? participant : [];
    const role = Number(ptArr[0]);
    const kyc = Number(ptArr[1]);
    const active = ptArr[5];

    // ✅ Step 3: Ensure this is a verified Admin
    if (role !== 5 || kyc !== 2 || !active) {
      throw new Error('Wallet is not a verified active Admin.');
    }

    // ✅ Step 4: Sign a message for Firebase verification
    const message = 'Log in to AgriChain Admin Dashboard';
    const signature = await signMessageAsync({ message });

    // ✅ Step 5: Send signed message to backend API route
    const res = await fetch('/api/firebase-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: walletAddress, message, signature }),
    });

    const { token } = await res.json();
    if (!token) throw new Error('Firebase custom token not returned from server.');

    // ✅ Step 6: Sign in to Firebase using the custom token
    await signInWithCustomToken(auth, token);

    // ✅ Step 7: Load Firestore profile if exists
    let adminProfile = {
      name: "",
      email:"",
      uid: walletAddress,
      role: 'Admin' as const,
      walletAddress,
      kycVerified: true,
      details: {},
    };

    const firestoreProfile = await getFirestoreProfile(walletAddress);
    if (firestoreProfile) {
      adminProfile = { ...adminProfile, ...firestoreProfile };
    }

    // ✅ Step 8: Update local + global state
    localStorage.setItem('user', JSON.stringify(adminProfile));
    const authState = useAuthState.getState();
    authState.setUser(adminProfile);

    toast({ title: 'Admin Login Successful', description: 'Welcome, Admin.' });
    router.push('/admin');
  } catch (error: any) {
    console.error(error);
    toast({
      variant: 'destructive',
      title: 'Admin Login Failed',
      description: error.message,
    });
  } finally {
    setAdminLoading(false);
  }
};

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Welcome Back</CardTitle>
        <CardDescription>Enter your credentials or log in as an Oracle.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
             <Label htmlFor="email" className="font-headline">Email (for Farmer, Industry, Transporter, Admin, Government)</Label>
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
            <Label htmlFor="password" className="font-headline">Password</Label>
            <Input 
              id="password" 
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>

          <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={loading}>
            {loading ? <><Loader2 className="animate-spin" /> Signing in...</> : "Sign In"}
          </Button>
        </form>
        <div className="mt-4 text-center text-sm">
          Don't have an account?{' '}
          <Link href="/register" className="underline text-accent">
            Register
          </Link>
        </div>

        <Separator className="my-6" />

        <div className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">For trusted Oracles only</p>
            <Button variant="outline" className="w-full" onClick={handleOracleLogin} disabled={oracleLoading}>
                {oracleLoading ? <><Loader2 className="animate-spin" /> Connecting...</> : <><DatabaseZap /> Login as Oracle</>}
            </Button>
        </div>

        <Separator className="my-6" />

        <div className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">For Admin only</p>
            <Button variant="outline" className="w-full" onClick={handleAdminWalletLogin} disabled={adminLoading}>
                {adminLoading ? <><Loader2 className="animate-spin" /> Connecting...</> : <><DatabaseZap /> Login as Admin</>}
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}
