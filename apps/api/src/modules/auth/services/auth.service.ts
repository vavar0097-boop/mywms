import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { env } from "../../../config/env";
import { UnauthorizedError } from "../../../utils/errors";
import { LoginDto } from "../dto/login.dto";
import { AuthRepository } from "../repositories/auth.repository";

type UserRoleRow = {
  roles?:
    | {
        name?: string | null;
      }
    | {
        name?: string | null;
      }[]
    | null;
};

function getRoleName(userRoles: UserRoleRow[] | null | undefined) {
  const role = userRoles?.[0]?.roles;

  if (Array.isArray(role)) {
    return role[0]?.name ?? "OPERATOR";
  }

  return role?.name ?? "OPERATOR";
}

type AuthUser = {
  id: string;
  username: string;
  full_name?: string | null;
  user_roles?: UserRoleRow[] | null;
};

export const ACCESS_TOKEN_EXPIRES_IN = "24h";
export const REFRESH_TOKEN_EXPIRES_IN = "7d";

export class AuthService {
  private repository = new AuthRepository();

  private signAccessToken(user: AuthUser) {
    return jwt.sign(
      {
        sub: user.id,
        username: user.username,
        role: getRoleName(user.user_roles),
      },
      env.JWT_ACCESS_SECRET,
      {
        expiresIn: ACCESS_TOKEN_EXPIRES_IN,
      }
    );
  }

  private toAuthUser(user: AuthUser) {
    return {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: getRoleName(user.user_roles),
    };
  }

  async login({ username, password }: LoginDto) {
    const user = await this.repository.findByUsername(username);

    if (!user) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const valid = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!valid) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const accessToken = this.signAccessToken(user);

    const refreshToken = jwt.sign(
      {
        sub: user.id,
      },
      env.JWT_REFRESH_SECRET,
      {
        expiresIn: REFRESH_TOKEN_EXPIRES_IN,
      }
    );

    return {
      user: this.toAuthUser(user),
      accessToken,
      refreshToken,
    };
  }

  async refresh(refreshToken: string) {
    const payload = jwt.verify(
      refreshToken,
      env.JWT_REFRESH_SECRET
    ) as {
      sub: string;
    };

    const user = await this.repository.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedError("Invalid refresh token");
    }

    return this.signAccessToken(user);
  }
}
