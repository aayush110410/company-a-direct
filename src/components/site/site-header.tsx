import Link from "next/link";
import { signOut } from "@/app/(auth)/actions";
import { getSession } from "@/server/auth";
import { latestOpenOrderId } from "@/server/orders/order-view";
import { createServerClient } from "@/server/supabase/server";
import { CartLink } from "./cart-link";

/** Quiet top bar: the wordmark, the way back to a live order, the cart, and who is signed in. */
export async function SiteHeader({ overlay = false }: { overlay?: boolean }) {
  const session = await getSession();
  const openOrder = session?.role === "customer" ? await latestOpenOrderId(await createServerClient(), session.userId) : null;
  return (
    <header
      className={
        overlay
          ? "absolute inset-x-0 top-0 z-20"
          : "sticky top-0 z-30 border-b border-seam bg-bg/90 backdrop-blur-md supports-[backdrop-filter]:bg-bg/75"
      }
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
        <Link href="/" className="text-[0.8125rem] font-semibold tracking-[0.32em] uppercase">
          Company A
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {openOrder && (
            <Link
              href={`/orders/${openOrder}`}
              aria-label="Track order"
              className="flex min-h-11 items-center gap-2 rounded-lg px-3 font-medium text-fg"
            >
              <span aria-hidden className="size-1.5 rounded-full bg-fg" />
              Track<span className="max-[399px]:hidden"> order</span>
            </Link>
          )}
          <CartLink />
          {session ? (
            <form action={signOut}>
              <button type="submit" className="flex min-h-11 items-center rounded-lg px-3 text-muted hover:text-fg">
                Sign out
              </button>
            </form>
          ) : (
            <Link href="/sign-in" className="flex min-h-11 items-center rounded-lg px-3 text-muted hover:text-fg">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
