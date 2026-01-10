import { readdir, stat } from 'node:fs/promises';
import { join, basename, dirname } from 'node:path';
import type { DocumentCategory } from '../types.js';
import {
  DOCS_PATH,
  EXCLUDED_FILES,
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE,
  DIRECTORY_TO_CATEGORY,
} from '../config/seed-config.js';

export interface ScannedDocument {
  filePath: string;
  fileName: string;
  category: DocumentCategory;
  dirName: string;
  fileSize: number;
}

export async function scanDocuments(): Promise<ScannedDocument[]> {
  const documents: ScannedDocument[] = [];

  async function scanDirectory(dirPath: string): Promise<void> {
    const entries = await readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);

      if (entry.isDirectory()) {
        await scanDirectory(fullPath);
      } else if (entry.isFile()) {
        if (EXCLUDED_FILES.includes(entry.name)) {
          continue;
        }

        const ext = entry.name.split('.').pop()?.toLowerCase();
        if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
          continue;
        }

        const stats = await stat(fullPath);
        if (stats.size > MAX_FILE_SIZE) {
          console.warn(
            `⚠️  Skipping ${entry.name}: File size (${(stats.size / 1024 / 1024).toFixed(2)}MB) exceeds 10MB limit`
          );
          continue;
        }

        const dirName = basename(dirname(fullPath));
        const category: DocumentCategory = DIRECTORY_TO_CATEGORY[dirName] ?? 'general';

        documents.push({
          filePath: fullPath,
          fileName: entry.name,
          category,
          dirName,
          fileSize: stats.size,
        });
      }
    }
  }

  await scanDirectory(DOCS_PATH);
  return documents;
}
