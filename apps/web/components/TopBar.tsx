"use client";

import { useRouter } from "next/navigation";
import { Button } from "@pr-pilot/ui";
import { useAuth } from "../lib/auth-context";

export function TopBar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
      <span className="text-sm text-slate-500">{user?.email}</span>
      <Button variant="ghost" onClick={handleLogout}>
        Sign out
      </Button>
    </header>
  );
}
