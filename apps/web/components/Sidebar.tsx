"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GitBranch, KeyRound, LayoutDashboard, ScrollText, TerminalSquare } from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/repos", label: "Repositories", icon: GitBranch },
  { href: "/dashboard/api-keys", label: "API Keys", icon: KeyRound },
  { href: "/dashboard/playground", label: "Playground", icon: TerminalSquare },
  { href: "/dashboard/audit-log", label: "Audit Log", icon: ScrollText },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex w-56 shrink-0 flex-col gap-1 border-r border-slate-200 bg-white p-4">
      <span className="mb-4 px-2 text-lg font-bold text-brand-700">PR-Pilot</span>
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Icon size={16} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
