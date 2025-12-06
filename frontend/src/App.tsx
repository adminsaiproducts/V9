import React, { useMemo } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './theme';
import { AppLayout } from './components/Layout/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { Customers } from './pages/Customers';
import { CustomerDetail } from './pages/CustomerDetail';
import { CustomerDataProvider } from './contexts/CustomerDataContext';
import { BreadcrumbProvider } from './contexts/BreadcrumbContext';

// CRM_INITIAL_STATE型定義
interface CRMInitialState {
  view?: string | null;
  id?: string | null;
  q?: string | null;
  deploymentUrl?: string;
  timestamp?: string;
}

declare global {
  interface Window {
    CRM_INITIAL_STATE?: CRMInitialState;
  }
}

/**
 * 初期状態から初期ルートを決定する
 * GASのクエリパラメータに基づいて適切なルートにリダイレクト
 */
function getInitialRoute(): string {
  const initialState = window.CRM_INITIAL_STATE;

  if (!initialState || !initialState.view) {
    return '/dashboard';
  }

  console.log('[App] Initial state for routing:', initialState);

  if (initialState.view === 'customer_detail' && initialState.id) {
    // 顧客詳細: /customers/M0024
    return `/customers/${initialState.id}`;
  } else if (initialState.view === 'customers') {
    // 顧客一覧
    const searchQuery = initialState.q || '';
    return searchQuery ? `/customers?q=${encodeURIComponent(searchQuery)}` : '/customers';
  } else if (initialState.view === 'dashboard') {
    return '/dashboard';
  }

  return '/dashboard';
}

export default function App() {
  // 初期ルートを一度だけ計算（アプリ起動時）
  const initialRoute = useMemo(() => {
    const route = getInitialRoute();
    console.log('[App] Initial route:', route);

    // deploymentUrl以外の初期状態をクリア（ルーティング完了後）
    const initialState = window.CRM_INITIAL_STATE;
    if (initialState) {
      const deploymentUrl = initialState.deploymentUrl;
      // viewやidをクリア（二重ナビゲーション防止）
      if (deploymentUrl) {
        window.CRM_INITIAL_STATE = { deploymentUrl };
      } else {
        delete window.CRM_INITIAL_STATE;
      }
    }

    return route;
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <CustomerDataProvider>
        <BreadcrumbProvider>
          <HashRouter>
            <Routes>
              <Route path="/" element={<AppLayout />}>
                <Route index element={<Navigate to={initialRoute} replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="customers" element={<Customers />} />
                <Route path="customers/:id" element={<CustomerDetail />} />
              </Route>
            </Routes>
          </HashRouter>
        </BreadcrumbProvider>
      </CustomerDataProvider>
    </ThemeProvider>
  );
}
