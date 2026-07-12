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

  it('injects roleplay mission goal and roles when a scenario is provided', () => {
    const instruction = service.buildSystemInstruction('casual_friend', 'N4', undefined, {
      id: 'n4-izakaya',
      title: 'Reserving an Izakaya Table',
      jlptLevel: 'N4',
      category: 'dining',
      goalDescription: 'Reserve a table for 5 people for Saturday at 7pm under Tanaka.',
      userRole: 'Customer calling the izakaya',
      aiRole: 'Izakaya Host (Polite desu-masu)',
    });
    expect(instruction).toContain('You are roleplaying as: Izakaya Host (Polite desu-masu)');
    expect(instruction).toContain('The user is roleplaying as: Customer calling the izakaya');
    expect(instruction).toContain('The user\'s secret goal for this conversation is: Reserve a table for 5 people for Saturday at 7pm under Tanaka.');
  });

  it('injects dynamic proficiency profile and real-time adaptation rules when adaptationMode is auto', () => {
    const service = new PersonaService();
    const prompt = service.buildSystemInstruction(
      'casual_friend',
      'N4',
      true,
      undefined,
      {
        estimatedLevel: 'N3',
        recentStruggles: ['verb conjugations (use te-form correctly)'],
        recentStrengths: [],
        totalPracticeMinutes: 120,
      },
      'auto'
    );

    expect(prompt).toContain('DYNAMIC ADAPTIVE PROFICIENCY PROFILE');
    expect(prompt).toContain('historical evaluated proficiency is approximately: N3');
    expect(prompt).toContain('verb conjugations (use te-form correctly)');
    expect(prompt).toContain('REAL-TIME ADAPTATION RULES');
  });

  it('injects rigid benchmark instructions when adaptationMode is rigid', () => {
    const service = new PersonaService();
    const prompt = service.buildSystemInstruction(
      'casual_friend',
      'N4',
      true,
      undefined,
      undefined,
      'rigid'
    );

    expect(prompt).toContain('Adaptation Mode: RIGID BENCHMARK');
    expect(prompt).not.toContain('DYNAMIC ADAPTIVE PROFICIENCY PROFILE');
  });
});

