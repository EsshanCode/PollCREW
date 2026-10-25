import { test, expect } from "@playwright/test";

test("animation timing tolerates a frame timestamp before the effect started", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => {
    const requestFrame = window.requestAnimationFrame.bind(window);
    // Browsers share a timestamp across a frame; it can precede effect startup.
    window.requestAnimationFrame = (callback) => requestFrame((time) => callback(time - 50));
  });
  await page.goto("/additional-features");
  await page.getByRole("button", { name: "02 Weight", exact: true }).click();
  await page.waitForTimeout(150);
  await expect(page.getByRole("heading", { name: "Your priorities shape the calculation." })).toBeVisible();
  expect(errors).toEqual([]);
});

test("additional features explains matching, recalculates priorities, and reveals without rescoring", async ({ page }) => {
  const errors: string[] = [];
  const apiRequests: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/")) apiRequests.push(request.url());
  });
  await page.goto("/additional-features");
  await expect(page.getByRole("link", { name: "Additional features", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Open theengine room.");
  await expect(page.getByText("Interactive walkthrough · Fictional example")).toBeVisible();
  await expect(page.getByText("Aster", { exact: true })).toHaveCount(0);
  const scores = page.locator(".be-result-row strong");
  await expect(scores).toHaveText(["81.3%", "81.3%", "50.0%"]);
  await page.getByRole("button", { name: "Apply priorities" }).click();
  await expect(page.getByRole("button", { name: "02 Weight" })).toHaveAttribute("aria-pressed", "true");
  const priority = page.getByRole("slider", { name: /School funding importance/ });
  await priority.focus();
  await priority.press("ArrowLeft");
  await expect(scores).toHaveText(["75.0%", "83.3%", "58.3%"]);
  await expect(page.getByText(/The school-funding answer counts 1 time\./)).toBeVisible();
  await priority.press("End");
  await expect(scores).toHaveText(["85.0%", "80.0%", "45.0%"]);
  await page.getByRole("button", { name: "Compare positions" }).click();
  await expect(page.getByRole("heading", { name: "Every difference becomes a score." })).toBeVisible();
  await page.getByRole("button", { name: "Run the stress test" }).click();
  const chart = page.getByRole("img", { name: /Two thousand calculated scenarios/ });
  const summary = await chart.getAttribute("aria-label");
  const counts = [...summary!.matchAll(/ranks first in (\d+)/g)].map((m) => Number(m[1]));
  expect(counts).toHaveLength(3);
  expect(counts.reduce((a, b) => a + b, 0)).toBe(2000);
  await page.getByText("Inspect the actual math", { exact: false }).click();
  await expect(page.getByText(/These coordinates come from selected answers, not NLP inference/)).toBeVisible();
  const beforeReveal = await scores.allTextContents();
  await page.getByRole("button", { name: "Reveal the result" }).click();
  await expect(page.locator(".be-result-row > span")).toHaveText(["Aster", "Juniper", "Cedar"]);
  await expect(scores).toHaveText(beforeReveal);
  await page.getByRole("button", { name: "Replay the process" }).click();
  await expect(page.getByRole("button", { name: "Previous", exact: true })).toBeDisabled();
  await expect(page.getByText("Aster", { exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
  expect(apiRequests).toEqual([]);
});

test("walkthrough fits narrow screens and supports reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [320, 736, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/additional-features");
    for (const label of ["01 Encode", "02 Weight", "03 Compare", "04 Stress-test", "05 Reveal"]) {
      await page.getByRole("button", { name: label, exact: true }).click();
      await expect(page.getByRole("button", { name: label, exact: true })).toHaveAttribute("aria-pressed", "true");
      const dimensions = await page.evaluate(() => ({ viewport: innerWidth, page: document.documentElement.scrollWidth }));
      expect(dimensions.page).toBeLessThanOrEqual(dimensions.viewport);
      await expect(page.locator("canvas")).toBeVisible();
    }
    await page.screenshot({ path: `test-results/walkthrough-${width}.png`, fullPage: true });
  }
});

test("shared navigation links the walkthrough to the rest of the site", async ({ page }) => {
  await page.goto("/about");
  await page.getByRole("link", { name: "Additional features", exact: true }).click();
  await expect(page).toHaveURL(/\/additional-features$/);
  await page.getByRole("link", { name: "For candidates", exact: true }).click();
  await expect(page).toHaveURL(/\/candidates$/);
  await page.getByRole("link", { name: "Additional features", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your answers become coordinates." })).toBeVisible();
  await page.getByRole("link", { name: "Back to matching my ballot" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("math lab updates formulas and diagnostics without changing the ballot scores", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/additional-features");
  const lab = page.locator("#ballot-math-lab");
  await expect(lab.getByRole("heading", { name: "The math behind the match." })).toBeVisible();
  await expect(lab.getByText("s = [0.8125, 0.8125, 0.5000]", { exact: true })).toBeVisible();
  await expect(page.getByText("Aster", { exact: true })).toHaveCount(0);
  await lab.getByRole("button", { name: "Monte Carlo", exact: true }).click();
  await expect(page.getByTestId("mc-share")).toContainText("42.20%");
  await lab.getByLabel("Inspect candidate").selectOption("1");
  await expect(page.getByTestId("mc-share")).toContainText("57.75%");
  await lab.getByRole("slider", { name: /Simulation prefix/ }).fill("200");
  await expect(page.getByTestId("mc-share")).toContainText("/ 200 runs");
  await expect(page.locator(".be-result-row strong")).toHaveText(["81.3%", "81.3%", "50.0%"]);
  await lab.getByRole("button", { name: "Information theory", exact: true }).click();
  await expect(lab.getByText(/Using the first/)).toContainText("200");
  await expect(lab.getByRole("table", { name: "Share of runs at each rank" })).toBeVisible();
  await lab.getByRole("button", { name: "Sensitivity", exact: true }).click();
  await lab.getByLabel("Inspect candidate").selectOption("0");
  await expect(lab.getByText("+4.69 pp / weight", { exact: true })).toBeVisible();
  await page.getByRole("slider", { name: /School funding importance/ }).fill("3");
  await expect(lab.getByText("+3.00 pp / weight", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "05 Reveal", exact: true }).click();
  await expect(lab.getByLabel("Inspect candidate").locator("option")).toHaveText(["Aster", "Juniper", "Cedar"]);
  expect(errors).toEqual([]);
});

test("all mathematical views fit a phone and keep their equations readable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/additional-features");
  for (const name of ["Vector algebra", "Monte Carlo", "Sensitivity", "Information theory"]) {
    await page.getByRole("button", { name, exact: true }).click();
    const overflow = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".bm-formula, .bm-panel, .bm-matrix")].filter((node) => node.scrollWidth > node.clientWidth + 1).map((node) => node.textContent));
    expect(overflow).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.locator("#ballot-math-lab").screenshot({ path: `test-results/math-${name.replaceAll(" ", "-")}-320.png` });
  }
  await page.setViewportSize({ width: 1024, height: 1000 });
  await page.getByRole("button", { name: "Monte Carlo", exact: true }).click();
  await page.locator("#ballot-math-lab").screenshot({ path: "test-results/math-monte-carlo-desktop.png" });
});
