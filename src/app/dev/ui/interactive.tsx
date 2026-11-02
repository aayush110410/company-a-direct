"use client";

import { useState } from "react";
import { Button, Segmented, Sheet, Stepper } from "@/components/ui";

export function GalleryInteractive() {
  const [portion, setPortion] = useState<"single" | "family">("family");
  const [qty, setQty] = useState(1);
  const [open, setOpen] = useState(false);
  return (
    <section className="flex flex-col gap-4">
      <h2 className="plate-label">Choose</h2>
      <Segmented
        label="Portion"
        value={portion}
        onChange={setPortion}
        options={[
          { value: "single", label: "Single", detail: "₹340" },
          { value: "family", label: "Family pack", detail: "₹980" },
        ]}
        className="max-w-sm"
      />
      <div className="flex items-center gap-4">
        <Stepper label="portions" value={qty} min={1} onChange={setQty} />
        <Button variant="secondary" onClick={() => setOpen(true)}>
          Open sheet
        </Button>
      </div>
      <Sheet open={open} onOpenChange={setOpen} title="Chicken dum biryani" description="Family pack serves 3–4">
        <p className="text-muted">Sheet body.</p>
      </Sheet>
    </section>
  );
}
