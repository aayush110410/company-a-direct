import Image from "next/image";
import Link from "next/link";
import { HERO_PHOTO } from "@/data/brand";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <aside className="relative h-[30dvh] overflow-hidden lg:sticky lg:top-0 lg:h-dvh">
        {HERO_PHOTO.url && (
          <Image src={HERO_PHOTO.url} alt="" fill priority sizes="(min-width: 1024px) 55vw, 100vw" className="object-cover" />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,19,18,0.55)_0%,rgba(20,19,18,0.1)_40%,rgba(20,19,18,0.92)_100%)]" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-5 lg:p-10">
          <Link href="/" className="text-sm font-semibold tracking-[0.32em] uppercase">
            Company A
          </Link>
        </div>
        <div className="absolute inset-x-0 bottom-0 hidden p-10 lg:block">
          <p className="max-w-[18ch] font-display text-5xl leading-[1.04] tracking-[-0.02em]">From our kitchen to your table.</p>
          <p className="mt-4 max-w-[44ch] text-muted">
            Order direct and your ticket goes straight to the outlet&rsquo;s kitchen, with a time it can actually keep.
          </p>
          {HERO_PHOTO.credit && <p className="mt-8 text-xs text-muted/70">Photo: {HERO_PHOTO.credit} / Unsplash</p>}
        </div>
      </aside>
      <main className="flex items-start justify-center px-5 py-10 lg:items-center lg:px-12">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
