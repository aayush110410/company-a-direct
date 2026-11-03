import Image from "next/image";
import { connection } from "next/server";
import { OutletPicker } from "@/components/menu/outlet-picker";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { AREAS } from "@/data/areas";
import { HERO_PHOTO } from "@/data/brand";
import { getOutlets } from "@/server/repo/outlets";

export default async function Home() {
  await connection();
  const outlets = await getOutlets();

  return (
    <>
      <section className="relative isolate flex min-h-[100svh] flex-col justify-end overflow-hidden">
        <div className="absolute inset-x-0 top-0 -z-10 h-[54svh] sm:h-full">
          <Image src={HERO_PHOTO.url} alt="Chicken dum biryani, fresh from the handi" fill priority sizes="100vw" className="object-cover" />
          {/* Light falls on the plate; the rest of the pass stays dark. */}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,19,18,0.55)_0%,rgba(20,19,18,0)_22%,rgba(20,19,18,0.25)_60%,#141312_100%)] sm:bg-[linear-gradient(180deg,rgba(20,19,18,0.5)_0%,rgba(20,19,18,0)_18%,rgba(20,19,18,0.35)_45%,rgba(20,19,18,0.94)_80%)]" />
        </div>
        <SiteHeader overlay />
        <div className="mx-auto w-full max-w-6xl px-5 pt-[44svh] pb-10 sm:pt-40 sm:pb-16">
          <h1 className="max-w-[14ch] font-display text-[clamp(2.75rem,9vw,5.75rem)] leading-[0.98] tracking-[-0.025em]">
            Biryani, straight from our kitchen.
          </h1>
          <p className="mt-5 max-w-[46ch] text-lg text-fg/80">
            Order direct from the nearest Company A kitchen. Your ticket goes straight onto its rail, with a time it can keep.
          </p>
          <div className="mt-10 max-w-xl">
            <OutletPicker outlets={outlets} areas={AREAS} />
          </div>
          <p className="mt-10 text-xs text-fg/50">Photo: {HERO_PHOTO.credit} / Unsplash</p>
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
