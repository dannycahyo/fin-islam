import chalk from 'chalk';
import { scanDocuments } from './utils/file-scanner.js';
import { extractMetadata } from './utils/metadata-extractor.js';
import {
  uploadDocument,
  waitForProcessing,
  getExistingDocuments,
  checkBackendHealth,
} from './utils/upload-client.js';

interface SeedResult {
  total: number;
  uploaded: number;
  indexed: number;
  failed: Array<{ file: string; error: string }>;
  skipped: Array<{ file: string; reason: string }>;
}

async function processInBatches<T, R>(
  items: T[],
  batchSize: number,
  processor: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, Math.min(i + batchSize, items.length));
    const batchResults = await Promise.all(
      batch.map((item, batchIndex) => processor(item, i + batchIndex))
    );
    results.push(...batchResults);
  }
  return results;
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  console.log(chalk.bold.green(`\n🌱 Document Seeding Script${isDryRun ? ' (DRY RUN)' : ''}`));
  console.log(chalk.gray('━'.repeat(40)));
  console.log();

  const results: SeedResult = {
    total: 0,
    uploaded: 0,
    indexed: 0,
    failed: [],
    skipped: [],
  };

  try {
    if (!isDryRun) {
      const isHealthy = await checkBackendHealth();
      if (!isHealthy) {
        console.error(chalk.red('✗ Backend health check failed'));
        console.error(chalk.yellow('  Make sure backend is running at http://localhost:3000'));
        console.error(chalk.yellow('  Run: pnpm dev:backend'));
        process.exit(1);
      }
      console.log(chalk.green('✓ Backend health check passed'));
    }

    const documents = await scanDocuments();
    results.total = documents.length;

    if (documents.length === 0) {
      console.error(chalk.yellow('✗ No documents found in docs/ directory'));
      process.exit(1);
    }

    console.log(chalk.green(`✓ Found ${documents.length} documents to seed`));

    let existingTitles = new Set<string>();
    if (!isDryRun) {
      const existingDocs = await getExistingDocuments();
      existingTitles = new Set(existingDocs.map((doc) => doc.title.toLowerCase()));
      if (existingDocs.length > 0) {
        console.log(chalk.blue(`  ${existingDocs.length} documents already in database`));
      }
    }

    console.log();

    if (isDryRun) {
      console.log(chalk.bold('Would upload:'));
      for (let i = 0; i < documents.length; i++) {
        const doc = documents[i];
        const metadata = await extractMetadata(doc.filePath, doc.category);

        console.log(chalk.cyan(`  [${i + 1}/${documents.length}] ${doc.fileName}`));
        console.log(chalk.gray(`        Category: ${metadata.category}`));
        console.log(chalk.gray(`        Title: ${metadata.title}`));
        if (metadata.description) {
          const shortDesc = metadata.description.substring(0, 60);
          console.log(chalk.gray(`        Description: ${shortDesc}...`));
        }
        console.log();
      }

      console.log(chalk.yellow('💡 Run without --dry-run to upload'));
      return;
    }

    console.log(chalk.bold('Uploading documents:'));

    await processInBatches(documents, 3, async (doc, index) => {
      try {
        const metadata = await extractMetadata(doc.filePath, doc.category);

        if (existingTitles.has(metadata.title.toLowerCase())) {
          results.skipped.push({
            file: doc.fileName,
            reason: 'Already exists',
          });
          console.log(
            chalk.yellow(`  ⊘ [${index + 1}/${documents.length}] ${doc.fileName} - already seeded`)
          );
          return;
        }

        console.log(chalk.cyan(`  ⏳ [${index + 1}/${documents.length}] ${doc.fileName}`));

        const uploadResult = await uploadDocument({
          filePath: doc.filePath,
          title: metadata.title,
          category: metadata.category,
          description: metadata.description,
        });

        results.uploaded++;
        console.log(
          chalk.gray(
            `     ✓ Uploaded (ID: ${uploadResult.id.substring(0, 8)}...) - waiting for processing...`
          )
        );

        const status = await waitForProcessing(uploadResult.id);

        if (status === 'indexed') {
          results.indexed++;
          console.log(chalk.green(`     ✓ Indexed successfully ✅`));
        } else {
          results.failed.push({
            file: doc.fileName,
            error: 'Processing failed',
          });
          console.log(chalk.red(`     ✗ Processing failed ❌`));
        }
      } catch (error) {
        results.failed.push({
          file: doc.fileName,
          error: error instanceof Error ? error.message : String(error),
        });
        console.log(
          chalk.red(`     ✗ Error: ${error instanceof Error ? error.message : String(error)}`)
        );
      }

      console.log();
    });

    console.log(chalk.gray('━'.repeat(40)));
    console.log(chalk.bold('📊 Summary:'));
    console.log(chalk.white(`  Total: ${results.total}`));
    console.log(chalk.green(`  Uploaded: ${results.uploaded}`));
    console.log(chalk.green(`  Indexed: ${results.indexed}`));
    console.log(chalk.red(`  Failed: ${results.failed.length}`));
    console.log(chalk.yellow(`  Skipped: ${results.skipped.length}`));
    console.log();

    if (results.failed.length > 0) {
      console.log(chalk.red('Failed documents:'));
      for (const fail of results.failed) {
        console.log(chalk.red(`  - ${fail.file}: ${fail.error}`));
      }
      console.log();
    }

    if (results.indexed === results.total) {
      console.log(chalk.bold.green('✅ All documents seeded successfully!'));
    } else if (results.indexed + results.skipped.length === results.total) {
      console.log(chalk.bold.green('✅ Seeding completed (some already existed)!'));
    } else {
      console.log(chalk.bold.yellow('⚠️  Seeding completed with some errors'));
      process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red('\n❌ Fatal error:'));
    console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    process.exit(1);
  }
}

main();
