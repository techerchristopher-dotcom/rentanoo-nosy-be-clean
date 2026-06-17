import { Link, useLocation } from "react-router-dom";
import {
  Calendar,
  Car,
  ClipboardList,
  LayoutDashboard,
  Menu,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";

type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }> };
type NavGroup = { title: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Général",
    items: [{ to: "/me/dashboard", label: "Tableau de bord", icon: LayoutDashboard }],
  },
  {
    title: "Mes locations",
    items: [
      { to: "/me/owner/vehicles", label: "Mes véhicules", icon: Car },
      { to: "/me/owner/bookings", label: "Mes réservations", icon: ClipboardList },
      { to: "/me/owner/requests", label: "Demandes", icon: MessageCircle },
    ],
  },
  {
    title: "En tant que locataire",
    items: [{ to: "/me/renter/bookings", label: "Mes réservations", icon: Calendar }],
  },
];

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();

  return (
    <nav className="flex flex-col gap-4 py-2">
      {NAV_GROUPS.map((group) => (
        <div key={group.title}>
          <p className="px-3 mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {group.title}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active =
                location.pathname === item.to ||
                (item.to !== "/me/dashboard" && location.pathname.startsWith(item.to));
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function OwnerSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile drawer */}
      <div className="lg:hidden mb-4">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm">
              <Menu className="h-4 w-4 mr-2" />
              Mon espace
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 overflow-y-auto">
            <NavContent onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-56 shrink-0 border-r border-border pr-4">
        <NavContent />
      </aside>
    </>
  );
}
