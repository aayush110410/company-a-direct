import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Badge, Button, DietMark, EmptyState, Field, LivePill, Price, Skeleton, SpiceLevel } from "@/components/ui";
import { serverEnv } from "@/server/env";
import { GalleryInteractive } from "./interactive";

export const metadata = { title: "UI kit" };

export default async function UiGallery() {
  await connection();
  if (!serverEnv().DEMO_MODE) notFound();

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-14 px-5 py-12">
      <header className="flex flex-col gap-3">
        <h1 className="font-display text-5xl leading-[1.02] tracking-[-0.02em] sm:text-6xl">Chicken dum biryani</h1>
        <p className="max-w-[60ch] text-lg text-muted">
          Long-grain basmati and marinated chicken, sealed and slow-cooked on dum. Served with mirchi ka salan and dahi chutney.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="section-title">Actions</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="lg">Pay ₹1,180</Button>
          <Button variant="secondary" size="lg">
            See the menu
          </Button>
          <Button variant="ghost">Change outlet</Button>
          <Button variant="danger">Cancel order</Button>
          <Button loading>Placing order</Button>
          <Button disabled>Out of stock</Button>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="section-title">Marks, prices, states</h2>
        <div className="flex flex-wrap items-center gap-5">
          <span className="flex items-center gap-2">
            <DietMark diet="veg" /> Veg biryani
          </span>
          <span className="flex items-center gap-2">
            <DietMark diet="non_veg" /> Mutton haleem
          </span>
          <span className="flex items-center gap-2">
            <DietMark diet="egg" /> Egg biryani
          </span>
          <SpiceLevel level={2} />
          <Price paise={118000} className="text-2xl font-semibold" />
          <Badge>Dairy</Badge>
          <Badge tone="accent">Arrives by 9:02 pm</Badge>
          <Badge tone="risk">At risk</Badge>
          <Badge tone="late">Late by 4 min</Badge>
          <LivePill state="live" />
          <LivePill state="reconnecting" />
        </div>
      </section>

      <GalleryInteractive />

      <section className="grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-4">
          <h2 className="section-title">Fields</h2>
          <Field label="Phone for delivery updates" placeholder="98765 43210" hint="We only message you about this order." />
          <Field label="Coupon" defaultValue="WELCOME" error="This code has expired" />
        </div>
        <div className="flex flex-col gap-3">
          <h2 className="section-title">Loading</h2>
          <Skeleton className="aspect-[4/3] w-full rounded-xl" />
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </section>

      <EmptyState
        title="We don't deliver to Shamshabad yet"
        body="Our nearest kitchen is Charminar, 14.2 km away. Try an area closer to the city, or pick up from the outlet."
        action={<Button variant="secondary">Choose another area</Button>}
      />

      <section data-theme="kitchen" className="rounded-2xl bg-bg p-6">
        <h2 className="section-title">Kitchen ticket</h2>
        <div className="mt-4 grid max-w-sm gap-0 overflow-hidden rounded-[var(--radius-ticket)] bg-paper text-ink shadow-[0_18px_40px_-18px_rgba(0,0,0,0.8)]">
          <div className="flex items-baseline justify-between bg-late px-4 py-2 text-white">
            <span className="text-[2rem] font-bold tabular-nums">778146</span>
            <span className="font-semibold">Late by 6 min</span>
          </div>
          <ul className="flex flex-col gap-1 px-4 py-3 text-[1.5rem] leading-tight">
            <li>
              <b className="tabular-nums">3×</b> Mutton haleem
            </li>
          </ul>
        </div>
      </section>
    </main>
  );
}
