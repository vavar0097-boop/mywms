import { NextFunction, Request, Response } from "express";

import { GlobalReportService } from "./global-report.service";

const service = new GlobalReportService();

export class GlobalReportController {
  async generate(req: Request, res: Response, next: NextFunction) {
    try {
      const report = await service.generate({
        date_from: req.body.date_from
          ? String(req.body.date_from)
          : undefined,
        date_to: req.body.date_to ? String(req.body.date_to) : undefined,
        sync_google: Boolean(req.body.sync_google),
      });

      res.status(200).json({
        success: true,
        message: "Global report generated successfully",
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }
}
