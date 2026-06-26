import { cn } from "@/lib/utils";

export function WaveDivider({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1200 32"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("w-full h-8 block", className)}
      preserveAspectRatio="none"
      aria-hidden
    >
      <path
        d="M0,16 C200,32 400,0 600,16 C800,32 1000,0 1200,16"
        fill="none"
        stroke="hsl(var(--primary-soft))"
        strokeWidth="1.5"
        opacity="0.5"
      />
    </svg>
  );
}
