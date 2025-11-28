import React, { useEffect, useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { DataGrid, GridColDef, GridPaginationModel, GridSortModel } from '@mui/x-data-grid';
import { Box, Typography, Paper } from '@mui/material';
import './index.css';

interface Customer {
  id: string;
  name: string;
  nameKana: string;
  address: string;
  phone: string;
  email: string;
}

interface ApiResponse {
  status: string;
  data: Customer[];
  total: number;
  page: number;
  pageSize: number;
}

const columns: GridColDef[] = [
  { field: 'id', headerName: 'ID', width: 200 },
  { field: 'name', headerName: '名前', width: 200 },
  { field: 'nameKana', headerName: 'カナ', width: 200 },
  { field: 'address', headerName: '住所', width: 300 },
  { field: 'phone', headerName: '電話', width: 150 },
  { field: 'email', headerName: 'メール', width: 250 },
];

// GAS API Wrapper
const runGasApi = (functionName: string, ...args: any[]): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (typeof google === 'undefined' || !google.script || !google.script.run) {
      reject(new Error('GAS environment not detected'));
      return;
    }

    google.script.run
      .withSuccessHandler((result: any) => {
        try {
          // Parse JSON if result is string, otherwise use as is
          const data = typeof result === 'string' ? JSON.parse(result) : result;
          resolve(data);
        } catch (e) {
          reject(e);
        }
      })
      .withFailureHandler((error: Error) => reject(error))
    [functionName](...args);
  });
};

function App() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rowCount, setRowCount] = useState(0);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 100,
  });
  const [sortModel, setSortModel] = useState<GridSortModel>([]);

  const fetchCustomers = useCallback(async () => {
    console.log('🚀 Fetching customers...', { paginationModel, sortModel });
    setLoading(true);
    setError(null);

    try {
      const sortField = sortModel.length > 0 ? sortModel[0].field : undefined;
      const sortOrder = sortModel.length > 0 ? sortModel[0].sort : undefined;

      // Call GAS function directly using google.script.run wrapper
      // Note: We need to expose a new GAS function that accepts these parameters
      // Or update api_getCustomers to accept arguments
      const response = await runGasApi(
        'api_getCustomersPaginated',
        paginationModel.page,
        paginationModel.pageSize,
        sortField,
        sortOrder
      );

      console.log('✅ API Response:', response);

      if (response.status === 'success') {
        setCustomers(response.data);
        setRowCount(response.total);
      } else {
        setError(response.message || 'データ取得に失敗しました');
      }
    } catch (e: any) {
      console.error('❌ Fetch error:', e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [paginationModel, sortModel]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          CRM V9 - 顧客リスト
        </Typography>
        <Typography color="error">エラー: {error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        CRM V9 - 顧客リスト
      </Typography>
      <Paper sx={{ height: 700, width: '100%' }}>
        <DataGrid
          rows={customers}
          columns={columns}
          rowCount={rowCount}
          loading={loading}
          pageSizeOptions={[50, 100, 200]}
          paginationModel={paginationModel}
          paginationMode="server"
          onPaginationModelChange={setPaginationModel}
          sortingMode="server"
          sortModel={sortModel}
          onSortModelChange={setSortModel}
          disableRowSelectionOnClick
        />
      </Paper>
    </Box>
  );
}

// マウント処理
console.log('🔥 JS ENTRY POINT EXECUTED');

function mountApp() {
  console.log('🚀 Starting Mount Process...');

  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error('❌ Root element not found!');
    return;
  }

  try {
    console.log('✅ Creating React root...');
    const reactRoot = createRoot(rootElement);
    reactRoot.render(<App />);
    console.log('✅ React render called successfully');
  } catch (e: any) {
    console.error('❌ React mount error:', e);
    rootElement.innerHTML = '<div style="color:red; padding:20px;"><h3>React Mount Error</h3><p>' + e.message + '</p></div>';
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountApp);
} else {
  mountApp();
}
