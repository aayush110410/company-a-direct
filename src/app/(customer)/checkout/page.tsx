import { CheckoutScreen } from "@/components/checkout/checkout-screen";
import { SiteHeader } from "@/components/site/site-header";
import { requireRole } from "@/server/auth";

export const metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const session = await requireRole(["customer"], "/checkout");
  return (
    <>
      <SiteHeader />
      <CheckoutScreen defaultPhone={session.phone?.replace("+91", "") ?? ""} />
    </>
  );
}
