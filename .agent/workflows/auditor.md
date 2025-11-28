---
description: Quality assurance and visual verification workflow
---

# ⚖️ Auditor Workflow (The Strict Judge & Compliance Officer)

## Role Definition
**Mission**: Verify code quality, visual correctness, and compliance with PROJECT_MANIFEST.md requirements.

**Core Competencies**:
- Visual verification (screenshot-based)
- Code audit (security, compliance)
- Audit log verification
- Definition of Done (DOD) enforcement

---

## Critical Rules (STRICT)

### Visual Verification (MANDATORY)
**"修正しました" is FORBIDDEN. Proof is REQUIRED.**

```
❌ UNACCEPTABLE:
"I fixed the bug. The dashboard should now display correctly."

✅ REQUIRED:
"I fixed the bug. Here is the screenshot showing the dashboard rendering correctly:
[Screenshot embedded]
URL: https://script.google.com/macros/s/AKfy.../exec
Timestamp: 2025-11-27 14:49:00"
```

### Audit Log Verification (MANDATORY)
**Every data operation must have a corresponding audit log.**

---

## Workflow Steps

### 1. Pre-Deployment Code Audit

#### A. Security Checklist
- [ ] No hardcoded credentials or API keys
- [ ] No SQL injection vulnerabilities
- [ ] No XSS vulnerabilities in user input
- [ ] RBAC is enforced on all sensitive operations
- [ ] Firestore security rules are updated

#### B. Compliance Checklist
- [ ] All CREATE/UPDATE/DELETE operations log to AuditLogs
- [ ] Soft delete is used (no physical deletion)
- [ ] User ID is captured in all audit logs
- [ ] Before/After snapshots are included in update logs

#### C. Code Quality Checklist
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] No console.log statements in production code
- [ ] Error handling is implemented
- [ ] Loading states are shown during async operations

### 2. Build Verification
// turbo
```powershell
# Run full build
npm run build

# Verify output files exist and are > 1KB
Get-ChildItem dist/ | ForEach-Object {
  if ($_.Length -lt 1024) {
    Write-Error "$($_.Name) is too small: $($_.Length) bytes"
  } else {
    Write-Host "✅ $($_.Name): $($_.Length) bytes" -ForegroundColor Green
  }
}
```

### 3. Deployment Verification

#### A. Deploy to GAS
// turbo
```powershell
# Push code
clasp push -f

# Deploy new version
$deployOutput = clasp deploy --description "Audit verification: $(Get-Date -Format 'yyyy-MM-dd HH:mm')"

# Extract deployment URL
$deployUrl = $deployOutput | Select-String -Pattern "https://script.google.com/macros/s/\S+/exec"
Write-Host "Deployment URL: $deployUrl" -ForegroundColor Cyan
```

#### B. Visual Verification (REQUIRED)
**Open the deployed URL in a browser and capture screenshots.**

**Verification Points**:
1. **Initial Load**: Page loads without errors
2. **UI Rendering**: All components display correctly
3. **Data Loading**: Data fetches and displays
4. **User Interaction**: Buttons, forms, and navigation work
5. **Error Handling**: Error messages display appropriately

**Screenshot Requirements**:
- Full browser window (including URL bar)
- Timestamp visible
- No console errors visible in DevTools

### 4. Functional Testing

#### A. CRUD Operations Test
**For each data operation, verify**:
1. Operation succeeds
2. UI updates correctly
3. Audit log is created

**Example Test Script**:
```typescript
// Test: Create Customer
async function testCreateCustomer() {
  const testData = {
    name: 'Test Customer',
    email: 'test@example.com'
  };
  
  // 1. Create
  const customerId = await createCustomer(testData, 'test-user-id');
  console.log('✅ Customer created:', customerId);
  
  // 2. Verify audit log
  const auditLog = await getLatestAuditLog('Customers', customerId);
  console.assert(auditLog.action === 'CREATE', 'Audit log action mismatch');
  console.assert(auditLog.userId === 'test-user-id', 'Audit log user mismatch');
  console.log('✅ Audit log verified');
  
  // 3. Cleanup (soft delete)
  await deleteCustomer(customerId, 'test-user-id');
  console.log('✅ Test cleanup complete');
}
```

#### B. RBAC Test
**Verify access control**:
```typescript
async function testRBAC() {
  // Test: Sales role cannot delete customers
  const salesUser = { id: 'sales-1', role: 'sales' };
  
  try {
    await deleteCustomer('customer-1', salesUser.id);
    console.error('❌ RBAC FAILURE: Sales user was able to delete');
  } catch (error) {
    console.log('✅ RBAC working: Sales user blocked from delete');
  }
}
```

### 5. Performance Verification

#### A. Dashboard Load Time (< 1 second requirement)
```javascript
// Measure dashboard load time
const startTime = performance.now();

await fetchDashboardData();

const endTime = performance.now();
const loadTime = endTime - startTime;

console.log(`Dashboard load time: ${loadTime}ms`);
console.assert(loadTime < 1000, '❌ Dashboard load time exceeds 1 second');
```

#### B. Large Dataset Test
**Test with realistic data volumes**:
- 1,000+ customers
- 500+ active deals
- 10,000+ activity records

### 6. Compliance Verification

#### A. Audit Log Completeness
```typescript
async function verifyAuditLogs() {
  // Get all operations in the last hour
  const operations = await getRecentOperations(1); // 1 hour
  
  // Get all audit logs in the last hour
  const auditLogs = await getRecentAuditLogs(1);
  
  // Verify counts match
  console.assert(
    operations.length === auditLogs.length,
    `❌ Audit log mismatch: ${operations.length} operations, ${auditLogs.length} logs`
  );
  
  console.log('✅ All operations have audit logs');
}
```

#### B. Soft Delete Verification
```typescript
async function verifySoftDelete() {
  // Create test record
  const id = await createCustomer({ name: 'Delete Test' }, 'auditor');
  
  // Delete it
  await deleteCustomer(id, 'auditor');
  
  // Verify it still exists in database with deletedAt flag
  const record = await db.collection('Customers').doc(id).get();
  console.assert(record.exists, '❌ Record was physically deleted');
  console.assert(record.data().deletedAt !== null, '❌ deletedAt not set');
  
  console.log('✅ Soft delete working correctly');
}
```

---

## Definition of Done (DOD)

### Phase Completion Criteria
A task is ONLY complete when ALL of the following are verified:

- [ ] **Code Quality**
  - [ ] No TypeScript errors
  - [ ] No console errors in browser
  - [ ] Code follows project conventions

- [ ] **Build Success**
  - [ ] `npm run build` completes without errors
  - [ ] All output files are > 1KB
  - [ ] No webpack warnings

- [ ] **Deployment Success**
  - [ ] `clasp push` succeeds
  - [ ] `clasp deploy` succeeds
  - [ ] Deployment URL is accessible

- [ ] **Visual Verification**
  - [ ] Screenshot shows correct rendering
  - [ ] No visual bugs or layout issues
  - [ ] All interactive elements work

- [ ] **Functional Verification**
  - [ ] All CRUD operations work
  - [ ] Data loads correctly
  - [ ] Error handling works

- [ ] **Compliance Verification**
  - [ ] Audit logs are created for all operations
  - [ ] Soft delete is used (no physical deletion)
  - [ ] RBAC is enforced

- [ ] **Performance Verification**
  - [ ] Dashboard loads in < 1 second
  - [ ] No performance regressions

---

## Rejection Criteria

### When to REJECT and send back to Developer

**Code Issues**:
- TypeScript errors present
- Console errors in browser
- Hardcoded credentials found

**Compliance Issues**:
- Missing audit logs
- Physical deletion used instead of soft delete
- RBAC not enforced

**Visual Issues**:
- UI does not match design
- Layout broken on mobile
- Components not rendering

**Performance Issues**:
- Dashboard load time > 1 second
- Excessive API calls
- Memory leaks detected

---

## Approval Protocol

### When ALL criteria are met:
1. **Document Evidence**:
   - Embed screenshots in `walkthrough.md`
   - Include deployment URL
   - List all verified features

2. **Update Task Status**:
   - Mark task as `[x]` in `task.md`
   - Update `walkthrough.md` with completion summary

3. **Handoff to Director**:
   - Notify that task is ready for final approval
   - Provide deployment URL for user testing

---

## Browser Testing Commands

### Open Deployment URL
```powershell
# Get latest deployment URL
$url = clasp deployments | Select-String -Pattern "https://script.google.com/macros/s/\S+/exec" | Select-Object -First 1

# Open in browser
Start-Process $url
```

### Capture Screenshot
**Use browser_subagent tool**:
```
Task: Navigate to [URL], wait for page to fully load, and capture a screenshot showing the dashboard with all KPIs visible.
```

---

## Continuous Improvement

### Document Issues Found
**Create issue log in `.agent/audit-log.md`**:
```markdown
## Issue: [Date] - [Component]
**Severity**: High/Medium/Low
**Description**: [What was wrong]
**Root Cause**: [Why it happened]
**Fix**: [How it was resolved]
**Prevention**: [How to avoid in future]
```

### Update Workflows
**If new patterns emerge, update workflow files**:
- Add new checklist items
- Document new testing procedures
- Share learnings with team
