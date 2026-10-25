import { expect, test } from "@playwright/test";

import { apiBaseUrl, appUrl } from "../src/env";

const apiOrigin = apiBaseUrl.replace(/\/$/, "");

test.describe("API deployment health", () => {
  test("health endpoint returns HTTP 200", async ({ request }) => {
    const response = await request.get(`${apiOrigin}/api/health`);

    expect(response.status(), await response.text()).toBe(200);
  });

  test("login preflight allows the configured frontend origin", async ({
    request,
  }) => {
    const response = await request.fetch(`${apiOrigin}/api/auth/login`, {
      method: "OPTIONS",
      headers: {
        Origin: appUrl,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
      },
    });

    expect(response.status(), await response.text()).toBe(204);
    expect(response.headers()["access-control-allow-origin"]).toBe(appUrl);
  });
});
