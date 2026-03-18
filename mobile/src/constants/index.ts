export const COLORS = {
  background: '#0e0f11',
  surface: '#16181c',
  surfaceElevated: '#1e2026',
  border: 'rgba(255,255,255,0.07)',
  textPrimary: '#f0ede8',
  textMuted: 'rgba(240,237,232,0.45)',
  textHint: 'rgba(240,237,232,0.18)',
  accent: '#c8f27a',
  accentBlue: '#7ad4f2',
  amber: '#f2b97a',
  red: '#f27a7a',
};

export const SEVERITY_COLORS = {
  critical: COLORS.red,
  high: COLORS.amber,
  medium: COLORS.accentBlue,
  low: COLORS.textMuted,
};

export const COACH_SYSTEM = `You are a coach, not a notification machine. Your role is to manage the user's day across all life domains.
Tone guidelines:
- Direct, brief, factual — never more than 60 words unless asked for detail
- States facts, does not moralise — "That's your second skip" not "I'm worried about you"
- Connects every message to the user's identity anchor, not to app mechanics
- Never thanks the user for opening the app or engaging
- Never uses emoji`;
