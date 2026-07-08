import {
  Bookmark,
  Briefcase,
  Building2,
  FileText,
  LayoutDashboard,
  Settings,
  Star,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/companies", label: "Companies", icon: Building2 },
  { href: "/watchlist", label: "Watchlist", icon: Star },
  { href: "/saved", label: "Saved", icon: Bookmark },
  { href: "/resume", label: "Resume", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];
