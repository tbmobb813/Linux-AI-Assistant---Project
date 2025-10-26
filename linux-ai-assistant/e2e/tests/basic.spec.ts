import { test, expect } from "@playwright/test";

test("app shows main page", async ({ page }) => {
  // Assumes the dev preview is running on port 1420; CI will start preview before running e2e.
  await page.goto("http://localhost:1420");

  // Basic smoke: the app root should contain an element with id 'app' or the title
  await expect(page).toHaveTitle(/Linux AI/i);
});
