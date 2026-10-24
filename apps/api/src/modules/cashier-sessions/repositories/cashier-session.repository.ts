import { db } from "../../../database/client";

import {
  OpenCashierSessionDto,
  CloseCashierSessionDto,
  CreateCashierDepositDto,
  CreateCashierExpenseDto,
} from "../dto/cashier-session.dto";

export class CashierSessionRepository {
  async findLocationById(
    locationId: string
  ) {
    const { data, error } = await db
      .from("locations")
      .select("*")
      .eq("id", locationId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }

  async findOpenSessionByCashierId(
    cashierId: string
  ) {
    const { data, error } = await db
      .from("v_cashier_session_summary")
      .select("*")
      .eq("cashier_id", cashierId)
      .eq("status", "OPEN")
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }

  async findOpenSessionByLocationId(
    locationId: string
  ) {
    const { data, error } = await db
      .from("v_cashier_session_summary")
      .select("*")
      .eq("location_id", locationId)
      .eq("status", "OPEN")
      .order("opened_at", {
        ascending: true,
      })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }

  async findSessionById(
    sessionId: string
  ) {
    const { data, error } = await db
      .from("cashier_sessions")
      .select("*")
      .eq("id", sessionId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }

  async findSummaryById(
    sessionId: string
  ) {
    const { data, error } = await db
      .from("v_cashier_session_summary")
      .select("*")
      .eq("cashier_session_id", sessionId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }

  async create(
    cashierId: string,
    dto: OpenCashierSessionDto
  ) {
    const { data, error } = await db
      .from("cashier_sessions")
      .insert({
        cashier_id: cashierId,
        location_id: dto.location_id,
        shift_name: dto.shift_name,
        opening_cash: dto.opening_cash,
        expected_cash: dto.opening_cash,
        status: "OPEN",
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async close(
    params: {
      sessionId: string;
      cashierId: string;
      expectedCash: number;
      dto: CloseCashierSessionDto;
    }
  ) {
    const { data, error } = await db
      .from("cashier_sessions")
      .update({
        status: "CLOSED",
        expected_cash:
          params.expectedCash,
        actual_cash:
          params.dto.actual_cash,
        notes:
          params.dto.notes ?? null,
      })
      .eq("id", params.sessionId)
      .eq("cashier_id", params.cashierId)
      .eq("status", "OPEN")
      .select()
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }

  async createExpense(params: {
    cashierSessionId: string;
    cashierId: string;
    locationId: string;
    dto: CreateCashierExpenseDto;
  }) {
    const { data, error } = await db
      .from("cashier_expenses")
      .insert({
        cashier_session_id: params.cashierSessionId,
        cashier_id: params.cashierId,
        location_id: params.locationId,
        expense_category: params.dto.expense_category,
        amount: params.dto.amount,
        reason: params.dto.reason,
        photo_url: params.dto.photo_url ?? null,
        status: "POSTED",
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async createDeposit(params: {
    cashierSessionId: string;
    cashierId: string;
    locationId: string;
    dto: CreateCashierDepositDto;
  }) {
    const { data, error } = await db
      .from("cashier_deposits")
      .insert({
        cashier_session_id: params.cashierSessionId,
        cashier_id: params.cashierId,
        location_id: params.locationId,
        amount: params.dto.amount,
        received_by: params.dto.received_by,
        photo_url: params.dto.photo_url ?? null,
        notes: params.dto.notes ?? null,
        status: "POSTED",
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async createFinanceExpense(params: {
    expenseId: string;
    cashierId: string;
    amount: number;
    category: string;
    description: string;
  }) {
    const { error } = await db
      .from("finance_transactions")
      .insert({
        type: "EXPENSE",
        category: params.category,
        description: params.description,
        amount: params.amount,
        payment_method: "CASH",
        reference_type: "CASHIER_EXPENSE",
        reference_id: params.expenseId,
        created_by: params.cashierId,
      });

    if (error) {
      throw error;
    }
  }
}
