# Islamic Finance Chatbot - Accuracy Test Suite

Comprehensive test suite with 55 questions covering all Islamic finance topics to validate chatbot achieves 90%+ accuracy.

## Overview

- **Total Questions**: 55
- **Target Accuracy**: 90%
- **Categories**:
  - Principles: 15 questions
  - Products: 15 questions
  - Compliance: 10 questions
  - Comparison: 10 questions
  - Calculation: 5 questions

## Files

```
tests/
├── test-questions.json        # 55 test questions with expected answers
├── run-accuracy-test.ts       # Automated test runner
├── README.md                  # This file
└── test-report-*.json         # Generated test reports (timestamped)
```

## Test Questions Structure

Each question includes:

- `id`: Unique identifier (P001, PR001, C001, CM001, CA001)
- `category`: Topic category
- `question`: Test query
- `expectedAnswer`:
  - `mustInclude`: Critical keywords (70% weight)
  - `shouldMention`: Important keywords (30% weight)
  - `accuracy`: Description of expected content

## Scoring System

**Score Calculation**:

- Must Include keywords: 70% of score
- Should Mention keywords: 30% of score
- **Pass threshold**: 70% minimum
- **Target accuracy**: 90% of tests pass

**Example**:

```json
{
  "mustInclude": ["Riba", "interest", "prohibited"], // 3 keywords
  "shouldMention": ["Quran", "exploitation"] // 2 keywords
}
```

If response contains:

- 3/3 must include = 70%
- 2/2 should mention = 30%
- **Total**: 100% (PASS)

## Running Tests

### Prerequisites

1. **Backend server running**:

```bash
pnpm dev:backend
```

2. **Ollama running** with models:

```bash
ollama pull llama3.1:8b
ollama pull nomic-embed-text
```

3. **Database ready** with indexed documents

### Execute Tests

```bash
pnpm test:accuracy
```

This will:

1. Create test session
2. Run all 55 questions (2s delay between)
3. Score each response
4. Generate detailed report
5. Save JSON report with timestamp
6. Exit with code 0 if ≥90% accuracy, 1 otherwise

### Expected Duration

- ~55 questions × ~3-5s per question = **3-5 minutes total**

## Test Report

### Console Output

```
📊 TEST REPORT SUMMARY
================================================================================
Total Tests:        55
Passed:             52 ✓
Failed:             3 ✗
Accuracy:           94.55%
Average Score:      87%
Avg Response Time:  3421ms
Target Accuracy:    90%
Status:             ✓ ACHIEVED

📈 CATEGORY BREAKDOWN
--------------------------------------------------------------------------------

PRINCIPLES:
  Tests:    14/15 (93%) ✓
  Avg Score: 88%

PRODUCTS:
  Tests:    15/15 (100%) ✓
  Avg Score: 92%

COMPLIANCE:
  Tests:    9/10 (90%) ✓
  Avg Score: 85%

COMPARISON:
  Tests:    10/10 (100%) ✓
  Avg Score: 89%

CALCULATION:
  Tests:    4/5 (80%) ✗
  Avg Score: 78%

⚠️  FAILURE PATTERNS
--------------------------------------------------------------------------------

CALCULATION:
  Common Missing Keywords:
    - capital ratio (missing in 2 answers)
    - Shariah requirement (missing in 2 answers)
  Failed Questions (1):
    - CA002: Using the same Musharakah from CA001, if the business...
```

### JSON Report

Saved as `test-report-YYYY-MM-DD.json`:

```json
{
  "summary": {
    "totalTests": 55,
    "passed": 52,
    "failed": 3,
    "accuracy": 94.55,
    "avgScore": 87,
    "avgResponseTime": 3421,
    "timestamp": "2026-01-10T10:30:00.000Z"
  },
  "categoryStats": { ... },
  "results": [
    {
      "id": "P001",
      "category": "principles",
      "question": "What is Riba...",
      "response": "Riba refers to...",
      "score": 95,
      "passed": true,
      "missingKeywords": [],
      "foundKeywords": ["interest", "prohibited", "Quran"],
      "responseDuration": 3200,
      "timestamp": "2026-01-10T10:25:00.000Z"
    }
  ],
  "failurePatterns": [ ... ]
}
```

## Test Categories Details

### Principles (15 questions)

Tests understanding of:

- Riba (interest prohibition)
- Gharar (uncertainty)
- Maysir (speculation/gambling)
- Asset-backing requirement
- Profit-loss sharing
- Halal/Haram screening
- Shariah governance
- Islamic vs ethical investing

**Example**: "What is Riba and why is it prohibited?"

### Products (15 questions)

Tests knowledge of Islamic financial instruments:

- Murabaha (cost-plus financing)
- Musharakah/Mudharabah (partnerships)
- Ijarah (leasing)
- Sukuk (Islamic bonds)
- Takaful (Islamic insurance)
- Salam/Istisna (forward contracts)
- Wakalah (agency)

**Example**: "Explain how Takaful insurance works"

### Compliance (10 questions)

Tests Shariah compliance understanding:

- Shariah Supervisory Board role
- Audit processes
- Purification of non-compliant income
- Standards organizations (AAOIFI, IFSB)
- Stock screening criteria
- Violation remediation

**Example**: "How do Islamic banks screen stocks for Shariah compliance?"

### Comparison (10 questions)

Tests ability to distinguish Islamic vs conventional finance:

- Banking models
- Mortgages/home financing
- Insurance products
- Bonds vs Sukuk
- Pricing competitiveness
- Risk management
- Default handling

**Example**: "Compare Sukuk with conventional bonds"

### Calculation (5 questions)

Tests computational accuracy for profit-sharing:

- Musharakah profit distribution (by agreement)
- Musharakah loss distribution (by capital)
- Mudharabah profit sharing
- Mudharabah loss bearing (capital provider only)
- Multi-partner scenarios

**Example**: "Partner A: $60k, Partner B: $40k, 50-50 profit split, $20k profit. Distribution?"

## Improving Accuracy

### If Accuracy < 90%

1. **Review failure patterns** in report:
   - Common missing keywords indicate knowledge gaps
   - Category-specific failures show weak areas

2. **Add/improve documents** in knowledge base:

   ```bash
   # Add documents to /docs/
   # Categories: principles, products, compliance, comparison, calculation
   ```

3. **Re-index knowledge base**:

   ```bash
   pnpm --filter backend db:migrate
   # Upload documents via API
   ```

4. **Adjust agent prompts** if systematic issues:
   - `/backend/agents/builders/*-prompt-builder.ts`
   - Add more examples for weak categories

5. **Tune retrieval parameters**:

   ```env
   KNOWLEDGE_RETRIEVAL_LIMIT=5      # Increase for more context
   KNOWLEDGE_RERANKED_LIMIT=3       # Increase for broader coverage
   KNOWLEDGE_CONFIDENCE_THRESHOLD=0.5  # Lower for more permissive matching
   ```

6. **Re-run tests**:
   ```bash
   pnpm test:accuracy
   ```

### Common Failure Patterns

**Calculations**:

- Missing specific formulas
- Not distinguishing profit vs loss ratios
- Solution: Add calculation examples to knowledge base

**Compliance**:

- Missing standard body names
- Not citing specific rules
- Solution: Add compliance documents with detailed standards

**Comparisons**:

- Too general, not highlighting key differences
- Solution: Add comparative analysis documents

## Continuous Testing

Add to CI/CD pipeline:

```yaml
# .github/workflows/test-accuracy.yml
name: Accuracy Test
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: pnpm install
      - run: pnpm db:setup
      - run: pnpm dev:backend & # Background
      - run: sleep 10 # Wait for startup
      - run: pnpm test:accuracy
```

## Extending Tests

### Add New Questions

Edit `test-questions.json`:

```json
{
  "id": "P016",
  "category": "principles",
  "question": "Your question here?",
  "expectedAnswer": {
    "mustInclude": ["keyword1", "keyword2"],
    "shouldMention": ["optional1"],
    "accuracy": "Description of expected answer"
  }
}
```

Update metadata counts:

```json
"metadata": {
  "totalQuestions": 56,
  "categories": {
    "principles": 16  // Increment
  }
}
```

### Custom Test Subsets

```typescript
// Run only specific category
const principlesTests = questionsData.questions.filter((q) => q.category === 'principles');
await tester.runAllTests(principlesTests);
```

## Troubleshooting

### Backend Not Running

```
Error: Failed to create session: fetch failed
```

**Solution**: Start backend with `pnpm dev:backend`

### Ollama Issues

```
Error: Ollama connection refused
```

**Solution**:

```bash
ollama serve
ollama pull llama3.1:8b
ollama pull nomic-embed-text
```

### Low Accuracy

```
Accuracy: 65% (✗ NOT ACHIEVED)
```

**Solution**:

1. Check failure patterns in report
2. Review failed question responses
3. Add knowledge base documents
4. Adjust retrieval parameters
5. Re-run tests

### Timeout Errors

```
Error: Request timeout
```

**Solution**: Increase delay in `run-accuracy-test.ts`:

```typescript
await tester.runAllTests(questions, 5000); // 5s delay
```

## Success Criteria

✅ **Test Suite Complete**:

- [x] 50+ test questions created (55 total)
- [x] All categories covered (5/5)
- [x] Expected answers documented
- [x] Automated test runner built

✅ **Accuracy Target**:

- [ ] System achieves 90%+ overall accuracy
- [ ] All categories achieve 80%+ minimum
- [ ] Calculation accuracy 90%+ (critical)

✅ **Documentation**:

- [x] Test questions catalog
- [x] Running instructions
- [x] Scoring methodology
- [x] Improvement guidelines

## Next Steps

1. **Run initial test**: `pnpm test:accuracy`
2. **Review results**: Check generated report
3. **If < 90%**: Follow improvement guide
4. **Iterate**: Add docs, tune, re-test
5. **Achieve target**: 90%+ accuracy
6. **Document patterns**: Update knowledge base based on failures
7. **Continuous monitoring**: Add to CI/CD

## Report Analysis Tips

**High-priority failures**:

- Calculation category < 90% → Add formula examples
- Must Include keywords missing → Core concept gap
- Consistent category failures → Insufficient domain coverage

**Lower-priority**:

- Should Mention keywords missing → Answer complete but could be enhanced
- Individual test failures → Edge cases, not systematic

**Focus improvements** on patterns affecting multiple tests in same category.
