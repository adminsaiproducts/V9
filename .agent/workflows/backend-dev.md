---
description: GAS and Firestore backend development workflow
---

# 🔨 Backend-Dev Workflow (GAS/Firestore Specialist)

## Role Definition
**Mission**: Implement server-side logic, database operations, and ensure Windows/PowerShell compatibility.

**Core Competencies**:
- Google Apps Script (GAS) development
- Firestore database operations
- Webpack configuration (backend)
- Audit log implementation
- Windows/PowerShell command execution

---

## Critical Constraints (MUST FOLLOW)

### Windows/PowerShell Rules
```powershell
# ❌ FORBIDDEN
rm -rf dist/          # Unix command
clasp undeploy AKfy...  # Unquoted argument
npm run build && clasp push  # && operator

# ✅ REQUIRED
Remove-Item -Recurse -Force dist/
clasp undeploy "AKfy..."
npm run build; if ($?) { clasp push }
```

### GAS Compatibility Strategy
1. **Base64 Encapsulation**: All JS/CSS must be Base64 encoded server-side
2. **Single File Output**: Avoid complex Webpack plugins
3. **HtmlService Standard**: Use `HtmlService.createHtmlOutputFromFile()`

---

## Workflow Steps

### 1. Environment Check
// turbo
```powershell
# Verify backend build tools
npm list webpack typescript @google/clasp
```

### 2. Backend Implementation

#### A. GAS Main File (`src/main.ts`)
**Standard Pattern**:
```typescript
function doGet() {
  // Read compiled files
  const html = HtmlService.createHtmlOutputFromFile('index');
  
  // Base64 encode JS/CSS
  const jsContent = HtmlService.createHtmlOutputFromFile('javascript').getContent();
  const cssContent = HtmlService.createHtmlOutputFromFile('stylesheet').getContent();
  
  const jsBase64 = Utilities.base64Encode(jsContent);
  const cssBase64 = Utilities.base64Encode(cssContent);
  
  // Inject into HTML
  return html.append(`<script>window.__JS__="${jsBase64}"</script>`)
             .append(`<script>window.__CSS__="${cssBase64}"</script>`);
}
```

#### B. Firestore Operations
**Always include Audit Logs**:
```typescript
async function updateCustomer(customerId: string, data: any, userId: string) {
  const before = await getCustomer(customerId);
  
  // Update operation
  await db.collection('Customers').doc(customerId).update(data);
  
  // Audit log (REQUIRED)
  await db.collection('AuditLogs').add({
    timestamp: FieldValue.serverTimestamp(),
    userId: userId,
    action: 'UPDATE',
    collection: 'Customers',
    documentId: customerId,
    before: before,
    after: data
  });
}
```

### 3. Build Process
// turbo
```powershell
# Backend build
npm run build:backend

# Verify output
Get-ChildItem dist/ | Select-Object Name, Length

# Check file sizes (must be > 1KB)
Get-ChildItem dist/*.js | Where-Object { $_.Length -lt 1024 }
```

### 4. Deployment Management

#### Check Deployment Limit
// turbo
```powershell
clasp deployments
```

#### Archive Old Deployments (if needed)
```powershell
# Get deployment IDs
$deployments = clasp deployments | Select-String -Pattern "AKfy"

# Undeploy oldest 5
$deployments | Select-Object -First 5 | ForEach-Object {
  $id = $_ -replace '.*(@\S+).*', '$1'
  clasp undeploy "$id"
}
```

#### Deploy New Version
// turbo
```powershell
clasp push -f
clasp deploy --description "Backend update: [description]"
```

### 5. Verification
**Self-Code Review Checklist**:
- [ ] All database operations have corresponding audit logs
- [ ] PowerShell commands use correct syntax
- [ ] Build output files are > 1KB
- [ ] No hardcoded credentials or secrets
- [ ] Error handling is implemented

---

## Common Patterns

### Soft Delete (Required)
```typescript
async function deleteCustomer(customerId: string, userId: string) {
  // ❌ NEVER: await db.collection('Customers').doc(customerId).delete();
  
  // ✅ ALWAYS: Soft delete
  await db.collection('Customers').doc(customerId).update({
    deletedAt: FieldValue.serverTimestamp(),
    deletedBy: userId
  });
  
  // Audit log
  await logAudit(userId, 'DELETE', 'Customers', customerId);
}
```

### RBAC Implementation
```typescript
function checkPermission(userId: string, action: string, resource: string): boolean {
  const userRole = getUserRole(userId);
  const rules = {
    'executive': ['READ', 'WRITE', 'DELETE'],
    'manager': ['READ', 'WRITE'],
    'sales': ['READ'],
    'staff': ['READ']
  };
  
  return rules[userRole]?.includes(action) ?? false;
}
```

---

## Failure Resistance Protocol
**When errors occur**:
1. **Analyze**: Read error message carefully
2. **Alternative**: Try different approach (e.g., different Webpack config)
3. **Document**: Update workflow with solution
4. **Never**: Give up after first failure

---

## Handoff to Frontend-Dev
**After backend completion**:
- Provide API endpoint documentation
- Share data structure definitions
- Confirm Base64 encoding format
- Update `implementation_plan.md` with integration notes
