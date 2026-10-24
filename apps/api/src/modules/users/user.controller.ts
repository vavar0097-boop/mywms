import { NextFunction, Request, Response } from "express";

import { UserService } from "./user.service";

const userService = new UserService();

export class UserController {
  async getUsers(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const search =
        typeof req.query.search === "string"
          ? req.query.search
          : undefined;

      const limit =
        typeof req.query.limit === "string"
          ? Number(req.query.limit)
          : undefined;

      const users = await userService.getUsers({
        search,
        limit,
      });

      res.status(200).json({
        success: true,
        message: "Users retrieved successfully",
        data: users,
      });
    } catch (error) {
      next(error);
    }
  }

  async getRoles(
    _req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const roles = await userService.getRoles();

      res.status(200).json({
        success: true,
        message: "Roles retrieved successfully",
        data: roles,
      });
    } catch (error) {
      next(error);
    }
  }

  async createUser(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const user = await userService.createUser(req.body);

      res.status(201).json({
        success: true,
        message: "User created successfully",
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateUser(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const user = await userService.updateUser(
        String(req.params.id),
        req.body,
      );

      res.status(200).json({
        success: true,
        message: "User updated successfully",
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteUser(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      await userService.deleteUser(String(req.params.id));

      res.status(200).json({
        success: true,
        message: "User deleted successfully",
        data: null,
      });
    } catch (error) {
      next(error);
    }
  }
}
