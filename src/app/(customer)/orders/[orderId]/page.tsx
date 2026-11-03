import { notFound } from "next/navigation";
import { connection } from "next/server";
import { OrderStatusScreen } from "@/components/order/order-status-screen";
import { SiteHeader } from "@/components/site/site-header";
import { requireRole } from "@/server/auth";
import { countTicketsAhead, getOrderView } from "@/server/orders/order-view";
import { createAdminClient } from "@/server/supabase/admin";
import { createServerClient } from "@/server/supabase/server";

export const metadata = { title: "Your order" };

export default async function OrderPage({ params, searchParams }: PageProps<"/orders/[orderId]">) {
  await connection();
  const { orderId } = await params;
  await requireRole(["customer"], `/orders/${orderId}`);
  const order = await getOrderView(await createServerClient(), orderId);
  if (!order) notFound();
  const ticketsAhead = await countTicketsAhead(createAdminClient(), orderId);
  const { new: fresh } = await searchParams;

  return (
    <>
      <SiteHeader />
      <OrderStatusScreen initial={{ ...order, ticketsAhead }} justPaid={fresh === "1"} />
    </>
  );
}
