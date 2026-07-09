"use client";

import { useState } from "react";
import { LogoutButton } from "@/components/logout-button";
import { clientUpdateSettings } from "@/lib/api/settings-client";
import type { NotificationChannel, SettingsResponse } from "@/lib/api/types";

const CHANNEL_OPTIONS: Array<{
  value: NotificationChannel;
  label: string;
  hint: string;
}> = [
  {
    value: "telegram",
    label: "Telegram",
    hint: "Delivered via bot token + chat ID from server env.",
  },
  {
    value: "email",
    label: "Email",
    hint: "Preference saved; delivery not implemented yet.",
  },
  {
    value: "push",
    label: "Push",
    hint: "Preference saved; delivery not implemented yet.",
  },
];

interface SettingsViewProps {
  initialSettings: SettingsResponse;
}

export function SettingsView({ initialSettings }: SettingsViewProps) {
  const [channel, setChannel] = useState(initialSettings.notificationChannel);
  const [threshold, setThreshold] = useState(
    String(initialSettings.matchScoreThreshold),
  );
  const [saved, setSaved] = useState(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const dirty =
    channel !== saved.notificationChannel ||
    Number(threshold) !== saved.matchScoreThreshold;

  async function handleSave() {
    if (isSaving) {
      return;
    }

    const parsedThreshold = Number.parseInt(threshold, 10);
    if (
      !Number.isInteger(parsedThreshold) ||
      parsedThreshold < 0 ||
      parsedThreshold > 100
    ) {
      setError("Match threshold must be an integer from 0 to 100.");
      setSuccess(null);
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updated = await clientUpdateSettings({
        notificationChannel: channel,
        matchScoreThreshold: parsedThreshold,
      });
      setSaved(updated);
      setChannel(updated.notificationChannel);
      setThreshold(String(updated.matchScoreThreshold));
      setSuccess("Settings saved.");
    } catch {
      setError("Could not save settings. Try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
          Settings
        </h1>
        <p className="max-w-2xl text-sm text-[var(--text-secondary)]">
          Choose how you get notified and the match score that counts as a
          high match. Telegram credentials stay on the server.
        </p>
      </div>

      <section className="max-w-xl rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)]">
        <div className="border-b border-[var(--border-default)] px-5 py-4">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Notifications
          </h2>
          <p className="text-xs text-[var(--text-muted)]">
            Watchlisted companies and high-match jobs use these preferences.
          </p>
        </div>

        <div className="flex flex-col gap-6 px-5 py-5">
          <fieldset className="flex flex-col gap-3">
            <legend className="text-sm font-medium text-[var(--text-primary)]">
              Channel
            </legend>
            <div className="flex flex-col gap-2">
              {CHANNEL_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] px-4 py-3 transition hover:border-[var(--border-strong)]"
                >
                  <input
                    type="radio"
                    name="notificationChannel"
                    value={option.value}
                    checked={channel === option.value}
                    onChange={() => setChannel(option.value)}
                    disabled={isSaving}
                    className="mt-0.5 size-4 accent-[var(--accent-primary)]"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm text-[var(--text-primary)]">
                      {option.label}
                    </span>
                    <span className="mt-0.5 block text-xs text-[var(--text-muted)]">
                      {option.hint}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-[var(--text-primary)]">
              High-match threshold
            </span>
            <span className="text-xs text-[var(--text-muted)]">
              Notify when a job scores at or above this value (0–100).
            </span>
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={threshold}
              onChange={(event) => setThreshold(event.target.value)}
              disabled={isSaving}
              className="w-28 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2 text-sm tabular-nums text-[var(--text-primary)] outline-none focus:border-[var(--border-strong)] focus:ring-2 focus:ring-[var(--focus-ring)]"
            />
          </label>

          {error ? (
            <p role="alert" className="text-sm text-[var(--state-error)]">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="text-sm text-[var(--state-success)]">{success}</p>
          ) : null}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !dirty}
              className="rounded-2xl bg-[var(--accent-primary)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition enabled:hover:opacity-90 disabled:opacity-50"
            >
              {isSaving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </section>

      <div className="max-w-xl">
        <LogoutButton />
      </div>
    </main>
  );
}
