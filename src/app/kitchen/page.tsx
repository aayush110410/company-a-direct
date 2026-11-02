import { requireRole } from "@/server/auth";

export default async function KitchenPage() {
  const session = await requireRole(["kitchen_staff", "outlet_manager", "admin"], "/kitchen");
  return <main className="p-8">Kitchen for {session.fullName}</main>;
}
