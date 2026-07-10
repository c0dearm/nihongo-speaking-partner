import { PERSONAS } from '../../data/personas';
import { JLPTLevel, Persona, PersonaId } from '../../types';

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

  buildSystemInstruction(personaId: PersonaId, targetLevel: JLPTLevel, _furiganaEnabled?: boolean): string {
    const persona = this.getPersona(personaId);

    return `${persona.systemPrompt}

TARGET JLPT LEVEL: ${targetLevel}
Adapt your vocabulary and grammatical complexity to match appropriate expectations for Japanese proficiency level ${targetLevel}.
Always respond entirely in authentic spoken Japanese. Keep your spoken turn natural and concise so the user has plenty of opportunity to practice speaking.`;
  }
}
