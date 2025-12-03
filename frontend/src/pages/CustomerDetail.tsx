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
              {customer.kana || customer.nameKana || '-'}
            </Typography>
          </Grid>

          {(customer as any).gender && (
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                性別
              </Typography>
              <Chip
                label={
                  (customer as any).gender === 'male' ? '男性' :
                  (customer as any).gender === 'female' ? '女性' : 'その他'
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

              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">
                  住所
                </Typography>
                <Typography variant="body1">
                  {customer.address}
                </Typography>
              </Grid>
            </>
          )}

          {/* Metadata */}
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" color="text.secondary">
              システム情報
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="text.secondary">
              作成日時
            </Typography>
            <Typography variant="body1">
              {new Date(customer.createdAt).toLocaleString('ja-JP')}
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="text.secondary">
              更新日時
            </Typography>
            <Typography variant="body1">
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
          initialData={customer as any}
          mode="edit"
        />
      )}
    </Box>
  );
};
