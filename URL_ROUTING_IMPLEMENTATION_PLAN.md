# V9 URL Routing Implementation Plan
## Phase: Deep-Linking Architecture for GAS Application

---

## 📋 Executive Summary

This plan implements **unique URLs for each page and record detail view** in CRM V9, enabling:

- Direct access to customer details via shareable URLs (e.g., `?view=customer_detail&id=CUST-1001`)
- Back/forward browser navigation support
- Bookmarkable pages
- Improved UX with persistent URL state

**Architecture Pattern**: Hybrid Query Parameter + React Router Integration (inspired by V10 Address Lookup Demo)

---

## 🎯 User Requirements

**Original Request**:
> 開発中のシステムで、それぞれのページに固有のURLを振ることはできませんか？それぞれのレコードの詳細ページやメニュー画面などに固有のURLを持たせるとしたらどのような設計に変えるべきでしょうか？

**Target URLs**:
- Dashboard: `https://.../exec` or `https://.../exec#/dashboard`
- Customer List: `https://.../exec#/customers`
- Customer Detail: `https://.../exec?view=customer_detail&id=CUST-001#/customers/CUST-001`
- Share Link: Copy button generates shareable URL

---

## 🏗️ Current Architecture Analysis

### Backend (GAS - main.ts)

**Current doGet() Implementation**:
```typescript
function doGet(e: GoogleAppsScript.Events.DoGet) {
  // Only handles API path routing, not initial state injection
  const path = e.parameter && e.parameter.path;

  if (path === 'api/customers') {
    return handleApiGetCustomers(e);
  }

  // Default: Serve index.html
  var template = HtmlService.createTemplateFromFile('index');
  return template.evaluate()
    .setTitle('CRM V9 - RECOVERY SUCCESS')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
```

**Issue**: No initial route state injection for deep-linking.

---

### Frontend (React Router)

**Current App.tsx**:
```typescript
<HashRouter>
  <Routes>
    <Route path="/" element={<AppLayout />}>
      <Route index element={<Navigate to="/dashboard" replace />} />
      <Route path="dashboard" element={<Dashboard />} />
      <Route path="customers" element={<Customers />} />
      {/* Missing: /customers/:id route */}
    </Route>
  </Routes>
</HashRouter>
```

**Current Customer Detail UI**: Uses `<Drawer>` component (CustomerDrawer.tsx)
- Opens on row click
- Not routable (no dedicated URL)
- Cannot be shared or bookmarked

---

### Customer API

**Available Backend Methods**:
- ✅ `getCustomer(id: string)` - Line 46 in customer_service.ts
- ✅ `api_getCustomers()` - Exposed in main.ts
- ⚠️ **Missing**: `api_getCustomerById(id: string)` - Needs implementation

---

## 🚀 Implementation Plan

### Phase 1: Backend - Initial State Injection

**File**: `V9/src/main.ts`

**Changes**:

1. **Parse Query Parameters in doGet()**:
```typescript
function doGet(e: GoogleAppsScript.Events.DoGet) {
  try {
    // API path routing (existing)
    const path = e.parameter && e.parameter.path;
    if (path === 'api/customers') {
      return handleApiGetCustomers(e);
    }

    // ✨ NEW: Parse deep-linking query parameters
    const view = e.parameter && e.parameter.view;
    const id = e.parameter && e.parameter.id;

    // Create initial state object
    const initialState = {
      view: view || null,
      id: id || null,
      timestamp: new Date().toISOString()
    };

    // Serve index.html with initial state
    var template = HtmlService.createTemplateFromFile('index');
    template.initialState = JSON.stringify(initialState);  // ✨ NEW

    return template.evaluate()
      .setTitle('CRM V9 - RECOVERY SUCCESS')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (error: any) {
    Logger.log('Error in doGet: ' + error.message);
    return HtmlService.createHtmlOutput(
      '<h1>Error in doGet</h1><p>' + error.message + '</p>'
    );
  }
}
```

2. **Add api_getCustomerById() Function**:
```typescript
/**
 * Get single customer by ID (for deep-linking)
 */
function api_getCustomerById(id: string) {
  try {
    const customerService = new CustomerService();
    const customer = customerService.getCustomer(id);

    if (!customer) {
      return JSON.stringify({
        status: 'error',
        message: `Customer not found: ${id}`,
        data: null
      });
    }

    return JSON.stringify({
      status: 'success',
      data: customer
    });
  } catch (error: any) {
    Logger.log('Error fetching customer: ' + error.message);
    return JSON.stringify({
      status: 'error',
      message: error.message,
      data: null
    });
  }
}
```

---

### Phase 2: Template - Inject Initial State

**File**: `V9/dist/index.html`

**Changes**:

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <base target="_top">
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CRM V9</title>
  <?!= include('stylesheet'); ?>

  <!-- ✨ NEW: Inject initial state from server -->
  <script>
    window.CRM_INITIAL_STATE = <?!= initialState ?>;
  </script>
</head>
<body>
  <div id="root"></div>
  <?!= include('javascript'); ?>
</body>
</html>
```

**Result**: `window.CRM_INITIAL_STATE` will contain:
```javascript
{
  "view": "customer_detail",
  "id": "CUST-001",
  "timestamp": "2025-12-02T10:30:00.000Z"
}
```

---

### Phase 3: Frontend - Deep Link Handler

**New File**: `V9/frontend/src/components/Router/DeepLinkHandler.tsx`

```typescript
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Component to handle server-side deep-linking parameters
 * Reads window.CRM_INITIAL_STATE and navigates to the appropriate route
 */
export const DeepLinkHandler: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if initial state exists
    const initialState = (window as any).CRM_INITIAL_STATE;

    if (!initialState) {
      console.log('[DeepLinkHandler] No initial state found');
      return;
    }

    console.log('[DeepLinkHandler] Initial state:', initialState);

    // Route based on view parameter
    if (initialState.view === 'customer_detail' && initialState.id) {
      console.log(`[DeepLinkHandler] Navigating to /customers/${initialState.id}`);
      navigate(`/customers/${initialState.id}`, { replace: true });
    } else if (initialState.view === 'customers') {
      navigate('/customers', { replace: true });
    }

    // Clear initial state after consumption
    delete (window as any).CRM_INITIAL_STATE;
  }, [navigate]);

  return null; // This component doesn't render anything
};
```

**Global Type Declaration** (add to `V9/frontend/src/vite-env.d.ts`):
```typescript
interface Window {
  CRM_INITIAL_STATE?: {
    view: string | null;
    id: string | null;
    timestamp: string;
  };
}
```

---

### Phase 4: Frontend - Customer Detail Page

**New File**: `V9/frontend/src/pages/CustomerDetail.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Button,
  CircularProgress,
  Alert,
  Grid,
  Chip,
  Divider,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Share as ShareIcon,
} from '@mui/icons-material';
import { Customer } from '../lib/api';
import { callGAS } from '../lib/api';
import { CustomerForm } from '../components/Customer/CustomerForm';

export const CustomerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);

  // Load customer data
  useEffect(() => {
    if (!id) {
      setError('Customer ID is missing');
      setLoading(false);
      return;
    }

    loadCustomer(id);
  }, [id]);

  const loadCustomer = async (customerId: string) => {
    try {
      setLoading(true);
      setError(null);

      const data = await callGAS<Customer>('api_getCustomerById', customerId);
      setCustomer(data);
    } catch (err: any) {
      console.error('Failed to load customer:', err);
      setError(err.message || 'Failed to load customer');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (data: any) => {
    // TODO: Implement update via callGAS('api_updateCustomer', id, data)
    console.log('Update customer:', data);
    setEditMode(false);
  };

  const handleDelete = async () => {
    // TODO: Implement delete via callGAS('api_deleteCustomer', id)
    console.log('Delete customer');
  };

  const handleShare = () => {
    const url = `${window.location.origin}${window.location.pathname}?view=customer_detail&id=${id}`;
    navigator.clipboard.writeText(url);
    alert('URLをクリップボードにコピーしました！');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Button onClick={() => navigate('/customers')} sx={{ mt: 2 }}>
          顧客一覧に戻る
        </Button>
      </Box>
    );
  }

  if (!customer) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">Customer not found</Alert>
        <Button onClick={() => navigate('/customers')} sx={{ mt: 2 }}>
          顧客一覧に戻る
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={() => navigate('/customers')}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              顧客詳細
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              startIcon={<ShareIcon />}
              onClick={handleShare}
              variant="outlined"
            >
              共有
            </Button>
            <Button
              startIcon={<EditIcon />}
              onClick={() => setEditMode(true)}
            >
              編集
            </Button>
            <Button
              startIcon={<DeleteIcon />}
              color="error"
              onClick={handleDelete}
            >
              削除
            </Button>
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Customer Details */}
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary">
              基本情報
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="text.secondary">
              名前
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              {customer.name}
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="text.secondary">
              フリガナ
            </Typography>
            <Typography variant="body1">
              {customer.nameKana}
            </Typography>
          </Grid>

          {customer.gender && (
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                性別
              </Typography>
              <Chip
                label={
                  customer.gender === 'male' ? '男性' :
                  customer.gender === 'female' ? '女性' : 'その他'
                }
                size="small"
              />
            </Grid>
          )}

          {/* Contact Information */}
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" color="text.secondary">
              連絡先
            </Typography>
          </Grid>

          {customer.phone && (
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                電話番号
              </Typography>
              <Typography variant="body1">
                {customer.phone}
              </Typography>
            </Grid>
          )}

          {customer.email && (
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                メールアドレス
              </Typography>
              <Typography variant="body1">
                {customer.email}
              </Typography>
            </Grid>
          )}

          {/* Address */}
          {customer.address && (
            <>
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" color="text.secondary">
                  住所
                </Typography>
              </Grid>

              {customer.address.postalCode && (
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    郵便番号
                  </Typography>
                  <Typography variant="body1">
                    {customer.address.postalCode}
                  </Typography>
                </Grid>
              )}

              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">
                  住所
                </Typography>
                <Typography variant="body1">
                  {customer.address.prefecture}
                  {customer.address.city}
                  {customer.address.town}
                  {customer.address.building && <><br />{customer.address.building}</>}
                </Typography>
              </Grid>
            </>
          )}
        </Grid>
      </Paper>

      {/* Edit Dialog */}
      {editMode && (
        <CustomerForm
          open={editMode}
          onClose={() => setEditMode(false)}
          onSubmit={handleUpdate}
          initialData={customer}
          mode="edit"
        />
      )}
    </Box>
  );
};
```

---

### Phase 5: Frontend - Update App Routing

**File**: `V9/frontend/src/App.tsx`

```typescript
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './theme';
import { AppLayout } from './components/Layout/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { Customers } from './pages/Customers';
import { CustomerDetail } from './pages/CustomerDetail';  // ✨ NEW
import { DeepLinkHandler } from './components/Router/DeepLinkHandler';  // ✨ NEW

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <HashRouter>
        <DeepLinkHandler />  {/* ✨ NEW: Handle server-side deep-linking */}
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="customers" element={<Customers />} />
            <Route path="customers/:id" element={<CustomerDetail />} />  {/* ✨ NEW */}
          </Route>
        </Routes>
      </HashRouter>
    </ThemeProvider>
  );
}
```

---

### Phase 6: Frontend - Update Customers Page

**File**: `V9/frontend/src/pages/Customers.tsx`

**Changes**:

Replace Drawer navigation with React Router navigation:

```typescript
import { useNavigate } from 'react-router-dom';  // ✨ ADD

export const Customers: React.FC = () => {
  const navigate = useNavigate();  // ✨ ADD
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);  // Keep drawer for compatibility

  // Handle row click - navigate to detail page
  const handleRowClick = (params: GridRowParams) => {
    const customerId = params.row.id;
    navigate(`/customers/${customerId}`);  // ✨ CHANGE: Navigate instead of opening drawer
  };

  // Rest of the component remains the same...
};
```

**Optional**: Keep drawer as fallback or remove entirely.

---

## 📊 URL Patterns Summary

| View | URL Pattern | Example |
|------|------------|---------|
| Dashboard | `exec#/dashboard` | `https://.../exec#/dashboard` |
| Customer List | `exec#/customers` | `https://.../exec#/customers` |
| Customer Detail (Client-side) | `exec#/customers/:id` | `https://.../exec#/customers/CUST-001` |
| Customer Detail (Deep-link) | `exec?view=customer_detail&id=:id#/customers/:id` | `https://.../exec?view=customer_detail&id=CUST-001#/customers/CUST-001` |

**Key Points**:
- **Hash routing (`#/`)** is used for client-side navigation (optimal for GAS iframe)
- **Query parameters (`?view=...&id=...`)** are used for server-side deep-linking (initial page load)
- DeepLinkHandler bridges the gap by reading query params and navigating to hash routes

---

## ✅ Testing Checklist

### Backend Testing
- [ ] `doGet()` with no parameters → serves index.html
- [ ] `doGet(e)` with `?view=customer_detail&id=CUST-001` → injects correct initialState
- [ ] `api_getCustomerById('CUST-001')` → returns customer JSON
- [ ] `api_getCustomerById('INVALID')` → returns error JSON

### Frontend Testing
- [ ] Initial load: Dashboard shows
- [ ] Navigate to `/customers` → Customer list shows
- [ ] Click customer row → Navigates to `/customers/:id`
- [ ] Customer detail page loads correct data
- [ ] Back button works (returns to `/customers`)
- [ ] Share button copies correct URL
- [ ] Paste shared URL in new tab → Opens correct customer detail

### Deep-Link Testing
- [ ] `?view=customer_detail&id=CUST-001` → Opens customer detail directly
- [ ] Invalid customer ID → Shows error + back button
- [ ] `window.CRM_INITIAL_STATE` is cleared after consumption

---

## 🚧 Implementation Order

1. **Phase 1**: Backend - doGet() modification + api_getCustomerById()
2. **Phase 2**: Template - index.html script injection
3. **Phase 3**: Frontend - DeepLinkHandler component
4. **Phase 4**: Frontend - CustomerDetail page
5. **Phase 5**: Frontend - App routing update
6. **Phase 6**: Frontend - Customers page navigation update
7. **Testing**: Full E2E testing
8. **Build & Deploy**: `npm run build` → `clasp push` → `clasp deploy`

---

## 📝 Migration Notes

### Backward Compatibility
- ✅ Existing URLs (`exec#/customers`) continue to work
- ✅ Drawer UI can be kept as fallback or removed
- ✅ No breaking changes to API

### Performance Considerations
- Initial page load: +1 API call (`api_getCustomerById`) only for deep-links
- Client-side navigation: No performance impact (uses existing React Router)

### Future Enhancements
- Add deep-linking for other entities (deals, temples, etc.)
- Implement URL state for filters/search queries
- Add analytics tracking for shared URLs

---

## 🔗 Reference Documentation

- V10 Address Lookup Demo Pattern: `?demo=address`
- React Router v7.9.6 Documentation
- GAS Template Service: `<?!= ... ?>`
- HashRouter in iframe environments

---

## 🎯 Success Metrics

- ✅ All pages have unique, shareable URLs
- ✅ Browser back/forward buttons work correctly
- ✅ URLs can be bookmarked and shared
- ✅ Direct access to customer details via URL works
- ✅ No regressions in existing functionality

---

**Plan Status**: Ready for User Approval
**Estimated Complexity**: Medium (6 files to modify, 3 new files)
**Risk Level**: Low (backward compatible, incremental implementation)
