"use client";

import { Gauge, MapPin, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { placeOrderAction, quoteOrderAction } from "@/app/(customer)/actions";
import { Button, buttonClasses, DietMark, EmptyState, Field, Price, Segmented, Skeleton, Stepper, TextAreaField } from "@/components/ui";
import { formatINR } from "@/domain/money";
import { formatIstTime } from "@/domain/time";
import { cn } from "@/lib/cn";
import { useCart } from "@/lib/cart/store";
import { useDeliveryLocation } from "@/lib/location/store";
import type { Quote } from "@/server/orders/quote";

const ADDRESS_KEY = "address:v1";

export function CheckoutScreen({ defaultPhone }: { defaultPhone: string }) {
  const router = useRouter();
  const cart = useCart();
  const { hydrated: locHydrated, location } = useDeliveryLocation();
  const [address, setAddress] = useState(() => (typeof window === "undefined" ? "" : safeGet(ADDRESS_KEY)));
  const [phone, setPhone] = useState(defaultPhone);
  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | undefined>();
  const [method, setMethod] = useState<"upi" | "card">("upi");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [placing, startPlacing] = useTransition();

  const lines = useMemo(
    () => cart.cart?.lines.map((l) => ({ itemId: l.itemId, portionId: l.portionId, qty: l.qty, addonIds: l.addonIds })) ?? [],
    [cart.cart],
  );
  const base = cart.cart && location ? { outletId: cart.cart.outletId, lines, deliveryLat: location.lat, deliveryLng: location.lng } : null;

  // Live quote: prices, GST and the honest arrival time, refreshed as the cart changes.
  useEffect(() => {
    if (!base || lines.length === 0) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      const r = await quoteOrderAction({ ...base, couponCode: appliedCoupon });
      if (cancelled) return;
      if (r.ok) {
        setQuote(r.data);
        setQuoteError(null);
      } else setQuoteError(r.error);
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- base is derived from these
  }, [JSON.stringify(lines), base?.outletId, base?.deliveryLat, base?.deliveryLng, appliedCoupon]);

  if (!cart.hydrated || !locHydrated) return <CheckoutSkeleton />;

  if (!cart.cart || cart.count === 0) {
    return (
      <main className="mx-auto w-full max-w-xl px-5 pt-16">
        <EmptyState
          title="Your cart is empty"
          body="Pick a dish from your nearest Company A kitchen and it will show up here."
          action={
            <Link href={cart.cart ? `/o/${cart.cart.outletSlug}` : "/"} className={buttonClasses("primary", "lg")}>
              Back to the menu
            </Link>
          }
        />
      </main>
    );
  }

  if (!location) {
    return (
      <main className="mx-auto w-full max-w-xl px-5 pt-16">
        <EmptyState
          title="Where should we deliver?"
          body="Choose your area first so we can check the kitchen delivers to you."
          action={
            <Link href="/" className={buttonClasses("primary", "lg")}>
              Choose your area
            </Link>
          }
        />
      </main>
    );
  }

  const unavailable = new Map(quote?.unavailable.map((u) => [u.index, u.reason]) ?? []);
  const canPay = quote && unavailable.size === 0 && !quote.couponError && !quoteError;

  const place = () =>
    startPlacing(async () => {
      setErrors({});
      safeSet(ADDRESS_KEY, address);
      const r = await placeOrderAction({ ...base!, couponCode: appliedCoupon, address, phone, paymentMethod: method });
      if (r.ok) {
        router.push(`/pay/${r.data.orderId}`);
        return;
      }
      if (r.field) setErrors({ [r.field]: r.error });
      toast.error(r.error);
    });

  return (
    <main className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 px-5 pt-10 pb-40 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-16">
      <div className="flex min-w-0 flex-col gap-10">
        <header>
          <h1 className="font-display text-[clamp(2.25rem,6vw,3.5rem)] leading-none tracking-[-0.02em]">Checkout</h1>
          <p className="mt-3 text-muted">
            <MapPin className="mr-1.5 inline size-4 align-[-2px]" aria-hidden />
            {cart.cart.outletName} kitchen · delivering to {location.label} ·{" "}
            <Link href="/" className="underline decoration-seam underline-offset-4 hover:text-fg">
              change
            </Link>
          </p>
        </header>

        <section aria-labelledby="your-order">
          <h2 id="your-order" className="plate-label">
            Your order
          </h2>
          <ul className="mt-3 flex flex-col">
            {cart.cart.lines.map((l, i) => (
              <li key={l.key} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-3 border-b border-seam py-4 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto_auto] sm:items-center">
                <DietMark diet={l.diet as "veg" | "non_veg" | "egg"} size={14} className="mt-1 sm:mt-0" />
                <div className="min-w-0">
                  <p className="font-semibold">{l.name}</p>
                  <p className="text-sm text-muted">
                    {l.portionName}
                    {l.addonNames.length > 0 && ` · + ${l.addonNames.join(", ")}`}
                  </p>
                  {unavailable.has(i) && (
                    <p role="alert" className="mt-1 text-sm font-medium text-danger">
                      {unavailable.get(i)}.{" "}
                      <button type="button" onClick={() => cart.remove(l.key)} className="underline underline-offset-2">
                        Remove
                      </button>
                    </p>
                  )}
                </div>
                <Price paise={l.unitPaise * l.qty} className="text-right font-semibold sm:order-last sm:w-20" />
                <div className="col-span-3 col-start-2 flex items-center justify-between sm:col-span-1 sm:col-start-auto sm:contents">
                  <Stepper label={l.name} value={l.qty} min={0} onChange={(q) => cart.setQty(l.key, q)} />
                  <button type="button" onClick={() => cart.remove(l.key)} className="grid size-11 place-items-center rounded-lg text-muted hover:bg-raised hover:text-fg sm:order-last" aria-label={`Remove ${l.name}`}>
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="delivery" className="flex flex-col gap-5">
          <h2 id="delivery" className="plate-label">
            Delivery
          </h2>
          <TextAreaField
            label="Address"
            placeholder="Flat, building, street, landmark"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            autoComplete="street-address"
            rows={2}
            error={errors.address}
          />
          <Field
            label="Mobile number"
            hint="For the rider and order updates on WhatsApp. Nothing else."
            inputMode="tel"
            autoComplete="tel-national"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            error={errors.phone}
          />
        </section>

        <section aria-labelledby="pay-with" className="flex flex-col gap-4">
          <h2 id="pay-with" className="plate-label">
            Pay with
          </h2>
          <Segmented
            label="Payment method"
            value={method}
            onChange={setMethod}
            options={[
              { value: "upi", label: "UPI" },
              { value: "card", label: "Card" },
            ]}
            className="max-w-sm"
          />
        </section>
      </div>

      <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
        <div className="flex flex-col gap-5 rounded-2xl border border-seam bg-surface p-5">
          <PromiseLine quote={quote} error={quoteError} />
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setAppliedCoupon(coupon.trim().toUpperCase() || undefined);
            }}
          >
            <label className="sr-only" htmlFor="coupon">
              Coupon code
            </label>
            <input
              id="coupon"
              value={coupon}
              onChange={(e) => setCoupon(e.target.value)}
              placeholder="Coupon code"
              autoCapitalize="characters"
              className="h-11 min-w-0 flex-1 rounded-lg border border-seam bg-bg px-3 uppercase placeholder:normal-case placeholder:text-muted focus:border-accent focus:outline-none"
            />
            <Button type="submit" variant="secondary">
              Apply
            </Button>
          </form>
          {(quote?.couponError || errors.coupon) && (
            <p role="alert" className="-mt-3 text-sm text-danger">
              {quote?.couponError ?? errors.coupon}
            </p>
          )}

          <dl className="flex flex-col gap-2 text-[0.9375rem]">
            <Row label="Subtotal" value={quote ? formatINR(quote.subtotalPaise) : formatINR(cart.subtotalPaise)} />
            {quote && quote.discountPaise > 0 && <Row label={`Discount (${appliedCoupon})`} value={`− ${formatINR(quote.discountPaise)}`} accent />}
            <Row label="Delivery" value="Free" />
            <div className="mt-2 flex items-baseline justify-between border-t border-seam pt-3">
              <dt className="font-semibold">Total</dt>
              <dd className="text-2xl font-bold tabular-nums">{quote ? formatINR(quote.totalPaise) : <Skeleton className="h-7 w-24" />}</dd>
            </div>
            <p className="text-sm text-muted">{quote ? `Includes ${formatINR(quote.gstPaise)} GST (5%). Prices include GST.` : "Prices include 5% GST."}</p>
          </dl>

          <Button size="lg" className="w-full" disabled={!canPay} loading={placing} onClick={place}>
            {quote ? (
              <>
                Pay <Price paise={quote.totalPaise} />
              </>
            ) : (
              "Calculating…"
            )}
          </Button>
          {unavailable.size > 0 && <p className="-mt-2 text-sm text-danger">Remove the items marked above to continue.</p>}
        </div>
      </aside>
    </main>
  );
}

function PromiseLine({ quote, error }: { quote: Quote | null; error: string | null }) {
  if (error) return <p role="alert" className="text-danger">{error}</p>;
  if (!quote) return <Skeleton className="h-14 w-full" />;
  return (
    <div>
      <p className="plate-label">Arrives by</p>
      <p className="mt-1 font-display text-4xl leading-none">{formatIstTime(new Date(quote.promisedAt))}</p>
      <p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
        {quote.confidence === "low" ? (
          <>
            <Gauge className="size-4 text-risk" aria-hidden />
            Busy kitchen right now: we&rsquo;ve added a safety margin.
          </>
        ) : (
          <>About {quote.promiseMinutes} min, based on how busy the kitchen is right now.</>
        )}
      </p>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-muted">{label}</dt>
      <dd className={cn("tabular-nums", accent && "text-[var(--ok-text)]")}>{value}</dd>
    </div>
  );
}

function CheckoutSkeleton() {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 pt-10" aria-busy="true">
      <Skeleton className="h-12 w-60" />
      <Skeleton className="mt-8 h-20 w-full max-w-2xl" />
      <Skeleton className="mt-3 h-20 w-full max-w-2xl" />
    </main>
  );
}

function safeGet(key: string) {
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}
function safeSet(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {}
}
