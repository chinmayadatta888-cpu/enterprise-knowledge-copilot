import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import * as fs from 'fs';
import * as path from 'path';

interface KnowledgeBaseMatch {
  filename: string;
  title: string;
  excerpt: string;
  reason: string;
}

export class KnowledgeBaseTools {
  /**
   * Validate filename for safe access (reusable across tools)
   */
  private validateFilename(filename: string): void {
    if (!filename) {
      throw new Error('Filename parameter is required and cannot be empty');
    }

    // Security: reject path traversal and non-direct filenames
    if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
      throw new Error('Invalid filename: path separators and traversal are not allowed');
    }

    if (!filename.endsWith('.md')) {
      throw new Error('Invalid filename: only Markdown files (.md) are allowed');
    }
  }

  /**
   * Resolve and validate file path is within knowledge-base
   */
  private resolveFilePath(filename: string): string {
    const knowledgeBasePath = path.join(process.cwd(), 'knowledge-base');
    const filePath = path.join(knowledgeBasePath, filename);

    // Ensure the resolved path is still within knowledge-base
    const resolvedPath = path.resolve(filePath);
    const resolvedBasePath = path.resolve(knowledgeBasePath);
    if (!resolvedPath.startsWith(resolvedBasePath)) {
      throw new Error('Access denied: file is outside the knowledge-base directory');
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filename}`);
    }

    return filePath;
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
    description: 'Retrieve a Markdown document from the knowledge-base folder by filename',
    inputSchema: z.object({
      filename: z.string().min(1).describe('Name of the Markdown file to retrieve (e.g., atlas-api-v2.md)')
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

    if (!filename) {
      throw new Error('Filename parameter is required and cannot be empty');
    }

    // Security: reject path traversal and non-direct filenames
    if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
      throw new Error('Invalid filename: path separators and traversal are not allowed');
    }

    if (!filename.endsWith('.md')) {
      throw new Error('Invalid filename: only Markdown files (.md) are allowed');
    }

    ctx.logger.info('Retrieving document', { filename });

    const knowledgeBasePath = path.join(process.cwd(), 'knowledge-base');
    const filePath = path.join(knowledgeBasePath, filename);

    // Ensure the resolved path is still within knowledge-base
    const resolvedPath = path.resolve(filePath);
    const resolvedBasePath = path.resolve(knowledgeBasePath);
    if (!resolvedPath.startsWith(resolvedBasePath)) {
      throw new Error('Access denied: file is outside the knowledge-base directory');
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filename}`);
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const title = this.extractTitle(content);

      ctx.logger.info('Document retrieved successfully', { filename, titleLength: title.length });

      return {
        filename,
        title,
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
    description: 'Create a concise, source-aware summary of a Markdown document in the knowledge base',
    inputSchema: z.object({
      filename: z.string().min(1).describe('Name of the Markdown file to summarize (for example, atlas-api-v2.md)')
    })
  })
  async summarizeDocument(input: any, ctx: ExecutionContext): Promise<any> {
    const filename = input.filename?.trim();
    this.validateFilename(filename);
    const filePath = this.resolveFilePath(filename);

    ctx.logger.info('Summarizing document', { filename });
    const content = fs.readFileSync(filePath, 'utf-8');
    const { summary, keyPoints, headingsUsed } = this.summarizeContent(content);

    return {
      filename,
      title: this.extractTitle(content),
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
    description: 'Compare two approved Markdown documents and show meaningful additions and removals',
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

    const olderPath = this.resolveFilePath(olderFilename);
    const newerPath = this.resolveFilePath(newerFilename);
    const olderContent = fs.readFileSync(olderPath, 'utf-8');
    const newerContent = fs.readFileSync(newerPath, 'utf-8');

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
      olderDocument: { filename: olderFilename, title: this.extractTitle(olderContent) },
      newerDocument: { filename: newerFilename, title: this.extractTitle(newerContent) },
      added,
      removed,
      summary: `${added.length} meaningful addition(s) and ${removed.length} meaningful removal(s) were found.`
    };
  }

  @Tool({
    name: 'searchKnowledgeBase',
    description: 'Search all Markdown files in the knowledge-base folder for documents matching a query',
    inputSchema: z.object({
      query: z.string().min(1).describe('Search query text (case-insensitive)')
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
            reason: 'Found in title and content'
          }
        ],
        total: 1,
        query: 'API authentication'
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
        message: 'Knowledge base directory not found'
      };
    }

    // Read all Markdown files
    let files: string[] = [];
    try {
      files = fs.readdirSync(knowledgeBasePath)
        .filter(file => file.endsWith('.md'))
        .sort();
    } catch (error) {
      ctx.logger.error('Failed to read knowledge base directory', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw new Error('Failed to read knowledge base directory');
    }

    const matches: KnowledgeBaseMatch[] = [];

    // Search each file
    for (const file of files) {
      const filePath = path.join(knowledgeBasePath, file);

      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lowerContent = content.toLowerCase();
        const lowerQuery = query.toLowerCase();

        // Check if query matches anywhere in the file
        if (lowerContent.includes(lowerQuery)) {
          const title = this.extractTitle(content);
          const excerpt = this.extractExcerpt(content, query);
          const { score, reason } = this.calculateRelevance(file, title, content, query);

          matches.push({
            filename: file,
            title,
            excerpt,
            reason
          });

          ctx.logger.info('Found match', {
            filename: file,
            score,
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

    // Sort by relevance (higher scores first)
    matches.sort((a, b) => {
      // Extract score from reason if available, otherwise use 0
      const scoreA = a.reason.includes('Found in title') ? 100 : 0;
      const scoreB = b.reason.includes('Found in title') ? 100 : 0;
      return scoreB - scoreA;
    });

    ctx.logger.info('Search complete', {
      query,
      matchCount: matches.length,
      filesSearched: files.length
    });

    return {
      matches,
      total: matches.length,
      query,
      filesSearched: files.length
    };
  }
}
