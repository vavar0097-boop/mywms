import bcrypt from "bcryptjs";

import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../utils/errors";
import { UserRepository, UserRow } from "./user.repository";

const userRepository = new UserRepository();

const defaultRoles = [
  {
    name: "OWNER",
    description: "Business owner with full system access",
  },
  {
    name: "FINANCE",
    description: "Finance, cashier settlement, and reports",
  },
  {
    name: "WAREHOUSE",
    description: "Warehouse stock and transfer operations",
  },
  {
    name: "CASHIER",
    description: "POS cashier access",
  },
  {
    name: "ADMIN",
    description: "Legacy full system access",
  },
  {
    name: "SUPERVISOR",
    description: "Operational supervisor",
  },
  {
    name: "OPERATOR",
    description: "Legacy cashier/operator access",
  },
  {
    name: "AUDITOR",
    description: "Audit and reporting",
  },
];

type UserPayload = {
  username: string;
  full_name: string;
  password?: string;
  role_id: string;
  is_active?: boolean;
};

function getRole(user: UserRow) {
  const role = user.user_roles?.[0]?.roles;

  if (Array.isArray(role)) {
    return role[0] ?? null;
  }

  return role ?? null;
}

function normalizeUser(user: UserRow) {
  const role = getRole(user);

  return {
    id: user.id,
    username: user.username,
    full_name: user.full_name,
    is_active: user.is_active ?? true,
    created_at: user.created_at,
    updated_at: user.updated_at,
    role_id: role?.id ?? null,
    role_name: role?.name ?? null,
  };
}

async function assertRole(roleId: string) {
  const role = await userRepository.findRoleById(roleId);

  if (!role) {
    throw new BadRequestError("Role not found");
  }
}

export class UserService {
  async getUsers(params?: {
    search?: string;
    limit?: number;
  }) {
    const users = await userRepository.findAll(params);

    return users.map(normalizeUser);
  }

  async getRoles() {
    await userRepository.upsertRoles(defaultRoles);
    const roles = await userRepository.findRoles();

    return roles;
  }

  async createUser(payload: UserPayload) {
    const username = payload.username?.trim();
    const fullName = payload.full_name?.trim();
    const password = payload.password?.trim();
    const roleId = payload.role_id?.trim();

    if (!username || !fullName || !password || !roleId) {
      throw new BadRequestError(
        "Username, full name, password, and role are required",
      );
    }

    if (password.length < 6) {
      throw new BadRequestError(
        "Password minimum 6 characters",
      );
    }

    await assertRole(roleId);

    const passwordHash = await bcrypt.hash(password, 10);
    let user: { id: string };

    try {
      user = await userRepository.create({
        username,
        full_name: fullName,
        password_hash: passwordHash,
        is_active: payload.is_active ?? true,
      });
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: unknown }).code === "23505"
      ) {
        throw new ConflictError("Username already exists");
      }

      throw error;
    }

    await userRepository.setRole(user.id, roleId);

    const created = await userRepository.findById(user.id);

    if (!created) {
      throw new NotFoundError("User not found");
    }

    return normalizeUser(created);
  }

  async updateUser(
    id: string,
    payload: Partial<UserPayload>,
  ) {
    const existing = await userRepository.findById(id);

    if (!existing) {
      throw new NotFoundError("User not found");
    }

    const updatePayload: {
      username?: string;
      full_name?: string;
      password_hash?: string;
      is_active?: boolean;
    } = {};

    if (payload.username !== undefined) {
      const username = payload.username.trim();

      if (!username) {
        throw new BadRequestError("Username is required");
      }

      updatePayload.username = username;
    }

    if (payload.full_name !== undefined) {
      const fullName = payload.full_name.trim();

      if (!fullName) {
        throw new BadRequestError("Full name is required");
      }

      updatePayload.full_name = fullName;
    }

    if (payload.password?.trim()) {
      const password = payload.password.trim();

      if (password.length < 6) {
        throw new BadRequestError(
          "Password minimum 6 characters",
        );
      }

      updatePayload.password_hash = await bcrypt.hash(
        password,
        10,
      );
    }

    if (payload.is_active !== undefined) {
      updatePayload.is_active = payload.is_active;
    }

    await userRepository.update(id, updatePayload);

    if (payload.role_id !== undefined) {
      const roleId = payload.role_id.trim();

      if (!roleId) {
        throw new BadRequestError("Role is required");
      }

      await assertRole(roleId);
      await userRepository.setRole(id, roleId);
    }

    const updated = await userRepository.findById(id);

    if (!updated) {
      throw new NotFoundError("User not found");
    }

    return normalizeUser(updated);
  }

  async deleteUser(id: string) {
    const existing = await userRepository.findById(id);

    if (!existing) {
      throw new NotFoundError("User not found");
    }

    await userRepository.softDelete(id);
  }
}
