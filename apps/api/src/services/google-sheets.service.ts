import crypto from "node:crypto";

import { BadRequestError } from "../utils/errors";

export type GoogleSheetValues = Array<Array<string | number>>;

export type GoogleChartSpec = {
  sheetName: string;
  title: string;
  type: "LINE" | "COLUMN" | "BAR";
  anchorRowIndex: number;
  anchorColumnIndex: number;
  domain: {
    startRowIndex: number;
    endRowIndex: number;
    startColumnIndex: number;
    endColumnIndex: number;
  };
  series: Array<{
    startRowIndex: number;
    endRowIndex: number;
    startColumnIndex: number;
    endColumnIndex: number;
  }>;
};

function toRows(values: GoogleSheetValues) {
  return values.map((row) => row.map((value) => String(value ?? "")));
}

function quoteSheetName(name: string) {
  return `'${name.replace(/'/g, "''")}'`;
}

function normalizeGooglePrivateKey(value?: string) {
  if (!value) return "";

  return value
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .replace(/\\\r?\n/g, "\n")
    .replace(/\\n/g, "\n")
    .trim()
    .replace(/\\$/g, "");
}

export async function syncGoogleSheet(params: {
  sheets: Record<string, GoogleSheetValues>;
  charts?: GoogleChartSpec[];
}) {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = normalizeGooglePrivateKey(
    process.env.GOOGLE_PRIVATE_KEY,
  );
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!clientEmail || !privateKey || !spreadsheetId) {
    return {
      synced: false,
      reason: "Google Sheets env is not configured",
    };
  }

  try {
    crypto.createPrivateKey(privateKey);
  } catch {
    throw new BadRequestError(
      "Google private key format is invalid. Recheck GOOGLE_PRIVATE_KEY in apps/api/.env",
    );
  }

  const jwt = await import("jsonwebtoken");
  const now = Math.floor(Date.now() / 1000);
  const assertion = jwt.default.sign(
    {
      iss: clientEmail,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    },
    privateKey,
    {
      algorithm: "RS256",
    },
  );

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    let reason = "Google authentication failed";

    try {
      const errorBody = JSON.parse(errorText) as {
        error?: string;
        error_description?: string;
      };

      reason = [
        reason,
        errorBody.error,
        errorBody.error_description,
      ]
        .filter(Boolean)
        .join(": ");
    } catch {
      if (errorText.trim()) {
        reason = `${reason}: ${errorText.slice(0, 200)}`;
      }
    }

    throw new BadRequestError(reason);
  }

  const tokenBody = (await tokenResponse.json()) as {
    access_token?: string;
  };

  const accessToken = tokenBody.access_token;

  if (!accessToken) {
    throw new BadRequestError("Google authentication returned no token");
  }

  async function fetchMetadata() {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      throw new BadRequestError("Google Sheets metadata failed");
    }

    return (await response.json()) as {
      sheets?: Array<{
        properties?: {
          sheetId?: number;
          title?: string;
        };
      }>;
    };
  }

  let metadata = await fetchMetadata();
  const existingSheets = new Set(
    (metadata.sheets ?? [])
      .map((sheet) => sheet.properties?.title)
      .filter((title): title is string => Boolean(title)),
  );
  const missingSheets = Object.keys(params.sheets).filter(
    (name) => !existingSheets.has(name),
  );

  if (missingSheets.length > 0) {
    const addSheetResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requests: missingSheets.map((name) => ({
            addSheet: {
              properties: {
                title: name,
              },
            },
          })),
        }),
      },
    );

    if (!addSheetResponse.ok) {
      throw new BadRequestError("Google Sheets tab creation failed");
    }

    metadata = await fetchMetadata();
  }

  const ranges = Object.keys(params.sheets).map(
    (name) => `${quoteSheetName(name)}!A:Z`,
  );

  const clearResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchClear`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ranges,
      }),
    },
  );

  if (!clearResponse.ok) {
    throw new BadRequestError("Google Sheets clear failed");
  }

  const data = Object.entries(params.sheets).map(([name, values]) => ({
    range: `${quoteSheetName(name)}!A1`,
    values: toRows(values),
  }));

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        valueInputOption: "USER_ENTERED",
        data,
      }),
    },
  );

  if (!response.ok) {
    throw new BadRequestError("Google Sheets sync failed");
  }

  const sheetIds = new Map(
    (metadata.sheets ?? [])
      .map((sheet) => [
        sheet.properties?.title,
        sheet.properties?.sheetId,
      ])
      .filter(
        (entry): entry is [string, number] =>
          Boolean(entry[0]) && typeof entry[1] === "number",
      ),
  );
  const chartRequests = (params.charts ?? [])
    .map((chart) => {
      const sheetId = sheetIds.get(chart.sheetName);

      if (sheetId === undefined) {
        return null;
      }

      const source = (range: GoogleChartSpec["domain"]) => ({
        sheetId,
        startRowIndex: range.startRowIndex,
        endRowIndex: range.endRowIndex,
        startColumnIndex: range.startColumnIndex,
        endColumnIndex: range.endColumnIndex,
      });

      return {
        addChart: {
          chart: {
            spec: {
              title: chart.title,
              basicChart: {
                chartType: chart.type,
                legendPosition: "RIGHT_LEGEND",
                axis: [
                  {
                    position: "BOTTOM_AXIS",
                    title: "Category",
                  },
                  {
                    position: "LEFT_AXIS",
                    title: "Value",
                  },
                ],
                domains: [
                  {
                    domain: {
                      sourceRange: {
                        sources: [source(chart.domain)],
                      },
                    },
                  },
                ],
                series: chart.series.map((series) => ({
                  series: {
                    sourceRange: {
                      sources: [source(series)],
                    },
                  },
                  targetAxis: "LEFT_AXIS",
                })),
                headerCount: 0,
              },
            },
            position: {
              overlayPosition: {
                anchorCell: {
                  sheetId,
                  rowIndex: chart.anchorRowIndex,
                  columnIndex: chart.anchorColumnIndex,
                },
                offsetXPixels: 0,
                offsetYPixels: 0,
                widthPixels: 520,
                heightPixels: 300,
              },
            },
          },
        },
      };
    })
    .filter((request): request is NonNullable<typeof request> =>
      Boolean(request),
    );
  const formatRequests = Object.keys(params.sheets)
    .map((sheetName) => sheetIds.get(sheetName))
    .filter((sheetId): sheetId is number => typeof sheetId === "number")
    .flatMap((sheetId) => [
      {
        repeatCell: {
          range: {
            sheetId,
            startRowIndex: 0,
            endRowIndex: 1,
          },
          cell: {
            userEnteredFormat: {
              textFormat: {
                bold: true,
                fontSize: 16,
              },
            },
          },
          fields: "userEnteredFormat.textFormat",
        },
      },
      {
        autoResizeDimensions: {
          dimensions: {
            sheetId,
            dimension: "COLUMNS",
            startIndex: 0,
            endIndex: 12,
          },
        },
      },
    ]);

  if (chartRequests.length > 0 || formatRequests.length > 0) {
    const formatResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requests: [...formatRequests, ...chartRequests],
        }),
      },
    );

    if (!formatResponse.ok) {
      const errorText = await formatResponse.text();

      throw new BadRequestError(
        `Google Sheets chart formatting failed: ${errorText.slice(0, 300)}`,
      );
    }
  }

  return {
    synced: true,
    spreadsheet_id: spreadsheetId,
    spreadsheet_url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    sheet_count: Object.keys(params.sheets).length,
  };
}
