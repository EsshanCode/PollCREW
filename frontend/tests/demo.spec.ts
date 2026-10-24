import { test, expect } from "@playwright/test";
test("complete worker confirmation, assignment, cancellation, recovery, approval and reset", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Every precinct crewed. Every line short.",
    }),
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
  await page.getByRole("button", { name: "Start the demo" }).click();
  await page.getByRole("button", { name: "Workers", exact: true }).click();
  await page
    .getByLabel("Experience", { exact: true })
    .fill(
      "I helped with registration and data entry. I troubleshoot tablets and printers. I led a team of volunteers.",
    );
  await page.getByRole("button", { name: "Suggest skills" }).click();
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
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(
    page.getByText("Saved. Only ticked skills are used for matching."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await page
    .getByRole("button", { name: "Build the plan", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Approve plan", exact: true }),
  ).toBeVisible({ timeout: 60000 });
  await page.getByRole("button", { name: "Plan", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(34);
  await page.getByRole("button", { name: "Approve plan", exact: true }).click();
  await page.getByRole("button", { name: "Simulate 3 cancellations" }).click();
  await expect(
    page.getByText("31 kept in place", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(31);
  const locked = await page.locator("tbody tr").allTextContents();
  await page
    .getByRole("button", { name: "Recover with backups", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Approve revised plan", exact: true }),
  ).toBeVisible({ timeout: 60000 });
  await expect(page.locator("tbody tr")).toHaveCount(34);
  const recovered = await page.locator("tbody tr").allTextContents();
  expect(locked.every((row) => recovered.includes(row))).toBeTruthy();
  await page
    .getByRole("button", { name: "Approve revised plan", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Every site is covered again" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await page.screenshot({
    path: "test-results/recovered-plan.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Results", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: "3 / 3 affected" }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Same budget, smarter placement" }),
  ).toBeVisible();
  await expect(page.locator(".tradeoff .main-svg").first()).toBeVisible({
    timeout: 15000,
  });
  await page.screenshot({
    path: "test-results/evaluation.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Reset demo" }).click();
  await expect(
    page.getByRole("button", { name: "Build the plan", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("mobile overview and requirements validation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page
    .getByRole("button", { name: /NC North Carolina Wake County/ })
    .click();
  await page.getByRole("button", { name: "Sites", exact: true }).click();
  await page.getByLabel("Extra check-in staff budget").fill("4");
  await page.getByRole("button", { name: "Save budget" }).click();
  await expect(page.getByText("Budget saved.")).toBeVisible();
  await page.getByText("Edit Central Library", { exact: true }).click();
  await page.getByLabel("Minimum", { exact: true }).first().fill("20");
  await page.getByRole("button", { name: "Save site" }).first().click();
  await expect(page.getByText(/Check your numbers/)).toBeVisible();
  await page.getByLabel("Minimum", { exact: true }).first().fill("2");
  await page.getByRole("button", { name: "Save site" }).first().click();
  await expect(page.getByText("Site saved.")).toBeVisible();
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
});

test("poll worker answers questions, sees assignment and cancels", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/worker");
  await expect(
    page.getByRole("heading", { name: "Who are you?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Morgan Rivera/ }).click();
  await page
    .getByLabel("Your experience")
    .fill("I worked the front desk at a clinic. I speak Spanish.");
  await page.getByRole("button", { name: "Find my skills" }).click();
  await expect(
    page.getByText("You said: “I speak Spanish.”", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("radio", { name: /Yes, all day/ }).click();
  await page.getByRole("radio", { name: /Yes, I finished it/ }).click();
  await page.getByRole("radio", { name: /Up to 10 miles/ }).click();
  await page.getByRole("button", { name: "Save my answers" }).click();
  await expect(
    page.getByRole("heading", { name: /answers are saved/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Español" }).click();
  await expect(
    page.getByRole("heading", { name: /respuestas están guardadas/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "English" }).click();
  await page.goto("/");
  await page
    .getByRole("button", { name: /NC North Carolina Wake County/ })
    .click();
  await page
    .getByRole("button", { name: "Build the plan", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Approve plan", exact: true })
    .click({ timeout: 60000 });
  await expect(
    page.getByRole("heading", { name: "Plan approved", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Poll worker view" }).click();
  await page.getByLabel("Search your name").fill("NC-002");
  await page.getByRole("button", { name: /NC-002/ }).click();
  await expect(
    page.getByRole("heading", { name: "Your Election Day" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "I can’t make it" }).click();
  await page.getByRole("button", { name: "Yes, I can’t make it" }).click();
  await expect(
    page.getByRole("heading", { name: "Thank you for letting us know" }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/worker.png", fullPage: true });
  expect(errors).toEqual([]);
});
