import { expect, test } from "@playwright/test";

import { login } from "../src/auth";
import {
  credentialsFor,
  missingCredentialsMessage,
  RoleName,
} from "../src/env";

const nonAdminRoleHome: Record<Exclude<RoleName, "admin">, string> = {
  owner: "/dashboard",
  finance: "/dashboard/finance",
  warehouse: "/dashboard/transfers",
  cashier: "/pos",
};

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("login", () => {
  test("renders login form and keeps submit disabled until filled", async ({
    page,
  }) => {
    await page.goto("/login");

    await expect(
      page.getByRole("heading", { name: "Hello, Welcome Back!" }),
    ).toBeVisible();
    await expect(page.getByText("Enterprise WMS")).toBeVisible();
    await expect(page.getByPlaceholder("Enter your username")).toBeVisible();
    const passwordInput = page.getByPlaceholder("Enter your password");
    await expect(passwordInput).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Show password" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeDisabled();

    await page.getByPlaceholder("Enter your username").fill("admin");
    await expect(page.getByRole("button", { name: "Sign in" })).toBeDisabled();

    await passwordInput.fill("wrong-password");
    await page.getByRole("button", { name: "Show password" }).click();
    await expect(passwordInput).toHaveAttribute("type", "text");
    await expect(page.getByRole("button", { name: "Hide password" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });

  test("rejects invalid credentials and stays on login page", async ({
    page,
  }) => {
    await page.goto("/login");

    await page
      .getByPlaceholder("Enter your username")
      .fill(`invalid-${Date.now()}`);
    await page.getByPlaceholder("Enter your password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL(/\/login(?:\?|$)/);
    await expect(page.getByText("Login failed")).toBeVisible();
    await expect(page.getByPlaceholder("Enter your username")).toBeEnabled();
    await expect(page.getByPlaceholder("Enter your password")).toBeEnabled();
  });

  test("admin can login and land on dashboard", async ({ page }) => {
    const credentials = credentialsFor("admin");
    test.skip(!credentials, missingCredentialsMessage("admin"));

    await login(page, credentials!);

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByText("POS Sales by Outlet")).toBeVisible();
  });

  for (const role of Object.keys(nonAdminRoleHome) as Exclude<
    RoleName,
    "admin"
  >[]) {
    test(`${role} can login and lands on the correct home page`, async ({
      page,
    }) => {
      const credentials = credentialsFor(role);
      test.skip(!credentials, missingCredentialsMessage(role));

      await login(page, credentials!);

      await expect
        .poll(() => new URL(page.url()).pathname)
        .toBe(nonAdminRoleHome[role]);
    });
  }

  test("session cookie keeps protected dashboard accessible after reload", async ({
    page,
  }) => {
    const credentials = credentialsFor("admin");
    test.skip(!credentials, missingCredentialsMessage("admin"));

    await login(page, credentials!);
    await page.reload();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });
});
