import { requireRole } from "@/server/auth";

export default async function AdminMenuPage() {
  const session = await requireRole(["admin"], "/admin/menu");
  return <main className="p-8">Menu admin for {session.fullName}</main>;
}
