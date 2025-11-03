
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, User, Truck, Building, Landmark } from 'lucide-react';
import type { Role } from '@/lib/types';

const roles: { name: Role; description: string; icon: React.ReactNode; href: string }[] = [
  {
    name: 'Farmer',
    description: 'Register to sell your produce and agricultural waste.',
    icon: <User className="h-8 w-8 text-accent" />,
    href: '/register/farmer',
  },
  {
    name: 'Transporter',
    description: 'Join the network to transport shipments.',
    icon: <Truck className="h-8 w-8 text-accent" />,
    href: '/register/transporter',
  },
  {
    name: 'Industry',
    description: 'Sign up to purchase agricultural resources.',
    icon: <Building className="h-8 w-8 text-accent" />,
    href: '/register/industry',
  },
  {
    name: 'Government',
    description: 'Register for oversight and analytics access.',
    icon: <Landmark className="h-8 w-8 text-accent" />,
    href: '/register/government',
  },
];

export default function RegisterPage() {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="font-headline text-2xl">Join AgriChain</CardTitle>
        <CardDescription>Choose your role to get started.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {roles.map((role) => (
          <Link href={role.href} key={role.name} passHref>
            <div className="group flex items-center gap-4 rounded-lg border p-4 transition-all hover:bg-secondary hover:shadow-md cursor-pointer">
              {role.icon}
              <div className="flex-1">
                <h3 className="font-headline font-semibold">{role.name}</h3>
                <p className="text-sm text-muted-foreground">{role.description}</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        ))}
         <div className="mt-4 text-center text-sm">
          Already have an account?{' '}
          <Link href="/login" className="underline text-accent">
            Login
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
