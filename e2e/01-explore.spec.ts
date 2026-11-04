import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test("explorar: login, demo y landing pública", async ({ page }) => {
  page.on("console", (m) => m.type() === "error" && console.log("[console]", m.text()));
  await login(page);
  await page.screenshot({ path: "test-results/shots/01-dashboard.png" });
  await page.getByRole("button", { name: /Datos de demostración/ }).click();
  await page.getByRole("button", { name: "Inicializar" }).click();
  await expect(page.getByText("Datos de demostración listos")).toBeVisible({ timeout: 90_000 });
  await page.screenshot({ path: "test-results/shots/02-dashboard-seeded.png" });
  await page.goto("/demo");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Congreso ACHO");
  await page.screenshot({ path: "test-results/shots/03-demo-desktop.png", fullPage: true });
});
