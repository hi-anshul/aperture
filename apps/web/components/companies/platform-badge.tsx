import { Badge } from "@/components/ui/badge";
import { formatPlatformLabel } from "@/lib/companies/format";
import { cn } from "@/lib/utils";

interface PlatformBadgeProps {
  platform: string;
  className?: string;
}

export function PlatformBadge({ platform, className }: PlatformBadgeProps) {
  const isUnknown = platform === "unknown";

  return (
    <Badge
      variant="outline"
      className={cn(
        "border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]",
        isUnknown && "text-[var(--state-warning)]",
        className,
      )}
    >
      {formatPlatformLabel(platform)}
    </Badge>
  );
}
