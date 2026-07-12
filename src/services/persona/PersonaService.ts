import { PERSONAS } from '../../data/personas';
import { JLPTLevel, Persona, PersonaId, RoleplayScenario } from '../../types';

export class PersonaService {
  getAllPersonas(): Persona[] {
    return PERSONAS;
  }

  getPersona(id: PersonaId): Persona {
    const persona = PERSONAS.find((p) => p.id === id);
    if (!persona) {
      return PERSONAS[0];
    }
    return persona;
  }

  buildSystemInstruction(
    personaId: PersonaId,
    targetLevel: JLPTLevel,
    _furiganaEnabled?: boolean,
    scenario?: RoleplayScenario
  ): string {
    const persona = this.getPersona(personaId);

    let base = `${persona.systemPrompt}

TARGET JLPT LEVEL: ${targetLevel}
Adapt your vocabulary and grammatical complexity to match appropriate expectations for Japanese proficiency level ${targetLevel}.
Always respond entirely in authentic spoken Japanese. Keep your spoken turn natural and concise so the user has plenty of opportunity to practice speaking.`;

    if (scenario) {
      base += `\n\nROLEPLAY MISSION CONTEXT:
You are roleplaying as: ${scenario.aiRole}
The user is roleplaying as: ${scenario.userRole}
The user's secret goal for this conversation is: ${scenario.goalDescription}
Do NOT immediately solve or give away the goal to the user. Stay strictly in character as ${scenario.aiRole}, ask natural situational follow-up questions (such as checking dates, names, numbers, or details), and require the user to naturally communicate the necessary information in Japanese across multiple conversational turns to accomplish their goal.`;
    }

    return base;
  }
}
