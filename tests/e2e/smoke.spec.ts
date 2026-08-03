import { test, expect } from "@playwright/test";

test("renders the ARISE Studio foundation shell", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "ARISE Studio" })).toBeVisible();
  await expect(page.getByTestId("environment-status")).toContainText("Environment valid");
});
