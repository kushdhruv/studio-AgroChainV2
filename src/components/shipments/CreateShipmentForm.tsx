
'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Upload, ShieldAlert, Loader2 } from "lucide-react";
import { useState } from "react";
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import type { User } from "@/lib/types";
import { useFirestore, useUser } from "@/firebase";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { doc, collection } from "firebase/firestore";
import { uploadToIPFS } from "@/lib/actions";
import { useAccount } from 'wagmi';
import { ShipmentTokenABI } from '@/contracts/ShipmentToken';
import { contractAddresses } from '@/contracts/addresses';
import { encodeBytes32String } from "ethers";
import { useTransactionStatus } from '@/hooks/use-transaction-status';
import { validateContractBeforeInteraction } from '@/lib/contract-validation';

const formSchema = z.object({
  content: z.string().min(3, "Content is required."),
  quantity: z.string().min(1, "Quantity is required."),
  origin: z.string().min(3, "Origin is required."),
  askPrice: z.coerce.number().positive("Price must be a positive number."),
});

export function CreateShipmentForm({ user: userProfile }: { user: User | null }) {
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { address: walletAddress, isConnected } = useAccount();
  const {
    writeContract,
    isLoading,
    isPending,
    isSuccess,
    isError,
    txHash,
  } = useTransactionStatus({
    contractName: 'ShipmentToken',
    functionName: 'createShipment',
    contractAddress: contractAddresses.ShipmentToken,
    successMessage: 'Shipment created successfully on-chain!',
  });

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content: "",
      quantity: "",
      origin: "",
      askPrice: 0,
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!userProfile?.kycVerified || !user) {
        toast({ variant: "destructive", title: "KYC Verification Required", description: "Please complete your profile before creating a shipment." });
        router.push('/dashboard/profile');
        return;
    }
    if (!file) {
        toast({ variant: "destructive", title: "Image Required", description: "Please upload an image for the shipment."});
        return;
    }
    if (!isConnected || !walletAddress) {
        toast({ variant: 'destructive', title: 'Wallet Not Connected' });
        return;
    }

    setIsUploading(true);
    
    try {
      // Step 1: Upload image to IPFS
      const formData = new FormData();
      formData.append('file', file);
      const ipfsResponse = await uploadToIPFS(formData);

      if (!ipfsResponse.success || !ipfsResponse.ipfsHash) {
          throw new Error(ipfsResponse.error || "Could not upload image to IPFS.");
      }
      const ipfsHash = ipfsResponse.ipfsHash;

      // Step 2: Prepare on-chain data
      const newShipmentRef = doc(collection(firestore, 'shipments'));
      const shipmentId = newShipmentRef.id;
      // IMPORTANT: formatBytes32String requires a string of 31 bytes or less.
      // Firestore IDs are 20 characters, which is safe. We truncate just in case.
      const shipmentIdBytes32 = encodeBytes32String(shipmentId.slice(0,31));

      const shipmentDetails = JSON.stringify({
        firestoreId: shipmentId,
        content: values.content,
        quantity: values.quantity,
        origin: values.origin,
        askPrice: values.askPrice,
        imageUrl: ipfsHash,
        imageHint: values.content,
      });

      // Step 3: Validate contract before interaction
      const validation = validateContractBeforeInteraction('ShipmentToken', contractAddresses.ShipmentToken);
      if (!validation.valid) {
        throw new Error(validation.error || 'Contract validation failed');
      }

      // Step 4: Call smart contract to create shipment
      await writeContract({
        abi: ShipmentTokenABI,
        address: contractAddresses.ShipmentToken,
        functionName: 'createShipment',
        args: [shipmentIdBytes32, shipmentDetails],
      }, {
        onSuccess: async (receipt) => {
          // Step 5: Only create Firestore document after transaction succeeds
          const shipmentData = {
            ...values,
            id: shipmentId,
            shipmentIdOnChain: shipmentIdBytes32,
            imageUrl: ipfsHash,
            farmerId: user.uid,
            farmerName: userProfile.name,
            status: 'Pending',
            imageHint: values.content,
            timeline: [
              { status: 'Pending', timestamp: new Date().toISOString(), details: 'Shipment created by farmer on-chain.' },
            ]
          };
          setDocumentNonBlocking(newShipmentRef, shipmentData, { merge: false });
          router.push('/dashboard/marketplace');
        },
        onError: (error) => {
          throw new Error(`Transaction failed: ${error.message}`);
        },
      });

    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Shipment Creation Failed', description: e.message });
    } finally {
        setIsUploading(false);
    }
  }

  if (!userProfile?.kycVerified) {
    return (
        <Card className="max-w-2xl mx-auto">
            <CardHeader><CardTitle className="font-headline">Create New Shipment</CardTitle></CardHeader>
            <CardContent>
                <Alert variant="destructive">
                    <ShieldAlert className="h-4 w-4" />
                    <AlertTitle>KYC Verification Required</AlertTitle>
                    <AlertDescription>
                        You must complete your profile before you can list shipments on the marketplace.
                        <Button variant="link" className="p-0 h-auto ml-1" onClick={() => router.push('/dashboard/profile')}>
                            Complete Profile Now
                        </Button>
                    </AlertDescription>
                </Alert>
            </CardContent>
        </Card>
    )
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="font-headline">Shipment Details</CardTitle>
        <CardDescription>Fill in the details below. This will mint a new Shipment NFT on the blockchain.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField control={form.control} name="content" render={({ field }) => (
              <FormItem><FormLabel>Produce / Waste Content</FormLabel><FormControl><Input placeholder="e.g., Paddy Straw" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="quantity" render={({ field }) => (
              <FormItem><FormLabel>Quantity</FormLabel><FormControl><Input placeholder="e.g., 10 Tonnes" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="origin" render={({ field }) => (
            <FormItem><FormLabel>Origin</FormLabel><FormControl><Input placeholder="City, State" {...field} /></FormControl><FormDescription>The destination will be set by the Industry partner.</FormDescription><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="askPrice" render={({ field }) => (
              <FormItem><FormLabel>Asking Price (INR)</FormLabel><FormControl><Input type="number" placeholder="e.g., 5000" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormItem>
                <FormLabel>Photos / Documents</FormLabel>
                 <FormControl>
                    <Input id="dropzone-file" type="file" className="hidden" onChange={handleFileChange} accept="image/png, image/jpeg" disabled={isUploading || isPending}/>
                 </FormControl>
                <label htmlFor="dropzone-file" className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg bg-secondary relative ${isUploading || isPending ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-muted'}`}>
                    {imagePreview ? (
                      <Image src={imagePreview} alt="Uploaded preview" fill className="object-contain p-2" />
                    ) : (
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="w-8 h-8 mb-4 text-muted-foreground" />
                          <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                          <p className="text-xs text-muted-foreground">PNG, JPG (MAX. 10MB)</p>
                      </div>
                    )}
                </label>
                <FormDescription>Upload an image of the produce. This will be stored on IPFS.</FormDescription>
            </FormItem>

            <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={isUploading || isLoading || !file || !isConnected}>
                {(isUploading || isLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? (isPending ? 'Waiting for Confirmation...' : 'Confirming Transaction...') : isUploading ? 'Uploading to IPFS...' : 'Create Shipment On-Chain'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
