import type {
  AssistantNamespace,
  CommandStep,
  ConfirmationPolicy,
  VerificationMode,
} from './types';

export type CommandSpec = {
  namespace: AssistantNamespace;
  command: string;
  confirmationPolicy: ConfirmationPolicy;
  verificationMode: VerificationMode;
};

export const COMMAND_CATALOG: CommandSpec[] = [
  { namespace: 'calendar', command: 'list_calendars', confirmationPolicy: 'auto', verificationMode: 'none' },
  { namespace: 'calendar', command: 'query_range', confirmationPolicy: 'auto', verificationMode: 'none' },
  { namespace: 'calendar', command: 'get_event', confirmationPolicy: 'auto', verificationMode: 'none' },
  { namespace: 'calendar', command: 'find_free_slots', confirmationPolicy: 'auto', verificationMode: 'none' },
  { namespace: 'calendar', command: 'create_event', confirmationPolicy: 'auto', verificationMode: 'read_after_write' },
  { namespace: 'calendar', command: 'update_event', confirmationPolicy: 'auto', verificationMode: 'read_after_write' },
  { namespace: 'calendar', command: 'delete_event', confirmationPolicy: 'destructive', verificationMode: 'read_after_write' },

  { namespace: 'task', command: 'query', confirmationPolicy: 'auto', verificationMode: 'none' },
  { namespace: 'task', command: 'create', confirmationPolicy: 'auto', verificationMode: 'read_after_write' },
  { namespace: 'task', command: 'update', confirmationPolicy: 'auto', verificationMode: 'read_after_write' },
  { namespace: 'task', command: 'complete', confirmationPolicy: 'auto', verificationMode: 'read_after_write' },
  { namespace: 'task', command: 'snooze', confirmationPolicy: 'auto', verificationMode: 'read_after_write' },
  { namespace: 'task', command: 'delete', confirmationPolicy: 'destructive', verificationMode: 'read_after_write' },

  { namespace: 'activity', command: 'query_today', confirmationPolicy: 'auto', verificationMode: 'none' },
  { namespace: 'activity', command: 'checkin', confirmationPolicy: 'auto', verificationMode: 'local_record' },
  { namespace: 'activity', command: 'mark_done', confirmationPolicy: 'auto', verificationMode: 'local_record' },
  { namespace: 'activity', command: 'mark_deferred', confirmationPolicy: 'auto', verificationMode: 'local_record' },
  { namespace: 'activity', command: 'mark_skipped', confirmationPolicy: 'auto', verificationMode: 'local_record' },
  { namespace: 'activity', command: 'reschedule', confirmationPolicy: 'auto', verificationMode: 'local_record' },

  { namespace: 'insight', command: 'schedule_query', confirmationPolicy: 'auto', verificationMode: 'none' },
  { namespace: 'insight', command: 'drift_query', confirmationPolicy: 'auto', verificationMode: 'none' },
  { namespace: 'insight', command: 'momentum_query', confirmationPolicy: 'auto', verificationMode: 'none' },
  { namespace: 'insight', command: 'sleep_query', confirmationPolicy: 'auto', verificationMode: 'none' },

  { namespace: 'contacts', command: 'search', confirmationPolicy: 'auto', verificationMode: 'none' },
  { namespace: 'contacts', command: 'get_contact', confirmationPolicy: 'auto', verificationMode: 'none' },

  { namespace: 'communication', command: 'sms.draft', confirmationPolicy: 'outbound', verificationMode: 'intent_launch' },
  { namespace: 'communication', command: 'call.dial', confirmationPolicy: 'outbound', verificationMode: 'intent_launch' },

  { namespace: 'app', command: 'list_installed', confirmationPolicy: 'auto', verificationMode: 'none' },
  { namespace: 'app', command: 'search', confirmationPolicy: 'auto', verificationMode: 'none' },
  { namespace: 'app', command: 'launch', confirmationPolicy: 'auto', verificationMode: 'intent_launch' },
  { namespace: 'app', command: 'open_settings', confirmationPolicy: 'auto', verificationMode: 'intent_launch' },
  { namespace: 'app', command: 'usage_query', confirmationPolicy: 'auto', verificationMode: 'none' },
  { namespace: 'app', command: 'block', confirmationPolicy: 'auto', verificationMode: 'local_record' },
  { namespace: 'app', command: 'unblock', confirmationPolicy: 'auto', verificationMode: 'local_record' },

  { namespace: 'permission', command: 'status', confirmationPolicy: 'auto', verificationMode: 'none' },
  { namespace: 'permission', command: 'open_settings', confirmationPolicy: 'auto', verificationMode: 'intent_launch' },
  { namespace: 'permission', command: 'setup_check', confirmationPolicy: 'auto', verificationMode: 'none' },
];

export const getCommandSpec = (
  namespace: AssistantNamespace,
  command: string
): CommandSpec | null => {
  return (
    COMMAND_CATALOG.find(
      (item) => item.namespace === namespace && item.command === command
    ) || null
  );
};

export const getCatalogPrompt = (): string => {
  return COMMAND_CATALOG.map(
    (item) =>
      `- ${item.namespace}.${item.command} (confirmation: ${item.confirmationPolicy}, verification: ${item.verificationMode})`
  ).join('\n');
};

export const withCommandDefaults = (
  step: Omit<CommandStep, 'confirmationPolicy' | 'verificationMode'>
): CommandStep | null => {
  const spec = getCommandSpec(step.namespace, step.command);
  if (!spec) {
    return null;
  }

  return {
    ...step,
    confirmationPolicy: spec.confirmationPolicy,
    verificationMode: spec.verificationMode,
  };
};
