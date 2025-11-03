'use client';

import { useState } from 'react';
import type { Shipment } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { ShipmentCard } from './ShipmentCard';
import { Search } from 'lucide-react';

export function MarketplaceClient({ shipments }: { shipments: Shipment[] }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredShipments = shipments.filter(shipment =>
    shipment.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    shipment.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (shipment.destination && shipment.destination.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by content, origin, or destination..."
          className="pl-10 w-full md:w-1/2 lg:w-1/3"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      {filteredShipments.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredShipments.map(shipment => (
            <ShipmentCard key={shipment.id} shipment={shipment} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <h3 className="font-headline text-xl">No Shipments Found</h3>
          <p className="text-muted-foreground">There are no shipments matching your criteria.</p>
        </div>
      )}
    </div>
  );
}
