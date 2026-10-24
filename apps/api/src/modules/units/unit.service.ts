import { UnitRepository } from "./unit.repository";

const unitRepository = new UnitRepository();

export class UnitService {
  async getUnits(params?: {
    search?: string;
    limit?: number;
  }) {
    let units = await unitRepository.findAll(params);

    if (units.length === 0 && !params?.search) {
      await unitRepository.seedDefaults();
      units = await unitRepository.findAll(params);
    }

    return units;
  }
}
