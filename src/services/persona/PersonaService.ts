import { PERSONAS } from '../../data/personas';
import { JLPTLevel, Persona, PersonaId, RoleplayScenario, ProficiencyProfile, AdaptationMode } from '../../types';

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
    scenario?: RoleplayScenario,
    profile?: ProficiencyProfile,
    adaptationMode: AdaptationMode = 'auto'
  ): string {
    const persona = this.getPersona(personaId);

    let base = `${persona.systemPrompt}\n\nTARGET JLPT LEVEL: ${targetLevel}`;

    if (adaptationMode === 'rigid') {
      base += `\nAdaptation Mode: RIGID BENCHMARK. Maintain rigid grammatical complexity, vocabulary register, and speaking speed appropriate for exact Japanese proficiency level ${targetLevel}. Do not simplify for the user even if they hesitate or make mistakes.`;
    } else {
      const levelToUse = profile?.estimatedLevel || targetLevel;
      const strugglesText = profile?.recentStruggles && profile.recentStruggles.length > 0
        ? profile.recentStruggles.join('; ')
        : 'None recorded yet';
      const mins = profile?.totalPracticeMinutes || 0;

      base += `\nAdaptation Mode: AUTO (DYNAMIC ADAPTIVE PROFICIENCY)
DYNAMIC ADAPTIVE PROFICIENCY PROFILE:
The user's historical evaluated proficiency is approximately: ${levelToUse}.
Total practice experience: ${mins} minutes.
Known recent struggling grammar/vocabulary areas to gently scaffold and practice: [${strugglesText}].

REAL-TIME ADAPTATION RULES:
You are an intelligent, responsive Japanese speaking tutor and conversation partner. Actively monitor the user's speaking fluency, hesitations, and grammar accuracy turn-by-turn:
- If the user hesitates, uses broken grammar, pauses frequently, or asks for clarification, immediately adapt by slowing your speaking pace, using simpler sentence structures, and naturally recasting their intended meaning without breaking character.
- If the user speaks fluently with accurate complex grammar and native flow, dynamically elevate your grammatical register, introduce natural native idioms, and increase conversational depth.`;
    }

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

