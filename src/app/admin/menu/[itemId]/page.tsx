import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ItemEditor } from "@/components/admin/item-editor";
import { getAdminLookups, getItemForEdit } from "@/server/repo/admin";

export const metadata = { title: "Edit dish" };

export default async function EditItemPage({ params }: PageProps<"/admin/menu/[itemId]">) {
  await connection();
  const { itemId } = await params;
  const [item, lookups] = await Promise.all([getItemForEdit(itemId), getAdminLookups()]);
  if (!item) notFound();
  return <ItemEditor item={item} lookups={lookups} />;
}
