import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { PayScreen } from "@/components/payment/pay-screen";
import { SiteHeader } from "@/components/site/site-header";
import { buttonClasses, EmptyState } from "@/components/ui";
import { requireRole } from "@/server/auth";
import { getOrderView } from "@/server/orders/order-view";
import { createServerClient } from "@/server/supabase/server";

export const metadata = { title: "Pay" };

export default async function PayPage({ params }: PageProps<"/pay/[orderId]">) {
  await connection();
  const { orderId } = await params;
  await requireRole(["customer"], `/pay/${orderId}`);
  const order = await getOrderView(await createServerClient(), orderId);
  if (!order) notFound();
  if (order.status !== "awaiting_payment" && order.status !== "expired") redirect(`/orders/${order.id}`);

  return (
    <>
      <SiteHeader />
      {order.status === "expired" ? (
        <main className="mx-auto w-full max-w-xl px-5 pt-16">
          <EmptyState
            title="This order expired"
            body="Unpaid orders are released after 15 minutes so the kitchen never cooks for nobody. No money was taken."
            action={
              <Link href="/checkout" className={buttonClasses("primary", "lg")}>
                Start again
              </Link>
            }
          />
        </main>
      ) : (
        <PayScreen order={order} />
      )}
    </>
  );
}
