import { expect, Page } from "@playwright/test";

const ignoredConsolePatterns = [
  /download/i,
  /favicon/i,
  /ResizeObserver loop/i,
];

export function watchConsoleErrors(page: Page) {
  const errors: string[] = [];

  page.on("console", (message) => {
    if (message.type() !== "error") return;

    const text = message.text();
    if (ignoredConsolePatterns.some((pattern) => pattern.test(text))) {
      return;
    }

    errors.push(text);
  });

  page.on("pageerror", (error) => {
    errors.push(error.message);
  });

  return {
    expectClean() {
      expect(errors, `Browser console errors:\n${errors.join("\n")}`).toEqual(
        [],
      );
    },
  };
}

export async function expectUsablePage(page: Page, heading: string | RegExp) {
  await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  await expect(page.locator("main")).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/failed to load/i);
  await expect(page.locator("body")).not.toContainText(/not found/i);
}

export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth - doc.clientWidth;
  });

  expect(overflow, "Unexpected horizontal page overflow").toBeLessThanOrEqual(
    2,
  );
}

export async function optionCount(page: Page, selector: string) {
  return page.locator(selector).locator("option").count();
}
