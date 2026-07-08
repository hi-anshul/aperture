import { AppNavbar, AppSidebar } from "./app-shell";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <AppNavbar />
      <div className="flex min-h-0 flex-1">
        <AppSidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}
