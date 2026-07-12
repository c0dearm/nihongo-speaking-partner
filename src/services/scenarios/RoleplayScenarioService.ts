import { StorageRepository } from '../storage/StorageRepository';
import { RoleplayScenario, JLPTLevel } from '../../types';
import { CURATED_SCENARIOS } from '../../data/scenarios/curatedScenarios';

export class RoleplayScenarioService {
  constructor(private repository: StorageRepository) {}

  async getScenariosByLevel(level: JLPTLevel): Promise<RoleplayScenario[]> {
    const curated = CURATED_SCENARIOS.filter((s) => s.jlptLevel === level);
    const custom = await this.repository.getCustomScenarios();
    const customFiltered = custom.filter((s) => s.jlptLevel === level);
    return [...curated, ...customFiltered];
  }

  async createCustomScenario(scenario: RoleplayScenario): Promise<void> {
    await this.repository.saveCustomScenario({
      ...scenario,
      isCustom: true,
    });
  }

  async getAllScenarios(): Promise<RoleplayScenario[]> {
    const custom = await this.repository.getCustomScenarios();
    return [...CURATED_SCENARIOS, ...custom];
  }
}
