import React, { useState } from 'react';
import {
    Box,
    Typography,
    Button,
    Fab,
    Snackbar,
    Alert,
} from '@mui/material';
import { DataGrid, GridColDef, GridRowParams } from '@mui/x-data-grid';
import { Add as AddIcon } from '@mui/icons-material';
import { CustomerForm } from '../components/Customer/CustomerForm';
import { CustomerDrawer } from '../components/Customer/CustomerDrawer';
import { api, Customer } from '../lib/api';

export const Customers: React.FC = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [formOpen, setFormOpen] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success',
    });

    // Load customers on mount
    React.useEffect(() => {
        loadCustomers();
    }, []);

    const loadCustomers = async () => {
        try {
            if (window.addLog) window.addLog('Customers: loadCustomers called');
            setLoading(true);
            const result = await api.searchCustomers('');
            if (window.addLog) window.addLog(`Customers: Loaded ${result.length} rows`);
            setCustomers(result);
        } catch (error) {
            if (window.addLog) window.addLog('Customers: Load failed');
            showSnackbar('顧客データの読み込みに失敗しました', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleRowClick = (params: GridRowParams) => {
        setSelectedCustomer(params.row as Customer);
        setDrawerOpen(true);
    };

    const handleCreateCustomer = async (data: any) => {
        try {
            await api.createCustomer(data);
            showSnackbar('顧客を登録しました', 'success');
            loadCustomers();
        } catch (error) {
            showSnackbar('顧客の登録に失敗しました', 'error');
            throw error;
        }
    };

    const handleUpdateCustomer = async (id: string, data: any) => {
        try {
            await api.updateCustomer(id, data);
            showSnackbar('顧客情報を更新しました', 'success');
            loadCustomers();
            setDrawerOpen(false);
        } catch (error) {
            showSnackbar('顧客情報の更新に失敗しました', 'error');
            throw error;
        }
    };

    const handleDeleteCustomer = async (id: string) => {
        try {
            await api.deleteCustomer(id);
            showSnackbar('顧客を削除しました', 'success');
            loadCustomers();
            setDrawerOpen(false);
        } catch (error) {
            showSnackbar('顧客の削除に失敗しました', 'error');
        }
    };

    const showSnackbar = (message: string, severity: 'success' | 'error') => {
        setSnackbar({ open: true, message, severity });
    };

    const columns: GridColDef[] = [
        { field: 'name', headerName: '名前', width: 200 },
        { field: 'nameKana', headerName: 'フリガナ', width: 200 },
        {
            field: 'address',
            headerName: '住所',
            width: 300,
            valueGetter: (value, row) => {
                const prefecture = row?.address?.prefecture || '';
                const city = row?.address?.city || '';
                const town = row?.address?.town || '';
                const fullAddress = `${prefecture}${city}${town}`;
                return fullAddress || '-';
            },
        },
        { field: 'phone', headerName: '電話番号', width: 150 },
        { field: 'email', headerName: 'メール', width: 200 },
    ];

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    顧客管理
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setFormOpen(true)}
                >
                    新規登録
                </Button>
            </Box>

            <Box sx={{ height: 600, width: '100%' }}>
                <DataGrid
                    rows={customers}
                    columns={columns}
                    loading={loading}
                    pageSizeOptions={[25, 50, 100]}
                    initialState={{
                        pagination: { paginationModel: { pageSize: 25 } },
                    }}
                    onRowClick={handleRowClick}
                    sx={{
                        '& .MuiDataGrid-row': {
                            cursor: 'pointer',
                        },
                    }}
                />
            </Box>

            <Fab
                color="primary"
                aria-label="add"
                sx={{ position: 'fixed', bottom: 24, right: 24 }}
                onClick={() => setFormOpen(true)}
            >
                <AddIcon />
            </Fab>

            <CustomerForm
                open={formOpen}
                onClose={() => setFormOpen(false)}
                onSubmit={handleCreateCustomer}
                mode="create"
            />

            {selectedCustomer && (
                <CustomerDrawer
                    open={drawerOpen}
                    onClose={() => setDrawerOpen(false)}
                    customer={selectedCustomer}
                    onUpdate={handleUpdateCustomer}
                    onDelete={handleDeleteCustomer}
                />
            )}

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
            >
                <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};
