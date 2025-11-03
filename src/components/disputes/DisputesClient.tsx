
'use client';

import type { Dispute } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '../ui/button';

const statusColors: { [key in Dispute['status']]: string } = {
    Open: "bg-red-100 text-red-800 border-red-300",
    Resolved: "bg-green-100 text-green-800 border-green-300",
    Rejected: "bg-gray-100 text-gray-800 border-gray-300",
};

export function DisputesClient({ disputes }: { disputes: Dispute[] }) {

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">All Disputes</CardTitle>
        <CardDescription>
          List of all open and resolved disputes you have access to.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dispute ID</TableHead>
              <TableHead>Shipment ID</TableHead>
              <TableHead>Raised By</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {disputes.length > 0 ? disputes.map(dispute => (
              <TableRow key={dispute.id}>
                <TableCell className="font-mono text-xs">{dispute.id.slice(0, 10)}...</TableCell>
                <TableCell className="font-mono text-xs">
                    <Link href={`/dashboard/shipments/${dispute.shipmentId}`} className="underline hover:text-accent">
                        {dispute.shipmentId.slice(0, 10)}...
                    </Link>
                </TableCell>
                <TableCell className="font-mono text-xs">{dispute.raiserId.slice(0, 10)}...</TableCell>
                <TableCell className="max-w-xs truncate">{dispute.reason}</TableCell>
                <TableCell><Badge className={statusColors[dispute.status]}>{dispute.status}</Badge></TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="ghost" size="sm">
                      <Link href={`/dashboard/disputes/${dispute.id}`}>View</Link>
                  </Button>
                </TableCell>
              </TableRow>
            )) : (
                <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">No disputes found.</TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
