import { Outlet } from "react-router-dom";
import { RequireAdmin } from "@/components/admin/RequireAdmin";
import { Footer } from "@/components/layout/footer";
import { BackOfficeSidebar } from "@/features/back-office/components/BackOfficeSidebar";

export default function AdminLayout() {
  return (
    <RequireAdmin>
      <div className="min-h-screen bg-gradient-to-br from-background via-primary-soft/5 to-secondary-soft/10 pt-20 flex flex-col">
        <div className="container mx-auto px-4 flex-1 pb-8">
          <div className="flex flex-col lg:flex-row gap-6">
            <BackOfficeSidebar />
            <main className="flex-1 min-w-0">
              <Outlet />
            </main>
          </div>
        </div>
        <Footer />
      </div>
    </RequireAdmin>
  );
}
