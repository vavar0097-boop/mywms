import bcrypt from "bcryptjs";

import { db } from "../src/database/client";

async function main() {
  const username = process.env.ADMIN_USERNAME?.trim() || "admin";
  const password = process.env.ADMIN_PASSWORD?.trim();

  if (!password) {
    console.error("ADMIN_PASSWORD is required to create or update an admin user.");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(
    password,
    10
  );

  const { data, error } = await db
    .from("users")
    .upsert(
      {
        username,
        full_name: "System Administrator",
        password_hash: passwordHash,
        is_active: true,
        is_deleted: false,
        deleted_at: null,
      },
      {
        onConflict: "username",
      }
    )
    .select("id, username")
    .single();

  if (error) {
    console.error(error);
    process.exit(1);
  }

  const { error: seedRoleError } = await db
    .from("roles")
    .upsert(
      {
        name: "ADMIN",
        description: "Full system access",
      },
      {
        onConflict: "name",
      }
    );

  if (seedRoleError) {
    console.error(seedRoleError);
    process.exit(1);
  }

  const { data: role, error: roleError } = await db
    .from("roles")
    .select("id")
    .eq("name", "ADMIN")
    .maybeSingle();

  if (roleError) {
    console.error(roleError);
    process.exit(1);
  }

  if (role) {
    const { error: userRoleError } = await db
      .from("user_roles")
      .upsert(
        {
          user_id: data.id,
          role_id: role.id,
        },
        {
          onConflict: "user_id,role_id",
        }
      );

    if (userRoleError) {
      console.error(userRoleError);
      process.exit(1);
    }
  }

  console.log(
    "Admin ready:",
    data
  );

  process.exit(0);
}

main();
