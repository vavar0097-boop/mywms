import { db } from "../../../database/client";

export type AuthUserRow = {
  id: string;
  username: string;
  full_name?: string | null;
  password_hash: string;
  is_active?: boolean | null;
  is_deleted?: boolean | null;
  user_roles?: {
    roles?:
      | {
          name?: string | null;
        }
      | {
          name?: string | null;
        }[]
      | null;
  }[] | null;
};

const selectUserWithRole = `
    id,
    username,
    full_name,
    password_hash,
    is_active,
    is_deleted,
    user_roles (
      roles (
        name
      )
    )
  `;

export class AuthRepository {
  async findByUsername(
    username: string
  ): Promise<AuthUserRow | null> {
    const { data, error } = await db
      .from("users")
      .select(selectUserWithRole)
      .eq("username", username.trim())
      .eq("is_active", true)
      .eq("is_deleted", false)
      .single();

    if (error) {
      return null;
    }

    return data as AuthUserRow;
  }

  async findById(id: string): Promise<AuthUserRow | null> {
    const { data, error } = await db
      .from("users")
      .select(selectUserWithRole)
      .eq("id", id)
      .eq("is_active", true)
      .eq("is_deleted", false)
      .single();

    if (error) {
      return null;
    }

    return data as AuthUserRow;
  }
}
