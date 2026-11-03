import { adminClientForScripts } from "../scripts/lib/admin-client";
import { resetDemoData } from "../src/server/demo/reset";

/** Every run starts from the brief's sample orders, timed to now. */
export default async function globalSetup() {
  await resetDemoData(adminClientForScripts(), new Date());
}
