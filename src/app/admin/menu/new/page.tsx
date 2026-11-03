import { connection } from "next/server";
import { ItemEditor } from "@/components/admin/item-editor";
import { getAdminLookups } from "@/server/repo/admin";

export const metadata = { title: "New dish" };

export default async function NewItemPage() {
  await connection();
  return <ItemEditor item={null} lookups={await getAdminLookups()} />;
}
