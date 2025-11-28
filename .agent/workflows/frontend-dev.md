---
description: React and Material UI frontend development workflow
---

# 🎨 Frontend-Dev Workflow (React/MUI Specialist)

## Role Definition
**Mission**: Implement user interfaces with React and Material UI, ensuring GAS compatibility through Base64 encoding.

**Core Competencies**:
- React 18+ development
- Material UI (MUI) component library
- Webpack configuration (frontend)
- Base64 encoding strategy
- Zero-friction UX design

---

## Critical Constraints (MUST FOLLOW)

### Base64 Encoding (MANDATORY)
**All JavaScript and CSS must be Base64 encoded for GAS compatibility.**

#### Client-Side Decoding Pattern
```html
<!-- index.html -->
<div id="root"></div>
<script>
  // Decode Base64 JS from server
  const jsBase64 = window.__JS__;
  const jsCode = decodeURIComponent(atob(jsBase64));
  
  // Inject as script
  const script = document.createElement('script');
  script.textContent = jsCode;
  document.head.appendChild(script);
  
  // Same for CSS
  const cssBase64 = window.__CSS__;
  const cssCode = decodeURIComponent(atob(cssBase64));
  
  const style = document.createElement('style');
  style.textContent = cssCode;
  document.head.appendChild(style);
</script>
```

### MUI Usage (REQUIRED)
**All UI components must use Material UI**:
```tsx
// ❌ AVOID: Plain HTML
<button onClick={handleClick}>Click me</button>

// ✅ USE: MUI Components
import { Button } from '@mui/material';
<Button variant="contained" onClick={handleClick}>Click me</Button>
```

---

## Workflow Steps

### 1. Environment Check
// turbo
```powershell
# Verify frontend dependencies
npm list react react-dom @mui/material @emotion/react @emotion/styled
```

### 2. Component Development

#### A. Zero-Friction Input Components
**Follow manifest principle: "No Typing"**
```tsx
import { Autocomplete, TextField } from '@mui/material';

function CustomerSelector({ onSelect }: Props) {
  const [customers, setCustomers] = useState([]);
  
  useEffect(() => {
    // Load customer list
    fetchCustomers().then(setCustomers);
  }, []);
  
  return (
    <Autocomplete
      options={customers}
      getOptionLabel={(option) => option.name}
      renderInput={(params) => (
        <TextField {...params} label="顧客を選択" />
      )}
      onChange={(_, value) => onSelect(value)}
    />
  );
}
```

#### B. Real-time Dashboard Components
**Executive Dashboard Pattern**:
```tsx
import { Card, CardContent, Typography, Grid } from '@mui/material';

function ExecutiveDashboard() {
  const [kpis, setKpis] = useState(null);
  
  useEffect(() => {
    // Must load in < 1 second (manifest requirement)
    fetchKPIs().then(setKpis);
  }, []);
  
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6">売上予実</Typography>
            <Typography variant="h3">{kpis?.revenue}</Typography>
          </CardContent>
        </Card>
      </Grid>
      {/* More KPI cards */}
    </Grid>
  );
}
```

#### C. Relationship Visualization
**Use D3.js or similar for network graphs**:
```tsx
import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

function RelationshipGraph({ customerId }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  
  useEffect(() => {
    if (!svgRef.current) return;
    
    // Fetch relationship data
    fetchRelationships(customerId).then(data => {
      // Render D3 force-directed graph
      const svg = d3.select(svgRef.current);
      // ... D3 visualization logic
    });
  }, [customerId]);
  
  return <svg ref={svgRef} width="100%" height="600px" />;
}
```

### 3. Webpack Configuration

#### Frontend Build Setup
**File**: `frontend/webpack.config.cjs`
```javascript
module.exports = {
  entry: './src/main.tsx',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, '../dist')
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './index.html',
      filename: 'index.html'
    }),
    // Custom plugin to separate JS/CSS for Base64 encoding
    new GasHtmlSeparatorPlugin()
  ]
};
```

#### GAS HTML Separator Plugin
**File**: `frontend/gas-html-separator-plugin.cjs`
```javascript
class GasHtmlSeparatorPlugin {
  apply(compiler) {
    compiler.hooks.emit.tapAsync('GasHtmlSeparatorPlugin', (compilation, callback) => {
      const htmlAsset = compilation.assets['index.html'];
      const htmlContent = htmlAsset.source();
      
      // Extract inline JS
      const jsMatch = htmlContent.match(/<script>(.*?)<\/script>/s);
      if (jsMatch) {
        compilation.assets['javascript.html'] = {
          source: () => `<script>${jsMatch[1]}</script>`,
          size: () => jsMatch[1].length
        };
      }
      
      // Extract inline CSS
      const cssMatch = htmlContent.match(/<style>(.*?)<\/style>/s);
      if (cssMatch) {
        compilation.assets['stylesheet.html'] = {
          source: () => `<style>${cssMatch[1]}</style>`,
          size: () => cssMatch[1].length
        };
      }
      
      callback();
    });
  }
}
```

### 4. Build Process
// turbo
```powershell
# Frontend build
npm run build:frontend

# Verify output
Get-ChildItem dist/ | Where-Object { $_.Name -match "\.html$" }

# Check file sizes
Get-ChildItem dist/*.html | ForEach-Object {
  Write-Host "$($_.Name): $($_.Length) bytes"
}
```

### 5. Local Testing (Optional)
```powershell
# Run dev server
npm run dev

# Open browser to http://localhost:3000
```

---

## UX Design Principles

### 1. Zero-Friction Entry
- Use `Autocomplete` instead of text input
- Provide smart defaults
- Minimize required fields

### 2. Visual Hierarchy
```tsx
// Primary action: Prominent
<Button variant="contained" color="primary">保存</Button>

// Secondary action: Subtle
<Button variant="outlined">キャンセル</Button>

// Destructive action: Warning color
<Button variant="contained" color="error">削除</Button>
```

### 3. Loading States
```tsx
import { CircularProgress, Backdrop } from '@mui/material';

function LoadingOverlay({ open }: Props) {
  return (
    <Backdrop open={open} sx={{ zIndex: 9999 }}>
      <CircularProgress />
    </Backdrop>
  );
}
```

### 4. Error Handling
```tsx
import { Snackbar, Alert } from '@mui/material';

function ErrorNotification({ error, onClose }: Props) {
  return (
    <Snackbar open={!!error} autoHideDuration={6000} onClose={onClose}>
      <Alert severity="error" onClose={onClose}>
        {error?.message}
      </Alert>
    </Snackbar>
  );
}
```

---

## Integration with Backend

### API Client Pattern
**File**: `frontend/src/lib/api.ts`
```typescript
const API_BASE = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';

export async function fetchCustomers() {
  const response = await fetch(`${API_BASE}?action=getCustomers`);
  if (!response.ok) throw new Error('Failed to fetch customers');
  return response.json();
}

export async function updateCustomer(id: string, data: any) {
  const response = await fetch(API_BASE, {
    method: 'POST',
    body: JSON.stringify({ action: 'updateCustomer', id, data })
  });
  if (!response.ok) throw new Error('Failed to update customer');
  return response.json();
}
```

---

## Self-Code Review Checklist
- [ ] All components use MUI (no plain HTML)
- [ ] Base64 encoding strategy is implemented
- [ ] Loading states are shown during async operations
- [ ] Error handling is implemented
- [ ] Responsive design works on mobile
- [ ] No TypeScript errors (`npm run type-check`)

---

## Handoff to Auditor
**After frontend completion**:
- Provide list of implemented components
- Share screenshots of key UI states
- Document any known visual issues
- Request visual verification in deployed environment
