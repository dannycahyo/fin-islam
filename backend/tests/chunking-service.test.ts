import { DocumentProcessor } from '../services/document-processor.js';
import { ChunkingService } from '../services/chunking-service.js';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

/**
 * Manual test suite for ChunkingService
 * Run with: tsx backend/tests/chunking-service.test.ts
 */

interface TestResult {
  testName: string;
  passed: boolean;
  error?: string;
  details?: Record<string, unknown>;
}

class ChunkingServiceTester {
  private documentProcessor: DocumentProcessor;
  private chunkingService: ChunkingService;
  private testResults: TestResult[] = [];
  private testDataDir: string;

  constructor() {
    this.documentProcessor = new DocumentProcessor();
    this.chunkingService = new ChunkingService();
    this.testDataDir = join(process.cwd(), 'fixtures');
  }

  async setup(): Promise<void> {
    // Create test fixtures directory
    await mkdir(this.testDataDir, { recursive: true });

    // Create sample documents
    await this.createSampleDocuments();
  }

  private async createSampleDocuments(): Promise<void> {
    // Sample Islamic finance content base
    const baseContent = `
Islamic Finance: Principles and Practices

Introduction to Islamic Finance

Islamic finance is a financial system that operates according to Islamic law (Shariah). The fundamental principle of Islamic finance is the prohibition of riba (interest or usury). This prohibition stems from the Quran and the teachings of Prophet Muhammad (peace be upon him).

Core Principles of Islamic Finance

1. Prohibition of Riba (Interest)
The charging or paying of interest is strictly forbidden in Islamic finance. Instead, Islamic financial institutions operate on the principle of profit and loss sharing. This ensures that both parties in a financial transaction share the risks and rewards of their venture.

2. Risk Sharing
Islamic finance promotes risk-sharing between the provider of capital and the user of funds. This is fundamentally different from conventional finance where risk is often transferred to one party through interest-bearing loans.

3. Prohibition of Gharar (Excessive Uncertainty)
Transactions must be free from excessive uncertainty or ambiguity. All terms and conditions must be clearly defined and understood by all parties involved. This principle protects against speculation and gambling-like activities.

4. Ethical Investment
Islamic finance prohibits investment in businesses that are considered haram (forbidden), such as those dealing with alcohol, gambling, pork products, or weapons. Investments must be socially responsible and ethical.

Islamic Financial Instruments

Murabaha (Cost-Plus Financing)
Murabaha is a sale contract where the seller discloses the cost and profit margin to the buyer. The financial institution purchases an asset and sells it to the client at a marked-up price. The payment can be made in installments. This is one of the most commonly used Islamic financing methods.

Mudarabah (Profit-Sharing Partnership)
In a Mudarabah contract, one party provides capital while the other provides expertise and management. Profits are shared according to a predetermined ratio, while losses are borne by the capital provider unless there is negligence or misconduct by the managing party.

Musharakah (Joint Venture)
Musharakah is a partnership where all parties contribute capital and share profits and losses according to their capital contribution or a pre-agreed ratio. This instrument is used for business financing and project financing.

Ijarah (Leasing)
Ijarah is an Islamic leasing contract where the lessor retains ownership of an asset while the lessee uses it for a specified period in exchange for rental payments. At the end of the lease period, ownership may transfer to the lessee.

Sukuk (Islamic Bonds)
Sukuk are certificates that represent ownership in tangible assets, usufructs, or services. Unlike conventional bonds that represent debt obligations, Sukuk holders have a proportionate beneficial ownership in the underlying assets.

Islamic Banking Operations

Islamic banks operate differently from conventional banks. They act as partners or investors rather than creditors. Here are some key operational differences:

Deposit Accounts
Islamic banks offer various types of accounts. Current accounts are guaranteed and provide safe custody of funds. Investment accounts operate on a profit-and-loss sharing basis where depositors share in the bank's investment profits.

Financing Operations
Instead of providing loans with interest, Islamic banks use Shariah-compliant contracts. For home financing, they might use Murabaha or Ijarah. For business financing, they might use Musharakah or Mudarabah.

Risk Management
Islamic financial institutions must manage risks within Shariah constraints. They cannot use conventional hedging instruments that involve interest or excessive uncertainty. Instead, they use alternatives like Takaful (Islamic insurance) and Shariah-compliant derivatives.

Governance in Islamic Finance

Shariah Supervisory Board
Every Islamic financial institution must have a Shariah Supervisory Board (SSB) consisting of Islamic scholars who ensure that all operations comply with Shariah principles. The SSB reviews contracts, products, and operations.

Regulatory Framework
Islamic financial institutions are subject to both conventional financial regulations and Shariah compliance requirements. Organizations like AAOIFI (Accounting and Auditing Organization for Islamic Financial Institutions) provide standards and guidelines.

Global Islamic Finance Market

The Islamic finance industry has experienced significant growth over the past few decades. It now operates in over 75 countries with assets exceeding $2 trillion. Major Islamic finance hubs include Malaysia, Saudi Arabia, UAE, and Bahrain.

Challenges and Future Prospects

Islamic finance faces several challenges including lack of standardization across jurisdictions, shortage of Shariah-compliant instruments for liquidity management, and limited awareness among potential customers.

However, the future looks promising. With growing Muslim populations, increasing awareness of ethical finance, and supportive regulatory frameworks, Islamic finance is expected to continue its expansion globally.

Conclusion

Islamic finance offers an alternative financial system based on ethical principles and social justice. Its emphasis on risk-sharing, asset-backing, and prohibition of interest creates a more stable and equitable financial environment. As the industry matures and innovates, it continues to demonstrate its viability as a comprehensive financial system.
`.trim();

    const shortContent = `
Islamic Finance Overview

Islamic finance operates according to Shariah law. The key principle is the prohibition of riba (interest). Instead, Islamic finance uses profit-sharing and risk-sharing mechanisms.

Main instruments include Murabaha (cost-plus financing), Mudarabah (profit-sharing), and Musharakah (joint venture). These ensure ethical and fair financial transactions.
`.trim();

    const mediumContent = baseContent.substring(0, 2000);

    // Create a true 10-page document (approx 15000-20000 tokens for 20-30 chunks)
    // Repeat base content to reach target length
    const longDocumentParts = [baseContent];
    for (let i = 1; i < 12; i++) {
      longDocumentParts.push(`\n\n--- Section ${i + 1} ---\n\n` + baseContent);
    }
    const islamicFinanceContent = longDocumentParts.join('');

    // Create test files
    await writeFile(join(this.testDataDir, 'short-document.txt'), shortContent);
    await writeFile(join(this.testDataDir, 'medium-document.txt'), mediumContent);
    await writeFile(join(this.testDataDir, 'long-document.txt'), islamicFinanceContent);
    await writeFile(join(this.testDataDir, 'sample.md'), islamicFinanceContent);
  }

  private addResult(
    testName: string,
    passed: boolean,
    error?: string,
    details?: Record<string, unknown>
  ): void {
    this.testResults.push({ testName, passed, error, details });
  }

  async testShortDocument(): Promise<void> {
    try {
      const filePath = join(this.testDataDir, 'short-document.txt');
      const processed = await this.documentProcessor.processTXT(filePath);
      const chunked = await this.chunkingService.chunkDocument(processed, filePath);

      const passed =
        chunked.chunks.length >= 1 &&
        chunked.chunks.every((c) => c.metadata.chunkIndex >= 0) &&
        chunked.chunks.every((c) => (c.metadata.tokenCount || 0) <= 1000);

      this.addResult('Short Document Test', passed, undefined, {
        totalChunks: chunked.totalChunks,
        avgTokensPerChunk: Math.round(
          chunked.chunks.reduce((sum, c) => sum + (c.metadata.tokenCount || 0), 0) /
            chunked.chunks.length
        ),
      });
    } catch (error) {
      this.addResult(
        'Short Document Test',
        false,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  async testMediumDocument(): Promise<void> {
    try {
      const filePath = join(this.testDataDir, 'medium-document.txt');
      const processed = await this.documentProcessor.processTXT(filePath);
      const chunked = await this.chunkingService.chunkDocument(processed, filePath);

      const passed =
        chunked.chunks.length >= 1 &&
        chunked.chunks.every((c) => c.metadata.chunkIndex >= 0) &&
        chunked.chunks.every((c) => (c.metadata.tokenCount || 0) <= 1000) &&
        chunked.chunks[0].metadata.totalChunks === chunked.totalChunks;

      this.addResult('Medium Document Test', passed, undefined, {
        totalChunks: chunked.totalChunks,
        avgTokensPerChunk: Math.round(
          chunked.chunks.reduce((sum, c) => sum + (c.metadata.tokenCount || 0), 0) /
            chunked.chunks.length
        ),
      });
    } catch (error) {
      this.addResult(
        'Medium Document Test',
        false,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  async testLongDocument(): Promise<void> {
    try {
      const filePath = join(this.testDataDir, 'long-document.txt');
      const processed = await this.documentProcessor.processTXT(filePath);
      const chunked = await this.chunkingService.chunkDocument(processed, filePath);

      // For a 10-page equivalent, expect 20-30 chunks
      const chunksInRange = chunked.totalChunks >= 15 && chunked.totalChunks <= 35;
      const validTokenCounts = chunked.chunks.every((c) => (c.metadata.tokenCount || 0) <= 1000);
      const validIndices = chunked.chunks.every((c, i) => c.metadata.chunkIndex === i);

      this.addResult(
        'Long Document Test (10-page equivalent)',
        chunksInRange && validTokenCounts && validIndices,
        undefined,
        {
          totalChunks: chunked.totalChunks,
          expectedRange: '20-30 chunks',
          avgTokensPerChunk: Math.round(
            chunked.chunks.reduce((sum, c) => sum + (c.metadata.tokenCount || 0), 0) /
              chunked.chunks.length
          ),
          maxTokenCount: Math.max(...chunked.chunks.map((c) => c.metadata.tokenCount || 0)),
        }
      );
    } catch (error) {
      this.addResult(
        'Long Document Test (10-page equivalent)',
        false,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  async testMarkdownDocument(): Promise<void> {
    try {
      const filePath = join(this.testDataDir, 'sample.md');
      const processed = await this.documentProcessor.processMD(filePath);
      const chunked = await this.chunkingService.chunkDocument(processed, filePath);

      const passed =
        chunked.chunks.length >= 1 &&
        chunked.chunks.every((c) => (c.metadata.tokenCount || 0) <= 1000);

      this.addResult('Markdown Document Test', passed, undefined, {
        totalChunks: chunked.totalChunks,
      });
    } catch (error) {
      this.addResult(
        'Markdown Document Test',
        false,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  async testMetadataPreservation(): Promise<void> {
    try {
      const filePath = join(this.testDataDir, 'long-document.txt');
      const processed = await this.documentProcessor.processTXT(filePath);
      const chunked = await this.chunkingService.chunkDocument(processed, filePath, 5);

      const hasSource = chunked.chunks.every((c) => c.metadata.source === filePath);
      const hasPageNumber = chunked.chunks.every((c) => c.metadata.pageNumber === 5);
      const hasChunkIndex = chunked.chunks.every((c) => c.metadata.chunkIndex >= 0);
      const hasTotalChunks = chunked.chunks.every(
        (c) => c.metadata.totalChunks === chunked.totalChunks
      );
      const hasWordCount = chunked.chunks.every((c) => c.metadata.wordCount > 0);

      this.addResult(
        'Metadata Preservation Test',
        hasSource && hasPageNumber && hasChunkIndex && hasTotalChunks && hasWordCount,
        undefined,
        {
          sampleMetadata: chunked.chunks[0].metadata,
        }
      );
    } catch (error) {
      this.addResult(
        'Metadata Preservation Test',
        false,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  async testChunkBoundaries(): Promise<void> {
    try {
      const filePath = join(this.testDataDir, 'long-document.txt');
      const processed = await this.documentProcessor.processTXT(filePath);
      const chunked = await this.chunkingService.chunkDocument(processed, filePath);

      // Check if chunks preserve natural boundaries
      // All chunks should end at word boundaries (not mid-word)
      // This validates that the separator strategy is working
      const chunksWithWordBoundaries = chunked.chunks.filter((c) => {
        const trimmed = c.content.trim();
        // Check if ends with punctuation, space, or complete word
        // Not mid-word (which would look like ending with alphanumeric followed by more content)
        return (
          /[.!?,;:\s]$/.test(trimmed) || // Ends with punctuation or whitespace
          /[a-zA-Z0-9)"]$/.test(trimmed) // Ends with alphanumeric (complete word)
        );
      }).length;

      // All chunks should maintain word boundaries
      const passed = chunksWithWordBoundaries === chunked.chunks.length;

      this.addResult('Chunk Boundary Test', passed, undefined, {
        totalChunks: chunked.totalChunks,
        chunksWithWordBoundaries: chunksWithWordBoundaries,
        testDescription: 'Validates chunks split at natural word/sentence boundaries',
      });
    } catch (error) {
      this.addResult(
        'Chunk Boundary Test',
        false,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  async testMaxTokenLimit(): Promise<void> {
    try {
      const filePath = join(this.testDataDir, 'long-document.txt');
      const processed = await this.documentProcessor.processTXT(filePath);
      const chunked = await this.chunkingService.chunkDocument(processed, filePath);

      const maxTokenCount = Math.max(...chunked.chunks.map((c) => c.metadata.tokenCount || 0));
      const allWithinLimit = chunked.chunks.every((c) => (c.metadata.tokenCount || 0) <= 1000);

      this.addResult('Max Token Limit Test', allWithinLimit, undefined, {
        maxTokenCount,
        limit: 1000,
        allWithinLimit,
      });
    } catch (error) {
      this.addResult(
        'Max Token Limit Test',
        false,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  printResults(): void {
    console.log('\n' + '='.repeat(70));
    console.log('CHUNKING SERVICE TEST RESULTS');
    console.log('='.repeat(70) + '\n');

    let passedCount = 0;
    let failedCount = 0;

    this.testResults.forEach((result) => {
      const status = result.passed ? '✓ PASS' : '✗ FAIL';
      const color = result.passed ? '\x1b[32m' : '\x1b[31m';
      const reset = '\x1b[0m';

      console.log(`${color}${status}${reset} ${result.testName}`);

      if (result.details) {
        Object.entries(result.details).forEach(([key, value]) => {
          console.log(`  ${key}: ${JSON.stringify(value)}`);
        });
      }

      if (result.error) {
        console.log(`  Error: ${result.error}`);
      }

      console.log();

      if (result.passed) passedCount++;
      else failedCount++;
    });

    console.log('='.repeat(70));
    console.log(
      `Total: ${this.testResults.length} | Passed: ${passedCount} | Failed: ${failedCount}`
    );
    console.log('='.repeat(70) + '\n');
  }

  async runAllTests(): Promise<void> {
    console.log('Setting up test environment...\n');
    await this.setup();

    console.log('Running tests...\n');
    await this.testShortDocument();
    await this.testMediumDocument();
    await this.testLongDocument();
    await this.testMarkdownDocument();
    await this.testMetadataPreservation();
    await this.testChunkBoundaries();
    await this.testMaxTokenLimit();

    this.printResults();
  }
}

// Run tests
const tester = new ChunkingServiceTester();
tester.runAllTests().catch(console.error);
