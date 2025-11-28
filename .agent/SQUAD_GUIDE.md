# CRM V9 Squad: AI Team Orchestration Guide

## 🎯 Overview

This guide explains how to work with the **CRM V9 Squad** - a workflow-based AI team system that simulates specialized agents for your project.

While Antigravity doesn't support true multi-agent coordination, this system provides **role-based workflows** that guide the AI to act as different specialists based on the task at hand.

---

## 👥 Squad Members

### 🧠 Planner (The Context Architect)
**Workflow**: `.agent/workflows/planner.md`

**When to invoke**:
- Starting a new feature
- Breaking down complex requirements
- Optimizing task execution strategy

**How to invoke**:
```
"Act as Planner and decompose this requirement: [your requirement]"
```

**Example**:
```
Act as Planner and decompose this requirement:
"Add a customer relationship visualization feature to the dashboard"
```

---

### 🔨 Backend-Dev (GAS/Firestore Specialist)
**Workflow**: `.agent/workflows/backend-dev.md`

**When to invoke**:
- GAS server-side logic
- Firestore database operations
- Audit log implementation
- Webpack backend configuration

**How to invoke**:
```
"Act as Backend-Dev and implement: [your requirement]"
```

**Example**:
```
Act as Backend-Dev and implement:
"Create a Firestore function to fetch customer relationships with audit logging"
```

**Critical Constraints**:
- ✅ Windows/PowerShell syntax only
- ✅ Base64 encoding for JS/CSS
- ✅ Audit logs for all data operations
- ✅ Soft delete only (no physical deletion)

---

### 🎨 Frontend-Dev (React/MUI Specialist)
**Workflow**: `.agent/workflows/frontend-dev.md`

**When to invoke**:
- React component development
- Material UI implementation
- Frontend Webpack configuration
- UX/UI improvements

**How to invoke**:
```
"Act as Frontend-Dev and implement: [your requirement]"
```

**Example**:
```
Act as Frontend-Dev and implement:
"Create a D3.js relationship graph component with MUI styling"
```

**Critical Constraints**:
- ✅ Base64 encoding MANDATORY
- ✅ MUI components only (no plain HTML)
- ✅ Zero-friction UX design
- ✅ < 1 second dashboard load time

---

### ⚖️ Auditor (The Strict Judge)
**Workflow**: `.agent/workflows/auditor.md`

**When to invoke**:
- After code implementation
- Before deployment
- Quality assurance checks
- Compliance verification

**How to invoke**:
```
"Act as Auditor and verify: [what to verify]"
```

**Example**:
```
Act as Auditor and verify:
"The customer relationship feature is ready for deployment"
```

**Critical Requirements**:
- ✅ Visual verification (screenshot REQUIRED)
- ✅ Audit log verification
- ✅ Definition of Done (DOD) enforcement
- ✅ No approval without proof

---

### 🎩 Director (The User Proxy)
**Workflow**: `.agent/workflows/director.md`

**When to invoke**:
- Final deployment approval
- Production release
- Risk assessment
- User communication

**How to invoke**:
```
"Act as Director and deploy: [what to deploy]"
```

**Example**:
```
Act as Director and deploy:
"The verified customer relationship feature to production"
```

**Auto-Approval Criteria**:
- ✅ Manifest compliant
- ✅ Auditor approved
- ✅ No breaking changes
- ✅ Deployment limit OK

---

## 🔄 Typical Workflow

### Example: Adding a New Feature

#### Step 1: Planning
```
Act as Planner and decompose this requirement:
"Add a kanban-style deal pipeline with drag-and-drop"
```

**Expected Output**:
- Task breakdown
- Component identification
- Risk assessment
- Agent assignments

---

#### Step 2: Backend Implementation
```
Act as Backend-Dev and implement:
"Firestore functions for deal pipeline CRUD operations with audit logging"
```

**Expected Output**:
- GAS functions created
- Audit logs implemented
- Soft delete enforced
- Build verified

---

#### Step 3: Frontend Implementation
```
Act as Frontend-Dev and implement:
"React kanban component with MUI and drag-and-drop using react-beautiful-dnd"
```

**Expected Output**:
- React component created
- MUI styling applied
- Base64 encoding configured
- Build verified

---

#### Step 4: Quality Assurance
```
Act as Auditor and verify:
"The deal pipeline feature is complete and ready for deployment"
```

**Expected Output**:
- Code audit completed
- Visual verification screenshot
- Compliance checks passed
- DOD criteria met

---

#### Step 5: Deployment
```
Act as Director and deploy:
"The verified deal pipeline feature to production"
```

**Expected Output**:
- Deployment executed
- URL provided
- Screenshot captured
- Git commit created

---

## 🎯 Quick Commands

### Start a New Feature
```
/planner [feature description]
```

### Backend Work
```
/backend-dev [backend task]
```

### Frontend Work
```
/frontend-dev [frontend task]
```

### Verify & Deploy
```
Act as Auditor and verify the latest changes, then act as Director and deploy if approved
```

---

## 📋 Role-Switching Syntax

### Explicit Role Assignment
```
Act as [Role] and [action]:
[detailed requirement]
```

### Multi-Role Workflow
```
1. Act as Planner and break down: [requirement]
2. Act as Backend-Dev and implement the backend tasks
3. Act as Frontend-Dev and implement the frontend tasks
4. Act as Auditor and verify everything
5. Act as Director and deploy
```

### Autonomous Mode
```
Complete this feature autonomously using the Squad workflows:
[feature description]

Follow the full workflow: Planner → Backend-Dev → Frontend-Dev → Auditor → Director
```

---

## 🛡️ Compliance Enforcement

### Mandatory Checks (Every Deployment)

#### Backend-Dev Must Verify:
- [ ] Windows/PowerShell syntax
- [ ] Audit logs implemented
- [ ] Soft delete used
- [ ] Build output > 1KB

#### Frontend-Dev Must Verify:
- [ ] Base64 encoding configured
- [ ] MUI components used
- [ ] No TypeScript errors
- [ ] Build output > 1KB

#### Auditor Must Verify:
- [ ] Visual verification screenshot
- [ ] All DOD criteria met
- [ ] Compliance checks passed
- [ ] No rejection criteria

#### Director Must Verify:
- [ ] Manifest compliance
- [ ] Auditor approval
- [ ] Deployment limit OK
- [ ] Git commit created

---

## 📁 File Structure

```
V9/
├── .agent/
│   ├── workflows/
│   │   ├── planner.md          # Task decomposition
│   │   ├── backend-dev.md      # GAS/Firestore specialist
│   │   ├── frontend-dev.md     # React/MUI specialist
│   │   ├── auditor.md          # QA & verification
│   │   └── director.md         # Deployment & approval
│   ├── deployment-log.md       # Deployment history
│   └── deployments/            # Verification screenshots
├── PROJECT_MANIFEST.md         # System requirements
└── [your code files]
```

---

## 🚀 Getting Started

### 1. Read the Manifest
```
Review PROJECT_MANIFEST.md to understand the system requirements
```

### 2. Choose Your Workflow
- New feature? → Start with **Planner**
- Backend task? → Use **Backend-Dev**
- Frontend task? → Use **Frontend-Dev**
- Verification? → Use **Auditor**
- Deployment? → Use **Director**

### 3. Invoke the Role
```
Act as [Role] and [action]: [requirement]
```

### 4. Follow the Workflow
Each workflow file contains:
- Role definition
- Critical constraints
- Step-by-step procedures
- Checklists
- Examples

---

## 💡 Tips for Effective Squad Usage

### 1. Be Specific
❌ "Fix the frontend"
✅ "Act as Frontend-Dev and fix the Base64 decoding error in index.html"

### 2. Use Workflows as Reference
Each workflow contains:
- Best practices
- Common patterns
- Checklists
- Examples

### 3. Chain Roles for Complex Tasks
```
Act as Planner and break down this feature: [feature]
Then act as Backend-Dev and implement the backend tasks
Then act as Frontend-Dev and implement the frontend tasks
Then act as Auditor and verify
Finally act as Director and deploy
```

### 4. Trust the Protocols
The workflows encode PROJECT_MANIFEST.md requirements:
- Windows/PowerShell constraints
- Base64 encoding
- Audit logging
- Visual verification

---

## 🔧 Troubleshooting

### "I forgot which role to use"
**Solution**: Start with Planner to get task breakdown and role assignments

### "The AI isn't following the workflow"
**Solution**: Explicitly reference the workflow file:
```
Follow the Backend-Dev workflow in .agent/workflows/backend-dev.md
and implement: [task]
```

### "I need to override a workflow step"
**Solution**: Be explicit:
```
Act as Backend-Dev but skip the deployment limit check
and implement: [task]
```

---

## 📊 Success Metrics

### Squad is Working Well When:
- ✅ Tasks are completed following manifest requirements
- ✅ Deployments include visual verification
- ✅ Audit logs are always implemented
- ✅ No Windows/PowerShell syntax errors
- ✅ Base64 encoding is always used
- ✅ Git commits are created after deployment

### Squad Needs Adjustment When:
- ❌ Manifest requirements are violated
- ❌ Deployments fail repeatedly
- ❌ Workflows are ignored
- ❌ No visual verification provided

---

## 🎓 Advanced Usage

### Create Custom Workflows
Add new workflow files to `.agent/workflows/`:

```markdown
---
description: Your workflow description
---

# Your Workflow Name

## Role Definition
[Define the role]

## Workflow Steps
[Define the steps]
```

### Extend Existing Workflows
Edit workflow files to add:
- New checklists
- New patterns
- New examples
- Lessons learned

---

## 📞 Getting Help

### View a Workflow
```
Show me the Backend-Dev workflow
```

### List All Workflows
```
What workflows are available?
```

### Understand a Role
```
Explain the Auditor role and when to use it
```

---

## 🎉 You're Ready!

The CRM V9 Squad is now set up and ready to use.

**Next Steps**:
1. Review PROJECT_MANIFEST.md
2. Choose a task to work on
3. Invoke the appropriate role
4. Follow the workflow
5. Verify and deploy

**Remember**: The Squad workflows are your guide to building enterprise-grade software with AI assistance.

Happy coding! 🚀
