import { LogoutButton } from "@/components/logout-button";

export default function SettingsPage() {
  return (
    <main className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
          Settings
        </h1>
        <p className="max-w-2xl text-sm text-[var(--text-secondary)]">
          Notification channels, platform overrides, and sync interval controls
          arrive in later phases.
        </p>
      </div>
      <LogoutButton />
    </main>
  );
}
