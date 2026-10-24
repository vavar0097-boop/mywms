import {
  BadRequestError,
  NotFoundError,
  isForeignKeyViolation,
  toDeleteConflictError,
} from "../../utils/errors";

import {
  VendorPayload,
  VendorRepository,
} from "./vendor.repository";

const vendorRepository = new VendorRepository();

function cleanPayload(payload: Partial<VendorPayload>) {
  return {
    ...(payload.vendor_code !== undefined
      ? { vendor_code: payload.vendor_code?.trim() || undefined }
      : {}),
    ...(payload.vendor_name !== undefined
      ? { vendor_name: payload.vendor_name.trim() }
      : {}),
    ...(payload.contact_name !== undefined
      ? { contact_name: payload.contact_name?.trim() || null }
      : {}),
    ...(payload.phone !== undefined
      ? { phone: payload.phone?.trim() || null }
      : {}),
    ...(payload.email !== undefined
      ? { email: payload.email?.trim() || null }
      : {}),
    ...(payload.address !== undefined
      ? { address: payload.address?.trim() || null }
      : {}),
    ...(payload.notes !== undefined
      ? { notes: payload.notes?.trim() || null }
      : {}),
    ...(payload.is_active !== undefined
      ? { is_active: payload.is_active }
      : {}),
  };
}

export class VendorService {
  async findMany(params?: {
    search?: string;
    limit?: number;
  }) {
    return vendorRepository.findAll(params);
  }

  async create(payload: VendorPayload) {
    const clean = cleanPayload(payload) as VendorPayload;

    if (!clean.vendor_name) {
      throw new BadRequestError("Vendor name is required");
    }

    return vendorRepository.create({
      ...clean,
      is_active: clean.is_active ?? true,
    });
  }

  async update(id: string, payload: Partial<VendorPayload>) {
    const existing = await vendorRepository.findById(id);

    if (!existing) {
      throw new NotFoundError("Vendor not found");
    }

    const clean = cleanPayload(payload);

    if ("vendor_name" in clean && !clean.vendor_name) {
      throw new BadRequestError("Vendor name is required");
    }

    return vendorRepository.update(id, clean);
  }

  async delete(id: string) {
    const existing = await vendorRepository.findById(id);

    if (!existing) {
      throw new NotFoundError("Vendor not found");
    }

    try {
      await vendorRepository.delete(id);
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        throw toDeleteConflictError(error, "vendor");
      }

      throw error;
    }
  }
}
