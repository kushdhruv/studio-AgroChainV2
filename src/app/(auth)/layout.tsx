import Link from 'next/link';
import { AppLogo } from '@/components/common/AppLogo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Link href="/" className="flex items-center gap-2" aria-label="AgriChain Home">
            <AppLogo className="h-8 w-8" />
            <span className="font-headline text-3xl font-bold text-gray-800">AgriChain</span>
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}
