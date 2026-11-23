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

const routes = Object.freeze([
  { name: 'Repository engineering', pattern: /\b(github|repository|pull request|\bpr\b|commit|code|tests?)\b/i, next: 'Inspect repository evidence, prepare a reversible patch, and run tests before proposing a pull request.' },
  { name: 'Windows diagnostics', pattern: /\b(windows|bluetooth|driver|powershell|disk|computer)\b/i, next: 'Collect read-only device evidence first; do not disable services or change drivers without approval.' },
  { name: 'Defensive security', pattern: /\b(security|audit|vulnerability|firewall|phishing)\b/i, next: 'Confirm authorized scope and perform defensive, non-destructive inspection.' },
  { name: 'Business operations', pattern: /\b(customer|website|business|streetwise|sales|support)\b/i, next: 'Review current business state and draft a verifiable action plan; do not contact customers or accept payments.' },
  { name: 'Research', pattern: /\b(research|find|compare|explain)\b/i, next: 'Identify reliable sources and summarize evidence, noting unavailable connections.' }
]);

export function planDevilTask(task) {
  if (typeof task !== 'string' || !task.trim() || task.length > 2000) return null;
  const route = routes.find(item => item.pattern.test(task)) || {
    name: 'General task planning', next: 'Break the request into reversible steps; identify the necessary authorized tools.'
  };
  return {
    mode: 'DEVIL',
    capability: route.name,
    nextStep: route.next,
    execution: 'not_performed',
    toolsConnected: false,
    requiresApproval: true,
    executionPath: 'private_owner_reviewed_command_workspace',
    commandTicket: null,
    paidServicesAllowed: false
  };
}
