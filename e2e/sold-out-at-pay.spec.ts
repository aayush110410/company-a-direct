import { adminClientForScripts } from "../scripts/lib/admin-client";
import { chooseArea, expect, signedInPage, test } from "./fixtures";

const DISH = "Double ka meetha";

async function setStock(status: "available" | "out_of_stock") {
  const db = adminClientForScripts();
  const { data: outlet } = await db.from("outlets").select("id").eq("slug", "kondapur").single();
  const { data: item } = await db.from("menu_items").select("id").eq("name", DISH).single();
  const { error } = await db.from("outlet_item_availability").upsert({ outlet_id: outlet!.id, item_id: item!.id, status });
  if (error) throw error;
}

test("a dish that sells out between the quote and Pay is flagged on its line", async ({ browser }) => {
  const { page } = await signedInPage(browser, "Customer");
  try {
    await chooseArea(page, "Kondapur");
    await page.getByRole("link", { name: "See the menu" }).click();
    await page.getByRole("button", { name: new RegExp(`^${DISH},`) }).click();
    await page.getByRole("button", { name: /^Add/ }).click();
    await page.getByRole("link", { name: /View cart/ }).click();
    await page.getByRole("textbox", { name: "Address" }).fill("Flat 302, Sai Residency, Kondapur Main Road");
    await page.getByRole("textbox", { name: "Mobile number" }).fill("9876543210");
    const pay = page.getByRole("button", { name: /^Pay ₹/ });
    await expect(pay).toBeEnabled();

    await setStock("out_of_stock");
    await pay.click();

    await expect(page.getByRole("alert").filter({ hasText: "Sold out at this kitchen" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Remove", exact: true })).toBeVisible();
    await expect(pay).toBeDisabled();
    expect(page.url()).not.toMatch(/\/pay\//);
  } finally {
    await setStock("available");
  }
});
