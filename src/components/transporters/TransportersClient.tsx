
'use client';

import type { User } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

export function TransportersClient({ transporters }: { transporters: User[] }) {

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Transporter Network</CardTitle>
        <CardDescription>
          Browse the details of verified transporters.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Vehicle Type</TableHead>
              <TableHead>Service Areas</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Wallet Address</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transporters.length > 0 ? transporters.map(transporter => (
              <TableRow key={transporter.uid}>
                <TableCell>
                    <div className="flex items-center gap-3">
                        <Avatar>
                            <AvatarImage src={transporter.avatarUrl} alt={transporter.name} />
                            <AvatarFallback>{transporter.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{transporter.name}</span>
                    </div>
                </TableCell>
                <TableCell>{transporter.details.vehicle?.vehicleType || 'N/A'}</TableCell>
                <TableCell>{transporter.details.employment?.serviceAreas?.join(', ') || 'N/A'}</TableCell>
                <TableCell>{transporter.email}</TableCell>
                <TableCell className="font-mono text-xs">{transporter.walletAddress}</TableCell>
              </TableRow>
            )) : (
                <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">No verified transporters found.</TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
