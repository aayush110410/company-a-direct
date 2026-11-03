import { connection } from "next/server";
import { ItemTable } from "@/components/admin/item-table";
import { getAdminLookups, listItems } from "@/server/repo/admin";

export const metadata = { title: "Menu" };

export default async function AdminMenuPage() {
  await connection();
  const [items, lookups] = await Promise.all([listItems(), getAdminLookups()]);
  return <ItemTable items={items} cities={lookups.cities} categories={lookups.categories} outletCount={lookups.outlets.length} />;
}
