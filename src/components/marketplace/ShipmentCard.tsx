'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { Shipment } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, ArrowRight, Truck, Weight } from 'lucide-react';
import { useState } from 'react';

const statusColors: { [key in Shipment['status']]: string } = {
  'Pending': "bg-yellow-100 text-yellow-800 border-yellow-300",
  'OfferMade': "bg-cyan-100 text-cyan-800 border-cyan-300",
  'AwaitingPayment': "bg-orange-100 text-orange-800 border-orange-300",
  'ReadyForPickup': "bg-blue-100 text-blue-800 border-blue-300",
  'In-Transit': "bg-indigo-100 text-indigo-800 border-indigo-300",
  'Claimed': "bg-teal-100 text-teal-800 border-teal-300",
  'Delivered': "bg-green-100 text-green-800 border-green-300",
  'Verified': "bg-emerald-100 text-emerald-800 border-emerald-300",
  'Cancelled': "bg-red-100 text-red-800 border-red-300",
  'Disputed': "bg-purple-100 text-purple-800 border-purple-300",
};

export function ShipmentCard({ shipment }: { shipment: Shipment }) {
  const ipfsGateway =
    process.env.NEXT_PUBLIC_PINATA_GATEWAY || "https://gateway.pinata.cloud";

  // ✅ Normalize image URL safely
  let imageUrl = shipment.imageUrl?.trim() || "";
  if (!imageUrl.startsWith("http")) {
    imageUrl = `${ipfsGateway}/ipfs/${imageUrl}`;
  } else if (!imageUrl.startsWith("https://")) {
    imageUrl = `https://${imageUrl}`;
  }

  const [imgSrc, setImgSrc] = useState(imageUrl || '/default-shipment.jpg');

  return (
    <Card className="flex flex-col h-full overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1">
      <CardHeader className="p-0">
        <div className="relative h-48 w-full bg-gray-100">
          <Image
            src={imgSrc}
            alt={shipment.content || "Shipment image"}
            fill
            className="object-contain"
            data-ai-hint={shipment.imageHint}
            onError={() => setImgSrc('/default-shipment.jpg')}
          />
          <Badge
            className={`absolute top-2 right-2 ${statusColors[shipment.status] || 'bg-gray-500 text-white'}`}
          >
            {shipment.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 flex-1">
        <CardTitle className="font-headline text-lg mb-2">
          {shipment.content} - {shipment.quantity}
        </CardTitle>
        <CardDescription className="text-sm">
          From: {shipment.farmerName}
        </CardDescription>

        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 shrink-0" />
          <span>{shipment.origin}</span>
          {shipment.destination && (
            <>
              <ArrowRight className="h-4 w-4 shrink-0" />
              <MapPin className="h-4 w-4 shrink-0" />
              <span>{shipment.destination}</span>
            </>
          )}
        </div>

        {shipment.transporterId && (
          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Truck className="h-4 w-4 shrink-0" />
            <span>In-transit with {shipment.transporterId}</span>
          </div>
        )}

        {shipment.weighments && shipment.weighments.length > 0 && (
            <div className="mt-4 pt-4 border-t border-dashed">
                <h4 className="font-headline text-md font-semibold mb-2 flex items-center">
                    <Weight className="h-5 w-5 mr-2 text-primary"/> Verified Weighments
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                    {shipment.weighments.map((w, index) => (
                        <li key={index} className="flex justify-between">
                            <span>{w.weight} kg</span>
                            <span className="text-xs">({new Date(w.timestamp).toLocaleDateString()})</span>
                        </li>
                    ))}
                </ul>
            </div>
        )}

      </CardContent>

      <CardFooter className="p-4 bg-secondary/50 flex justify-between items-center">
        <div className="font-bold text-lg font-headline">
          {shipment.askPrice.toLocaleString()}AGT
        </div>
        <Button asChild size="sm">
          <Link href={`/dashboard/shipments/${shipment.id}`}>View Details</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
