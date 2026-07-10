import { describe, it, expect } from 'vitest';
import { PersonaService } from './PersonaService';

describe('PersonaService', () => {
  const service = new PersonaService();

  it('returns all personas', () => {
    const personas = service.getAllPersonas();
    expect(personas).toHaveLength(4);
  });

  it('returns persona by ID', () => {
    const tutor = service.getPersona('jlpt_tutor');
    expect(tutor.name).toContain('Sayuri');
  });

  it('returns first persona when given an invalid ID', () => {
    const fallback = service.getPersona('unknown_id' as any);
    expect(fallback.id).toBe('casual_friend');
  });

  it('builds full system instruction with target JLPT level constraint', () => {
    const instruction = service.buildSystemInstruction('jlpt_tutor', 'N3');
    expect(instruction).toContain('Sayuri');
    expect(instruction).toContain('TARGET JLPT LEVEL: N3');
  });
});
