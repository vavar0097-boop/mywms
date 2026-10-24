import { create } from "zustand";

import type {
  CreateTransferPayload,
  Transfer,
  TransferAction,
} from "../types/transfer.types";
import { transferService } from "../services/transfer.service";

type TransferStore = {
  transfers: Transfer[];
  selectedTransfer: Transfer | null;

  loadingList: boolean;
  loadingDetail: boolean;
  creating: boolean;
  actionLoading: TransferAction | null;

  fetchTransfers: () => Promise<void>;
  fetchTransfer: (id: string) => Promise<void>;
  createTransfer: (
    payload: CreateTransferPayload,
  ) => Promise<Transfer>;
  runAction: (
    id: string,
    action: TransferAction,
  ) => Promise<void>;
};

export const useTransferStore = create<TransferStore>(
  (set, get) => ({
    transfers: [],
    selectedTransfer: null,

    loadingList: false,
    loadingDetail: false,
    creating: false,
    actionLoading: null,

    async fetchTransfers() {
      set({
        loadingList: true,
      });

      try {
        const transfers =
          await transferService.getTransfers();

        set({
          transfers,
        });
      } finally {
        set({
          loadingList: false,
        });
      }
    },

    async fetchTransfer(id) {
      set({
        loadingDetail: true,
      });

      try {
        const transfer =
          await transferService.getTransferById(id);

        set({
          selectedTransfer: transfer,
        });
      } finally {
        set({
          loadingDetail: false,
        });
      }
    },

    async createTransfer(payload) {
      set({
        creating: true,
      });

      try {
        const transfer =
          await transferService.createTransfer(payload);

        set((state) => ({
          transfers: [transfer, ...state.transfers],
        }));

        return transfer;
      } finally {
        set({
          creating: false,
        });
      }
    },

    async runAction(id, action) {
      set({
        actionLoading: action,
      });

      try {
        await transferService.runAction(id, action);
        await get().fetchTransfer(id);
        await get().fetchTransfers();
      } finally {
        set({
          actionLoading: null,
        });
      }
    },
  }),
);
