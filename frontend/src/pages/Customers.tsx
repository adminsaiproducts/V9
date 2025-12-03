import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Button,
    Fab,
    Snackbar,
    Alert,
    CircularProgress,
} from '@mui/material';
import { DataGrid, GridColDef, GridRowParams } from '@mui/x-data-grid';
import { Add as AddIcon } from '@mui/icons-material';
import { CustomerForm } from '../components/Customer/CustomerForm';
import { CustomerDrawer } from '../components/Customer/CustomerDrawer';
import { useCustomers } from '../hooks/useCustomers';
import { createCustomer, updateCustomer, deleteCustomer } from '../api/customers';
import type { Customer } from '../api/types';

export const Customers: React.FC = () => {
    console.log('📋 Customers component rendering...');

    const navigate = useNavigate();

    // Use new API client hook
    const { customers, loading, error, refetch } = useCustomers();

    const [formOpen, setFormOpen] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success',
    });

    const handleRowClick = (params: GridRowParams) => {
        const customerId = params.row.id;
        navigate(`/customers/${customerId}`);
    };

    const handleCreateCustomer = async (data: any) => {
        try {
            await createCustomer(data);
            showSnackbar('顧客を登録しました', 'success');
            refetch();
        } catch (error) {
            showSnackbar('顧客の登録に失敗しました', 'error');
            throw error;
        }
    };

    const handleUpdateCustomer = async (id: string, data: any) => {
        try {
            await updateCustomer(id, data);
            showSnackbar('顧客情報を更新しました', 'success');
            refetch();
            setDrawerOpen(false);
        } catch (error) {
            showSnackbar('顧客情報の更新に失敗しました', 'error');
            throw error;
        }
    };

    const handleDeleteCustomer = async (id: string) => {
        try {
            await deleteCustomer(id);
            showSnackbar('顧客を削除しました', 'success');
            refetch();
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
        { field: 'kana', headerName: 'フリガナ', width: 200 },
        { field: 'address', headerName: '住所', width: 300 },
        { field: 'phone', headerName: '電話番号', width: 150 },
        { field: 'email', headerName: 'メール', width: 200 },
    ];

    // Show error state
    if (error) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
                <Button variant="contained" onClick={refetch}>
                    再読み込み
                </Button>
            </Box>
        );
    }

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
                    disabled={loading}
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
