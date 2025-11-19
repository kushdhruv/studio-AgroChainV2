'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Shipment } from '@/lib/types';

export const columns: ColumnDef<Shipment>[] = [
  {
    accessorKey: 'id',
    header: 'Shipment ID',
  },
  {
    accessorKey: 'origin',
    header: 'Origin',
  },
  {
    accessorKey: 'destination',
    header: 'Destination',
  },
  {
    accessorKey: 'status',
    header: 'Status',
  },
];
