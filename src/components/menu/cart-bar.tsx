"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Price } from "@/components/ui";
import { useCart } from "@/lib/cart/store";

/** Always one tap from checkout once something is in the cart. */
export function CartBar({ outletId }: { outletId: string }) {
  const { hydrated, cart, count, subtotalPaise } = useCart();
  if (!hydrated || !cart || count === 0) return null;

  const elsewhere = cart.outletId !== outletId;
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <Link
        href="/checkout"
        className="mx-auto flex h-16 max-w-xl items-center justify-between gap-4 rounded-2xl bg-accent px-5 text-on-accent shadow-[0_18px_40px_-12px_rgba(0,0,0,0.7)] transition-colors hover:bg-accent-strong"
      >
        <span className="flex flex-col leading-tight">
          <span className="text-sm font-medium opacity-80">
            {count} {count === 1 ? "item" : "items"}
            {elsewhere ? ` · from ${cart.outletName}` : ""}
          </span>
          <Price paise={subtotalPaise} className="text-lg font-bold" />
        </span>
        <span className="flex items-center gap-2 font-semibold">
          View cart
          <ArrowRight className="size-4" aria-hidden />
        </span>
      </Link>
    </div>
  );
}
