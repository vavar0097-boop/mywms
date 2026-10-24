import { test as setup } from "@playwright/test";

import { login } from "../src/auth";
import {
  credentialsFor,
  missingCredentialsMessage,
  RoleName,
  storageStatePath,
} from "../src/env";

const roles: RoleName[] = [
  "admin",
  "owner",
  "finance",
  "warehouse",
  "cashier",
];

for (const role of roles) {
  setup(`login as ${role}`, async ({ page }) => {
    const credentials = credentialsFor(role);
    setup.skip(!credentials, missingCredentialsMessage(role));

    await login(page, credentials!);
    await page.context().storageState({
      path: storageStatePath(role),
    });
  });
}
