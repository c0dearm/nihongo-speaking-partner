import { PERSONAS } from '../../data/personas';
import { JLPTLevel, Persona, PersonaId, RoleplayScenario, ProficiencyProfile, AdaptationMode, SpeakingSpeed, Initiator } from '../../types';

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
    adaptationMode: AdaptationMode = 'auto',
    speakingSpeed: SpeakingSpeed = 'auto',
    initiator: Initiator = 'ai_first'
  ): string {
    const persona = this.getPersona(personaId);

    let base = `${persona.systemPrompt}\n\nTARGET JLPT LEVEL: ${targetLevel}`;

    const levelToUse = profile?.estimatedLevel || targetLevel;

    if (adaptationMode === 'rigid') {
      base += `\nAdaptation Mode: RIGID BENCHMARK. Maintain rigid grammatical complexity, vocabulary register, and speaking speed appropriate for exact Japanese proficiency level ${targetLevel}. Do not simplify for the user even if they hesitate or make mistakes.`;
    } else {
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

    if (speakingSpeed === 'very_slow' || (speakingSpeed === 'auto' && (levelToUse === 'N5' || levelToUse === 'N4'))) {
      base += `\n\nSPEAKING PACE & CADENCE: You MUST speak VERY SLOWLY and clearly with distinct, gentle pauses between words and clauses (approx. 0.7x to 0.75x normal native speaking pace). Enunciate every syllable clearly so a beginner ear can catch each sound. Do not rush or slur words.`;
    } else if (speakingSpeed === 'slow' || (speakingSpeed === 'auto' && levelToUse === 'N3')) {
      base += `\n\nSPEAKING PACE & CADENCE: Speak at a moderate, steady, and clear pace with distinct pauses (approx. 0.85x to 0.9x normal native pace).`;
    } else if (speakingSpeed === 'normal' || (speakingSpeed === 'auto' && (levelToUse === 'N2' || levelToUse === 'N1'))) {
      base += `\n\nSPEAKING PACE & CADENCE: Speak at a natural, authentic native conversational speed.`;
    }

    if (initiator === 'ai_first') {
      base += `\n\nCONVERSATION INITIATION: You MUST speak first immediately upon session connection. Greet the user warmly in your persona role and open the scene or roleplay situation. Do NOT wait for the user to speak first.`;
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

