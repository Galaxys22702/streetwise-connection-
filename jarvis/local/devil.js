// DEVIL is a presentation profile, not an authorization or tool-execution mode.
export const DEVIL_ON = 'JARVIS, ACTIVATE DEVIL MODE';
export const DEVIL_OFF = 'JARVIS, DEACTIVATE DEVIL MODE';

export function devilCommand(message) {
  const normalized = message.trim().replace(/[.!]+$/g, '').toUpperCase();
  if (normalized === DEVIL_ON) return 'on';
  if (normalized === DEVIL_OFF) return 'off';
  return null;
}

export function devilInstructions() {
  return 'DEVIL mode is active inside JARVIS. Respond with terse, intimidating cyberpunk style and dry dark humor while remaining accurate and useful. This is only a persona: you have no additional tools, privileges, permissions, or autonomy. Never pretend to execute actions, bypass approvals, expose secrets, or change the free-only provider route. Avoid abusive or harmful behavior.';
}
