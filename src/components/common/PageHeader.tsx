import { cn } from "@/lib/utils";

export function PageHeader({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <header className={cn("p-4 sm:p-6 md:p-8 border-b bg-background/50 backdrop-blur-sm", className)}>
      <div className="space-y-1.5">{children}</div>
    </header>
  );
}

export function PageHeaderHeading({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <h1 className={cn("font-headline text-2xl sm:text-3xl font-bold tracking-tight", className)}>
      {children}
    </h1>
  );
}

export function PageHeaderDescription({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <p className={cn("max-w-2xl text-base text-muted-foreground", className)}>
      {children}
    </p>
  );
}
