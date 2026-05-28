import { cn } from "@/lib/utils";

type AdminBookingBadgeProps = {
  className?: string;
};

export function AdminBookingBadge({ className }: AdminBookingBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 border border-amber-200",
        className
      )}
    >
      Résa admin
    </span>
  );
}
