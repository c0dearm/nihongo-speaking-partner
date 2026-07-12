import { StorageRepository } from '../storage/StorageRepository';
import { JLPTLevel, ProficiencyProfile } from '../../types';

export class ProficiencyProfileService {
  constructor(private repository: StorageRepository) {}

  async getProficiencyProfile(defaultLevel: JLPTLevel): Promise<ProficiencyProfile> {
    try {
      const [sessions, notebookItems, stats] = await Promise.all([
        this.repository.getSessions(),
        this.repository.getNotebookItems(),
        this.repository.getUserStats(),
      ]);

      let estimatedLevel: JLPTLevel = defaultLevel;
      for (const session of sessions) {
        if (session.feedbackReport?.estimatedLevel && ['N5', 'N4', 'N3', 'N2', 'N1'].includes(session.feedbackReport.estimatedLevel)) {
          estimatedLevel = session.feedbackReport.estimatedLevel as JLPTLevel;
          break;
        }
      }

      const unmastered = notebookItems.filter((item) => !item.mastered);
      const recentStruggles = unmastered
        .slice(0, 5)
        .map((item) => `${item.originalText} (${item.explanation})`);

      return {
        estimatedLevel,
        recentStruggles,
        recentStrengths: [],
        totalPracticeMinutes: stats.totalMinutesPracticed || 0,
      };
    } catch (err) {
      console.error('[ProficiencyProfileService] Failed to synthesize profile, falling back to baseline:', err);
      return {
        estimatedLevel: defaultLevel,
        recentStruggles: [],
        recentStrengths: [],
        totalPracticeMinutes: 0,
      };
    }
  }
}
