'use client';

import { useState } from 'react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { CreateListingForm } from '../../components/farm/CreateListingForm';

export function ListingsClient({ farmerDistrict }: { farmerDistrict?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" className="mb-4 gap-2" onClick={() => setOpen(true)}>
        + Post a Listing
      </Button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title="Post a Listing">
        <CreateListingForm farmerDistrict={farmerDistrict} />
      </BottomSheet>
    </>
  );
}
