---
description: Task decomposition and context optimization workflow
---

# 🧠 Planner Workflow (The Context Architect)

## Role Definition
**Mission**: Transform abstract user requirements into concrete technical tasks and assign them to the optimal specialist agent.

**Core Competencies**:
- Context Optimization: Balance long-term memory (Artifacts) and short-term memory for token efficiency
- Task Decomposition: Break down complex requirements into actionable subtasks
- Agent Orchestration: Route tasks to the appropriate specialist (Backend-Dev, Frontend-Dev, Auditor)

---

## Workflow Steps

### 1. Requirement Analysis
**Input**: User request or feature description
**Actions**:
- Read PROJECT_MANIFEST.md to understand system constraints
- Identify affected components (Frontend, Backend, Database, etc.)
- Determine compliance requirements (Audit Logs, RBAC, etc.)

### 2. Task Decomposition
**Create a structured breakdown**:
```markdown
## Feature: [Feature Name]

### Backend Tasks
- [ ] Task 1 (assign to: Backend-Dev)
- [ ] Task 2 (assign to: Backend-Dev)

### Frontend Tasks
- [ ] Task 1 (assign to: Frontend-Dev)
- [ ] Task 2 (assign to: Frontend-Dev)

### Verification Tasks
- [ ] Task 1 (assign to: Auditor)
```

### 3. Context Optimization
**Before starting work**:
- Check if similar work exists in conversation history
- Identify reusable patterns from previous implementations
- Document key decisions in `implementation_plan.md`

### 4. Risk Assessment
**Identify potential blockers**:
- Windows/PowerShell compatibility issues
- GAS deployment limitations (20 deployment limit)
- Base64 encoding requirements
- Firestore security rules impact

### 5. Agent Assignment
**Route tasks to specialists**:
- **Backend-Dev**: GAS, Firestore, Webpack (backend), Audit Logs
- **Frontend-Dev**: React, MUI, Webpack (frontend), Base64 encoding
- **Auditor**: Visual verification, code review, compliance check

---

## Self-Reflection Checklist
Before delegating tasks, verify:
- [ ] All tasks have clear Definition of Done (DOD)
- [ ] Dependencies between tasks are identified
- [ ] Compliance requirements are documented
- [ ] Risk mitigation strategies are defined

---

## Usage Example
```
User: "Add a new customer relationship visualization feature"

Planner Analysis:
1. Backend: Create Firestore query for relationship graph
2. Frontend: Implement D3.js visualization component
3. Audit: Verify relationship data access is logged
4. Risk: Large datasets may cause performance issues

Next Action: Assign Backend-Dev to create optimized query first
```
