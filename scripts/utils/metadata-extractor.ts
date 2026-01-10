import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import type { DocumentCategory } from '../types.js';

export interface DocumentMetadata {
  title: string;
  description?: string;
  category: DocumentCategory;
}

function cleanFileName(fileName: string): string {
  let title = fileName.replace(/\.(pdf|md|docx|txt)$/i, '');

  title = title.replace(/[_-]{2,}/g, ' ');

  title = title.replace(/\s+[a-f0-9]{32,}$/i, '');

  title = title.replace(/[_-]/g, ' ');

  title = title.replace(/\s+/g, ' ').trim();

  return title;
}

async function extractMarkdownTitle(filePath: string): Promise<string | null> {
  try {
    const content = await readFile(filePath, 'utf-8');
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('# ')) {
        return trimmed.substring(2).trim();
      }
    }

    return null;
  } catch {
    return null;
  }
}

async function extractMarkdownDescription(filePath: string): Promise<string | null> {
  try {
    const content = await readFile(filePath, 'utf-8');
    const lines = content.split('\n');

    let foundTitle = false;
    let description = '';

    for (const line of lines) {
      const trimmed = line.trim();

      if (!foundTitle && trimmed.startsWith('# ')) {
        foundTitle = true;
        continue;
      }

      if (foundTitle && trimmed && !trimmed.startsWith('#')) {
        description += trimmed + ' ';

        if (description.length > 200) {
          break;
        }
      }
    }

    return description.trim().substring(0, 200) || null;
  } catch {
    return null;
  }
}

export async function extractMetadata(
  filePath: string,
  category: DocumentCategory
): Promise<DocumentMetadata> {
  const fileName = basename(filePath);
  const ext = fileName.split('.').pop()?.toLowerCase();

  let title: string;
  let description: string | undefined;

  if (ext === 'md') {
    const mdTitle = await extractMarkdownTitle(filePath);
    title = mdTitle ?? cleanFileName(fileName);

    const mdDescription = await extractMarkdownDescription(filePath);
    description = mdDescription ?? `Islamic Finance document covering ${category} topics`;
  } else {
    title = cleanFileName(fileName);
    description = `Islamic Finance document covering ${category} topics`;
  }

  return {
    title,
    description,
    category,
  };
}
