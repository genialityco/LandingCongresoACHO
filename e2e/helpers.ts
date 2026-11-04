import { expect, type Page } from "@playwright/test";

export async function login(page: Page, email = "admin@demo.local", password = "admin123") {
  await page.goto("/admin/login");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: "Páginas", exact: true })).toBeVisible();
}
