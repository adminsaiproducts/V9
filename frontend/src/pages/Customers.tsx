import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Button,
    Fab,
    Snackbar,
    Alert,
    TextField,
    InputAdornment,
    IconButton,
    CircularProgress,
    Chip,
} from '@mui/material';
import { DataGrid, GridColDef, GridRowParams } from '@mui/x-data-grid';
import { Add as AddIcon, Search as SearchIcon, Clear as ClearIcon } from '@mui/icons-material';
import { CustomerForm } from '../components/Customer/CustomerForm';
import { CustomerDrawer } from '../components/Customer/CustomerDrawer';
import { useCustomerData } from '../contexts/CustomerDataContext';
import {
    createCustomer,
    updateCustomer,
    deleteCustomer,
    getCustomersPaginated,
} from '../api/customers';
import type { Customer } from '../api/types';

// Helper: Format address for display
function formatAddress(address: any): string {
    if (!address) return '';
    if (typeof address === 'string') return address;
    if (typeof address === 'object') {
        const parts = [
            address.prefecture,
            address.city,
            address.town,
            address.streetNumber,
            address.building
        ].filter(Boolean);
        return parts.join('');
    }
    return '';
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(timer);
        };
    }, [value, delay]);

    return debouncedValue;
}

export const Customers: React.FC = () => {
    const navigate = useNavigate();

    // グローバル顧客データコンテキストを使用
    // CustomerDataProviderがApp.tsxでマウントされた時点で自動的に読み込み開始済み
    const {
        allCustomers,
        isLoading: backgroundLoading,
        isReady: searchReady,
        reload: reloadCustomerData,
        invalidate: invalidateCustomerData
    } = useCustomerData();

    // Initial display data (fast - 100 records) - fallback when context not ready
    const [initialCustomers, setInitialCustomers] = useState<Customer[]>([]);
    const [initialLoading, setInitialLoading] = useState(true);
    const [initialTotal, setInitialTotal] = useState(0);

    const [error, setError] = useState<string | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success',
    });

    // Debounce search query - 300ms delay to prevent freezing
    const debouncedSearchQuery = useDebounce(searchQuery, 300);

    const isMounted = useRef(true);
    useEffect(() => {
        return () => {
            isMounted.current = false;
        };
    }, []);

    // フォールバック読み込みが実行されたかどうかを追跡
    const fallbackLoadDone = useRef(false);

    // コンテキストからデータが利用可能かチェック
    useEffect(() => {
        // コンテキストでデータが準備できていれば即座に表示可能
        if (searchReady && allCustomers && allCustomers.length > 0) {
            console.log('[Customers] Context data already available:', allCustomers.length, 'records');
            setInitialLoading(false);
            return;
        }

        // コンテキストが読み込み中であれば待機
        if (backgroundLoading) {
            console.log('[Customers] Waiting for context data...');
            setInitialLoading(true);
            return;
        }

        // 既にフォールバック読み込みが完了していればスキップ
        if (fallbackLoadDone.current) {
            return;
        }

        // コンテキストが読み込み中でもなく、データもない場合のみフォールバック
        fallbackLoadDone.current = true;
        const loadInitialData = async () => {
            setInitialLoading(true);
            try {
                console.log('[Customers] Loading initial 100 records (fallback)...');
                const result = await getCustomersPaginated(0, 100, true);
                if (isMounted.current) {
                    setInitialCustomers(result.data || []);
                    setInitialTotal(result.total || 0);
                    console.log(`[Customers] Initial load: ${result.data?.length || 0} records, total: ${result.total}`);
                }
            } catch (err: any) {
                console.error('[Customers] Initial load failed:', err);
                if (isMounted.current) {
                    setError(err.message || '顧客データの読み込みに失敗しました');
                }
            } finally {
                if (isMounted.current) {
                    setInitialLoading(false);
                }
            }
        };

        loadInitialData();
    }, [searchReady, allCustomers, backgroundLoading]);

    // Filtered results - use debounced query to prevent freezing
    const [filteredResults, setFilteredResults] = useState<Customer[]>([]);
    const [isFiltering, setIsFiltering] = useState(false);
    const filterAbortRef = useRef<boolean>(false);

    // Chunked filter function to avoid blocking UI
    const filterInChunks = useCallback(async (
        data: Customer[],
        query: string,
        queryForPhone: string
    ): Promise<Customer[]> => {
        const CHUNK_SIZE = 2000; // Process 2000 records at a time
        const results: Customer[] = [];

        for (let i = 0; i < data.length; i += CHUNK_SIZE) {
            // Check if search was cancelled
            if (filterAbortRef.current) {
                console.log('[Customers] Filter aborted');
                return [];
            }

            const chunk = data.slice(i, i + CHUNK_SIZE);
            const chunkResults = chunk.filter(c => {
                const name = String(c.name || '').toLowerCase();
                const kana = String(c.kana || c.nameKana || '').toLowerCase();
                const phoneRaw = c.phone;
                const phoneStr = typeof phoneRaw === 'string' ? phoneRaw : (phoneRaw ? String(phoneRaw) : '');
                const phone = phoneStr.replace(/[-\s]/g, '');
                const email = String(c.email || '').toLowerCase();

                return name.includes(query) ||
                       kana.includes(query) ||
                       phone.includes(queryForPhone) ||
                       email.includes(query);
            });
            results.push(...chunkResults);

            // Yield to UI thread between chunks
            if (i + CHUNK_SIZE < data.length) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }

        return results;
    }, []);

    // Perform filtering when debounced query changes
    useEffect(() => {
        const query = debouncedSearchQuery.trim().toLowerCase();

        // If no search query, don't filter
        if (!query) {
            setFilteredResults([]);
            setIsFiltering(false);
            return;
        }

        // Abort any previous filter operation
        filterAbortRef.current = true;

        setIsFiltering(true);

        // Use setTimeout to allow UI to update with "検索中..." state
        const timeoutId = setTimeout(async () => {
            filterAbortRef.current = false;

            console.log(`[Customers] Filtering with query: "${query}"`);
            const dataToSearch = allCustomers || initialCustomers;
            console.log(`[Customers] Searching in ${dataToSearch.length} records`);

            const queryForPhone = query.replace(/[-\s]/g, '');
            const startTime = performance.now();

            const results = await filterInChunks(dataToSearch, query, queryForPhone);

            const elapsed = performance.now() - startTime;
            console.log(`[Customers] Found ${results.length} results in ${elapsed.toFixed(0)}ms`);

            if (isMounted.current && !filterAbortRef.current) {
                setFilteredResults(results);
                setIsFiltering(false);
            }
        }, 10);

        return () => {
            filterAbortRef.current = true;
            clearTimeout(timeoutId);
        };
    }, [debouncedSearchQuery, allCustomers, initialCustomers, filterInChunks]);

    // Determine which data to display
    const displayData = useMemo(() => {
        if (!debouncedSearchQuery.trim()) {
            return allCustomers || initialCustomers;
        }
        return filteredResults;
    }, [debouncedSearchQuery, allCustomers, initialCustomers, filteredResults]);

    const handleClearSearch = useCallback(() => {
        setSearchQuery('');
    }, []);

    const handleRowClick = useCallback((params: GridRowParams) => {
        const customerId = params.row.id;
        const customerData = params.row;
        navigate(`/customers/${customerId}`, { state: { customerData } });
    }, [navigate]);

    const handleRefresh = useCallback(async () => {
        setInitialLoading(true);
        try {
            // グローバルコンテキストをリロード
            await reloadCustomerData();
            showSnackbar('データを更新しました', 'success');
        } catch (err: any) {
            if (isMounted.current) {
                setError(err.message || '更新に失敗しました');
            }
        } finally {
            if (isMounted.current) {
                setInitialLoading(false);
            }
        }
    }, [reloadCustomerData]);

    const handleCreateCustomer = useCallback(async (data: any) => {
        try {
            const newCustomer = await createCustomer(data);
            showSnackbar('顧客を登録しました', 'success');
            if (newCustomer) {
                setInitialCustomers(prev => [newCustomer, ...prev]);
                setInitialTotal(prev => prev + 1);
                // グローバルコンテキストをリロード
                reloadCustomerData();
            }
        } catch (err) {
            showSnackbar('顧客の登録に失敗しました', 'error');
            throw err;
        }
    }, [reloadCustomerData]);

    const handleUpdateCustomer = useCallback(async (id: string, data: any) => {
        try {
            const updatedCustomer = await updateCustomer(id, data);
            showSnackbar('顧客情報を更新しました', 'success');
            if (updatedCustomer) {
                setInitialCustomers(prev => prev.map(c => c.id === id ? updatedCustomer : c));
                // グローバルコンテキストをリロード
                reloadCustomerData();
            }
            setDrawerOpen(false);
        } catch (err) {
            showSnackbar('顧客情報の更新に失敗しました', 'error');
            throw err;
        }
    }, [reloadCustomerData]);

    const handleDeleteCustomer = useCallback(async (id: string) => {
        try {
            await deleteCustomer(id);
            showSnackbar('顧客を削除しました', 'success');
            setInitialCustomers(prev => prev.filter(c => c.id !== id));
            setInitialTotal(prev => Math.max(0, prev - 1));
            // グローバルコンテキストをリロード
            reloadCustomerData();
            setDrawerOpen(false);
        } catch (err) {
            showSnackbar('顧客の削除に失敗しました', 'error');
        }
    }, [reloadCustomerData]);

    const showSnackbar = (message: string, severity: 'success' | 'error') => {
        setSnackbar({ open: true, message, severity });
    };

    const columns: GridColDef[] = useMemo(() => [
        { field: 'trackingNo', headerName: '追客NO', width: 100 },
        { field: 'name', headerName: '名前', width: 200 },
        {
            field: 'kana',
            headerName: 'フリガナ',
            width: 200,
            valueGetter: (value: any, row: any) => row.kana || row.nameKana || '',
        },
        {
            field: 'address',
            headerName: '住所',
            width: 300,
            valueGetter: (value: any, row: any) => formatAddress(row.address),
        },
        { field: 'phone', headerName: '電話番号', width: 150 },
        { field: 'email', headerName: 'メール', width: 200 },
    ], []);

    const isSearching = searchQuery.trim().length > 0;
    // バックグラウンド読み込み中は件数を表示せず、読み込み完了後に表示
    const totalCount = allCustomers ? allCustomers.length : (backgroundLoading ? null : initialTotal);
    // searchReadyはコンテキストから取得済み

    // Show error state
    if (error && !initialLoading) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
                <Button variant="contained" onClick={handleRefresh}>
                    再読み込み
                </Button>
            </Box>
        );
    }

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 600 }}>
                        顧客管理
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                            {totalCount === null
                                ? '読み込み中...'
                                : isSearching
                                    ? `検索結果: ${displayData.length.toLocaleString()} 件 (全 ${totalCount.toLocaleString()} 件中)`
                                    : `全 ${totalCount.toLocaleString()} 件`
                            }
                        </Typography>
                        {backgroundLoading && (
                            <Chip
                                label="検索データ読込中"
                                size="small"
                                color="warning"
                                variant="outlined"
                                icon={<CircularProgress size={12} />}
                            />
                        )}
                        {!backgroundLoading && searchReady && (
                            <Chip label="検索可能" size="small" color="success" variant="outlined" />
                        )}
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant="outlined"
                        onClick={handleRefresh}
                        disabled={initialLoading}
                    >
                        更新
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setFormOpen(true)}
                        disabled={initialLoading}
                    >
                        新規登録
                    </Button>
                </Box>
            </Box>

            <Box sx={{ mb: 2 }}>
                <TextField
                    fullWidth
                    placeholder={searchReady ? "名前、フリガナ、電話番号、メールで検索..." : "検索データ読み込み中..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                {isFiltering ? (
                                    <CircularProgress size={20} />
                                ) : (
                                    <SearchIcon color="action" />
                                )}
                            </InputAdornment>
                        ),
                        endAdornment: searchQuery && (
                            <InputAdornment position="end">
                                <IconButton onClick={handleClearSearch} size="small">
                                    <ClearIcon />
                                </IconButton>
                            </InputAdornment>
                        ),
                    }}
                    size="small"
                    sx={{ maxWidth: 600 }}
                    disabled={initialLoading}
                />
                {isSearching && !searchReady && (
                    <Typography variant="caption" color="warning.main" sx={{ mt: 0.5, display: 'block' }}>
                        ※ 検索データ読み込み中のため、最初の100件のみを検索しています
                    </Typography>
                )}
            </Box>

            <Box sx={{ height: 600, width: '100%' }}>
                <DataGrid
                    rows={displayData}
                    columns={columns}
                    loading={initialLoading || isFiltering}
                    pageSizeOptions={[25, 50, 100]}
                    initialState={{
                        pagination: { paginationModel: { pageSize: 25 } },
                    }}
                    onRowClick={handleRowClick}
                    disableColumnFilter
                    disableColumnSelector
                    disableDensitySelector
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
