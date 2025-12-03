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
import type { Customer } from '../api/types';
import { callGAS } from '../api/client';
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
    console.log('handleUpdate called with:', data);
    console.log('Customer ID:', id);

    if (!id) {
      console.error('No customer ID');
      return;
    }

    try {
      setLoading(true);
      console.log('Calling api_updateCustomer...');
      const result = await callGAS<Customer>('api_updateCustomer', id, data);
      console.log('Update result:', result);
      // Reload customer data after update
      await loadCustomer(id);
      setEditMode(false);
      alert('更新しました');
    } catch (err: any) {
      console.error('Failed to update customer:', err);
      setError(err.message || '更新に失敗しました');
      alert('更新エラー: ' + (err.message || '不明なエラー'));
    } finally {
      setLoading(false);
    }
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

  // Format address for display
  const formatAddress = (customer: Customer): string => {
    if (!customer.address) return '-';
    if (typeof customer.address === 'string') return customer.address;

    const addr = customer.address;
    const parts: string[] = [];

    if (addr.postalCode) parts.push(`〒${addr.postalCode}`);
    if (addr.prefecture) parts.push(addr.prefecture);
    if (addr.city) parts.push(addr.city);
    if (addr.town) parts.push(addr.town);
    if (addr.building) parts.push(addr.building);

    return parts.join(' ') || '-';
  };

  // Get gender display
  const getGenderDisplay = (gender?: string): string => {
    if (!gender) return '';
    if (gender === 'male' || gender === '男') return '男性';
    if (gender === 'female' || gender === '女') return '女性';
    return gender;
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
          {/* 基本情報 */}
          <Grid size={12}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.main', mb: 2 }}>
              基本情報
            </Typography>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="body2" color="text.secondary">
              名前
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 500, mt: 0.5 }}>
              {customer.name}
            </Typography>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="body2" color="text.secondary">
              フリガナ
            </Typography>
            <Typography variant="body1" sx={{ mt: 0.5 }}>
              {customer.nameKana || customer.kana || '-'}
            </Typography>
          </Grid>

          {customer.gender && (
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="body2" color="text.secondary">
                性別
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                <Chip label={getGenderDisplay(customer.gender)} size="small" />
              </Box>
            </Grid>
          )}

          {customer.type && (
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="body2" color="text.secondary">
                顧客区分
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                <Chip
                  label={customer.type === 'INDIVIDUAL' ? '個人' : '法人'}
                  size="small"
                  color={customer.type === 'INDIVIDUAL' ? 'default' : 'primary'}
                />
              </Box>
            </Grid>
          )}

          {/* 連絡先 */}
          <Grid size={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.main', mb: 2 }}>
              連絡先
            </Typography>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="body2" color="text.secondary">
              電話番号
            </Typography>
            <Typography variant="body1" sx={{ mt: 0.5 }}>
              {customer.phone || '-'}
            </Typography>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="body2" color="text.secondary">
              携帯番号
            </Typography>
            <Typography variant="body1" sx={{ mt: 0.5 }}>
              {customer.mobile || '-'}
            </Typography>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="body2" color="text.secondary">
              メールアドレス
            </Typography>
            <Typography variant="body1" sx={{ mt: 0.5 }}>
              {customer.email || '-'}
            </Typography>
          </Grid>

          {/* 住所 */}
          <Grid size={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.main', mb: 2 }}>
              住所
            </Typography>
          </Grid>

          {customer.address && typeof customer.address === 'object' && (
            <>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="body2" color="text.secondary">
                  郵便番号
                </Typography>
                <Typography variant="body1" sx={{ mt: 0.5 }}>
                  {customer.address.postalCode ? `〒${customer.address.postalCode}` : '-'}
                </Typography>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="body2" color="text.secondary">
                  都道府県
                </Typography>
                <Typography variant="body1" sx={{ mt: 0.5 }}>
                  {customer.address.prefecture || '-'}
                </Typography>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="body2" color="text.secondary">
                  市区町村
                </Typography>
                <Typography variant="body1" sx={{ mt: 0.5 }}>
                  {customer.address.city || '-'}
                </Typography>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="body2" color="text.secondary">
                  町域・番地
                </Typography>
                <Typography variant="body1" sx={{ mt: 0.5 }}>
                  {customer.address.town || '-'}
                </Typography>
              </Grid>

              <Grid size={12}>
                <Typography variant="body2" color="text.secondary">
                  建物名・部屋番号
                </Typography>
                <Typography variant="body1" sx={{ mt: 0.5 }}>
                  {customer.address.building || '-'}
                </Typography>
              </Grid>
            </>
          )}

          {(!customer.address || typeof customer.address === 'string') && (
            <Grid size={12}>
              <Typography variant="body2" color="text.secondary">
                住所
              </Typography>
              <Typography variant="body1" sx={{ mt: 0.5 }}>
                {formatAddress(customer)}
              </Typography>
            </Grid>
          )}

          {/* 備考 */}
          {customer.notes && (
            <>
              <Grid size={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.main', mb: 2 }}>
                  備考
                </Typography>
              </Grid>

              <Grid size={12}>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {customer.notes}
                </Typography>
              </Grid>
            </>
          )}

          {/* システム情報 */}
          <Grid size={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.main', mb: 2 }}>
              システム情報
            </Typography>
          </Grid>

          {customer.originalId && (
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="body2" color="text.secondary">
                元ID (GenieeCRM)
              </Typography>
              <Typography variant="body1" sx={{ mt: 0.5, fontFamily: 'monospace' }}>
                {customer.originalId}
              </Typography>
            </Grid>
          )}

          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="body2" color="text.secondary">
              作成日時
            </Typography>
            <Typography variant="body1" sx={{ mt: 0.5 }}>
              {new Date(customer.createdAt).toLocaleString('ja-JP')}
            </Typography>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="body2" color="text.secondary">
              更新日時
            </Typography>
            <Typography variant="body1" sx={{ mt: 0.5 }}>
              {new Date(customer.updatedAt).toLocaleString('ja-JP')}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Edit Dialog */}
      {editMode && (
        <CustomerForm
          open={editMode}
          onClose={() => setEditMode(false)}
          onSubmit={handleUpdate}
          initialData={{
            name: customer.name,
            nameKana: customer.nameKana || customer.kana || '',
            gender: customer.gender || '',
            type: 'INDIVIDUAL',
            postalCode: customer.address?.postalCode || '',
            prefecture: customer.address?.prefecture || '',
            city: customer.address?.city || '',
            town: customer.address?.town || '',
            building: customer.address?.building || '',
            phone: customer.phone || '',
            mobile: customer.mobile || '',
            email: customer.email || '',
          }}
          mode="edit"
        />
      )}
    </Box>
  );
};
