import { ToolDecorator as Tool, z } from '@nitrostack/core';
import {
  actionItemsStore,
  ActionItemPriority,
  ActionItemStatus,
  ActionItem,
} from './action-items.store.js';

/**
 * Action Items Tools
 * Provides MCP tools for creating, listing, and updating action items
 */
export class ActionItemsTools {
  /**
   * Create a new action item
   */
  @Tool({
    name: 'createActionItem',
    description: 'Create a new action item with title, owner, priority, and optional metadata',
    inputSchema: z.object({
      title: z.string().min(1, 'Title is required').describe('Action item title'),
      owner: z.string().min(1, 'Owner is required').describe('Person or team responsible'),
      priority: z
        .enum(['low', 'medium', 'high', 'critical'])
        .describe('Priority level'),
      sourceDocument: z
        .string()
        .optional()
        .describe('Optional approved Markdown filename reference'),
      dueDate: z
        .string()
        .optional()
        .describe('Optional due date (e.g., 2024-05-30)'),
      description: z
        .string()
        .optional()
        .describe('Optional detailed description'),
    }),
  })
  createActionItem(input: {
    title: string;
    owner: string;
    priority: ActionItemPriority;
    sourceDocument?: string;
    dueDate?: string;
    description?: string;
  }): ActionItem & { storageNote: string } {
    return actionItemsStore.createActionItem(
      input.title,
      input.owner,
      input.priority,
      input.sourceDocument,
      input.dueDate,
      input.description
    );
  }

  /**
   * List action items with optional filtering
   */
  @Tool({
    name: 'listActionItems',
    description:
      'List action items with optional filtering by status, owner, or priority. Returns count breakdown by status.',
    inputSchema: z.object({
      status: z
        .enum(['open', 'in_progress', 'completed'])
        .optional()
        .describe('Filter by status'),
      owner: z
        .string()
        .optional()
        .describe('Filter by owner (partial match, case-insensitive)'),
      priority: z
        .enum(['low', 'medium', 'high', 'critical'])
        .optional()
        .describe('Filter by priority'),
    }),
  })
  listActionItems(input: {
    status?: ActionItemStatus;
    owner?: string;
    priority?: ActionItemPriority;
  }): {
    items: ActionItem[];
    totalCount: number;
    statusBreakdown: Record<ActionItemStatus, number>;
    storageNote: string;
  } {
    return actionItemsStore.listActionItems(input.status, input.owner, input.priority);
  }

  /**
   * Update action item status
   */
  @Tool({
    name: 'updateActionStatus',
    description: 'Update the status of an action item. Returns error if ID not found.',
    inputSchema: z.object({
      id: z.string().min(1, 'ID is required').describe('Action item ID (e.g., ACT-001)'),
      status: z
        .enum(['open', 'in_progress', 'completed'])
        .describe('New status'),
    }),
  })
  updateActionStatus(input: {
    id: string;
    status: ActionItemStatus;
  }): {
    success: boolean;
    message: string;
    actionItem?: ActionItem;
    storageNote: string;
  } {
    const updated = actionItemsStore.updateActionStatus(input.id, input.status);

    if (!updated) {
      return {
        success: false,
        message: `Action item with ID "${input.id}" not found.`,
        storageNote:
          'This prototype keeps action items for the current running session only. ' +
          'A production version would use an approved database for persistence.',
      };
    }

    const { storageNote, ...actionItem } = updated;

    return {
      success: true,
      message: `Action item "${input.id}" status updated to "${input.status}".`,
      actionItem,
      storageNote,
    };
  }
}
