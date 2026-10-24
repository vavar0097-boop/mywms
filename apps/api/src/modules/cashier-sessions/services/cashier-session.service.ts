
import {
  BadRequestError,
  NotFoundError,
} from "../../../utils/errors";

import {
  OpenCashierSessionDto,
  CloseCashierSessionDto,
  CreateCashierDepositDto,
  CreateCashierExpenseDto,
} from "../dto/cashier-session.dto";

import {
  CashierSessionRepository,
} from "../repositories/cashier-session.repository";

function uniqueViolationText(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return "";
  }

  return [
    "message" in error ? (error as { message?: unknown }).message : "",
    "details" in error ? (error as { details?: unknown }).details : "",
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ");
}

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505"
  );
}

export class CashierSessionService {
  private repository =
    new CashierSessionRepository();

  private getLocationType(
    location: Record<string, unknown>
  ): string | null {
    const value =
      location.type ??
      location.location_type ??
      location.locationType ??
      location.level;

    if (!value) {
      return null;
    }

    return String(value);
  }

  async getActiveSession(
    cashierId: string
  ) {
    return this.repository
      .findOpenSessionByCashierId(
        cashierId
      );
  }

  async open(
    cashierId: string,
    dto: OpenCashierSessionDto
  ) {
    const existingOpenSession =
      await this.repository
        .findOpenSessionByCashierId(
          cashierId
        );

    if (existingOpenSession) {
      throw new BadRequestError(
        "Cashier already has an open session"
      );
    }

    const location =
      await this.repository
        .findLocationById(
          dto.location_id
        );

    if (!location) {
      throw new NotFoundError(
        "Location not found"
      );
    }

    const locationType =
      this.getLocationType(
        location
      );

    if (locationType !== "OUTLET") {
      throw new BadRequestError(
        "Cashier session location must be OUTLET"
      );
    }

    const isActive =
      location.is_active;

    if (isActive === false) {
      throw new BadRequestError(
        "Location is not active"
      );
    }

    const existingOutletSession =
      await this.repository
        .findOpenSessionByLocationId(
          dto.location_id
        );

    if (existingOutletSession) {
      throw new BadRequestError(
        "This outlet still has an open shift. Close the previous shift before opening a new one."
      );
    }

    let session;

    try {
      session =
        await this.repository
          .create(
            cashierId,
            dto
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        const text = uniqueViolationText(error);

        if (text.includes("one_open_per_cashier")) {
          throw new BadRequestError(
            "Cashier already has an open session"
          );
        }

        throw new BadRequestError(
          "This outlet still has an open shift. Close the previous shift before opening a new one."
        );
      }

      throw error;
    }

    return this.repository
      .findSummaryById(
        session.id
      );
  }

  async close(
    cashierId: string,
    sessionId: string,
    dto: CloseCashierSessionDto
  ) {
    const session =
      await this.repository
        .findSessionById(
          sessionId
        );

    if (!session) {
      throw new NotFoundError(
        "Cashier session not found"
      );
    }

    if (
      session.cashier_id !== cashierId
    ) {
      throw new BadRequestError(
        "Invalid cashier session owner"
      );
    }

    if (
      session.status !== "OPEN"
    ) {
      throw new BadRequestError(
        "Cashier session already closed"
      );
    }

    const summary =
      await this.repository
        .findSummaryById(
          sessionId
        );

    if (!summary) {
      throw new NotFoundError(
        "Cashier session summary not found"
      );
    }

    const expectedCash =
      Number(
        summary.calculated_expected_cash ?? 0
      );

    const closedSession =
      await this.repository
        .close({
          sessionId,
          cashierId,
          expectedCash,
          dto,
        });

    if (!closedSession) {
      throw new BadRequestError(
        "Failed to close cashier session"
      );
    }

    return this.repository
      .findSummaryById(
        sessionId
      );
  }

  async createExpense(
    cashierId: string,
    dto: CreateCashierExpenseDto
  ) {
    const activeSession =
      await this.repository
        .findOpenSessionByCashierId(
          cashierId
        );

    if (!activeSession) {
      throw new BadRequestError(
        "Open cashier session is required before recording expense"
      );
    }

    const expense =
      await this.repository
        .createExpense({
          cashierSessionId:
            activeSession.cashier_session_id,
          cashierId,
          locationId:
            activeSession.location_id,
          dto,
        });

    await this.repository
      .createFinanceExpense({
        expenseId: expense.id,
        cashierId,
        amount: dto.amount,
        category:
          `Cashier Expense - ${dto.expense_category}`,
        description: dto.reason,
      });

    return expense;
  }

  async createDeposit(
    cashierId: string,
    dto: CreateCashierDepositDto
  ) {
    const activeSession =
      await this.repository
        .findOpenSessionByCashierId(
          cashierId
        );

    if (!activeSession) {
      throw new BadRequestError(
        "Open cashier session is required before recording deposit"
      );
    }

    return this.repository
      .createDeposit({
        cashierSessionId:
          activeSession.cashier_session_id,
        cashierId,
        locationId:
          activeSession.location_id,
        dto,
      });
  }
}
