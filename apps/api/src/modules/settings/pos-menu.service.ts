import { BadRequestError } from "../../utils/errors";
import {
  PosMenuBomComponentPayload,
  PosMenuPayload,
  PosMenuRepository,
} from "./pos-menu.repository";

const repository = new PosMenuRepository();

function cleanPayload(payload: PosMenuPayload): PosMenuPayload {
  const menuCode = payload.menu_code?.trim();
  const menuName = payload.menu_name?.trim();
  const price = Number(payload.price);

  if (!menuCode || !menuName || !Number.isFinite(price) || price < 0) {
    throw new BadRequestError(
      "Menu code, name, and valid price are required",
    );
  }

  return {
    item_id: payload.item_id || null,
    menu_code: menuCode,
    menu_name: menuName,
    category: payload.category?.trim() || null,
    price,
    is_visible: payload.is_visible ?? true,
    is_available: payload.is_available ?? true,
    sort_order: Number(payload.sort_order ?? 0),
  };
}

function cleanBomComponents(
  components: PosMenuBomComponentPayload[],
): PosMenuBomComponentPayload[] {
  if (!Array.isArray(components)) {
    throw new BadRequestError("BOM components must be an array");
  }

  const seen = new Set<string>();

  return components.map((component) => {
    const itemId = component.component_item_id?.trim();
    const quantity = Number(component.quantity_per_menu);
    const fixed = component.is_fixed_quantity ?? false;
    const tolerance = fixed
      ? 0
      : Number(component.tolerance_percent ?? 3);

    if (!itemId) {
      throw new BadRequestError("BOM component item is required");
    }

    if (seen.has(itemId)) {
      throw new BadRequestError("BOM component items must be unique");
    }

    seen.add(itemId);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new BadRequestError("BOM component quantity must be greater than 0");
    }

    if (!Number.isFinite(tolerance) || tolerance < 0 || tolerance > 3) {
      throw new BadRequestError("BOM tolerance must be between 0 and 3 percent");
    }

    return {
      component_item_id: itemId,
      quantity_per_menu: quantity,
      tolerance_percent: tolerance,
      is_fixed_quantity: fixed,
      notes: component.notes?.trim() || null,
    };
  });
}

export class PosMenuService {
  async getMenuItems(params?: {
    search?: string;
    visible_only?: boolean;
    limit?: number;
  }) {
    return repository.findAll(params);
  }

  async createMenuItem(payload: PosMenuPayload) {
    return repository.create(cleanPayload(payload));
  }

  async updateMenuItem(id: string, payload: PosMenuPayload) {
    return repository.update(id, cleanPayload(payload));
  }

  async deleteMenuItem(id: string) {
    await repository.delete(id);
  }

  async getBom(menuItemId: string) {
    return repository.findBom(menuItemId);
  }

  async replaceBom(
    menuItemId: string,
    components: PosMenuBomComponentPayload[],
  ) {
    return repository.replaceBom(
      menuItemId,
      cleanBomComponents(components),
    );
  }
}
