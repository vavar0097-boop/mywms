import { Request, Response } from "express";
import { z } from "zod";

import { successResponse } from "../../utils/response";
import { AuditRepository } from "./audit.repository";

const auditQuerySchema = z.object({
  search: z.string().trim().optional(),
  entity_name: z.string().trim().optional(),
  action: z.string().trim().optional(),
  user_id: z.uuid().optional(),
  date_from: z.string().trim().optional(),
  date_to: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(100),
});

export class AuditController {
  private repository = new AuditRepository();

  getLogs = async (req: Request, res: Response) => {
    const query = auditQuerySchema.parse(req.query);
    const logs = await this.repository.findMany(query);

    return successResponse(
      res,
      logs,
      "Audit logs fetched successfully",
    );
  };
}
