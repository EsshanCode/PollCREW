import { test, expect } from "@playwright/test";
test("complete worker confirmation, assignment, cancellation, recovery, approval and reset", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Every location. The right crew." }),
  ).toBeVisible();
  await expect(page.getByText("150", { exact: true })).toBeVisible();
  await page.screenshot({
    path: "test-results/national-overview.png",
    fullPage: true,
  });
  await page.getByLabel("Filter jurisdictions by state").selectOption("WI");
  await expect(
    page.getByRole("heading", { name: "Dane County", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Wake County", exact: true }),
  ).not.toBeVisible();
  await page.getByRole("button", { name: "Open demo jurisdiction" }).click();
  await page.getByRole("button", { name: "Workers", exact: true }).click();
  await page
    .getByLabel("Experience", { exact: true })
    .fill(
      "I helped with registration and data entry. I troubleshoot tablets and printers. I led a team of volunteers.",
    );
  await page.getByRole("button", { name: "Extract suggested skills" }).click();
  await expect(
    page.getByText("Offline keyword demo · no LLM call"),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Confirm", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Reject", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Confirm", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Save confirmed profile" }).click();
  await expect(
    page.getByText(
      "Confirmed profile saved. Only these skills will influence matching.",
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await page
    .getByRole("button", { name: "Generate assignments", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Approve plan", exact: true }),
  ).toBeVisible({ timeout: 60000 });
  await page.getByRole("button", { name: "Assignments", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(28);
  await page.getByRole("button", { name: "Approve plan", exact: true }).click();
  await page.getByRole("button", { name: "Simulate 3 cancellations" }).click();
  await expect(
    page.getByText("25 assignments preserved", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(25);
  const locked = await page.locator("tbody tr").allTextContents();
  await page
    .getByRole("button", { name: "Recover with backups", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Approve revised plan", exact: true }),
  ).toBeVisible({ timeout: 60000 });
  await expect(page.locator("tbody tr")).toHaveCount(28);
  const recovered = await page.locator("tbody tr").allTextContents();
  expect(locked.every((row) => recovered.includes(row))).toBeTruthy();
  await page
    .getByRole("button", { name: "Approve revised plan", exact: true })
    .click();
  await expect(page.getByText("Plan approved inside the demo.")).toBeVisible();
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await page.screenshot({
    path: "test-results/recovered-plan.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Evaluation", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: "3 / 3 affected" }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reset demo" }).click();
  await expect(
    page.getByRole("button", { name: "Generate assignments", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("mobile overview and requirements validation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page
    .getByRole("button", { name: /NC North Carolina Wake County/ })
    .click();
  await page.getByRole("button", { name: "Requirements", exact: true }).click();
  await page.getByText("Configure Central Library", { exact: true }).click();
  await page.getByLabel("Required minimum", { exact: true }).first().fill("20");
  await page.getByRole("button", { name: "Save requirements" }).first().click();
  await expect(page.getByText(/Check your inputs/)).toBeVisible();
  await page.getByLabel("Required minimum", { exact: true }).first().fill("2");
  await page.getByRole("button", { name: "Save requirements" }).first().click();
  await expect(page.getByText("Requirements saved.")).toBeVisible();
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
});
