import { notFound } from "next/navigation";
import { connection } from "next/server";
import { MenuScreen } from "@/components/menu/menu-screen";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { getMenuForOutlet } from "@/server/repo/menu";
import { getOutletBySlug } from "@/server/repo/outlets";

export async function generateMetadata({ params }: PageProps<"/o/[outletSlug]">) {
  const outlet = await getOutletBySlug((await params).outletSlug);
  return { title: outlet ? `Menu · ${outlet.name}` : "Menu" };
}

export default async function MenuPage({ params }: PageProps<"/o/[outletSlug]">) {
  await connection();
  const outlet = await getOutletBySlug((await params).outletSlug);
  if (!outlet) notFound();
  const menu = await getMenuForOutlet(outlet, new Date());

  return (
    <>
      <SiteHeader />
      <MenuScreen menu={menu} />
      <SiteFooter />
    </>
  );
}
