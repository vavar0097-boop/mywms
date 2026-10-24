import {
  Response,
} from "express";

import {
  successResponse,
  createdResponse,
} from "../../../utils/response";

import {
  AuthRequest,
} from "../../../middleware/auth.middleware";

import {
  CashierSessionService,
} from "../services/cashier-session.service";

import {
  openCashierSessionSchema,
  closeCashierSessionSchema,
  createCashierDepositSchema,
  createCashierExpenseSchema,
} from "../validators/cashier-session.validator";

import {
  UnauthorizedError,
} from "../../../utils/errors";

export class CashierSessionController {
  private service =
    new CashierSessionService();

  getActive = async (
    req: AuthRequest,
    res: Response
  ) => {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    const session =
      await this.service
        .getActiveSession(
          req.user.id
        );

    return successResponse(
      res,
      session,
      "Active cashier session fetched successfully"
    );
  };

  open = async (
    req: AuthRequest,
    res: Response
  ) => {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    const dto =
      openCashierSessionSchema
        .parse(req.body);

    const session =
      await this.service.open(
        req.user.id,
        dto
      );

    return createdResponse(
      res,
      session,
      "Cashier session opened successfully"
    );
  };

  close = async (
    req: AuthRequest,
    res: Response
  ) => {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    const dto =
      closeCashierSessionSchema
        .parse(req.body);

    const session =
      await this.service.close(
        req.user.id,
        String(req.params.id),
        dto
      );

    return successResponse(
      res,
      session,
      "Cashier session closed successfully"
    );
  };

  createExpense = async (
    req: AuthRequest,
    res: Response
  ) => {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    const dto =
      createCashierExpenseSchema
        .parse(req.body);

    const expense =
      await this.service
        .createExpense(
          req.user.id,
          dto
        );

    return createdResponse(
      res,
      expense,
      "Cashier expense recorded successfully"
    );
  };

  createDeposit = async (
    req: AuthRequest,
    res: Response
  ) => {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    const dto =
      createCashierDepositSchema
        .parse(req.body);

    const deposit =
      await this.service
        .createDeposit(
          req.user.id,
          dto
        );

    return createdResponse(
      res,
      deposit,
      "Cashier deposit recorded successfully"
    );
  };
}
