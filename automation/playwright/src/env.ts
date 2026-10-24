export type Credentials = {
  username: string;
  password: string;
};

export type RoleName =
  | "admin"
  | "owner"
  | "finance"
  | "warehouse"
  | "cashier";

const roleEnv: Record<RoleName, [string, string]> = {
  admin: ["WMS_ADMIN_USERNAME", "WMS_ADMIN_PASSWORD"],
  owner: ["WMS_OWNER_USERNAME", "WMS_OWNER_PASSWORD"],
  finance: ["WMS_FINANCE_USERNAME", "WMS_FINANCE_PASSWORD"],
  warehouse: ["WMS_WAREHOUSE_USERNAME", "WMS_WAREHOUSE_PASSWORD"],
  cashier: ["WMS_CASHIER_USERNAME", "WMS_CASHIER_PASSWORD"],
};

export const appUrl =
  process.env.WMS_APP_URL || "https://mywms-686.pages.dev";

export const apiBaseUrl =
  process.env.WMS_API_BASE_URL || "";

export const reportMonth =
  process.env.WMS_REPORT_MONTH || currentJakartaMonth();

export const syncGoogle = process.env.WMS_SYNC_GOOGLE === "true";

export const allowMutation = process.env.WMS_ALLOW_MUTATION === "true";

export function storageStatePath(role: RoleName) {
  return `.auth/${role}.json`;
}

export function credentialsFor(role: RoleName): Credentials | null {
  const [usernameKey, passwordKey] = roleEnv[role];
  const username = process.env[usernameKey];
  const password = process.env[passwordKey];

  if (!username || !password) {
    return null;
  }

  return { username, password };
}

export function missingCredentialsMessage(role: RoleName) {
  const [usernameKey, passwordKey] = roleEnv[role];

  return `Set ${usernameKey} and ${passwordKey} in automation/playwright/.env`;
}

function currentJakartaMonth() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
  })
    .format(new Date())
    .slice(0, 7);
}
