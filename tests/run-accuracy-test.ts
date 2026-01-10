import fs from 'fs';
import path from 'path';

interface ExpectedAnswer {
  mustInclude: string[];
  shouldMention: string[];
  accuracy: string;
}

interface TestQuestion {
  id: string;
  category: string;
  question: string;
  expectedAnswer: ExpectedAnswer;
}

interface TestQuestionsData {
  metadata: {
    totalQuestions: number;
    categories: Record<string, number>;
    version: string;
    created: string;
  };
  questions: TestQuestion[];
}

interface TestResult {
  id: string;
  category: string;
  question: string;
  response: string;
  expectedAnswer: ExpectedAnswer;
  score: number;
  passed: boolean;
  missingKeywords: string[];
  foundKeywords: string[];
  responseDuration: number;
  timestamp: string;
  error?: string;
}

interface CategoryStats {
  total: number;
  passed: number;
  failed: number;
  avgScore: number;
  accuracy: number;
}

interface TestReport {
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    accuracy: number;
    avgScore: number;
    avgResponseTime: number;
    timestamp: string;
  };
  categoryStats: Record<string, CategoryStats>;
  results: TestResult[];
  failurePatterns: {
    category: string;
    commonIssues: string[];
    failedQuestions: string[];
  }[];
}

class AccuracyTester {
  private apiUrl: string;
  private results: TestResult[] = [];
  private sessionId: string = '';

  constructor(apiUrl: string = 'http://localhost:3001') {
    this.apiUrl = apiUrl;
  }

  async createSession(): Promise<string> {
    try {
      const response = await fetch(`${this.apiUrl}/api/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      this.sessionId = data.sessionId;
      console.log(`✓ Session created: ${this.sessionId}`);
      return this.sessionId;
    } catch (error) {
      console.error('Failed to create session:', error);
      throw error;
    }
  }

  async askQuestion(question: string): Promise<{ response: string; duration: number }> {
    const startTime = Date.now();

    try {
      const response = await fetch(`${this.apiUrl}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: question,
          sessionId: this.sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      let fullResponse = '';
      const decoder = new TextDecoder();

      let isDone = false;
      while (!isDone) {
        const { done, value } = await reader.read();
        if (done) {
          isDone = true;
          break;
        }

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'content' && data.content) {
                fullResponse += data.content;
              } else if (data.type === 'done' && data.answer) {
                fullResponse = data.answer;
              } else if (data.type === 'error') {
                throw new Error(data.message || 'Unknown error');
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      const duration = Date.now() - startTime;
      return { response: fullResponse.trim(), duration };
    } catch (error) {
      const duration = Date.now() - startTime;
      throw { error, duration };
    }
  }

  scoreResponse(
    response: string,
    expected: ExpectedAnswer
  ): {
    score: number;
    passed: boolean;
    missingKeywords: string[];
    foundKeywords: string[];
  } {
    const responseLower = response.toLowerCase();

    // Check mustInclude keywords (critical)
    const mustIncludeFound = expected.mustInclude.filter((keyword) =>
      responseLower.includes(keyword.toLowerCase())
    );
    const mustIncludeMissing = expected.mustInclude.filter(
      (keyword) => !responseLower.includes(keyword.toLowerCase())
    );

    // Check shouldMention keywords (important but not critical)
    const shouldMentionFound = expected.shouldMention.filter((keyword) =>
      responseLower.includes(keyword.toLowerCase())
    );
    const shouldMentionMissing = expected.shouldMention.filter(
      (keyword) => !responseLower.includes(keyword.toLowerCase())
    );

    // Calculate score
    const mustIncludeScore = (mustIncludeFound.length / expected.mustInclude.length) * 70;
    const shouldMentionScore =
      expected.shouldMention.length > 0
        ? (shouldMentionFound.length / expected.shouldMention.length) * 30
        : 30;

    const totalScore = mustIncludeScore + shouldMentionScore;
    const passed = totalScore >= 70; // 70% threshold

    return {
      score: Math.round(totalScore),
      passed,
      missingKeywords: [...mustIncludeMissing, ...shouldMentionMissing],
      foundKeywords: [...mustIncludeFound, ...shouldMentionFound],
    };
  }

  async runTest(testQuestion: TestQuestion): Promise<TestResult> {
    console.log(
      `\n📋 Testing [${testQuestion.id}] ${testQuestion.category}: ${testQuestion.question.substring(0, 60)}...`
    );

    try {
      const { response, duration } = await this.askQuestion(testQuestion.question);
      const { score, passed, missingKeywords, foundKeywords } = this.scoreResponse(
        response,
        testQuestion.expectedAnswer
      );

      const result: TestResult = {
        id: testQuestion.id,
        category: testQuestion.category,
        question: testQuestion.question,
        response,
        expectedAnswer: testQuestion.expectedAnswer,
        score,
        passed,
        missingKeywords,
        foundKeywords,
        responseDuration: duration,
        timestamp: new Date().toISOString(),
      };

      const passIcon = passed ? '✓' : '✗';
      console.log(
        `${passIcon} Score: ${score}% | Duration: ${duration}ms | ${passed ? 'PASS' : 'FAIL'}`
      );

      if (!passed) {
        console.log(`  Missing keywords: ${missingKeywords.join(', ')}`);
      }

      this.results.push(result);
      return result;
    } catch (err: any) {
      const error = err.error || err;
      console.log(`✗ ERROR: ${error.message || String(error)}`);

      const result: TestResult = {
        id: testQuestion.id,
        category: testQuestion.category,
        question: testQuestion.question,
        response: '',
        expectedAnswer: testQuestion.expectedAnswer,
        score: 0,
        passed: false,
        missingKeywords: testQuestion.expectedAnswer.mustInclude,
        foundKeywords: [],
        responseDuration: err.duration || 0,
        timestamp: new Date().toISOString(),
        error: error.message || String(error),
      };

      this.results.push(result);
      return result;
    }
  }

  async runAllTests(questions: TestQuestion[], delayMs: number = 1000): Promise<TestResult[]> {
    console.log(`\n🚀 Starting accuracy test suite with ${questions.length} questions...\n`);

    await this.createSession();

    for (let i = 0; i < questions.length; i++) {
      await this.runTest(questions[i]);

      // Delay between requests to avoid overwhelming the server
      if (i < questions.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    return this.results;
  }

  generateReport(): TestReport {
    const totalTests = this.results.length;
    const passed = this.results.filter((r) => r.passed).length;
    const failed = totalTests - passed;
    const accuracy = (passed / totalTests) * 100;
    const avgScore = this.results.reduce((sum, r) => sum + r.score, 0) / totalTests;
    const avgResponseTime =
      this.results.reduce((sum, r) => sum + r.responseDuration, 0) / totalTests;

    // Category statistics
    const categoryStats: Record<string, CategoryStats> = {};
    const categories = [...new Set(this.results.map((r) => r.category))];

    for (const category of categories) {
      const categoryResults = this.results.filter((r) => r.category === category);
      const categoryPassed = categoryResults.filter((r) => r.passed).length;
      const categoryTotal = categoryResults.length;
      const categoryAvgScore = categoryResults.reduce((sum, r) => sum + r.score, 0) / categoryTotal;

      categoryStats[category] = {
        total: categoryTotal,
        passed: categoryPassed,
        failed: categoryTotal - categoryPassed,
        avgScore: Math.round(categoryAvgScore),
        accuracy: Math.round((categoryPassed / categoryTotal) * 100),
      };
    }

    // Failure pattern analysis
    const failurePatterns = categories
      .map((category) => {
        const failedResults = this.results.filter((r) => r.category === category && !r.passed);

        // Find common missing keywords
        const allMissingKeywords = failedResults.flatMap((r) => r.missingKeywords);
        const keywordFrequency: Record<string, number> = {};
        allMissingKeywords.forEach((keyword) => {
          keywordFrequency[keyword] = (keywordFrequency[keyword] || 0) + 1;
        });

        const commonIssues = Object.entries(keywordFrequency)
          .filter(([_, count]) => count >= 2)
          .sort((a, b) => b[1] - a[1])
          .map(([keyword, count]) => `${keyword} (missing in ${count} answers)`);

        return {
          category,
          commonIssues,
          failedQuestions: failedResults.map((r) => `${r.id}: ${r.question.substring(0, 60)}...`),
        };
      })
      .filter((fp) => fp.failedQuestions.length > 0);

    return {
      summary: {
        totalTests,
        passed,
        failed,
        accuracy: Math.round(accuracy * 100) / 100,
        avgScore: Math.round(avgScore),
        avgResponseTime: Math.round(avgResponseTime),
        timestamp: new Date().toISOString(),
      },
      categoryStats,
      results: this.results,
      failurePatterns,
    };
  }

  printReport(report: TestReport): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 TEST REPORT SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total Tests:        ${report.summary.totalTests}`);
    console.log(`Passed:             ${report.summary.passed} ✓`);
    console.log(`Failed:             ${report.summary.failed} ✗`);
    console.log(`Accuracy:           ${report.summary.accuracy}%`);
    console.log(`Average Score:      ${report.summary.avgScore}%`);
    console.log(`Avg Response Time:  ${report.summary.avgResponseTime}ms`);
    console.log(`Target Accuracy:    90%`);
    console.log(
      `Status:             ${report.summary.accuracy >= 90 ? '✓ ACHIEVED' : '✗ NOT ACHIEVED'}`
    );

    console.log('\n' + '-'.repeat(80));
    console.log('📈 CATEGORY BREAKDOWN');
    console.log('-'.repeat(80));

    for (const [category, stats] of Object.entries(report.categoryStats)) {
      const statusIcon = stats.accuracy >= 90 ? '✓' : '✗';
      console.log(`\n${category.toUpperCase()}:`);
      console.log(`  Tests:    ${stats.passed}/${stats.total} (${stats.accuracy}%) ${statusIcon}`);
      console.log(`  Avg Score: ${stats.avgScore}%`);
    }

    if (report.failurePatterns.length > 0) {
      console.log('\n' + '-'.repeat(80));
      console.log('⚠️  FAILURE PATTERNS');
      console.log('-'.repeat(80));

      for (const pattern of report.failurePatterns) {
        console.log(`\n${pattern.category.toUpperCase()}:`);
        if (pattern.commonIssues.length > 0) {
          console.log('  Common Missing Keywords:');
          pattern.commonIssues.forEach((issue) => console.log(`    - ${issue}`));
        }
        console.log(`  Failed Questions (${pattern.failedQuestions.length}):`);
        pattern.failedQuestions.slice(0, 3).forEach((q) => console.log(`    - ${q}`));
        if (pattern.failedQuestions.length > 3) {
          console.log(`    ... and ${pattern.failedQuestions.length - 3} more`);
        }
      }
    }

    console.log('\n' + '='.repeat(80));
  }

  saveReport(report: TestReport, filename: string = 'test-report.json'): void {
    const filepath = path.join(__dirname, filename);
    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    console.log(`\n💾 Report saved to: ${filepath}`);
  }
}

async function main() {
  try {
    // Load test questions
    const questionsPath = path.join(__dirname, 'test-questions.json');
    const questionsData: TestQuestionsData = JSON.parse(fs.readFileSync(questionsPath, 'utf-8'));

    console.log('📚 Loaded test questions:');
    console.log(`  Total: ${questionsData.metadata.totalQuestions}`);
    Object.entries(questionsData.metadata.categories).forEach(([cat, count]) => {
      console.log(`  ${cat}: ${count}`);
    });

    // Initialize tester
    const tester = new AccuracyTester('http://localhost:3001');

    // Run tests
    await tester.runAllTests(questionsData.questions, 2000); // 2s delay between questions

    // Generate and print report
    const report = tester.generateReport();
    tester.printReport(report);

    // Save report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    tester.saveReport(report, `test-report-${timestamp}.json`);

    // Exit with appropriate code
    process.exit(report.summary.accuracy >= 90 ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Test execution failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { AccuracyTester, TestQuestion, TestResult, TestReport };
