import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AppLogo } from '@/components/common/AppLogo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Package, Truck, University } from 'lucide-react';
import { placeholderImages } from '@/lib/placeholder-images';

const features = [
  {
    icon: <Package className="h-10 w-10 text-accent" />,
    title: 'Transparent Supply Chain',
    description: 'Farmers can mint NFTs for他們的 produce, creating a digital record from farm to fork.',
  },
  {
    icon: <Truck className="h-10 w-10 text-accent" />,
    title: 'Efficient Logistics',
    description: 'Transporters can seamlessly manage shipments and provide real-time updates.',
  },
  {
    icon: <University className="h-10 w-10 text-accent" />,
    title: 'Verified Sourcing',
    description: 'Industries can procure produce with confidence, backed by verifiable on-chain data.',
  },
  {
    icon: <CheckCircle className="h-10 w-10 text-accent" />,
    title: 'Government Oversight',
    description: 'Authorities get a transparent view of the supply chain, with AI-powered anomaly detection.',
  },
];

export default function Home() {
  const heroImage = placeholderImages.find(p => p.id === 'hero-background');

  return (
    <div className="flex flex-col min-h-screen">
      <header className="py-4 px-4 md:px-6 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2" aria-label="AgriChain Home">
            <AppLogo />
            <span className="font-headline text-2xl font-bold text-gray-800">AgriChain</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" className="font-headline">
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild className="font-headline bg-accent text-accent-foreground hover:bg-accent/90">
              <Link href="/register">Register</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative w-full h-[60vh] md:h-[70vh] flex items-center justify-center text-center">
          {heroImage && (
             <Image
              src={heroImage.imageUrl}
              alt={heroImage.description}
              fill
              className="object-cover"
              priority
              data-ai-hint={heroImage.imageHint}
            />
          )}
          <div className="absolute inset-0 bg-background/50" />
          <div className="relative z-10 container px-4 md:px-6">
            <h1 className="font-headline text-4xl md:text-6xl font-bold tracking-tighter text-card-foreground">
              Revolutionizing Agriculture, One Shipment at a Time.
            </h1>
            <p className="mt-4 max-w-2xl mx-auto text-lg md:text-xl text-card-foreground/80">
              AgriChain connects farmers, transporters, and industries on a transparent, secure, and efficient blockchain platform.
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <Button asChild size="lg" className="font-headline bg-accent text-accent-foreground hover:bg-accent/90">
                <Link href="/register">Get Started</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="font-headline bg-background/80">
                <Link href="#features">Learn More</Link>
              </Button>
            </div>
          </div>
        </section>

        <section id="features" className="py-16 md:py-24">
          <div className="container px-4 md:px-6">
            <div className="text-center">
              <h2 className="font-headline text-3xl md:text-4xl font-bold tracking-tight">A New Era for Agri-Tech</h2>
              <p className="mt-4 max-w-3xl mx-auto text-lg text-muted-foreground">
                Our platform provides end-to-end traceability and trust for the entire agricultural value chain.
              </p>
            </div>
            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => (
                <Card key={feature.title} className="text-center bg-card/80 backdrop-blur-sm">
                  <CardHeader className="items-center">
                    {feature.icon}
                    <CardTitle className="font-headline mt-4">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="py-6 bg-muted">
        <div className="container mx-auto px-4 md:px-6 text-center text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} AgriChain. All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  );
}
