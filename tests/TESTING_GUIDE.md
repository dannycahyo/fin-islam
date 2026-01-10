# Testing Guide - Step by Step

Complete guide to run accuracy tests and achieve 90%+ target.

## Quick Start

```bash
# 1. Install tsx (if not already)
pnpm add -D tsx

# 2. Start backend server (in separate terminal)
pnpm dev:backend

# 3. Wait for server ready (check logs show "Server running on port 3001")

# 4. Run accuracy tests
pnpm test:accuracy
```

## Detailed Setup

### Step 1: Prerequisites

**Check Ollama is running**:

```bash
ollama list
# Should show:
# - llama3.1:8b
# - nomic-embed-text
```

If models missing:

```bash
ollama pull llama3.1:8b
ollama pull nomic-embed-text
```

**Check database is ready**:

```bash
pnpm db:migrate
```

**Check documents are indexed**:

```bash
# Start backend
pnpm dev:backend

# In another terminal, check documents endpoint
curl http://localhost:3001/api/documents

# Should return list of indexed documents
# If empty, you need to upload documents first
```

### Step 2: Upload Test Documents (If Needed)

Your knowledge base should have documents covering:

**Principles** (`/docs/principles/`):

- Riba concept and prohibition
- Gharar (uncertainty) explanation
- Maysir (gambling) distinction
- Asset-backing requirement
- Profit-loss sharing principles
- Halal/Haram investment criteria
- Shariah governance role

**Products** (`/docs/products/`):

- Murabaha (cost-plus sale)
- Musharakah/Mudharabah (partnerships)
- Ijarah (leasing)
- Sukuk (Islamic bonds)
- Takaful (Islamic insurance)
- Wakalah, Salam, Istisna contracts
- Qard Hassan (benevolent loan)

**Compliance** (`/docs/compliance/`):

- Shariah Supervisory Board
- Compliance audit processes
- Income purification
- AAOIFI/IFSB standards
- Stock screening methodology

**Comparison** (`/docs/comparison_documents/`):

- Islamic vs conventional banking
- Mortgage structures comparison
- Insurance differences
- Bond vs Sukuk comparison
- Risk management approaches

**Calculation** (`/docs/calculations/`):

- Musharakah profit/loss formulas
- Mudharabah distribution rules
- Multi-partner scenarios
- Loss bearing principles

### Step 3: Install Dependencies

```bash
# From project root
pnpm install

# Install tsx for running TypeScript
pnpm add -D tsx
```

### Step 4: Start Backend

**Terminal 1** - Backend:

```bash
cd /Users/dannydwicahyono/Projects/fin-islam
pnpm dev:backend
```

Wait for:

```
Server running on port 3001
Database connected
Ollama connected
```

### Step 5: Run Tests

**Terminal 2** - Tests:

```bash
cd /Users/dannydwicahyono/Projects/fin-islam
pnpm test:accuracy
```

### Step 6: Review Results

Tests will output:

```
📋 Testing [P001] principles: What is Riba and why is it prohibited...
✓ Score: 95% | Duration: 3200ms | PASS

... (55 questions) ...

📊 TEST REPORT SUMMARY
Total Tests:        55
Passed:             52 ✓
Failed:             3 ✗
Accuracy:           94.55%
Status:             ✓ ACHIEVED
```

Report saved to: `tests/test-report-2026-01-10.json`

## Understanding Results

### Overall Metrics

- **Accuracy**: % of tests with score ≥70%
- **Average Score**: Mean score across all tests
- **Avg Response Time**: Mean time to answer
- **Target**: 90% accuracy minimum

### Category Breakdown

Each category shows:

- Pass/fail count
- Accuracy percentage
- Average score
- Status (✓ or ✗)

**Example**:

```
PRINCIPLES:
  Tests:    14/15 (93%) ✓
  Avg Score: 88%
```

= 14 passed, 1 failed, 93% accuracy, 88% average score

### Failure Patterns

Shows systematic issues:

```
CALCULATION:
  Common Missing Keywords:
    - capital ratio (missing in 2 answers)
    - Shariah requirement (missing in 2 answers)
```

This indicates calculation knowledge gap.

## If Accuracy < 90%

### Strategy

1. **Identify weak categories** (< 80% accuracy)
2. **Review failure patterns** for common missing keywords
3. **Add/improve documents** for those topics
4. **Re-index and re-test**

### Example Workflow

**Scenario**: Calculation category at 60% accuracy

**Step 1 - Analyze**:

```json
{
  "category": "calculation",
  "commonIssues": [
    "capital ratio (missing in 3 answers)",
    "loss distribution (missing in 2 answers)"
  ],
  "failedQuestions": ["CA002: Musharakah loss distribution", "CA004: Mudharabah loss bearing"]
}
```

**Step 2 - Create Document**:

Create `/docs/calculations/profit-loss-distribution.md`:

```markdown
# Profit and Loss Distribution in Islamic Partnerships

## Musharakah Partnership

### Profit Distribution

- Profit is distributed by **agreed ratio** between partners
- Ratio can differ from capital contribution ratio
- Must be agreed upon at contract initiation

Example:

- Partner A: $60,000 (60% capital)
- Partner B: $40,000 (40% capital)
- Agreed profit ratio: 50-50
- Profit $20,000 → A gets $10,000, B gets $10,000

### Loss Distribution

- Loss MUST be distributed by **capital ratio** (Shariah requirement)
- Cannot deviate from capital contribution percentages
- This is a fundamental Islamic finance principle

Example (same partnership):

- Loss $15,000 → A bears $9,000 (60%), B bears $6,000 (40%)

## Mudharabah Partnership

### Profit Distribution

- Distributed by **agreed ratio**
- Rabb-al-Mal (capital provider) and Mudarib (entrepreneur) agree on percentage

Example:

- Capital: $100,000
- Profit ratio: 60-40 (investor-entrepreneur)
- Profit $30,000 → Investor $18,000, Entrepreneur $12,000

### Loss Distribution

- **100% borne by capital provider** (Rabb-al-Mal)
- Entrepreneur (Mudarib) bears zero financial loss
- Entrepreneur loses time and effort only
- This is a Shariah requirement

Example (same contract):

- Loss $20,000 → Investor bears full $20,000, Entrepreneur $0
```

**Step 3 - Upload Document**:

```bash
# Use document upload API or add to /docs/ and re-index
curl -X POST http://localhost:3001/api/documents \
  -H "Content-Type: multipart/form-data" \
  -F "file=@docs/calculations/profit-loss-distribution.md" \
  -F "category=calculation"
```

**Step 4 - Re-run Tests**:

```bash
pnpm test:accuracy
```

**Step 5 - Verify Improvement**:

```
CALCULATION:
  Tests:    5/5 (100%) ✓  # Improved from 60%!
  Avg Score: 92%
```

### Document Quality Checklist

For each document:

- [ ] Uses exact keywords from test `mustInclude` lists
- [ ] Provides clear examples with numbers
- [ ] Cites Shariah requirements explicitly
- [ ] Includes comparisons where relevant
- [ ] Uses Islamic terminology correctly
- [ ] Structured with clear headings
- [ ] 500-1500 words (optimal chunk size)

## Running Specific Categories

To test individual categories:

```typescript
// Edit run-accuracy-test.ts temporarily
const questionsToTest = questionsData.questions.filter(
  (q) => q.category === 'calculation' // Change category
);
await tester.runAllTests(questionsToTest, 2000);
```

Or create category-specific scripts:

```bash
# tests/run-calculation-tests.ts
const questions = questionsData.questions.filter(
  q => q.category === 'calculation'
);
```

## Tuning Parameters

If systematic low confidence:

```env
# backend/.env

# Retrieve more chunks
KNOWLEDGE_RETRIEVAL_LIMIT=7  # Default: 5

# Use more chunks for context
KNOWLEDGE_RERANKED_LIMIT=5   # Default: 3

# Lower matching threshold
KNOWLEDGE_CONFIDENCE_THRESHOLD=0.4  # Default: 0.5

# Increase generation creativity
KNOWLEDGE_AGENT_TEMPERATURE=0.8  # Default: 0.7
```

⚠️ **Warning**: Lower thresholds may increase false positives. Test after each change.

## Expected Timeline

**Initial run** (no docs):

- Accuracy: 30-50%
- Many failures due to no knowledge base

**After adding 5-10 docs per category**:

- Accuracy: 70-85%
- Most principles/products covered

**After targeted improvements**:

- Accuracy: 90-95%
- All categories ≥80%

**Optimal state**:

- Accuracy: 95%+
- Only edge cases fail

## Common Issues

### Issue: All tests timeout

**Cause**: Backend not running or Ollama down
**Solution**:

```bash
# Check backend
curl http://localhost:3001/health

# Check Ollama
ollama list
```

### Issue: Accuracy < 50%

**Cause**: Empty or insufficient knowledge base
**Solution**: Upload documents covering all 5 categories

### Issue: Specific category fails

**Cause**: Missing documents for that topic
**Solution**: Add 3-5 documents specifically for that category

### Issue: Calculations always wrong

**Cause**: MCP server not running
**Solution**:

```bash
# Start MCP server
pnpm dev:mcp

# Verify in backend logs
# Should see: "MCP server connected"
```

### Issue: Inconsistent results

**Cause**: LLM temperature too high or retrieval instability
**Solution**:

- Lower `KNOWLEDGE_AGENT_TEMPERATURE` to 0.3-0.5
- Increase `KNOWLEDGE_RERANKED_LIMIT` for stable context

## Validation Checklist

Before considering tests complete:

- [ ] Backend running and healthy
- [ ] Ollama models pulled and active
- [ ] Database migrated with documents
- [ ] MCP server running for calculations
- [ ] All 55 tests execute without errors
- [ ] Overall accuracy ≥90%
- [ ] All categories ≥80% (ideally ≥90%)
- [ ] Calculation category ≥90% (critical)
- [ ] Average response time <5s
- [ ] Test report generated successfully
- [ ] Failure patterns documented
- [ ] Knowledge gaps identified
- [ ] Improvement plan created if needed

## Success Metrics

**Minimum Acceptable**:

- 90% overall accuracy
- 80% per category
- <5s avg response time

**Excellent**:

- 95% overall accuracy
- 90% all categories
- <3s avg response time

**Outstanding**:

- 98% overall accuracy
- 95% all categories
- <2s avg response time
- Zero calculation errors

## Next Steps After Achieving 90%

1. **Document learnings**: Update knowledge base based on failures
2. **Add edge cases**: Create tests for boundary conditions
3. **Monitor degradation**: Re-run monthly to catch knowledge drift
4. **Expand coverage**: Add 10-20 advanced questions
5. **Performance optimization**: Reduce response times
6. **CI/CD integration**: Automate tests on deployment
7. **User testing**: Validate with real queries
8. **Feedback loop**: Update tests based on production queries

## Support

If stuck:

1. Check `tests/README.md` for detailed explanations
2. Review failure patterns in JSON report
3. Examine individual test responses
4. Verify backend logs for errors
5. Check Ollama logs for model issues
6. Validate document indexing in database

**Remember**: 90% accuracy is achievable with proper knowledge base coverage. Focus on systematic improvements based on failure patterns rather than individual test fixes.
