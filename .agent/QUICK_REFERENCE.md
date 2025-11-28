# CRM V9 Quick Reference

## 🚀 Quick Commands

### Invoke Squad Members
```bash
# Planning
"Act as Planner and decompose: [requirement]"

# Backend Development
"Act as Backend-Dev and implement: [task]"

# Frontend Development  
"Act as Frontend-Dev and implement: [task]"

# Quality Assurance
"Act as Auditor and verify: [what to verify]"

# Deployment
"Act as Director and deploy: [what to deploy]"
```

---

## 🔨 Common PowerShell Commands

### Build
```powershell
# Full build
npm run build

# Backend only
npm run build:backend

# Frontend only
npm run build:frontend

# Verify output
Get-ChildItem dist/ | Select-Object Name, Length
```

### Deploy
```powershell
# Check deployments
clasp deployments

# Push code
clasp push -f

# Deploy new version
clasp deploy --description "Description here"

# Undeploy (with quotes!)
clasp undeploy "@AKfycby..."
```

### Git
```powershell
# Status
git status

# Add all
git add .

# Commit
git commit -m "Message"

# Push
git push origin main
```

---

## ✅ Compliance Checklist

### Backend-Dev
- [ ] Windows/PowerShell syntax
- [ ] Audit logs for all operations
- [ ] Soft delete (no physical deletion)
- [ ] Build output > 1KB

### Frontend-Dev
- [ ] Base64 encoding configured
- [ ] MUI components only
- [ ] No TypeScript errors
- [ ] Dashboard loads < 1 second

### Auditor
- [ ] Visual verification screenshot
- [ ] All DOD criteria met
- [ ] No console errors
- [ ] Compliance verified

### Director
- [ ] Manifest compliant
- [ ] Auditor approved
- [ ] Deployment successful
- [ ] Git committed

---

## 🎯 Typical Workflow

```
1. Planner: Break down requirement
   ↓
2. Backend-Dev: Implement server logic
   ↓
3. Frontend-Dev: Implement UI
   ↓
4. Auditor: Verify everything
   ↓
5. Director: Deploy to production
```

---

## 📁 Key Files

```
.agent/
├── SQUAD_GUIDE.md          # Full guide (you are here)
├── workflows/
│   ├── planner.md          # Task decomposition
│   ├── backend-dev.md      # GAS/Firestore
│   ├── frontend-dev.md     # React/MUI
│   ├── auditor.md          # QA & verification
│   └── director.md         # Deployment
└── deployment-log.md       # Deployment history

PROJECT_MANIFEST.md         # System requirements
```

---

## 🛡️ Critical Constraints

### Windows/PowerShell
```powershell
# ❌ WRONG
rm -rf dist/
npm run build && clasp push
clasp undeploy AKfycby...

# ✅ CORRECT
Remove-Item -Recurse -Force dist/
npm run build; if ($?) { clasp push }
clasp undeploy "@AKfycby..."
```

### Base64 Encoding
```typescript
// Server (GAS)
const jsContent = HtmlService.createHtmlOutputFromFile('javascript').getContent();
const jsBase64 = Utilities.base64Encode(jsContent);

// Client (HTML)
const jsCode = decodeURIComponent(atob(window.__JS__));
```

### Audit Logs
```typescript
// ALWAYS log operations
await db.collection('AuditLogs').add({
  timestamp: FieldValue.serverTimestamp(),
  userId: userId,
  action: 'UPDATE',
  collection: 'Customers',
  documentId: id,
  before: beforeData,
  after: afterData
});
```

### Soft Delete
```typescript
// ❌ NEVER
await db.collection('Customers').doc(id).delete();

// ✅ ALWAYS
await db.collection('Customers').doc(id).update({
  deletedAt: FieldValue.serverTimestamp(),
  deletedBy: userId
});
```

---

## 🔧 Troubleshooting

### Build Fails
```powershell
# Clean and rebuild
Remove-Item -Recurse -Force dist/
Remove-Item -Recurse -Force node_modules/
npm install
npm run build
```

### Deployment Limit Reached
```powershell
# List deployments
clasp deployments

# Undeploy oldest 5
# (Get IDs from above command)
clasp undeploy "@ID1"
clasp undeploy "@ID2"
# ... etc
```

### TypeScript Errors
```powershell
# Check types
npm run type-check

# View errors in detail
npx tsc --noEmit
```

---

## 📞 Getting Help

```
# View a workflow
"Show me the [role] workflow"

# List workflows
"What workflows are available?"

# Understand a role
"Explain the [role] role"
```

---

## 🎉 Ready to Start!

**Choose your starting point**:
- New feature? → `/planner`
- Backend task? → `/backend-dev`
- Frontend task? → `/frontend-dev`
- Verify & deploy? → Auditor → Director

**Full guide**: See `.agent/SQUAD_GUIDE.md`
