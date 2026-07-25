import { ToolDecorator as Tool, Widget, ExecutionContext, z } from '@nitrostack/core';
import * as fs from 'fs';
import * as path from 'path';
import { extractDocumentText, getDocumentType, isSupportedDocument, titleFromFilename } from './document-extractor.js';

interface KnowledgeBaseMatch {
  filename: string;
  title: string;
  excerpt: string;
  reason: string;
  relevanceScore: number;
  matchedTerms: string[];
  fileType: string;
}

/**
 * Local synonym map for enterprise search terms.
 * Deterministic and local — no AI generation.
 */
const SYNONYM_MAP: Record<string, string[]> = {
  authentication: ['login', 'oauth', 'token', 'authorization'],
  integration: ['endpoint', 'api', 'migration'],
  deprecated: ['sunset', 'retired', 'removed'],
  incident: ['issue', 'report']
};

/**
 * Common stop words to filter out during query normalization.
 */
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'what', 'how', 'show', 'me', 'find',
  'document', 'about', 'for', 'and', 'or', 'to', 'of', 'in'
]);

export class KnowledgeBaseTools {
  /**
   * Normalize query safely: lowercase, remove punctuation, split into keywords, filter stop words.
   */
  private normalizeQuery(query: string): string[] {
    // Lowercase
    let normalized = query.toLowerCase();

    // Remove punctuation safely using character whitelist
    // Keep only alphanumeric, spaces, and hyphens
    normalized = normalized.replace(/[^a-z0-9\s\-]/g, '');

    // Split on whitespace and hyphens
    const tokens = normalized.split(/[\s\-]+/).filter(token => token.length > 0);

    // Filter out stop words
    return tokens.filter(token => !STOP_WORDS.has(token));
  }

  /**
   * Expand keywords using the synonym map.
   * Returns the original keyword plus all synonyms.
   */
  private expandKeywords(keywords: string[]): string[] {
    const expanded = new Set<string>();

    for (const keyword of keywords) {
      expanded.add(keyword);

      // Check if this keyword is a key in the synonym map
      if (SYNONYM_MAP[keyword]) {
        SYNONYM_MAP[keyword].forEach(syn => expanded.add(syn));
      }

      // Check if this keyword is a synonym of any key
      for (const [key, synonyms] of Object.entries(SYNONYM_MAP)) {
        if (synonyms.includes(keyword)) {
          expanded.add(key);
          synonyms.forEach(syn => expanded.add(syn));
        }
      }
    }

    return Array.from(expanded);
  }

  /**
   * Calculate relevance score for a document based on keyword matches.
   * Scoring:
   * - Title match: +100 per keyword
   * - Section heading match: +50 per keyword
   * - Filename match: +30 per keyword
   * - Full-content match: +10 per keyword
   * - Exact phrase bonus: +25
   */
  private calculateKeywordRelevance(
    filename: string,
    title: string,
    content: string,
    originalQuery: string,
    keywords: string[],
    expandedKeywords: string[]
  ): { score: number; matchedTerms: string[]; reason: string } {
    const lowerTitle = title.toLowerCase();
    const lowerFilename = filename.toLowerCase();
    const lowerContent = content.toLowerCase();

    let score = 0;
    const matchedTerms = new Set<string>();
    const reasons: string[] = [];

    // Check for exact phrase match (bonus)
    const lowerQuery = originalQuery.toLowerCase();
    if (lowerContent.includes(lowerQuery)) {
      score += 25;
      reasons.push('Exact phrase match');
    }

    // Check each expanded keyword
    for (const keyword of expandedKeywords) {
      // Title match (strongest)
      if (lowerTitle.includes(keyword)) {
        score += 100;
        matchedTerms.add(keyword);
        if (!reasons.includes('Title match')) reasons.push('Title match');
      }

      // Section heading match
      const headingRegex = new RegExp(`^#+\\s+.*${keyword}.*$`, 'mi');
      if (headingRegex.test(content)) {
        score += 50;
        matchedTerms.add(keyword);
        if (!reasons.includes('Section heading match')) reasons.push('Section heading match');
      }

      // Filename match
      if (lowerFilename.includes(keyword)) {
        score += 30;
        matchedTerms.add(keyword);
        if (!reasons.includes('Filename match')) reasons.push('Filename match');
      }

      // Full-content match
      if (lowerContent.includes(keyword)) {
        score += 10;
        matchedTerms.add(keyword);
        if (!reasons.includes('Content match')) reasons.push('Content match');
      }
    }

    return {
      score,
      matchedTerms: Array.from(matchedTerms),
      reason: reasons.join('; ') || 'Matched query'
    };
  }

  /**
   * Check if a document matches the search criteria.
   * Matches if:
   * - Exact phrase appears, OR
   * - A single meaningful keyword matches, OR
   * - At least two meaningful query keywords match
   */
  private documentMatches(
    content: string,
    originalQuery: string,
    keywords: string[],
    expandedKeywords: string[]
  ): boolean {
    const lowerContent = content.toLowerCase();
    const lowerQuery = originalQuery.toLowerCase();

    // Exact phrase match
    if (lowerContent.includes(lowerQuery)) {
      return true;
    }

    // Count how many expanded keywords match
    let matchCount = 0;
    for (const keyword of expandedKeywords) {
      if (lowerContent.includes(keyword)) {
        matchCount++;
      }
    }

    // Match if at least one keyword matches, or at least two original keywords match
    if (matchCount >= 1) {
      return true;
    }

    // Check if at least two original keywords match
    let originalKeywordMatches = 0;
    for (const keyword of keywords) {
      if (lowerContent.includes(keyword)) {
        originalKeywordMatches++;
      }
    }

    return originalKeywordMatches >= 2;
  }
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

  private async readDocument(filename: string): Promise<{ content: string; title: string; fileType: string }> {
    const content = await extractDocumentText(this.resolveFilePath(filename));
    const extractedTitle = this.extractTitle(content);
    return {
      content,
      title: extractedTitle === 'Untitled Document' ? titleFromFilename(filename) : extractedTitle,
      fileType: getDocumentType(filename)
    };
  }

  /** Return every approved Markdown file beneath the knowledge-base root. */
  private getKnowledgeBaseFiles(): string[] {
    const knowledgeBasePath = path.resolve(process.cwd(), 'knowledge-base');
    const walk = (directory: string): string[] => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return walk(fullPath);
      if (entry.isFile() && isSupportedDocument(entry.name)) {
        return [path.relative(knowledgeBasePath, fullPath).split(path.sep).join('/')];
      }
      return [];
    });

    return fs.existsSync(knowledgeBasePath) ? walk(knowledgeBasePath).sort() : [];
  }

  /**
   * Extract title from Markdown frontmatter or first heading
   */
  private extractTitle(content: string): string {
    // Try to extract from H1 heading
    const h1Match = content.match(/^#\s+(.+)$/m);
    if (h1Match) {
      return h1Match[1].trim();
    }
    return 'Untitled Document';
  }

  /** Extract Markdown section headings for source references. */
  private extractHeadings(content: string): string[] {
    return content
      .split('\n')
      .map(line => line.match(/^#{2,3}\s+(.+)$/))
      .filter((match): match is RegExpMatchArray => Boolean(match))
      .map(match => match[1].trim());
  }

  /** Convert a Markdown line into readable plain text. */
  private stripMarkdown(line: string): string {
    return line
      .replace(/^#{1,6}\s+/, '')
      .replace(/^[-*+]\s+/, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      .trim();
  }

  /** Build a compact deterministic summary without calling an external AI service. */
  private summarizeContent(content: string): { summary: string; keyPoints: string[]; headingsUsed: string[] } {
    const headingsUsed = this.extractHeadings(content);
    const lines = content
      .split('\n')
      .map(line => this.stripMarkdown(line))
      .filter(line => line.length > 25 && !line.startsWith('---'));

    const summary = lines[0] || 'This document does not contain enough text to summarize.';
    const keyPoints = Array.from(new Set(lines.slice(1, 6))).slice(0, 5);

    if (keyPoints.length < 3) {
      for (const heading of headingsUsed) {
        if (!keyPoints.includes(heading)) {
          keyPoints.push(heading);
        }
        if (keyPoints.length === 3) break;
      }
    }

    return { summary, keyPoints, headingsUsed };
  }

  /**
   * Extract a relevant excerpt around the matched query
   */
  private extractExcerpt(content: string, query: string, maxLength: number = 150): string {
    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const matchIndex = lowerContent.indexOf(lowerQuery);

    if (matchIndex === -1) {
      // Fallback: return first non-empty line
      const lines = content.split('\n').filter(line => line.trim().length > 0);
      return lines[0]?.substring(0, maxLength) || 'No preview available';
    }

    // Extract context around the match
    const start = Math.max(0, matchIndex - 50);
    const end = Math.min(content.length, matchIndex + query.length + 100);
    let excerpt = content.substring(start, end).trim();

    // Clean up excerpt
    excerpt = excerpt.replace(/\n+/g, ' ').replace(/#+\s+/g, '');
    if (excerpt.length > maxLength) {
      excerpt = excerpt.substring(0, maxLength) + '...';
    }

    return excerpt;
  }

  /**
   * Calculate relevance score based on match type
   */
  private calculateRelevance(
    filename: string,
    title: string,
    content: string,
    query: string
  ): { score: number; reason: string } {
    const lowerQuery = query.toLowerCase();
    const lowerContent = content.toLowerCase();
    const lowerTitle = title.toLowerCase();
    const lowerFilename = filename.toLowerCase();

    let score = 0;
    let reasons: string[] = [];

    // Title match (highest priority)
    if (lowerTitle.includes(lowerQuery)) {
      score += 100;
      reasons.push('Found in title');
    }

    // Filename match
    if (lowerFilename.includes(lowerQuery)) {
      score += 50;
      reasons.push('Found in filename');
    }

    // Content match - count occurrences
    const matches = (lowerContent.match(new RegExp(lowerQuery, 'g')) || []).length;
    score += Math.min(matches * 10, 50);
    if (matches > 0) {
      reasons.push(`Found ${matches} time${matches > 1 ? 's' : ''} in content`);
    }

    // Heading proximity (if found in a heading)
    const headingMatch = content.match(new RegExp(`^#+\\s+.*${lowerQuery}.*$`, 'mi'));
    if (headingMatch) {
      score += 30;
      reasons.push('Found in section heading');
    }

    return {
      score,
      reason: reasons.join('; ') || 'Matched query'
    };
  }

  @Tool({
    name: 'getDocument',
    description: 'Retrieve an approved document from the knowledge-base folder by safe relative path. Supports Markdown, text, CSV, JSON, PDF, Word, and Excel files.',
    inputSchema: z.object({
      filename: z.string().min(1).describe('Safe relative path of the document to retrieve (e.g., apis/inventory-api-v2.md)')
    }),
    examples: {
      request: {
        filename: 'atlas-api-v2.md'
      },
      response: {
        filename: 'atlas-api-v2.md',
        title: 'Atlas API v2 Documentation',
        content: '# Atlas API v2 Documentation\n\nAtlas API v2 requires...'
      }
    }
  })
  async getDocument(input: any, ctx: ExecutionContext): Promise<any> {
    const filename = input.filename?.trim();
    this.validateFilename(filename);

    ctx.logger.info('Retrieving document', { filename });

    try {
      const { content, title, fileType } = await this.readDocument(filename);

      ctx.logger.info('Document retrieved successfully', { filename, titleLength: title.length });

      return {
        filename,
        title,
        fileType,
        content
      };
    } catch (error) {
      ctx.logger.error('Failed to read document', {
        filename,
        error: error instanceof Error ? error.message : String(error)
      });
      throw new Error(`Failed to read document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  @Tool({
    name: 'summarizeDocument',
    description: 'Create a concise, source-aware summary of an approved document in the knowledge base',
    inputSchema: z.object({
      filename: z.string().min(1).describe('Safe relative path of the document to summarize')
    })
  })
  async summarizeDocument(input: any, ctx: ExecutionContext): Promise<any> {
    const filename = input.filename?.trim();
    this.validateFilename(filename);

    ctx.logger.info('Summarizing document', { filename });
    const { content, title, fileType } = await this.readDocument(filename);
    const { summary, keyPoints, headingsUsed } = this.summarizeContent(content);

    return {
      filename,
      title,
      fileType,
      summary,
      keyPoints,
      headingsUsed
    };
  }

  /** Keep only meaningful lines when comparing two Markdown documents. */
  private getComparableLines(content: string): string[] {
    return content
      .split('\n')
      .map(line => this.stripMarkdown(line))
      .filter(line => line.length > 0);
  }

  @Tool({
    name: 'compareDocuments',
    description: 'Compare two approved documents and show meaningful additions and removals',
    inputSchema: z.object({
      olderFilename: z.string().min(1).describe('Older Markdown filename, for example atlas-api-v1.md'),
      newerFilename: z.string().min(1).describe('Newer Markdown filename, for example atlas-api-v2.md')
    })
  })
  async compareDocuments(input: any, ctx: ExecutionContext): Promise<any> {
    const olderFilename = input.olderFilename?.trim();
    const newerFilename = input.newerFilename?.trim();

    this.validateFilename(olderFilename);
    this.validateFilename(newerFilename);

    const olderDocument = await this.readDocument(olderFilename);
    const newerDocument = await this.readDocument(newerFilename);
    const olderContent = olderDocument.content;
    const newerContent = newerDocument.content;

    const olderLines = this.getComparableLines(olderContent);
    const newerLines = this.getComparableLines(newerContent);
    const olderSet = new Set(olderLines);
    const newerSet = new Set(newerLines);
    const added = newerLines.filter(line => !olderSet.has(line)).slice(0, 10);
    const removed = olderLines.filter(line => !newerSet.has(line)).slice(0, 10);

    ctx.logger.info('Compared documents', {
      olderFilename,
      newerFilename,
      addedCount: added.length,
      removedCount: removed.length
    });

    return {
      olderDocument: { filename: olderFilename, title: olderDocument.title, fileType: olderDocument.fileType },
      newerDocument: { filename: newerFilename, title: newerDocument.title, fileType: newerDocument.fileType },
      added,
      removed,
      summary: `${added.length} meaningful addition(s) and ${removed.length} meaningful removal(s) were found.`
    };
  }

  @Tool({
    name: 'analyzeChangeImpact',
    description: 'Analyze two document versions to identify affected teams, change priority, and recommended actions',
    inputSchema: z.object({
      olderFilename: z.string().min(1).describe('Older Markdown filename, for example atlas-api-v1.md'),
      newerFilename: z.string().min(1).describe('Newer Markdown filename, for example atlas-api-v2.md')
    })
  })
  @Widget('change-impact-dashboard')
  async analyzeChangeImpact(input: any, ctx: ExecutionContext): Promise<any> {
    const olderFilename = input.olderFilename?.trim();
    const newerFilename = input.newerFilename?.trim();
    this.validateFilename(olderFilename);
    this.validateFilename(newerFilename);

    const olderContent = (await this.readDocument(olderFilename)).content;
    const newerContent = (await this.readDocument(newerFilename)).content;
    const olderLines = this.getComparableLines(olderContent);
    const newerLines = this.getComparableLines(newerContent);
    const olderSet = new Set(olderLines);
    const added = newerLines.filter(line => !olderSet.has(line));
    const removed = olderLines.filter(line => !new Set(newerLines).has(line));
    const changeText = `${added.join(' ')} ${removed.join(' ')}`.toLowerCase();

    const affectedTeams = new Set<string>();
    const recommendedActions = new Set<string>();
    let priority: 'critical' | 'high' | 'medium' | 'low' = 'low';
    const raisePriority = (candidate: typeof priority) => {
      const levels = { low: 0, medium: 1, high: 2, critical: 3 };
      if (levels[candidate] > levels[priority]) priority = candidate;
    };

    if (/oauth|authentication|authorization|token|security/.test(changeText)) {
      affectedTeams.add('Backend Engineering');
      affectedTeams.add('Security');
      recommendedActions.add('Update authentication configuration and securely obtain the required OAuth credentials.');
      raisePriority('critical');
    }
    if (/endpoint|\/reports|\/analytics/.test(changeText)) {
      affectedTeams.add('Backend Engineering');
      affectedTeams.add('Frontend and Integrations');
      recommendedActions.add('Update API endpoint URLs in all client integrations.');
      raisePriority('high');
    }
    if (/deprecated|removed|sunset|backward-incompatible|410 gone/.test(changeText)) {
      affectedTeams.add('Backend Engineering');
      affectedTeams.add('Customer Success');
      recommendedActions.add('Remove deprecated field usage and communicate the migration deadline to affected users.');
      raisePriority('high');
    }
    if (/requestid|timestamp|metadata|parser/.test(changeText)) {
      affectedTeams.add('Backend Engineering');
      recommendedActions.add('Update response parsers and logging to handle the new metadata fields.');
      raisePriority('medium');
    }
    if (/rate limit|rate-limit/.test(changeText)) {
      affectedTeams.add('Platform Engineering');
      recommendedActions.add('Review client retry behaviour and update rate-limit monitoring thresholds.');
      raisePriority('medium');
    }
    if (affectedTeams.size === 0) {
      affectedTeams.add('Document Owners');
      recommendedActions.add('Review the changes and confirm whether downstream teams need to act.');
      raisePriority('low');
    }

    ctx.logger.info('Change impact analyzed', { olderFilename, newerFilename, priority, affectedTeams: [...affectedTeams] });
    return {
      olderFilename,
      newerFilename,
      priority,
      affectedTeams: [...affectedTeams],
      recommendedActions: [...recommendedActions],
      changeHighlights: added.slice(0, 8),
      removedHighlights: removed.slice(0, 5)
    };
  }

  /** Extract a labelled Markdown metadata value, such as **Version:** 2.0. */
  private extractMetadata(content: string, label: string): string | undefined {
    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = content.match(new RegExp(`^\\*\\*${escapedLabel}:\\*\\*\\s*(.+)$`, 'mi'));
    return match?.[1].trim();
  }

  private inferCategory(filename: string, content: string): string {
    const haystack = `${filename} ${content}`.toLowerCase();
    if (haystack.includes('api')) return 'API Documentation';
    if (haystack.includes('sop') || haystack.includes('standard operating procedure')) return 'SOP';
    if (haystack.includes('meeting')) return 'Meeting Notes';
    return 'Project Documentation';
  }

  @Tool({
    name: 'getKnowledgeCatalog',
    description: 'List approved knowledge-base documents with metadata and lifecycle warnings',
    inputSchema: z.object({
      status: z.string().optional().describe('Optional status filter, such as Current or Deprecated')
    })
  })
  async getKnowledgeCatalog(input: any, ctx: ExecutionContext): Promise<any> {
    const requestedStatus = input.status?.trim().toLowerCase();
    const knowledgeBasePath = path.join(process.cwd(), 'knowledge-base');
    if (!fs.existsSync(knowledgeBasePath)) {
      throw new Error('Knowledge base directory not found');
    }

    const allDocuments = await Promise.all(this.getKnowledgeBaseFiles()
      .map(async filename => {
        const { content, title, fileType } = await this.readDocument(filename);
        const version = this.extractMetadata(content, 'Version');
        const status = this.extractMetadata(content, 'Status');
        const lastUpdated = this.extractMetadata(content, 'Last Updated')
          || this.extractMetadata(content, 'Released')
          || this.extractMetadata(content, 'Date');
        const lifecycleWarnings: string[] = [];
        const lowerContent = content.toLowerCase();

        if (!status) lifecycleWarnings.push('Missing document status');
        if (!version) lifecycleWarnings.push('Missing version');
        if (!lastUpdated) lifecycleWarnings.push('Missing last-updated or release date');
        if (/deprecated|sunset|end of life/.test(lowerContent)) {
          lifecycleWarnings.push('Contains deprecation or sunset information');
        }

        return {
          filename,
          title,
          fileType,
          version: version || 'Not specified',
          status: status || 'Not specified',
          lastUpdated: lastUpdated || 'Not specified',
          category: this.inferCategory(filename, content),
          lifecycleWarnings
        };
      }));
    const documents = allDocuments
      .filter(document => !requestedStatus || document.status.toLowerCase() === requestedStatus);

    const deprecatedDocuments = documents.filter(document =>
      document.status.toLowerCase().includes('deprecated')
      || document.lifecycleWarnings.includes('Contains deprecation or sunset information')
    );
    const documentsNeedingReview = documents.filter(document => document.lifecycleWarnings.length > 0);

    ctx.logger.info('Knowledge catalog generated', {
      totalDocuments: documents.length,
      requestedStatus: requestedStatus || 'all'
    });

    return {
      documents,
      totalDocuments: documents.length,
      documentsNeedingReview,
      deprecatedDocuments,
      catalogSummary: `${documents.length} document(s) found; ${documentsNeedingReview.length} need review and ${deprecatedDocuments.length} are deprecated or have a sunset notice.`
    };
  }

  @Tool({
    name: 'searchKnowledgeBase',
    description: 'Search approved Markdown, text, CSV, JSON, PDF, Word, and Excel files using multi-keyword ranked search',
    inputSchema: z.object({
      query: z.string().min(1).describe('Search query text (case-insensitive, supports multiple keywords)')
    }),
    examples: {
      request: {
        query: 'API authentication'
      },
      response: {
        matches: [
          {
            filename: 'atlas-api-v2.md',
            title: 'Atlas API v2 Documentation',
            excerpt: 'Atlas API v2 requires both API key and OAuth 2.0 token for enhanced security...',
            relevanceScore: 135,
            matchedTerms: ['api', 'authentication', 'oauth'],
            reason: 'Exact phrase match; Title match; Content match'
          }
        ],
        total: 1,
        query: 'API authentication',
        filesSearched: 5
      }
    }
  })
  async searchKnowledgeBase(input: any, ctx: ExecutionContext): Promise<any> {
    const query = input.query?.trim();

    if (!query) {
      throw new Error('Query parameter is required and cannot be empty');
    }

    ctx.logger.info('Searching knowledge base', { query });

    const knowledgeBasePath = path.join(process.cwd(), 'knowledge-base');

    // Check if knowledge-base directory exists
    if (!fs.existsSync(knowledgeBasePath)) {
      ctx.logger.warn('Knowledge base directory not found', { path: knowledgeBasePath });
      return {
        matches: [],
        total: 0,
        query,
        message: 'Knowledge base directory not found',
        filesSearched: 0
      };
    }

    // Read all supported files inside the approved knowledge-base tree.
    let files: string[] = [];
    try {
      files = this.getKnowledgeBaseFiles();
    } catch (error) {
      ctx.logger.error('Failed to read knowledge base directory', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw new Error('Failed to read knowledge base directory');
    }

    // Normalize and expand query keywords
    const keywords = this.normalizeQuery(query);
    const expandedKeywords = this.expandKeywords(keywords);

    ctx.logger.info('Query normalized', {
      originalQuery: query,
      keywords,
      expandedKeywords
    });

    const matches: KnowledgeBaseMatch[] = [];

    // Search each file
    for (const file of files) {
      try {
        const { content, title, fileType } = await this.readDocument(file);

        // Check if document matches search criteria
        if (this.documentMatches(content, query, keywords, expandedKeywords)) {
          const excerpt = this.extractExcerpt(content, query);
          const { score, matchedTerms, reason } = this.calculateKeywordRelevance(
            file,
            title,
            content,
            query,
            keywords,
            expandedKeywords
          );

          matches.push({
            filename: file,
            title,
            excerpt,
            reason,
            relevanceScore: score,
            matchedTerms,
            fileType
          });

          ctx.logger.info('Found match', {
            filename: file,
            score,
            matchedTerms,
            reason
          });
        }
      } catch (error) {
        ctx.logger.warn('Failed to read file', {
          file,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // Sort by relevance score (highest first) and limit to top 5
    matches.sort((a, b) => b.relevanceScore - a.relevanceScore);
    const topMatches = matches.slice(0, 5);

    ctx.logger.info('Search complete', {
      query,
      matchCount: topMatches.length,
      totalMatches: matches.length,
      filesSearched: files.length
    });

    return {
      matches: topMatches,
      total: topMatches.length,
      query,
      filesSearched: files.length,
      keywordsUsed: keywords,
      expandedKeywordsUsed: expandedKeywords
    };
  }
}
