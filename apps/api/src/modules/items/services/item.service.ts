import {
  BadRequestError,
  NotFoundError,
} from "../../../utils/errors";

import {
  CreateItemDto,
} from "../dto/create-item.dto";

import {
  UpdateItemDto,
} from "../dto/update-item.dto";

import {
  ItemQueryDto,
} from "../dto/item-query.dto";

import {
  ItemRepository,
} from "../repositories/item.repository";

import {
  ItemType,
  ITEM_PREFIX_MAP,
} from "../types/item.type";

export class ItemService {
  private repository =
    new ItemRepository();

  private getPrefix(
    itemType: ItemType
  ): string {
    return ITEM_PREFIX_MAP[
      itemType
    ];
  }

  async create(
    dto: CreateItemDto
  ) {
    const unit =
      await this.repository
        .findUnitById(
          dto.base_unit_id
        );

    if (!unit) {
      throw new BadRequestError(
        "Base unit not found"
      );
    }

    if (dto.barcode) {
      const existing =
        await this.repository
          .findByBarcode(
            dto.barcode
          );

      if (existing) {
        throw new BadRequestError(
          "Barcode already exists"
        );
      }
    }

    const prefix =
      this.getPrefix(
        dto.item_type
      );

    const itemCode =
      await this.repository
        .generateItemCode(
          prefix
        );

    return this.repository.create({
      item_code: itemCode,
      item_code_prefix:
        prefix,
      dto,
    });
  }

  async findById(
    id: string
  ) {
    const item =
      await this.repository
        .findById(id);

    if (!item) {
      throw new NotFoundError(
        "Item not found"
      );
    }

    return item;
  }

  async findMany(
    query: ItemQueryDto
  ) {
    const page =
      query.page ?? 1;

    const limit =
      query.limit ?? 20;

    const result =
      await this.repository
        .findMany(
          page,
          limit,
          query.search
        );

    return {
      data: result.data,
      pagination: {
        page,
        limit,
        total:
          result.total,

        totalPages:
          Math.ceil(
            result.total /
            limit
          ),
      },
    };
  }

  async update(
    id: string,
    dto: UpdateItemDto
  ) {
    await this.findById(id);

    if (
      dto.base_unit_id
    ) {
      const unit =
        await this.repository
          .findUnitById(
            dto.base_unit_id
          );

      if (!unit) {
        throw new BadRequestError(
          "Base unit not found"
        );
      }
    }

    if (dto.barcode) {
      const existing =
        await this.repository
          .findByBarcode(
            dto.barcode
          );

      if (
        existing &&
        existing.id !== id
      ) {
        throw new BadRequestError(
          "Barcode already exists"
        );
      }
    }

    return this.repository.update(
      id,
      dto
    );
  }

  async delete(
    id: string
  ) {
    await this.findById(id);

    await this.repository
      .softDelete(id);

    return true;
  }
}