import { requireRole } from "@/server/auth";

export const metadata = { title: "Kitchen" };

export default async function KitchenLayout({ children }: LayoutProps<"/kitchen">) {
  await requireRole(["kitchen_staff", "outlet_manager", "admin"], "/kitchen");
  return (
    <div data-theme="kitchen" className="min-h-dvh bg-bg text-fg">
      {children}
    </div>
  );
}
