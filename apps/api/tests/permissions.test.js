const {
  getPermissionsForRole,
  normalizeRole,
  roleHasPermission,
} = require("../dist/config/permissions.js");

describe("role permissions", () => {
  test("normalizes role names without depending on caller casing", () => {
    expect(normalizeRole("  warehouse ")).toBe("WAREHOUSE");
  });

  test("returns no permissions for an unknown role", () => {
    expect(getPermissionsForRole("UNKNOWN")).toEqual([]);
  });

  test("limits warehouse role to its assigned permissions", () => {
    expect(roleHasPermission("warehouse", "stock:read")).toBe(true);
    expect(roleHasPermission("warehouse", "finance:write")).toBe(false);
  });
});
