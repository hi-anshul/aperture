import type { PlatformType } from "@aperture/shared";

const PLATFORM_LABELS: Record<PlatformType, string> = {
  greenhouse: "Greenhouse",
  lever: "Lever",
  ashby: "Ashby",
  workday: "Workday",
  smartrecruiters: "SmartRecruiters",
  "static-html": "Static HTML",
  "react-rendered": "React",
  linkedin: "LinkedIn",
  indeed: "Indeed",
  naukri: "Naukri",
  unknown: "Unknown",
};

export function formatPlatformLabel(platform: string): string {
  return PLATFORM_LABELS[platform as PlatformType] ?? platform;
}

export function formatSyncStatus(status: string | null | undefined): string {
  if (!status) {
    return "Never synced";
  }

  switch (status) {
    case "success":
      return "Synced";
    case "failed":
      return "Sync failed";
    case "running":
      return "Syncing";
    default:
      return status;
  }
}

export function formatSyncTimestamp(value: string | null): string {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
