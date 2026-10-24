import { Request, Response } from "express";

import {
  AuthRequest,
} from "../../../middleware/auth.middleware";
import {
  UnauthorizedError,
} from "../../../utils/errors";
import {
  successResponse,
} from "../../../utils/response";
import { env } from "../../../config/env";
import { AuthService } from "../services/auth.service";

const isProduction = env.NODE_ENV === "production";
const accessTokenCookieOptions = {
  httpOnly: true,
  sameSite: isProduction ? "none" as const : "lax" as const,
  secure: isProduction,
  maxAge: 24 * 60 * 60 * 1000,
};
const cookieOptions = {
  httpOnly: true,
  sameSite: isProduction ? "none" as const : "lax" as const,
  secure: isProduction,
};

export class AuthController {
  private service = new AuthService();

  login = async (
    req: Request,
    res: Response
  ) => {
    const {
      username,
      password,
    } = req.body;

    const result = await this.service.login({
      username,
      password,
    });

    res.cookie(
      "access_token",
      result.accessToken,
      accessTokenCookieOptions
    );

    res.cookie(
      "refresh_token",
      result.refreshToken,
      cookieOptions
    );

    return successResponse(
      res,
      result.user,
      "Login successful"
    );
  };

  me = async (
    req: AuthRequest,
    res: Response
  ) => {
    return successResponse(
      res,
      req.user,
      "Current User"
    );
  };

  logout = async (
    _req: Request,
    res: Response
  ) => {
    res.clearCookie("access_token", cookieOptions);
    res.clearCookie("refresh_token", cookieOptions);

    return successResponse(
      res,
      null,
      "Logout successful"
    );
  };

  refresh = async (
    req: Request,
    res: Response
  ) => {
    const refreshToken = req.cookies.refresh_token;

    if (!refreshToken) {
      throw new UnauthorizedError(
        "Refresh token missing"
      );
    }

    const accessToken =
      await this.service.refresh(refreshToken);

    res.cookie(
      "access_token",
      accessToken,
      accessTokenCookieOptions
    );

    return successResponse(
      res,
      null,
      "Token refreshed"
    );
  };
}
