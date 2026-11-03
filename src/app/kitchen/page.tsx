import Link from "next/link";
import { connection } from "next/server";
import { KitchenBoard } from "@/components/kitchen/board";
import { requireRole } from "@/server/auth";
import { serverEnv } from "@/server/env";
import { getBoard, getStockList } from "@/server/repo/kitchen";
import { getOutletById, getOutletBySlug, getOutlets } from "@/server/repo/outlets";
import { createServerClient } from "@/server/supabase/server";

export default async function KitchenPage({ searchParams }: PageProps<"/kitchen">) {
  await connection();
  const session = await requireRole(["kitchen_staff", "outlet_manager", "admin"], "/kitchen");
  const { outlet: slug } = await searchParams;

  const outlet =
    session.role === "admin"
      ? typeof slug === "string"
        ? await getOutletBySlug(slug)
        : null
      : session.outletId
        ? await getOutletById(session.outletId)
        : null;

  if (!outlet) {
    // Admins pick which kitchen to watch.
    const outlets = session.role === "admin" ? await getOutlets() : [];
    return (
      <main className="mx-auto max-w-3xl p-8">
        <h1 className="font-display text-4xl">Choose a kitchen</h1>
        <ul className="mt-6 grid gap-2 sm:grid-cols-2">
          {outlets.map((o) => (
            <li key={o.id}>
              <Link href={`/kitchen?outlet=${o.slug}`} className="flex min-h-16 items-center rounded-xl border border-seam px-5 text-lg hover:border-accent">
                {o.name}
              </Link>
            </li>
          ))}
        </ul>
      </main>
    );
  }

  const supabase = await createServerClient();
  const [initial, stock] = await Promise.all([getBoard(supabase, outlet.id), getStockList(supabase, outlet.id)]);

  return (
    <KitchenBoard
      outlet={{ id: outlet.id, name: outlet.name }}
      initial={initial}
      stock={stock}
      role={session.role as "kitchen_staff" | "outlet_manager" | "admin"}
      staffName={session.fullName}
      demo={serverEnv().DEMO_MODE}
    />
  );
}
