import { Response } from "express";

import {AuthRequest} from "../../../middleware/auth.middleware";

import { TransferService } from "../services/transfer.service";

export class TransferController {
  constructor(
    private readonly service =
      new TransferService()
  ) {}

  create = async (
    req: AuthRequest,
    res: Response
  ) => {
    const result =
      await this.service.create(
        req.body,
        req.user!
      );

    res.status(201).json(result);
  };

  findMany = async (
    req: AuthRequest,
    res: Response
  ) => {
    const result =
      await this.service.findMany(
        req.query
      );

    res.json(result);
  };

  findById = async (
    req: AuthRequest,
    res: Response
  ) => {
    const result =
      await this.service.findById(
        String(req.params.id)
      );

    res.json(result);
  };

  request = async (
    req: AuthRequest,
    res: Response
  ) => {
    const result =
      await this.service.request(
        String(req.params.id),
        req.body,
        req.user!
      );

    res.json(result);
  };

  pick = async (
    req: AuthRequest,
    res: Response
  ) => {
    const result =
      await this.service.pick(
        String(req.params.id),
        req.body,
        req.user!
      );

    res.json(result);
  };

  dispatch = async (
    req: AuthRequest,
    res: Response
  ) => {
    const result =
      await this.service.dispatch(
        String(req.params.id),
        req.body,
        req.user!
      );

    res.json(result);
  };

  receive = async (
    req: AuthRequest,
    res: Response
  ) => {
    const result =
      await this.service.receive(
        String(req.params.id),
        req.body,
        req.user!
      );

    res.json(result);
  };

  cancel = async (
    req: AuthRequest,
    res: Response
  ) => {
    const result =
      await this.service.cancel(
        String(req.params.id),
        req.body,
        req.user!
      );

    res.json(result);
  };
}
