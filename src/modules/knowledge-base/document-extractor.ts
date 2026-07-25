import * as fs from 'fs/promises';
import * as path from 'path';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';
import * as XLSX from 'xlsx';

export const SUPPORTED_DOCUMENT_EXTENSIONS = new Set([
  '.md', '.txt', '.csv', '.json', '.pdf', '.docx', '.xlsx'
]);

export function getDocumentExtension(filename: string): string {
  return path.extname(filename).toLowerCase();
}

export function isSupportedDocument(filename: string): boolean {
  return SUPPORTED_DOCUMENT_EXTENSIONS.has(getDocumentExtension(filename));
}

export function getDocumentType(filename: string): string {
  const types: Record<string, string> = {
    '.md': 'Markdown document',
    '.txt': 'Text document',
    '.csv': 'CSV data file',
    '.json': 'JSON data file',
    '.pdf': 'PDF document',
    '.docx': 'Word document',
    '.xlsx': 'Excel workbook'
  };
  return types[getDocumentExtension(filename)] || 'Document';
}

/** Extract readable text locally; no external service or AI API is used. */
export async function extractDocumentText(filePath: string): Promise<string> {
  const extension = getDocumentExtension(filePath);

  if (extension === '.md' || extension === '.txt' || extension === '.csv') {
    return fs.readFile(filePath, 'utf-8');
  }

  if (extension === '.json') {
    const raw = await fs.readFile(filePath, 'utf-8');
    try {
      return JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      return raw;
    }
  }

  if (extension === '.pdf') {
    const buffer = await fs.readFile(filePath);
    const result = await pdfParse(buffer);
    return result.text.trim();
  }

  if (extension === '.docx') {
    const buffer = await fs.readFile(filePath);
    const result = await mammoth.extractRawText({ buffer });
    return result.value.trim();
  }

  if (extension === '.xlsx') {
    const workbook = XLSX.readFile(filePath, { cellDates: true });
    return workbook.SheetNames.map(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
      return `# Sheet: ${sheetName}\n${csv}`;
    }).join('\n\n');
  }

  throw new Error(`Unsupported document type: ${extension || 'no extension'}`);
}

export function titleFromFilename(filename: string): string {
  return path.basename(filename, path.extname(filename))
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, character => character.toUpperCase());
}
