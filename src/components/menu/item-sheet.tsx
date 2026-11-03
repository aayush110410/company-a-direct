"use client";

import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import { Button, DietMark, Price, Segmented, Sheet, SpiceLevel, Stepper } from "@/components/ui";
import { isOrderable } from "@/domain/availability";
import { formatINR } from "@/domain/money";
import { useCart } from "@/lib/cart/store";
import type { MenuItemView } from "@/server/repo/menu-mapper";
import type { OutletSummary } from "@/server/repo/outlets";
import { SwitchOutletDialog } from "./switch-outlet-dialog";

export function ItemSheet({ item, outlet, onClose }: { item: MenuItemView | null; outlet: OutletSummary; onClose: () => void }) {
  // Keyed by item so each dish opens with fresh choices.
  return item ? <ItemSheetBody key={item.id} item={item} outlet={outlet} onClose={onClose} /> : null;
}

function ItemSheetBody({ item, outlet, onClose }: { item: MenuItemView; outlet: OutletSummary; onClose: () => void }) {
  const cart = useCart();
  const [portionId, setPortionId] = useState(item.portions[0]?.id ?? "");
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [qty, setQty] = useState(1);
  const [pendingSwitch, setPendingSwitch] = useState(false);

  const portion = item.portions.find((p) => p.id === portionId) ?? item.portions[0]!;
  const addons = item.addons.filter((a) => addonIds.includes(a.id));
  const unitPaise = portion.pricePaise + addons.reduce((s, a) => s + a.pricePaise, 0);
  const orderable = isOrderable(item.availability) && outlet.isAcceptingOrders;
  const cartOutlet = { id: outlet.id, slug: outlet.slug, name: outlet.name };

  const line = {
    itemId: item.id,
    portionId: portion.id,
    qty,
    addonIds,
    name: item.name,
    portionName: portion.name,
    unitPaise,
    addonNames: addons.map((a) => a.name),
    diet: item.diet,
  };

  const add = () => {
    if (cart.add(line, cartOutlet) === "needs_switch") {
      setPendingSwitch(true);
      return;
    }
    toast.success(`${qty} × ${item.name} added`, { description: portion.name });
    onClose();
  };

  return (
    <>
      <Sheet open onOpenChange={(o) => !o && onClose()} title={item.name} description={item.portions.length > 1 ? "Choose a portion" : undefined}>
        <div className="relative -mx-5 mb-5 aspect-[16/10] overflow-hidden">
          <Image src={item.photoUrl} alt={item.name} fill sizes="(min-width: 640px) 32rem, 100vw" className="object-cover" />
        </div>
        <div className="flex flex-col gap-5">
          <div>
            <p className="flex flex-wrap items-center gap-3 text-sm text-muted">
              <span className="flex items-center gap-1.5">
                <DietMark diet={item.diet} size={14} />
                {item.diet === "veg" ? "Vegetarian" : item.diet === "egg" ? "Contains egg" : "Non-vegetarian"}
              </span>
              <SpiceLevel level={item.spiceLevel} />
            </p>
            <p className="mt-2 text-fg/85">{item.description}</p>
            {item.allergens.length > 0 && <p className="mt-2 text-sm text-muted">Allergens: {item.allergens.join(", ")}</p>}
            {item.photoCredit && <p className="mt-1 text-xs text-muted/70">Photo: {item.photoCredit} / Unsplash</p>}
          </div>

          {item.portions.length > 1 && (
            <Segmented
              label="Portion"
              value={portion.id}
              onChange={setPortionId}
              options={item.portions.map((p) => ({ value: p.id, label: p.name, detail: formatINR(p.pricePaise) }))}
            />
          )}

          {item.addons.length > 0 && (
            <fieldset className="flex flex-col">
              <legend className="mb-1 text-sm font-medium">Add extras</legend>
              {item.addons.map((a) => (
                <label key={a.id} className="flex min-h-12 items-center gap-3 border-b border-seam last:border-0">
                  <input
                    type="checkbox"
                    checked={addonIds.includes(a.id)}
                    onChange={(e) => setAddonIds((ids) => (e.target.checked ? [...ids, a.id] : ids.filter((x) => x !== a.id)))}
                    className="size-5 accent-[var(--accent)]"
                  />
                  <DietMark diet={a.diet} size={13} />
                  <span className="flex-1">{a.name}</span>
                  <span className="text-muted tabular-nums">+{formatINR(a.pricePaise)}</span>
                </label>
              ))}
            </fieldset>
          )}

          <div className="sticky bottom-0 -mx-5 flex items-center gap-3 border-t border-seam bg-surface px-5 pt-4">
            <Stepper label={item.name} value={qty} min={1} onChange={setQty} />
            <Button size="lg" className="flex-1" disabled={!orderable} onClick={add}>
              {orderable ? (
                <>
                  Add · <Price paise={unitPaise * qty} />
                </>
              ) : item.availability.state === "off_schedule" ? (
                item.availability.label
              ) : (
                "Sold out today"
              )}
            </Button>
          </div>
        </div>
      </Sheet>
      <SwitchOutletDialog
        open={pendingSwitch}
        from={cart.cart?.outletName ?? ""}
        to={outlet.name}
        onCancel={() => setPendingSwitch(false)}
        onConfirm={() => {
          cart.switchOutlet(cartOutlet);
          cart.add(line, cartOutlet);
          setPendingSwitch(false);
          toast.success(`New cart at ${outlet.name}`, { description: `${qty} × ${item.name}` });
          onClose();
        }}
      />
    </>
  );
}
