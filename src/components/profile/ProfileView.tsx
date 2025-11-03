
'use client';

import type { User as AppUser, FarmerDetails, TransporterDetails, IndustryDetails, GovernmentDetails } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Button } from '../ui/button';
import { Pencil, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRef } from 'react';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { useFirestore, useUser } from '@/firebase';
import { doc } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';

function DetailItem({ label, value }: { label: string; value?: string | string[] | number | null }) {
  if (!value && typeof value !== 'number') return null;
  const displayValue = Array.isArray(value) ? value.join(', ') : value;
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-medium break-words">{displayValue}</p>
    </div>
  );
}

export function ProfileView({ user: userProfile, onEdit }: { user: AppUser; onEdit: () => void }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fallback = userProfile.name.split(' ').map(n => n[0]).join('').toUpperCase();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && user) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const userDocRef = doc(firestore, 'users', user.uid);
        updateDocumentNonBlocking(userDocRef, { avatarUrl: dataUrl });
        toast({
          title: "Profile Picture Updated",
          description: "Your new profile picture has been saved.",
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const renderDetails = () => {
    if (!userProfile.kycVerified) {
      return (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>KYC Verification Required</AlertTitle>
          <AlertDescription>
            Please complete your profile to access all features.
            <Button variant="link" className="p-0 h-auto ml-1" onClick={onEdit}>Complete Profile Now</Button>
          </AlertDescription>
        </Alert>
      );
    }

    const details = userProfile.details;

    switch (userProfile.role) {
      case 'Farmer': {
        const d = details as FarmerDetails;
        return (
          <>
            <DetailItem label="Aadhaar (Encrypted)" value={d.aadhaarEncrypted ? '••••••••••••' : ''} />
            <Separator />
            <h4 className="font-semibold text-lg">Farm Location</h4>
            <DetailItem label="State" value={d.farm?.location?.state} />
            <DetailItem label="District" value={d.farm?.location?.district} />
            <DetailItem label="Village" value={d.farm?.location?.village} />
            <DetailItem label="Pincode" value={d.farm?.location?.pincode} />
            <DetailItem label="GPS" value={d.farm?.location?.gpsCoordinates} />
            <Separator />
            <h4 className="font-semibold text-lg">Land Details</h4>
            <DetailItem label="Total Area (Acres)" value={d.farm?.land?.totalAreaAcres} />
            <DetailItem label="Ownership Type" value={d.farm?.land?.ownershipType} />
             <Separator />
            <h4 className="font-semibold text-lg">Crop & Waste Info</h4>
            <DetailItem label="Primary Crops" value={d.crops?.primaryCrops} />
            <DetailItem label="Cropping Season" value={d.crops?.croppingSeason} />
            <DetailItem label="Waste Types" value={d.waste?.wasteTypes} />
            <DetailItem label="Avg. Waste (Tonnes/Season)" value={d.waste?.avgQuantityPerSeasonTonnes} />
            <DetailItem label="Current Disposal Method" value={d.waste?.currentDisposalMethod} />
          </>
        );
      }
      case 'Transporter': {
        const d = details as TransporterDetails;
        return (
          <>
            <DetailItem label="Aadhaar (Encrypted)" value={d.aadhaarEncrypted ? '••••••••••••' : ''} />
            <DetailItem label="License Number" value={d.licenseNumber} />
            <Separator />
            <h4 className="font-semibold text-lg">Vehicle Info</h4>
            <DetailItem label="Registration Number" value={d.vehicle?.registrationNumber} />
            <DetailItem label="Vehicle Type" value={d.vehicle?.vehicleType} />
            <DetailItem label="Capacity (Tonnes)" value={d.vehicle?.capacityTonnes} />
             <Separator />
            <h4 className="font-semibold text-lg">Employment</h4>
            <DetailItem label="Service Areas" value={d.employment?.serviceAreas} />
          </>
        );
      }
      case 'Industry': {
        const d = details as IndustryDetails;
        return (
          <>
            <DetailItem label="Company Type" value={d.companyType} />
            <DetailItem label="GST Number" value={d.gstNumber} />
            <DetailItem label="Incorporation Number" value={d.incorporationNumber} />
            <Separator />
            <h4 className="font-semibold text-lg">Operations</h4>
            <DetailItem label="Processing Capacity (Tonnes/Day)" value={d.operations?.processingCapacityTonnesPerDay} />
            <DetailItem label="Waste Types Required" value={d.operations?.wasteRequirements?.wasteTypes} />
            <DetailItem label="Monthly Requirement (Tonnes)" value={d.operations?.wasteRequirements?.monthlyRequirementTonnes} />
          </>
        );
      }
      case 'Government': {
        const d = details as GovernmentDetails;
        return (
          <>
            <DetailItem label="Authority Type" value={d.authorityType} />
            <DetailItem label="Department" value={d.department} />
            <DetailItem label="Jurisdiction Area" value={d.jurisdictionArea} />
          </>
        );
      }
      default:
        return <p>No additional details available.</p>;
    }
  };

  return (
    <Card>
       <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Avatar className="h-16 w-16">
                <AvatarImage src={userProfile.avatarUrl} alt={userProfile.name} />
                <AvatarFallback>{fallback}</AvatarFallback>
              </Avatar>
              <Button
                variant="outline"
                size="icon"
                className="absolute inset-0 m-auto h-8 w-8 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => fileInputRef.current?.click()}
              >
                <Pencil className="h-4 w-4" />
                <span className="sr-only">Edit Image</span>
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleImageChange}
              />
            </div>
            <div>
              <CardTitle className="font-headline text-2xl">{userProfile.name}</CardTitle>
              <CardDescription>{userProfile.role}</CardDescription>
            </div>
          </div>
           <Button
            variant="outline"
            size="icon"
            onClick={onEdit}
          >
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Edit Profile</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
            <DetailItem label="Email" value={userProfile.email} />
            {userProfile.mobile && <DetailItem label="Mobile" value={userProfile.mobile} />}
            {user && <DetailItem label="User ID" value={user.uid} />}
            <DetailItem label="Wallet Address" value={userProfile.walletAddress} />
        </div>
        <Separator />
        <div className="space-y-4">
            {renderDetails()}
        </div>
      </CardContent>
    </Card>
  );
}
