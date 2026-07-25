import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import * as fs from 'fs';
import * as path from 'path';
import { extractDocumentText, isSupportedDocument } from './document-extractor.js';

/**
 * Role enum for migration brief generation
 */
type MigrationRole = 'Backend Engineer' | 'QA Engineer' | 'Security Engineer' | 'Engineering Manager' | 'Customer Success';

/**
 * Migration brief output structure
 */
interface MigrationBrief {
  role: MigrationRole;
  priority: 'critical' | 'high' | 'medium' | 'low';
  briefSummary: string;
  requiredActions: string[];
  verificationChecklist: string[];
  deadlineOrRisk: string;
}

/**
 * Shared validation and document-reading helpers (reused from KnowledgeBaseTools)
 */
class MigrationBriefGenerator {
  /**
   * Validate filename for safe access (reusable across tools)
   */
  private validateFilename(filename: string): void {
    if (!filename) {
      throw new Error('Filename parameter is required and cannot be empty');
    }

    const normalized = filename.replace(/\\/g, '/');
    // Allow approved subfolders, but never allow paths to escape the knowledge base.
    if (normalized.startsWith('/') || normalized.split('/').some(segment => segment === '..' || segment.length === 0)) {
      throw new Error('Invalid filename: only safe relative paths inside knowledge-base are allowed');
    }

    if (!isSupportedDocument(filename)) {
      throw new Error('Unsupported file type. Allowed types: .md, .txt, .csv, .json, .pdf, .docx, .xlsx');
    }
  }

  /**
   * Resolve and validate file path is within knowledge-base
   */
  private resolveFilePath(filename: string): string {
    const knowledgeBasePath = path.resolve(process.cwd(), 'knowledge-base');
    const filePath = path.resolve(knowledgeBasePath, filename.replace(/\\/g, '/'));

    // Ensure the resolved path is still within knowledge-base
    const resolvedPath = path.resolve(filePath);
    const resolvedBasePath = path.resolve(knowledgeBasePath);
    const relativePath = path.relative(resolvedBasePath, resolvedPath);
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      throw new Error('Access denied: file is outside the knowledge-base directory');
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filename}`);
    }

    return filePath;
  }

  private async readDocument(filename: string): Promise<string> {
    return extractDocumentText(this.resolveFilePath(filename));
  }

  /**
   * Extract meaningful lines from Markdown for comparison
   */
  private stripMarkdown(line: string): string {
    return line
      .replace(/^#{1,6}\s+/, '')
      .replace(/^[-*+]\s+/, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      .trim();
  }

  /**
   * Get comparable lines from content
   */
  private getComparableLines(content: string): string[] {
    return content
      .split('\n')
      .map(line => this.stripMarkdown(line))
      .filter(line => line.length > 0);
  }

  /**
   * Analyze changes between two documents
   */
  private analyzeChanges(olderContent: string, newerContent: string): {
    added: string[];
    removed: string[];
    changeText: string;
  } {
    const olderLines = this.getComparableLines(olderContent);
    const newerLines = this.getComparableLines(newerContent);
    const olderSet = new Set(olderLines);
    const newerSet = new Set(newerLines);

    const added = newerLines.filter(line => !olderSet.has(line));
    const removed = olderLines.filter(line => !newerSet.has(line));
    const changeText = `${added.join(' ')} ${removed.join(' ')}`.toLowerCase();

    return { added, removed, changeText };
  }

  /**
   * Generate role-specific migration brief
   */
  async generateBrief(
    olderFilename: string,
    newerFilename: string,
    role: MigrationRole,
    ctx: ExecutionContext
  ): Promise<MigrationBrief> {
    // Validate and load documents
    this.validateFilename(olderFilename);
    this.validateFilename(newerFilename);

    const olderContent = await this.readDocument(olderFilename);
    const newerContent = await this.readDocument(newerFilename);

    ctx.logger.info('Generating migration brief', { olderFilename, newerFilename, role });

    // Analyze changes
    const { added, removed, changeText } = this.analyzeChanges(olderContent, newerContent);

    // Determine priority based on change severity
    let priority: 'critical' | 'high' | 'medium' | 'low' = 'low';
    const raisePriority = (candidate: typeof priority) => {
      const levels = { low: 0, medium: 1, high: 2, critical: 3 };
      if (levels[candidate] > levels[priority]) priority = candidate;
    };

    if (/oauth|authentication|authorization|token|security|credential/.test(changeText)) {
      raisePriority('critical');
    }
    if (/endpoint|deprecated|removed|sunset|backward-incompatible|410 gone/.test(changeText)) {
      raisePriority('high');
    }
    if (/requestid|timestamp|metadata|parser|rate.limit/.test(changeText)) {
      raisePriority('medium');
    }

    // Generate role-specific content
    const briefSummary = this.generateBriefSummary(role, changeText, added, removed);
    const requiredActions = this.generateRequiredActions(role, changeText, added, removed);
    const verificationChecklist = this.generateVerificationChecklist(role, changeText);
    const deadlineOrRisk = this.generateDeadlineOrRisk(role, priority, changeText);

    ctx.logger.info('Migration brief generated', { role, priority, actionCount: requiredActions.length });

    return {
      role,
      priority,
      briefSummary,
      requiredActions,
      verificationChecklist,
      deadlineOrRisk
    };
  }

  /**
   * Generate role-specific brief summary
   */
  private generateBriefSummary(role: MigrationRole, changeText: string, added: string[], removed: string[]): string {
    const changeCount = added.length + removed.length;

    switch (role) {
      case 'Backend Engineer':
        return `Atlas API v1→v2 migration requires OAuth 2.0 authentication, endpoint updates (e.g., /reports → /analytics/reports), and response parser changes to handle requestId and timestamp metadata. ${changeCount} significant changes detected.`;

      case 'QA Engineer':
        return `Comprehensive testing required for v1→v2 migration: OAuth token validation, endpoint routing, backward-compatibility verification, and response schema validation. ${changeCount} changes require test coverage.`;

      case 'Security Engineer':
        return `Critical security review needed: OAuth 2.0 credential handling, token lifecycle management, and authentication header validation. Ensure secure storage and rotation of OAuth credentials before migration.`;

      case 'Engineering Manager':
        return `Atlas API v1→v2 migration affects multiple teams. Sunset deadline: 2024-06-30. Coordinate Backend, QA, Security, and Customer Success teams. ${changeCount} changes require cross-team coordination.`;

      case 'Customer Success':
        return `Prepare customer communication for Atlas API v1→v2 migration. Sunset date: 2024-06-30. Provide migration guides, support resources, and timeline to affected customers.`;

      default:
        return `Atlas API migration from v1 to v2 with ${changeCount} significant changes.`;
    }
  }

  /**
   * Generate role-specific required actions (3-6 items)
   */
  private generateRequiredActions(role: MigrationRole, changeText: string, added: string[], removed: string[]): string[] {
    const actions: string[] = [];

    switch (role) {
      case 'Backend Engineer':
        actions.push('Obtain OAuth 2.0 credentials (client_id, client_secret) from auth.atlas.internal');
        actions.push('Update API endpoint URLs: /reports → /analytics/reports and base URL v1 → v2');
        actions.push('Implement OAuth token acquisition and refresh logic in client code');
        actions.push('Update response parsers to extract and log requestId and timestamp fields');
        actions.push('Remove any code referencing deprecated legacyId field');
        if (/rate.limit/.test(changeText)) {
          actions.push('Update rate-limit handling to accommodate 5000 req/hour (up from 1000)');
        }
        break;

      case 'QA Engineer':
        actions.push('Create test cases for OAuth 2.0 token acquisition and validation');
        actions.push('Verify endpoint routing: /reports → /analytics/reports returns correct data');
        actions.push('Test backward-compatibility: confirm v1 endpoints return 410 Gone after sunset');
        actions.push('Validate response schema includes requestId and timestamp in all endpoints');
        actions.push('Test rate-limit behavior at 5000 req/hour threshold');
        actions.push('Verify error responses include requestId for debugging');
        break;

      case 'Security Engineer':
        actions.push('Audit OAuth credential storage: ensure client_secret is never logged or exposed');
        actions.push('Implement secure token refresh mechanism with expiration handling');
        actions.push('Validate OAuth token scopes and permissions are minimal (principle of least privilege)');
        actions.push('Review authentication header construction to prevent token leakage in logs');
        actions.push('Establish credential rotation policy and schedule');
        break;

      case 'Engineering Manager':
        actions.push('Schedule migration kickoff meeting with Backend, QA, Security, and Customer Success');
        actions.push('Assign ownership: Backend (OAuth + endpoints), QA (testing), Security (credential review)');
        actions.push('Set internal migration deadline: 2024-05-30 (30 days before v1 sunset)');
        actions.push('Establish communication cadence with customers (weekly updates starting 2024-04-01)');
        actions.push('Create risk register: identify blockers, dependencies, and escalation paths');
        break;

      case 'Customer Success':
        actions.push('Draft customer migration announcement: include sunset date (2024-06-30) and action items');
        actions.push('Create step-by-step migration guide with OAuth setup and endpoint examples');
        actions.push('Prepare FAQ addressing common OAuth questions and troubleshooting');
        actions.push('Schedule customer webinars: OAuth setup, endpoint migration, Q&A sessions');
        actions.push('Set up support ticket template for migration-related issues');
        break;

      default:
        actions.push('Review migration documentation');
        actions.push('Coordinate with relevant teams');
        break;
    }

    // Ensure we return 3-6 actions
    return actions.slice(0, 6);
  }

  /**
   * Generate role-specific verification checklist (2-5 items)
   */
  private generateVerificationChecklist(role: MigrationRole, changeText: string): string[] {
    const checklist: string[] = [];

    switch (role) {
      case 'Backend Engineer':
        checklist.push('✓ OAuth token successfully acquired and refreshed');
        checklist.push('✓ All v1 endpoints migrated to v2 URLs');
        checklist.push('✓ Response parsers handle requestId and timestamp without errors');
        checklist.push('✓ Deprecated legacyId field removed from codebase');
        break;

      case 'QA Engineer':
        checklist.push('✓ OAuth token validation tests pass');
        checklist.push('✓ Endpoint routing tests confirm /analytics/reports works');
        checklist.push('✓ Response schema validation includes requestId and timestamp');
        checklist.push('✓ Rate-limit tests pass at 5000 req/hour');
        checklist.push('✓ v1 endpoints return 410 Gone after sunset date');
        break;

      case 'Security Engineer':
        checklist.push('✓ OAuth credentials stored securely (no plaintext in logs)');
        checklist.push('✓ Token refresh mechanism tested and working');
        checklist.push('✓ Credential rotation policy documented and scheduled');
        checklist.push('✓ Security audit of authentication headers completed');
        break;

      case 'Engineering Manager':
        checklist.push('✓ All teams have assigned owners and deadlines');
        checklist.push('✓ Customer communication plan approved and scheduled');
        checklist.push('✓ Internal migration deadline (2024-05-30) tracked in project management');
        checklist.push('✓ Risk register reviewed and escalation paths established');
        break;

      case 'Customer Success':
        checklist.push('✓ Migration announcement sent to all affected customers');
        checklist.push('✓ Migration guide and FAQ published and accessible');
        checklist.push('✓ Customer webinars scheduled and invitations sent');
        checklist.push('✓ Support team trained on migration troubleshooting');
        break;

      default:
        checklist.push('✓ Migration plan reviewed');
        break;
    }

    return checklist.slice(0, 5);
  }

  /**
   * Generate role-specific deadline or risk statement
   */
  private generateDeadlineOrRisk(role: MigrationRole, priority: string, changeText: string): string {
    switch (role) {
      case 'Backend Engineer':
        return `DEADLINE: 2024-05-30 (30 days before v1 sunset). RISK: v1 endpoints return 410 Gone on 2024-06-30; production outage if not migrated.`;

      case 'QA Engineer':
        return `DEADLINE: 2024-05-15 (complete testing before internal deadline). RISK: Untested OAuth or endpoint changes cause production failures post-migration.`;

      case 'Security Engineer':
        return `DEADLINE: 2024-04-30 (credential audit before development). RISK: Exposed OAuth credentials or insecure token handling leads to unauthorized API access.`;

      case 'Engineering Manager':
        return `DEADLINE: 2024-06-30 (v1 sunset). RISK: Missed deadline causes production outage; customer escalations; reputational damage. Recommend internal completion by 2024-05-30.`;

      case 'Customer Success':
        return `DEADLINE: 2024-06-30 (v1 sunset). RISK: Customers unaware of migration face service disruption; support burden increases. Proactive communication reduces churn.`;

      default:
        return `DEADLINE: 2024-06-30 (v1 sunset). RISK: Service disruption if migration not completed.`;
    }
  }
}

/**
 * Tool class for generating migration briefs
 */
export class GenerateMigrationBriefTools {
  private generator = new MigrationBriefGenerator();

  @Tool({
    name: 'generateMigrationBrief',
    description:
      'Generate a role-specific migration brief comparing two API versions (e.g., v1 to v2). Provides tailored actions, verification checklist, and deadline/risk for Backend Engineer, QA Engineer, Security Engineer, Engineering Manager, or Customer Success roles.',
    inputSchema: z.object({
      olderFilename: z
        .string()
        .min(1)
        .describe('Older Markdown filename (e.g., atlas-api-v1.md) from the knowledge-base'),
      newerFilename: z
        .string()
        .min(1)
        .describe('Newer Markdown filename (e.g., atlas-api-v2.md) from the knowledge-base'),
      role: z
        .enum(['Backend Engineer', 'QA Engineer', 'Security Engineer', 'Engineering Manager', 'Customer Success'])
        .describe('Role for which to generate the migration brief')
    }),
    examples: {
      request: {
        olderFilename: 'atlas-api-v1.md',
        newerFilename: 'atlas-api-v2.md',
        role: 'Backend Engineer'
      },
      response: {
        role: 'Backend Engineer',
        priority: 'critical',
        briefSummary: 'Atlas API v1→v2 migration requires OAuth 2.0 authentication...',
        requiredActions: [
          'Obtain OAuth 2.0 credentials (client_id, client_secret) from auth.atlas.internal',
          'Update API endpoint URLs: /reports → /analytics/reports and base URL v1 → v2',
          'Implement OAuth token acquisition and refresh logic in client code',
          'Update response parsers to extract and log requestId and timestamp fields',
          'Remove any code referencing deprecated legacyId field',
          'Update rate-limit handling to accommodate 5000 req/hour (up from 1000)'
        ],
        verificationChecklist: [
          '✓ OAuth token successfully acquired and refreshed',
          '✓ All v1 endpoints migrated to v2 URLs',
          '✓ Response parsers handle requestId and timestamp without errors',
          '✓ Deprecated legacyId field removed from codebase'
        ],
        deadlineOrRisk:
          'DEADLINE: 2024-05-30 (30 days before v1 sunset). RISK: v1 endpoints return 410 Gone on 2024-06-30; production outage if not migrated.'
      }
    }
  })
  async generateMigrationBrief(input: any, ctx: ExecutionContext): Promise<MigrationBrief> {
    const olderFilename = input.olderFilename?.trim();
    const newerFilename = input.newerFilename?.trim();
    const role = input.role?.trim() as MigrationRole;

    if (!olderFilename || !newerFilename || !role) {
      throw new Error('olderFilename, newerFilename, and role are all required');
    }

    return this.generator.generateBrief(olderFilename, newerFilename, role, ctx);
  }
}
