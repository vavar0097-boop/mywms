import { expect, test } from "@playwright/test";

import { authHeaders, loginApi } from "../src/api";
import {
  credentialsFor,
  missingCredentialsMessage,
  reportMonth,
  syncGoogle,
} from "../src/env";

test.describe("finance monthly report", () => {
  test("API returns daily worksheet payloads", async () => {
    const credentials = credentialsFor("finance");
    test.skip(!credentials, missingCredentialsMessage("finance"));

    const { api, cookie } = await loginApi(credentials!);

    const response = await api.post("finance/monthly-report", {
      headers: authHeaders(cookie),
      data: {
        month: reportMonth,
        sync_google: false,
      },
    });

    expect(response.ok()).toBeTruthy();

    const payload = await response.json();
    const report = payload.data;
    const sheetNames = Object.keys(report.sheets ?? {});

    expect(payload.success).toBe(true);
    expect(report.month).toBe(reportMonth);
    expect(sheetNames.length).toBeGreaterThan(0);
    expect(sheetNames.every((name) => /^\d{4}-\d{2}-\d{2}$/.test(name))).toBe(
      true,
    );
    expect(report.summary).toBeTruthy();
    expect(Array.isArray(report.outlet_summary)).toBe(true);
    expect(
      report.outlet_summary.every(
        (outlet: { outlet_name?: string; income?: number; expense?: number }) =>
          Boolean(outlet.outlet_name) &&
          Number.isFinite(outlet.income) &&
          Number.isFinite(outlet.expense),
      ),
    ).toBe(true);

    await api.dispose();
  });

  test("API returns a seven-day report range", async () => {
    const credentials = credentialsFor("finance");
    test.skip(!credentials, missingCredentialsMessage("finance"));
    const { api, cookie } = await loginApi(credentials!);
    const end = new Date();
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - 6);
    const dateFrom = start.toISOString().slice(0, 10);
    const dateTo = end.toISOString().slice(0, 10);

    const response = await api.post("finance/report", {
      headers: authHeaders(cookie),
      data: { date_from: dateFrom, date_to: dateTo, period: "Mingguan", sync_google: false },
    });
    expect(response.ok()).toBeTruthy();
    const payload = await response.json();
    expect(payload.data.date_from).toBe(dateFrom);
    expect(payload.data.date_to).toBe(dateTo);
    expect(Object.keys(payload.data.sheets ?? {}).length).toBeGreaterThan(0);
    await api.dispose();
  });

  test("Google sync writes daily sheets when enabled", async () => {
    test.skip(!syncGoogle, "Set WMS_SYNC_GOOGLE=true to verify Google sync");

    const credentials = credentialsFor("finance");
    test.skip(!credentials, missingCredentialsMessage("finance"));

    const { api, cookie } = await loginApi(credentials!);

    const response = await api.post("finance/monthly-report", {
      headers: authHeaders(cookie),
      data: {
        month: reportMonth,
        sync_google: true,
      },
    });

    expect(response.ok()).toBeTruthy();

    const payload = await response.json();
    const report = payload.data;
    const sheetNames = Object.keys(report.sheets ?? {});

    expect(report.google.synced).toBe(true);
    expect(report.google.sheet_count).toBe(sheetNames.length);

    await api.dispose();
  });
});
