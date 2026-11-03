"use client";

import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/lib/cart/store";

export function CartLink() {
  const { hydrated, count } = useCart();
  if (!hydrated || count === 0) return null;
  return (
    <Link
      href="/checkout"
      className="flex min-h-11 items-center gap-2 rounded-lg px-3 font-medium hover:bg-raised"
      aria-label={`Cart, ${count} ${count === 1 ? "item" : "items"}`}
    >
      <ShoppingBag className="size-4" aria-hidden />
      <span className="tabular-nums">{count}</span>
    </Link>
  );
}
