import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const NAV_LINKS: Array<{ href: string; label: string }> = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/boards", label: "Boards" },
  { href: "/chat", label: "Chat" },
  { href: "/schedule", label: "Schedule" },
  { href: "/notifications", label: "Notifications" },
  { href: "/admin/users", label: "Admin" },
];

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 flex-col border-r bg-slate-50 p-4">
        <div className="mb-6 text-lg font-semibold">Nexus</div>
        <nav className="flex flex-1 flex-col gap-1 text-sm">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded px-2 py-1.5 hover:bg-slate-200"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="mt-4 border-t pt-4 text-xs">
          <div className="mb-2 truncate text-muted-foreground" title={user.email ?? ""}>
            {user.email}
          </div>
          <form action="/logout" method="post">
            <button
              type="submit"
              className="w-full rounded bg-slate-200 px-2 py-1.5 text-left hover:bg-slate-300"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
