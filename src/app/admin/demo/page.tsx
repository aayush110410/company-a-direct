import { connection } from "next/server";
import { DemoTools } from "@/components/admin/demo-tools";
import { getAdminLookups } from "@/server/repo/admin";

export const metadata = { title: "Demo tools" };

export default async function DemoPage() {
  await connection();
  const { outlets } = await getAdminLookups();
  return <DemoTools outlets={outlets.map((o) => ({ id: o.id, name: o.name, slug: o.slug }))} />;
}
