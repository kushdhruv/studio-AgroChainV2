'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { User as AppUser, Role } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Separator } from "../ui/separator";
import { Textarea } from "../ui/textarea";
import { useFirestore, useUser } from "@/firebase";
import { doc, setDoc, updateDoc } from "firebase/firestore";
import { uploadJsonToIPFS } from "@/lib/actions";
import { useAccount, useWriteContract } from "wagmi";
import { RegistrationABI } from "@/contracts/Registration";
import { contractAddresses } from "@/contracts/addresses";
import { Loader2 } from "lucide-react";
import { useState } from "react";

// Base schema for editable fields common to all users
const baseSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email(),
});

// KYC Schemas for different roles
const farmerKycSchema = baseSchema.extend({
  aadhaarEncrypted: z.string().min(12, "Aadhaar is required."),
  farmState: z.string().min(1, "State is required."),
  farmDistrict: z.string().min(1, "District is required."),
  farmVillage: z.string().min(1, "Village is required."),
  farmPincode: z.string().length(6, "Pincode must be 6 digits."),
  gpsCoordinates: z.string().min(1, "GPS coordinates are required."),
  totalAreaAcres: z.coerce.number().positive("Must be a positive number."),
  ownershipType: z.enum(["Owned", "Leased", "Sharecropping"]),
  primaryCrops: z.string().min(3, "Enter at least one crop."),
  croppingSeason: z.enum(["Kharif", "Rabi", "Zaid"]),
  wasteTypes: z.string().min(3, "Enter at least one waste type."),
  avgQuantityPerSeasonTonnes: z.coerce.number().positive("Must be a positive number."),
  currentDisposalMethod: z.string().min(3, "Disposal method is required."),
});

const transporterKycSchema = baseSchema.extend({
    aadhaarEncrypted: z.string().min(12, "Aadhaar is required."),
    licenseNumber: z.string().min(5, "License number is required."),
    registrationNumber: z.string().min(5, "Vehicle registration is required."),
    vehicleType: z.enum(["Truck", "Tractor", "Other"]),
    capacityTonnes: z.coerce.number().positive("Must be a positive number."),
    serviceAreas: z.string().min(3, "Enter service areas."),
});

const industryKycSchema = baseSchema.extend({
    companyType: z.enum(["Private", "Public", "Cooperative", "FPO"]),
    incorporationNumber: z.string().min(5, "A valid registration number is required."),
    gstNumber: z.string().length(15, "GST Number must be 15 characters."),
    processingCapacityTonnesPerDay: z.coerce.number().positive("Must be a positive number."),
    wasteTypes: z.string().min(3, "Waste type is required."),
    monthlyRequirementTonnes: z.coerce.number().positive("Must be a positive number."),
});

const governmentKycSchema = baseSchema.extend({
    authorityType: z.enum(["Central", "State", "District", "Block"]),
    department: z.string().min(3, "Department is required."),
    jurisdictionArea: z.string().min(2, "Jurisdiction is required."),
});

// Combine all schemas for a unified TypeScript type
const allFieldsSchema = farmerKycSchema
  .merge(transporterKycSchema)
  .merge(industryKycSchema)
  .merge(governmentKycSchema);

// This creates a static type that includes all possible fields
type AllFields = z.infer<typeof allFieldsSchema>;

const getSchema = (role: Role) => {
    switch (role) {
        case 'Farmer': return farmerKycSchema;
        case 'Transporter': return transporterKycSchema;
        case 'Industry': return industryKycSchema;
        case 'Government': return governmentKycSchema;
        default: return baseSchema;
    }
}

export function ProfileForm({ user: userProfile, onFinished }: { user: AppUser, onFinished: () => void }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { address: walletAddress } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const formSchema = getSchema(userProfile.role);

  const defaultValues = {
    name: userProfile.name || "",
    email: userProfile.email || "",
    ...(userProfile.role === 'Farmer' && userProfile.details && { 
        aadhaarEncrypted: userProfile.details.aadhaarEncrypted || "",
        farmState: userProfile.details.farm?.location?.state || "",
        farmDistrict: userProfile.details.farm?.location?.district || "",
        farmVillage: userProfile.details.farm?.location?.village || "",
        farmPincode: userProfile.details.farm?.location?.pincode || "",
        gpsCoordinates: userProfile.details.farm?.location?.gpsCoordinates || "",
        totalAreaAcres: userProfile.details.farm?.land?.totalAreaAcres || 0,
        ownershipType: userProfile.details.farm?.land?.ownershipType || undefined,
        primaryCrops: userProfile.details.crops?.primaryCrops?.join(', ') || "",
        croppingSeason: userProfile.details.crops?.croppingSeason || undefined,
        wasteTypes: userProfile.details.waste?.wasteTypes?.join(', ') || "",
        avgQuantityPerSeasonTonnes: userProfile.details.waste?.avgQuantityPerSeasonTonnes || 0,
        currentDisposalMethod: userProfile.details.waste?.currentDisposalMethod || "",
    }),
    ...(userProfile.role === 'Transporter' && userProfile.details && { 
        aadhaarEncrypted: userProfile.details.aadhaarEncrypted || "",
        licenseNumber: userProfile.details.licenseNumber || "",
        registrationNumber: userProfile.details.vehicle?.registrationNumber || "",
        vehicleType: userProfile.details.vehicle?.vehicleType || undefined,
        capacityTonnes: userProfile.details.vehicle?.capacityTonnes || 0,
        serviceAreas: userProfile.details.employment?.serviceAreas?.join(', ') || "",
     }),
    ...(userProfile.role === 'Industry' && userProfile.details && { 
        companyType: userProfile.details.companyType || undefined,
        incorporationNumber: userProfile.details.incorporationNumber || "",
        gstNumber: userProfile.details.gstNumber || "",
        processingCapacityTonnesPerDay: userProfile.details.operations?.processingCapacityTonnesPerDay || 0,
        wasteTypes: userProfile.details.operations?.wasteRequirements?.wasteTypes?.join(', ') || "",
        monthlyRequirementTonnes: userProfile.details.operations?.wasteRequirements?.monthlyRequirementTonnes || 0,
    }),
    ...(userProfile.role === 'Government' && userProfile.details && { 
        authorityType: userProfile.details.authorityType || undefined,
        department: userProfile.details.department || "",
        jurisdictionArea: userProfile.details.jurisdictionArea || ""
    }),
  };

  const form = useForm<AllFields>({
      resolver: zodResolver(formSchema) as any,
      defaultValues,
  });

  async function onSubmit(values: any) {
    if (!user || !walletAddress) {
        toast({
            variant: "destructive",
            title: "Not Authenticated",
           description: "You must be logged in and have a wallet connected to update your profile.",
        });
        return;
    }

    setIsSubmitting(true);

    try {
        const updatedDetails: any = {};
        let detailsJson: any = { base: { name: values.name, email: values.email }};

     if (userProfile.role === 'Farmer') {
            const v = values as z.infer<typeof farmerKycSchema>;
            updatedDetails.aadhaarEncrypted = v.aadhaarEncrypted;
            updatedDetails.farm = {
                location: { state: v.farmState, district: v.farmDistrict, village: v.farmVillage, pincode: v.farmPincode, gpsCoordinates: v.gpsCoordinates },
                land: { totalAreaAcres: v.totalAreaAcres, ownershipType: v.ownershipType }
            };
            updatedDetails.crops = { primaryCrops: v.primaryCrops.split(',').map(s => s.trim()), croppingSeason: v.croppingSeason };
            updatedDetails.waste = { wasteTypes: v.wasteTypes.split(',').map(s => s.trim()), avgQuantityPerSeasonTonnes: v.avgQuantityPerSeasonTonnes, currentDisposalMethod: v.currentDisposalMethod };
            detailsJson.farmer = updatedDetails;
        } else if (userProfile.role === 'Transporter') {
            const v = values as z.infer<typeof transporterKycSchema>;
            updatedDetails.aadhaarEncrypted = v.aadhaarEncrypted;
            updatedDetails.licenseNumber = v.licenseNumber;
            updatedDetails.vehicle = { registrationNumber: v.registrationNumber, vehicleType: v.vehicleType, capacityTonnes: v.capacityTonnes };
            updatedDetails.employment = { serviceAreas: v.serviceAreas.split(',').map(s => s.trim()) };
            detailsJson.transporter = updatedDetails;
        } else if (userProfile.role === 'Industry') {
            const v = values as z.infer<typeof industryKycSchema>;
            updatedDetails.companyType = v.companyType;
            updatedDetails.incorporationNumber = v.incorporationNumber;
            updatedDetails.gstNumber = v.gstNumber;
            updatedDetails.operations = {
                processingCapacityTonnesPerDay: v.processingCapacityTonnesPerDay,
                wasteRequirements: {
                    wasteTypes: v.wasteTypes.split(',').map(s => s.trim()),
                    monthlyRequirementTonnes: v.monthlyRequirementTonnes
                }
            };
            detailsJson.industry = updatedDetails;
        } else if (userProfile.role === 'Government') {
            const v = values as z.infer<typeof governmentKycSchema>;
            updatedDetails.authorityType = v.authorityType;
            updatedDetails.department = v.department;
            updatedDetails.jurisdictionArea = v.jurisdictionArea;
            detailsJson.government = updatedDetails;
        }

        const userDocRef = doc(firestore, 'users', user.uid);
        await updateDoc(userDocRef, {
            name: values.name,
            email: values.email,
            details: updatedDetails,
        });
        
        const approvalDocRef = doc(firestore, 'pendingApprovals', user.uid);

        if (!userProfile.kycVerified) {
             await setDoc(approvalDocRef, {
                userId: user.uid,
                name: values.name,
                email: values.email,
                role: userProfile.role,
                walletAddress: walletAddress, // <-- FIX: Added wallet address
                details: updatedDetails,
                submittedAt: new Date().toISOString(),
             });
             toast({
                title: "KYC Submitted for Review",
                description: "Your details have been saved and sent to an Oracle for on-chain verification.",
             });
        } 
        else {
            const ipfsResponse = await uploadJsonToIPFS(detailsJson);
            if (!ipfsResponse.success || !ipfsResponse.ipfsHash) {
                throw new Error(ipfsResponse.error || "Could not upload profile data to IPFS.");
            }
            
            await writeContractAsync({
                abi: RegistrationABI,
                address: contractAddresses.Registration,
                functionName: 'updateMetaData',
                args: [ipfsResponse.ipfsHash, true], // isCritical = true to reset KYC
            });

            await updateDoc(userDocRef, { kycVerified: false });
             
             await setDoc(approvalDocRef, {
                userId: user.uid,
                name: values.name,
                email: values.email,
                role: userProfile.role,
                walletAddress: walletAddress, // <-- FIX: Added wallet address
                details: updatedDetails,
                submittedAt: new Date().toISOString(),
             });

            toast({
              title: "Profile Update Submitted",
              description: "Your details have been updated and sent for re-verification. Your KYC status is now pending.",
            });
        }
        
        onFinished();

    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Update Failed', description: e.message });
    } finally {
        setIsSubmitting(false);
    }
  }
  
  const renderRoleFields = () => {
    switch (userProfile.role) {
      case 'Farmer':
        return <>
          <Separator />
          <h3 className="font-headline text-lg font-semibold">KYC Details</h3>
          <FormField control={form.control as any} name="aadhaarEncrypted" render={({ field }) => (
            <FormItem><FormLabel>Aadhaar Number</FormLabel><FormControl><Input placeholder="Enter 12-digit Aadhaar" {...field} /></FormControl><FormDescription>Your data will be encrypted.</FormDescription><FormMessage /></FormItem>
          )} />
          <h4 className="font-semibold">Farm Location</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control as any} name="farmState" render={({ field }) => (
              <FormItem><FormLabel>State</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control as any} name="farmDistrict" render={({ field }) => (
              <FormItem><FormLabel>District</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control as any} name="farmVillage" render={({ field }) => (
              <FormItem><FormLabel>Village</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control as any} name="farmPincode" render={({ field }) => (
              <FormItem><FormLabel>Pincode</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
             <FormField control={form.control as any} name="gpsCoordinates" render={({ field }) => (
              <FormItem><FormLabel>GPS Coordinates</FormLabel><FormControl><Input placeholder="Lat, Long" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>
          <h4 className="font-semibold">Land & Crop Details</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control as any} name="totalAreaAcres" render={({ field }) => (
              <FormItem><FormLabel>Total Land Area (Acres)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
             <FormField control={form.control as any} name="ownershipType" render={({ field }) => (
                <FormItem><FormLabel>Ownership</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Owned">Owned</SelectItem><SelectItem value="Leased">Leased</SelectItem><SelectItem value="Sharecropping">Sharecropping</SelectItem></SelectContent></Select><FormMessage /></FormItem>
              )} />
            <FormField control={form.control as any} name="primaryCrops" render={({ field }) => (
              <FormItem><FormLabel>Primary Crops</FormLabel><FormControl><Textarea placeholder="e.g., Wheat, Rice" {...field} /></FormControl><FormDescription>Comma-separated.</FormDescription><FormMessage /></FormItem>
            )} />
            <FormField control={form.control as any} name="croppingSeason" render={({ field }) => (
              <FormItem><FormLabel>Cropping Season</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select season" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Kharif">Kharif</SelectItem><SelectItem value="Rabi">Rabi</SelectItem><SelectItem value="Zaid">Zaid</SelectItem></SelectContent></Select><FormMessage /></FormItem>
            )} />
          </div>
          <h4 className="font-semibold">Waste Generation</h4>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control as any} name="wasteTypes" render={({ field }) => (
              <FormItem><FormLabel>Waste Types Generated</FormLabel><FormControl><Textarea placeholder="e.g., Paddy straw" {...field} /></FormControl><FormDescription>Comma-separated.</FormDescription><FormMessage /></FormItem>
            )} />
             <FormField control={form.control as any} name="avgQuantityPerSeasonTonnes" render={({ field }) => (
              <FormItem><FormLabel>Average Waste (Tonnes/season)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control as any} name="currentDisposalMethod" render={({ field }) => (
              <FormItem className="md:col-span-2"><FormLabel>Current Disposal Method</FormLabel><FormControl><Input placeholder="e.g., Burning" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>
        </>;
      case 'Transporter':
        return <>
            <Separator />
            <h3 className="font-headline text-lg font-semibold">KYC & Vehicle Details</h3>
            <FormField control={form.control as any} name="aadhaarEncrypted" render={({ field }) => (
              <FormItem><FormLabel>Aadhaar Number</FormLabel><FormControl><Input placeholder="Enter 12-digit Aadhaar" {...field} /></FormControl><FormDescription>Your data will be encrypted.</FormDescription><FormMessage /></FormItem>
            )} />
            <FormField control={form.control as any} name="licenseNumber" render={({ field }) => (
                <FormItem><FormLabel>Driving License Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control as any} name="registrationNumber" render={({ field }) => (
                  <FormItem><FormLabel>Vehicle Registration</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
               <FormField control={form.control as any} name="vehicleType" render={({ field }) => (
                <FormItem><FormLabel>Vehicle Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Truck">Truck</SelectItem><SelectItem value="Tractor">Tractor</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select><FormMessage /></FormItem>
              )} />
              <FormField control={form.control as any} name="capacityTonnes" render={({ field }) => (
                  <FormItem><FormLabel>Capacity (Tonnes)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control as any} name="serviceAreas" render={({ field }) => (
                  <FormItem><FormLabel>Service Areas</FormLabel><FormControl><Input placeholder="e.g. Lucknow, Kanpur" {...field} /></FormControl><FormDescription>Comma-separated.</FormDescription><FormMessage /></FormItem>
              )} />
            </div>
        </>;
      case 'Industry':
        return <>
            <Separator />
            <h3 className="font-headline text-lg font-semibold">Company Verification</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control as any} name="companyType" render={({ field }) => (
                <FormItem><FormLabel>Company Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Private">Private</SelectItem><SelectItem value="Public">Public</SelectItem><SelectItem value="Cooperative">Cooperative</SelectItem><SelectItem value="FPO">FPO</SelectItem></SelectContent></Select><FormMessage /></FormItem>
              )} />
              <FormField control={form.control as any} name="incorporationNumber" render={({ field }) => (
                  <FormItem><FormLabel>Incorporation Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control as any} name="gstNumber" render={({ field }) => (
                  <FormItem><FormLabel>GST Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <h4 className="font-semibold">Operational Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control as any} name="processingCapacityTonnesPerDay" render={({ field }) => (
                  <FormItem><FormLabel>Processing Capacity (Tonnes/Day)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control as any} name="wasteTypes" render={({ field }) => (
                  <FormItem><FormLabel>Required Waste Types</FormLabel><FormControl><Input {...field} /></FormControl><FormDescription>Comma-separated.</FormDescription><FormMessage /></FormItem>
              )} />
              <FormField control={form.control as any} name="monthlyRequirementTonnes" render={({ field }) => (
                  <FormItem><FormLabel>Monthly Requirement (Tonnes)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
        </>;
      case 'Government':
        return <>
            <Separator />
            <h3 className="font-headline text-lg font-semibold">Authority Details</h3>
            <FormField control={form.control as any} name="authorityType" render={({ field }) => (
              <FormItem><FormLabel>Authority Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Central">Central</SelectItem><SelectItem value="State">State</SelectItem><SelectItem value="District">District</SelectItem><SelectItem value="Block">Block</SelectItem></SelectContent></Select><FormMessage /></FormItem>
            )} />
            <FormField control={form.control as any} name="department" render={({ field }) => (
              <FormItem><FormLabel>Department</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control as any} name="jurisdictionArea" render={({ field }) => (
              <FormItem><FormLabel>Jurisdiction Area</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
        </>;
      default:
        return null;
    }
  }

  const cardTitle = userProfile.kycVerified ? "Edit Profile" : "Complete Your Profile (KYC)";
  const cardDescription = userProfile.kycVerified ? "Update your personal and role-specific details. This will require re-verification." : "Please fill out your details to submit them for KYC verification by an Oracle.";

  const submitButtonText = userProfile.kycVerified ? 'Update & Resubmit for Verification' : 'Submit for KYC Verification';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">{cardTitle}</CardTitle>
        <CardDescription>{cardDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <h3 className="font-headline text-lg font-semibold">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control as any} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name / Company Name</FormLabel>
                  <FormControl><Input placeholder="Your full name" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control as any} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl><Input type="email" placeholder="you@example.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {renderRoleFields()}
            
            <div className="flex justify-end gap-4 pt-4">
                <Button type="button" variant="outline" onClick={onFinished} disabled={isSubmitting || isPending}>Cancel</Button>
                <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90" disabled={isSubmitting || isPending}>
                  {(isSubmitting || isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isPending ? 'Confirm in Wallet...' : isSubmitting ? 'Submitting...' : submitButtonText}
                </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
