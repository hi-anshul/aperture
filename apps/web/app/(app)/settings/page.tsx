import { SettingsView } from "@/components/settings/settings-view";
import { fetchSettings } from "@/lib/api/settings";

export default async function SettingsPage() {
  try {
    const settings = await fetchSettings();

    return <SettingsView initialSettings={settings} />;
  } catch {
    return (
      <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-6 py-8 text-center">
        <p className="text-sm font-medium text-[var(--text-primary)]">
          Unable to load settings
        </p>
        <p className="max-w-md text-sm text-[var(--text-muted)]">
          Settings could not be fetched. Check that the API is running and try
          refreshing the page.
        </p>
      </main>
    );
  }
}
