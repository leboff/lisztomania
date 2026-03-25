import { AuthGuard } from "@/components/layout/AuthGuard";
import { BottomNav } from "@/components/layout/BottomNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen flex-col pb-24">
        {children}
      </div>
      <BottomNav />
    </AuthGuard>
  );
}
