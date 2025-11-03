'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// This page now simply acts as a redirector to the new admin section.
export default function AdminRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin');
  }, [router]);

  return (
    <div className="flex h-full w-full items-center justify-center p-8">
        <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <p>Redirecting to the Admin Console...</p>
        </div>
    </div>
  );
}