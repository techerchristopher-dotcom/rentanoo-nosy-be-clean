import { Link, Outlet } from "react-router-dom";
import { RequireAdmin } from "@/components/admin/RequireAdmin";
import { Footer } from "@/components/layout/footer";

export default function AdminLayout() {
  return (
    <RequireAdmin>
      <div className="min-h-screen bg-gradient-to-br from-background via-primary-soft/5 to-secondary-soft/10 pt-20 flex flex-col">
        <div className="container mx-auto px-4 flex-1 pb-8">
          <nav className="mb-6 flex flex-wrap items-center gap-3 text-sm text-muted-foreground border-b border-border pb-4">
            <Link to="/admin" className="font-medium text-foreground hover:text-primary transition-colors">
              Administration
            </Link>
            <span aria-hidden className="text-border">
              /
            </span>
            <Link to="/admin/bookings/new" className="hover:text-primary transition-colors">
              Nouvelle réservation
            </Link>
            <span aria-hidden className="text-border">
              /
            </span>
            <Link to="/admin/drafts" className="hover:text-primary transition-colors">
              Mes brouillons
            </Link>
            <span aria-hidden className="text-border">
              /
            </span>
            <Link to="/admin/planning" className="hover:text-primary transition-colors">
              Planning
            </Link>
          </nav>
          <Outlet />
        </div>
        <Footer />
      </div>
    </RequireAdmin>
  );
}
