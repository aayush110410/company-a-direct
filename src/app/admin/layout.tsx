import Link from "next/link";
import { signOut } from "@/app/(auth)/actions";
import { AdminNav } from "@/components/admin/admin-nav";
import { requireRole } from "@/server/auth";

export const metadata = { title: { default: "Admin", template: "%s · Admin · Company A" } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const session = await requireRole(["admin"], "/admin/menu");
  return (
    <div data-theme="paper" className="min-h-dvh bg-bg text-fg">
      <header className="border-b border-seam bg-surface">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-5">
          <Link href="/admin/menu" className="text-[0.8125rem] font-semibold tracking-[0.32em] uppercase">
            Company A
          </Link>
          <AdminNav />
          <div className="ml-auto flex items-center gap-2 text-sm text-muted">
            <span className="hidden sm:inline">{session.fullName}</span>
            <form action={signOut}>
              <button type="submit" className="min-h-11 rounded-lg px-3 hover:text-fg">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-5 py-8">{children}</div>
    </div>
  );
}
