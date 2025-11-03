import { cn } from '@/lib/utils';

export function AppLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={cn("h-10 w-10", className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M62.5 37.5C62.5 29.2157 55.7843 22.5 47.5 22.5C39.2157 22.5 32.5 29.2157 32.5 37.5C32.5 45.7843 39.2157 52.5 47.5 52.5"
        stroke="hsl(var(--accent))"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M37.5 62.5C37.5 70.7843 44.2157 77.5 52.5 77.5C60.7843 77.5 67.5 70.7843 67.5 62.5C67.5 54.2157 60.7843 47.5 52.5 47.5"
        stroke="hsl(var(--accent))"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M50 50C50 63.8071 38.8071 75 25 75C11.1929 75 0 63.8071 0 50C0 36.1929 11.1929 25 25 25"
        stroke="hsl(var(--primary))"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
