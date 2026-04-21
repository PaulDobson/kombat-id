import { DashboardNav } from "./_components/DashboardNav";
import { NavigationProgress } from "./_components/NavigationProgress";
import { Suspense } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col">
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      <DashboardNav />
      <div className="flex-1">{children}</div>
    </div>
  );
}
