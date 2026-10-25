import { test, expect, Page } from "@playwright/test";

const PARENT: Record<string, [number, number]> = {
  school_levy: [1, 3],
  school_buildings: [1, 2],
  taxes_services: [-1, 2],
  housing_types: [0, 1],
  growth_pace: [1, 3],
  roads: [1, 2],
  public_safety: [2, 3],
  parks_libraries: [1, 2],
};
const LABEL: Record<string, string> = {
  "-2": "Strongly disagree",
  "-1": "Disagree",
  "0": "Neutral",
  "1": "Agree",
  "2": "Strongly agree",
};
const WEIGHT: Record<number, string> = {
  1: "A little",
  2: "Somewhat",
  3: "A lot",
};

async function answerAll(page: Page, county: number) {
  const issues: string[] = await page.evaluate(async (index) => {
    const sid = sessionStorage.getItem("blindballot-session")!;
    const s = await (
      await fetch("/api/state", { headers: { "X-Demo-Session": sid } })
    ).json();
    const used = new Set(
      s.counties[index].races.flatMap((r: { issues: string[] }) => r.issues),
    );
    return s.issues
      .filter((i: { id: string }) => used.has(i.id))
      .map((i: { id: string }) => i.id);
  }, county);
  for (const id of issues) {
    const [stance, weight] = PARENT[id];
    await page.getByRole("radio", { name: LABEL[stance], exact: true }).click();
    await page
      .getByRole("radio", { name: WEIGHT[weight], exact: true })
      .click();
    await page.getByRole("button", { name: "Next" }).click();
  }
}

test("voter: blind match, reveal, and ballot sheet", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Vote on policies, not ad budgets." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Find my ballot" }).click();
  await page.getByRole("button", { name: /Lewis Center/ }).click();
  await expect(
    page.getByRole("heading", { name: "Your ballot has 4 local choices" }),
  ).toBeVisible();
  // Real statewide races appear for every Ohio address.
  await expect(
    page.getByRole("heading", { name: "Statewide races on every Ohio ballot" }),
  ).toBeVisible();
  await expect(page.getByText("Sherrod Brown")).toBeVisible();
  await page.getByRole("button", { name: "Start the questions" }).click();
  await answerAll(page, 0);
  await page.getByRole("button", { name: "Usually Republican" }).click();
  await page.getByRole("button", { name: "See my blind matches" }).click();
  await expect(
    page.getByRole("heading", { name: "Your blind matches are ready" }),
  ).toBeVisible();
  // Blind: no names before the reveal.
  await expect(page.getByText("Linda Kowalczyk")).toHaveCount(0);
  await expect(page.getByText("Candidate A").first()).toBeVisible();
  await page.getByRole("switch", { name: "Reveal who they are" }).click();
  await expect(
    page.getByRole("heading", {
      name: "In 3 of 3 races, your best match was not the biggest spender.",
    }),
  ).toBeVisible();
  await expect(page.getByText("Linda Kowalczyk")).toBeVisible();
  // The toggle hides them again, then reveals.
  const toggle = page.getByRole("switch", { name: "Reveal who they are" });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  await expect(page.getByText("Linda Kowalczyk")).toHaveCount(0);
  await toggle.click();
  await expect(page.getByText("Linda Kowalczyk")).toBeVisible();
  await expect(
    page.getByText(
      "Best match spent $4.1K. Top spender ($86.4K) matched you 52%.",
    ),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/reveal.png", fullPage: true });
  // One race per slide: Next through the rest, then the ballot sheet.
  await expect(page.getByText("1 of 4")).toBeVisible();
  for (let i = 0; i < 3; i++) {
    await page.getByRole("button", { name: "Next" }).click();
  }
  await expect(page.getByText("4 of 4")).toBeVisible();
  await page.getByRole("button", { name: "Make my ballot sheet" }).click();
  await expect(
    page.getByRole("heading", { name: "Delaware County, Ohio" }),
  ).toBeVisible();
  await expect(page.locator(".pick")).toHaveCount(5);
  expect(errors).toEqual([]);
});

test("candidate portal: a new candidate is matched blind", async ({ page }) => {
  await page.goto("/candidates");
  await expect(
    page.getByRole("heading", { name: "Tell voters what you’d actually do." }),
  ).toBeVisible();
  await page.getByLabel("Office").selectOption("del-orange-trustee");
  await page.getByLabel("Name as it appears on the ballot").fill("Sam Lee");
  const positions = page.locator("fieldset.position");
  for (const [i, label] of [
    "Neutral",
    "Agree",
    "Agree",
    "Strongly agree",
    "Agree",
  ].entries()) {
    await positions
      .nth(i)
      .getByRole("button", { name: label, exact: true })
      .click();
  }
  await positions
    .nth(3)
    .locator("textarea")
    .fill("Add a medic unit so help arrives fast.");
  await page.getByRole("button", { name: "Add me to the ballot" }).click();
  await expect(
    page.getByRole("heading", {
      name: "You’re on the Orange Township Trustee ballot",
    }),
  ).toBeVisible();
  await page.getByRole("link", { name: "See it as a voter" }).click();
  await page.getByRole("button", { name: "Find my ballot" }).click();
  await page.getByRole("button", { name: /Lewis Center/ }).click();
  await page.getByRole("button", { name: "Start the questions" }).click();
  await answerAll(page, 0);
  await page.getByRole("button", { name: "See my blind matches" }).click();
  await page.getByRole("switch", { name: "Reveal who they are" }).click();
  await page.getByRole("button", { name: /Orange Township Trustee/ }).click();
  await expect(page.getByText("Sam Lee")).toBeVisible();
  await expect(page.getByText("Self-reported")).toBeVisible();
});

test("mobile: Franklin County by ZIP, no sideways scrolling", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Find my ballot" }).click();
  await page.getByLabel("ZIP code").fill("43210");
  await page.getByRole("button", { name: "Find my ballot" }).click();
  await expect(
    page.getByRole("heading", { name: "Your ballot has 4 local choices" }),
  ).toBeVisible();
  await expect(
    page.getByText("Columbus City Council, District 4"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Start the questions" }).click();
  await answerAll(page, 1);
  await page.getByRole("button", { name: "See my blind matches" }).click();
  await page.getByRole("switch", { name: "Reveal who they are" }).click();
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
});

test("outside the demo counties: real local candidates by ZIP", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Find my ballot" }).click();
  await page.getByLabel("ZIP code").fill("44308");
  await page.getByRole("button", { name: "Find my ballot" }).click();
  await expect(
    page.getByRole("heading", { name: "Your ballot in Summit County" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Local races" })).toBeVisible();
  await expect(page.getByText("Emilia Sykes")).toBeVisible();
  await expect(page.getByText("Sherrod Brown")).toBeVisible();
});
