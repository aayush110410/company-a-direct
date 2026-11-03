"use client";

import { ArrowRight, LocateFixed, MapPin } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { buttonClasses } from "@/components/ui";
import type { Area } from "@/data/areas";
import { matchOutlet, travelMinutes } from "@/domain/geo";
import { cn } from "@/lib/cn";
import { useDeliveryLocation } from "@/lib/location/store";
import type { OutletSummary } from "@/server/repo/outlets";

/** Typical promise shown before checkout; checkout quotes the honest, load-aware time. */
const usualMinutes = (o: OutletSummary, km: number) => Math.max(o.minPromiseMinutes, travelMinutes(km) + 25);

export function OutletPicker({ outlets, areas }: { outlets: OutletSummary[]; areas: Area[] }) {
  const { hydrated, location, set } = useDeliveryLocation();
  const [locating, setLocating] = useState(false);

  const match = useMemo(() => (location ? matchOutlet(location, outlets) : null), [location, outlets]);
  const outletById = (id: string) => outlets.find((o) => o.id === id)!;

  const useMyLocation = () => {
    if (!("geolocation" in navigator)) {
      toast.error("Your browser can't share location. Pick your area instead.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        set({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: "Your location", areaSlug: null });
      },
      () => {
        setLocating(false);
        toast.error("We couldn't get your location. Pick your area instead.");
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 },
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Deliver to</span>
          <MapPin className="pointer-events-none absolute top-1/2 left-4 z-10 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <select
            value={location?.areaSlug ?? ""}
            onChange={(e) => {
              const area = areas.find((a) => a.slug === e.target.value);
              if (area) set({ lat: area.lat, lng: area.lng, label: area.name, areaSlug: area.slug });
            }}
            className="h-13 w-full appearance-none rounded-xl border border-seam bg-bg/80 pr-10 pl-11 text-base text-fg backdrop-blur-md transition-colors hover:border-muted focus:border-accent focus:outline-none"
          >
            <option value="" disabled>
              {location && !location.areaSlug ? "Your location" : "Choose your area"}
            </option>
            <optgroup label="Hyderabad">
              {areas.filter((a) => a.city === "hyderabad").map((a) => (
                <option key={a.slug} value={a.slug}>
                  {a.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Bengaluru">
              {areas.filter((a) => a.city === "bengaluru").map((a) => (
                <option key={a.slug} value={a.slug}>
                  {a.name}
                </option>
              ))}
            </optgroup>
          </select>
          <span aria-hidden className="pointer-events-none absolute top-1/2 right-4 z-10 -translate-y-1/2 text-muted">
            ▾
          </span>
        </label>
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className={buttonClasses("secondary", "lg", "bg-bg/60 backdrop-blur-md")}
        >
          <LocateFixed className={cn("size-4", locating && "motion-safe:animate-pulse")} aria-hidden />
          {locating ? "Locating…" : "Use my location"}
        </button>
      </div>

      <div aria-live="polite" className="min-h-[7.5rem]">
        {hydrated && match?.kind === "match" && (
          <OutletResult outlet={outletById(match.outletId)} km={match.distanceKm} label={location?.label ?? ""} />
        )}
        {hydrated && match?.kind === "out_of_range" && (
          <div className="rounded-2xl border border-seam bg-bg/85 p-5 backdrop-blur-md">
            <p className="font-display text-2xl leading-tight">We don&rsquo;t deliver to {location?.label} yet</p>
            <p className="mt-2 text-muted">
              Our nearest kitchen is {outletById(match.nearestOutletId).name}, {match.distanceKm} km away. Try an area closer to
              the city.
            </p>
          </div>
        )}
        {hydrated && match?.kind === "none" && (
          <p className="rounded-2xl border border-seam bg-bg/85 p-5 text-muted">Our kitchens aren&rsquo;t taking orders right now. Please check back soon.</p>
        )}
      </div>
    </div>
  );
}

function OutletResult({ outlet, km, label }: { outlet: OutletSummary; km: number; label: string }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-seam bg-bg/85 p-5 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm text-muted">
          Delivering to {label} from
        </p>
        <p className="mt-0.5 font-display text-2xl leading-tight">
          {outlet.name}
          {outlet.kind === "cloud_kitchen" ? "" : " kitchen"}
        </p>
        <p className="mt-1 text-sm text-muted">
          {km} km away · usually about {usualMinutes(outlet, km)} min · FSSAI Lic. {outlet.fssaiLicence}
        </p>
      </div>
      <Link href={`/o/${outlet.slug}`} className={buttonClasses("primary", "lg", "shrink-0")}>
        See the menu
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </div>
  );
}
