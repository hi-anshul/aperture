import { WatchlistView } from "@/components/watchlist/watchlist-view";
import { fetchWatchlists } from "@/lib/api/watchlists";

export default async function WatchlistPage() {
  try {
    const { watchlists } = await fetchWatchlists();

    return <WatchlistView initialWatchlists={watchlists} />;
  } catch {
    return (
      <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-6 py-8 text-center">
        <p className="text-sm font-medium text-[var(--text-primary)]">
          Unable to load watchlist
        </p>
        <p className="max-w-md text-sm text-[var(--text-muted)]">
          The watchlist could not be fetched. Check that the API is running and
          try refreshing the page.
        </p>
      </main>
    );
  }
}
