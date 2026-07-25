/**
 * In-memory store for action items (session-scoped demo only)
 */

export type ActionItemPriority = 'low' | 'medium' | 'high' | 'critical';
export type ActionItemStatus = 'open' | 'in_progress' | 'completed';

export interface ActionItem {
  id: string;
  title: string;
  owner: string;
  priority: ActionItemPriority;
  status: ActionItemStatus;
  sourceDocument?: string;
  dueDate?: string;
  description?: string;
  createdAt: string;
}

export interface ActionItemsStoreResponse {
  storageNote: string;
  [key: string]: any;
}

class ActionItemsStore {
  private items: Map<string, ActionItem> = new Map();
  private idCounter: number = 0;
  private initialized: boolean = false;

  private readonly STORAGE_NOTE =
    'This prototype keeps action items for the current running session only. ' +
    'A production version would use an approved database for persistence.';

  /**
   * Initialize store with starter items if empty
   */
  private ensureInitialized(): void {
    if (this.initialized) return;

    this.initialized = true;

    // Add two realistic starter items
    const starterItems: ActionItem[] = [
      {
        id: 'ACT-001',
        title: 'Review Atlas API v2 OAuth migration guide',
        owner: 'Backend Team',
        priority: 'high',
        status: 'open',
        sourceDocument: 'atlas-api-v2.md',
        dueDate: '2024-05-15',
        description: 'Review the new OAuth 2.0 authentication flow and update internal documentation.',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'ACT-002',
        title: 'Update API client library for v2 endpoints',
        owner: 'Backend Team',
        priority: 'critical',
        status: 'in_progress',
        sourceDocument: 'atlas-api-v2.md',
        dueDate: '2024-05-30',
        description: 'Migrate all endpoint calls from /reports to /analytics/reports and handle new response schema.',
        createdAt: new Date().toISOString(),
      },
    ];

    starterItems.forEach((item) => {
      this.items.set(item.id, item);
      // Extract counter from ID (e.g., "ACT-001" → 1)
      const num = parseInt(item.id.split('-')[1], 10);
      if (num > this.idCounter) {
        this.idCounter = num;
      }
    });
  }

  /**
   * Generate next readable ID
   */
  private generateId(): string {
    this.idCounter += 1;
    return `ACT-${String(this.idCounter).padStart(3, '0')}`;
  }

  /**
   * Create a new action item
   */
  createActionItem(
    title: string,
    owner: string,
    priority: ActionItemPriority,
    sourceDocument?: string,
    dueDate?: string,
    description?: string
  ): ActionItem & ActionItemsStoreResponse {
    this.ensureInitialized();

    const id = this.generateId();
    const item: ActionItem = {
      id,
      title,
      owner,
      priority,
      status: 'open',
      sourceDocument,
      dueDate,
      description,
      createdAt: new Date().toISOString(),
    };

    this.items.set(id, item);

    return {
      ...item,
      storageNote: this.STORAGE_NOTE,
    };
  }

  /**
   * List action items with optional filters
   */
  listActionItems(
    status?: ActionItemStatus,
    owner?: string,
    priority?: ActionItemPriority
  ): {
    items: ActionItem[];
    totalCount: number;
    statusBreakdown: Record<ActionItemStatus, number>;
    storageNote: string;
  } {
    this.ensureInitialized();

    let filtered = Array.from(this.items.values());

    if (status) {
      filtered = filtered.filter((item) => item.status === status);
    }
    if (owner) {
      filtered = filtered.filter((item) =>
        item.owner.toLowerCase().includes(owner.toLowerCase())
      );
    }
    if (priority) {
      filtered = filtered.filter((item) => item.priority === priority);
    }

    // Calculate status breakdown
    const statusBreakdown: Record<ActionItemStatus, number> = {
      open: 0,
      in_progress: 0,
      completed: 0,
    };

    Array.from(this.items.values()).forEach((item) => {
      statusBreakdown[item.status] += 1;
    });

    return {
      items: filtered,
      totalCount: filtered.length,
      statusBreakdown,
      storageNote: this.STORAGE_NOTE,
    };
  }

  /**
   * Update action item status
   */
  updateActionStatus(
    id: string,
    newStatus: ActionItemStatus
  ): (ActionItem & ActionItemsStoreResponse) | null {
    this.ensureInitialized();

    const item = this.items.get(id);
    if (!item) {
      return null;
    }

    item.status = newStatus;
    this.items.set(id, item);

    return {
      ...item,
      storageNote: this.STORAGE_NOTE,
    };
  }

  /**
   * Get item by ID (for validation)
   */
  getActionItem(id: string): ActionItem | undefined {
    this.ensureInitialized();
    return this.items.get(id);
  }
}

// Singleton instance
export const actionItemsStore = new ActionItemsStore();
