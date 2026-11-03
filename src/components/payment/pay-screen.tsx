"use client";

import { CreditCard, FlaskConical, ShieldCheck, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { payAction } from "@/app/(customer)/actions";
import { Button, Field, Price, Segmented } from "@/components/ui";
import { useCart } from "@/lib/cart/store";
import type { OrderView } from "@/server/orders/order-view";

const luhn = (digits: string) =>
  digits
    .split("")
    .reverse()
    .map(Number)
    .reduce((sum, d, i) => sum + (i % 2 ? (d * 2 > 9 ? d * 2 - 9 : d * 2) : d), 0) %
    10 ===
  0;

/** Test-mode gateway: looks and behaves like a payment step, moves no money. */
export function PayScreen({ order }: { order: OrderView }) {
  const router = useRouter();
  const cart = useCart();
  const [method, setMethod] = useState<"upi" | "card">(order.paymentMethod);
  const [vpa, setVpa] = useState("demo@upi");
  const [card, setCard] = useState("4242 4242 4242 4242");
  const [notice, setNotice] = useState<string | null>(order.paymentStatus === "failed" ? "Your last attempt failed. No money was taken." : null);
  const [pending, start] = useTransition();

  const cardDigits = card.replace(/\D/g, "");
  const cardValid = cardDigits.length >= 13 && cardDigits.length <= 19 && luhn(cardDigits);
  const vpaValid = /^[\w.-]{2,}@[a-z]{2,}$/i.test(vpa.trim());
  const ready = method === "upi" ? vpaValid : cardValid;

  const pay = (outcome: "succeed" | "fail" | "timeout") =>
    start(async () => {
      const r = await payAction({ orderId: order.id, outcome });
      if (!r.ok) {
        toast.error(r.error);
        router.refresh();
        return;
      }
      if (r.data.status === "awaiting_payment") {
        setNotice(r.data.message ?? null);
        return;
      }
      cart.clear();
      router.push(`${r.data.redirectTo}?new=1`);
    });

  return (
    <main className="mx-auto w-full max-w-lg px-5 pt-10 pb-24">
      <p role="note" className="flex items-center gap-2 rounded-xl border border-risk/50 px-4 py-3 text-sm text-risk">
        <FlaskConical className="size-4 shrink-0" aria-hidden />
        Test mode: no money moves. Use the buttons below to try success, failure or a timeout.
      </p>

      <h1 className="mt-8 font-display text-4xl leading-tight">
        Pay <Price paise={order.totalPaise} />
      </h1>
      <p className="mt-2 text-muted">
        Order {order.id} · {order.outletName} kitchen · includes <Price paise={order.gstPaise} /> GST
      </p>

      <div className="mt-8 flex flex-col gap-6">
        <Segmented
          label="Payment method"
          value={method}
          onChange={setMethod}
          options={[
            { value: "upi", label: "UPI" },
            { value: "card", label: "Card" },
          ]}
        />

        {method === "upi" ? (
          <div className="flex flex-col gap-3">
            <Field label="UPI ID" value={vpa} onChange={(e) => setVpa(e.target.value)} autoComplete="off" error={vpaValid ? undefined : "Enter a UPI ID like name@bank"} />
            <p className="flex items-center gap-2 text-sm text-muted">
              <Smartphone className="size-4" aria-hidden />
              You&rsquo;d approve the request in your UPI app. In test mode it&rsquo;s approved instantly.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <Field
              label="Card number"
              inputMode="numeric"
              autoComplete="cc-number"
              value={card}
              onChange={(e) => setCard(e.target.value)}
              error={cardValid ? undefined : "That card number doesn't look right"}
              hint="Test card prefilled. Card details never leave this page."
            />
            <p className="flex items-center gap-2 text-sm text-muted">
              <CreditCard className="size-4" aria-hidden />
              Any future expiry and CVV work in test mode.
            </p>
          </div>
        )}

        {notice && (
          <p role="alert" className="rounded-xl border border-danger/50 px-4 py-3 text-danger">
            {notice}
          </p>
        )}

        <Button size="lg" className="w-full" disabled={!ready} loading={pending} onClick={() => pay("succeed")}>
          Pay <Price paise={order.totalPaise} />
        </Button>

        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted">
          <span>Simulate:</span>
          <button type="button" disabled={pending} onClick={() => pay("fail")} className="min-h-11 underline underline-offset-4 hover:text-fg">
            A failed payment
          </button>
          <button type="button" disabled={pending} onClick={() => pay("timeout")} className="min-h-11 underline underline-offset-4 hover:text-fg">
            A timeout
          </button>
        </div>

        <p className="flex items-center justify-center gap-2 text-xs text-muted">
          <ShieldCheck className="size-3.5" aria-hidden />
          Unpaid orders are released after 15 minutes and never reach the kitchen.
        </p>
      </div>
    </main>
  );
}
