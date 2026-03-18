import { contactsService } from '../../contacts/contactsService';
import type { AssistantCapability } from '../types';
import { getFirstStringParam, getStringParam } from './common';

const resolveSearchQuery = (params: Record<string, unknown>): string | undefined => {
  const explicit = getFirstStringParam(params, [
    'query',
    'contactQuery',
    'name',
    'person',
  ]);
  if (explicit) {
    return explicit;
  }

  const rawText = getStringParam(params, 'rawText');
  if (!rawText) {
    return undefined;
  }

  const match = rawText.match(/\b(?:search|find|look up|lookup)\s+for?\s*([a-z][a-z\s'-]+?)(?:\s+in\s+contacts?)?$/i);
  return match?.[1]?.trim();
};

export const contactsCapability: AssistantCapability = {
  namespace: 'contacts',

  execute: async (step) => {
    const permission = await contactsService.ensurePermission(true);
    if (!permission.granted) {
      return {
        reply: 'Contacts access is not granted on this device.',
        status: 'blocked_by_permission',
        evidence: { permission },
      };
    }

    switch (step.command) {
      case 'search': {
        const query = resolveSearchQuery(step.params);
        if (!query) {
          return {
            reply: 'Contacts search needs a query.',
            status: 'failed',
          };
        }
        const contacts = await contactsService.searchContacts(query);
        return {
          reply: `Found ${contacts.length} contact${contacts.length === 1 ? '' : 's'}.`,
          evidence: { contacts },
        };
      }

      case 'get_contact': {
        const contactId = getStringParam(step.params, 'contactId');
        if (!contactId) {
          return {
            reply: 'Contact lookup needs a contact id.',
            status: 'failed',
          };
        }
        const contact = await contactsService.getContact(contactId);
        if (!contact) {
          return {
            reply: 'That contact could not be found.',
            status: 'failed',
          };
        }
        return {
          reply: `Resolved ${contact.name}.`,
          evidence: { contact },
        };
      }

      default:
        return {
          reply: `Contacts command ${step.command} is not implemented.`,
          status: 'failed',
        };
    }
  },

  verify: async (_step, execution) => ({
    ...execution,
    status: execution.status || 'verified',
  }),
};
