import { expect, test } from "@playwright/test";

import { authHeaders, loginApi, rowsFromPayload } from "../src/api";
import { allowMutation, credentialsFor, missingCredentialsMessage } from "../src/env";

type Role = { id: string; name: string };
type User = { id: string; username: string; full_name: string; role_name?: string };

async function unwrap(response: Awaited<ReturnType<import("@playwright/test").APIRequestContext["get"]>>) {
  const payload = await response.json();
  expect(response.ok(), JSON.stringify(payload)).toBeTruthy();
  return payload.data;
}

test.describe("prototype user CRUD workflow", () => {
  test("admin creates, updates, reads, and soft-deletes a QA user", async () => {
    test.skip(
      !allowMutation,
      "Set WMS_ALLOW_MUTATION=true only for the approved prototype test environment",
    );

    const credentials = credentialsFor("admin");
    test.skip(!credentials, missingCredentialsMessage("admin"));

    const { api, cookie } = await loginApi(credentials!);
    const headers = authHeaders(cookie) ?? {};
    const username = `qa-pw-${Date.now()}`;
    let userId: string | null = null;

    try {
      const roles = await api
        .get("users/roles", { headers })
        .then(async (response) => rowsFromPayload<Role>(await response.json()));
      const role = roles.find((entry) => entry.name === "CASHIER");
      expect(role, "CASHIER role must exist").toBeTruthy();

      const createResponse = await api.post("users", {
        headers,
        data: {
          username,
          full_name: "Playwright QA User",
          password: `Qa-${Date.now()}-test`,
          role_id: role!.id,
          is_active: true,
        },
      });
      const created = (await unwrap(createResponse)) as User;
      userId = created.id;
      expect(created.username).toBe(username);
      expect(created.role_name).toBe("CASHIER");

      const updatedUsername = `${username}-updated`;
      const updateResponse = await api.put(`users/${userId}`, {
        headers,
        data: {
          username: updatedUsername,
          full_name: "Playwright QA User Updated",
          is_active: true,
        },
      });
      const updated = (await unwrap(updateResponse)) as User;
      expect(updated.username).toBe(updatedUsername);
      expect(updated.full_name).toBe("Playwright QA User Updated");

      const readResponse = await api.get(
        `users?search=${encodeURIComponent(updatedUsername)}`,
        { headers },
      );
      const found = rowsFromPayload<User>(await readResponse.json());
      expect(readResponse.ok()).toBeTruthy();
      expect(found.some((entry) => entry.id === userId)).toBe(true);

      console.log(`Retained QA user for review: ${updatedUsername} (${userId})`);
    } finally {
      await api.dispose();
    }
  });
});
