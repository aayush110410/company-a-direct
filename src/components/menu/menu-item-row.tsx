import { Plus } from "lucide-react";
import Image from "next/image";
import { DietMark, Price, SpiceLevel } from "@/components/ui";
import { isOrderable } from "@/domain/availability";
import { cn } from "@/lib/cn";
import type { MenuItemView } from "@/server/repo/menu-mapper";

function availabilityNote(item: MenuItemView): string | null {
  switch (item.availability.state) {
    case "out_of_stock":
      return "Sold out at this kitchen today";
    case "off_schedule":
      return item.availability.label;
    default:
      return null;
  }
}

export function MenuItemRow({ item, featured, onChoose }: { item: MenuItemView; featured: boolean; onChoose: () => void }) {
  const orderable = isOrderable(item.availability);
  const note = availabilityNote(item);
  const priceLabel = item.portions.length > 1 ? "from " : "";

  const meta = (
    <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8125rem] text-muted">
      <SpiceLevel level={item.spiceLevel} />
      {item.allergens.length > 0 && <span>Contains {item.allergens.join(", ")}</span>}
    </p>
  );

  if (featured) {
    return (
      <li>
        <button type="button" onClick={onChoose} className="group block w-full text-left" aria-label={`${item.name}, ${priceLabel}${(item.fromPricePaise / 100).toLocaleString("en-IN")} rupees${note ? `, ${note}` : ""}`}>
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-surface">
            <Image
              src={item.photoUrl}
              alt=""
              fill
              sizes="(min-width: 640px) 50vw, 100vw"
              className={cn(
                "object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]",
                !orderable && "opacity-45 grayscale",
              )}
            />
            {note && (
              <span className="absolute bottom-3 left-3 rounded-full bg-bg/85 px-3 py-1 text-sm font-medium backdrop-blur">{note}</span>
            )}
          </div>
          <div className="mt-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="flex items-center gap-2.5 font-display text-2xl leading-tight">
                <DietMark diet={item.diet} />
                {item.name}
              </h3>
              <p className="mt-1.5 line-clamp-2 max-w-[48ch] text-muted">{item.description}</p>
              {meta}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-3">
              <span className="text-lg font-semibold">
                <span className="text-sm font-normal text-muted">{priceLabel}</span>
                <Price paise={item.fromPricePaise} />
              </span>
              {orderable && (
                <span className="flex size-11 items-center justify-center rounded-full border border-seam transition-colors group-hover:border-accent group-hover:text-accent-strong">
                  <Plus className="size-5" aria-hidden />
                </span>
              )}
            </div>
          </div>
        </button>
      </li>
    );
  }

  return (
    <li className="border-b border-seam">
      <button type="button" onClick={onChoose} className="group flex w-full items-center gap-4 py-4 text-left" aria-label={`${item.name}, ${(item.fromPricePaise / 100).toLocaleString("en-IN")} rupees${note ? `, ${note}` : ""}`}>
        <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-surface">
          <Image src={item.photoUrl} alt="" fill sizes="80px" className={cn("object-cover", !orderable && "opacity-45 grayscale")} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-2 text-[1.0625rem] font-semibold">
            <DietMark diet={item.diet} size={14} />
            {item.name}
          </h3>
          {note ? <p className="mt-1 text-sm text-risk">{note}</p> : <p className="mt-1 line-clamp-1 text-sm text-muted">{item.description}</p>}
          {meta}
        </div>
        <Price paise={item.fromPricePaise} className="shrink-0 font-semibold" />
      </button>
    </li>
  );
}
