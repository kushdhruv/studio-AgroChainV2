'use client';

import type { Shipment } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '../ui/button';

const statusColors: { [key in Shipment['status']]: string } = {
    Pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
    OfferMade: "bg-cyan-100 text-cyan-800 border-cyan-300",
    AwaitingPayment: "bg-orange-100 text-orange-800 border-orange-300",
    ReadyForPickup: "bg-blue-100 text-blue-800 border-blue-300",
    "In-Transit": "bg-indigo-100 text-indigo-800 border-indigo-300",
    Claimed: "bg-amber-100 text-amber-800 border-amber-300",
    Delivered: "bg-green-100 text-green-800 border-green-300",
    Verified: "bg-emerald-100 text-emerald-800 border-emerald-300",
    Cancelled: "bg-red-100 text-red-800 border-red-300",
    Disputed: "bg-purple-100 text-purple-800 border-purple-300",
};

export function OversightClient({ shipments }: { shipments: Shipment[] }) {
  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">All Shipments</CardTitle>
        </CardHeader>
        <CardContent>
          {shipments.length === 0 ? (
             <div className="text-center py-12">
                <p className="text-muted-foreground">No shipments found in the system.</p>
             </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shipment ID</TableHead>
                  <TableHead>Content</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shipments.map(shipment => (
                  <TableRow key={shipment.id}>
                    <TableCell className="font-medium">{shipment.id.slice(0,10)}...</TableCell>
                    <TableCell>{shipment.content}</TableCell>
                    <TableCell>{shipment.origin} {shipment.destination ? `→ ${shipment.destination}` : ''}</TableCell>
                    <TableCell><Badge className={statusColors[shipment.status]}>{shipment.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                          <Link href={`/dashboard/shipments/${shipment.id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
