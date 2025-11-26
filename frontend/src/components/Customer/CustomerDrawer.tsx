import React, { useState } from 'react';
import {
    Drawer,
    Box,
    Typography,
    IconButton,
    Button,
    Divider,
    Grid,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
} from '@mui/material';
import {
    Close as CloseIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
} from '@mui/icons-material';
import { Customer } from '../../lib/api';
import { CustomerForm } from './CustomerForm';

interface CustomerDrawerProps {
    open: boolean;
    onClose: () => void;
    customer: Customer;
    onUpdate: (id: string, data: any) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
}

export const CustomerDrawer: React.FC<CustomerDrawerProps> = ({
    open,
    onClose,
    customer,
    onUpdate,
    onDelete,
}) => {
    const [editMode, setEditMode] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const handleUpdate = async (data: any) => {
        await onUpdate(customer.id, data);
        setEditMode(false);
    };

    const handleDelete = async () => {
        await onDelete(customer.id);
        setDeleteDialogOpen(false);
    };

    return (
        <>
            <Drawer
                anchor="right"
                open={open}
                onClose={onClose}
                PaperProps={{ sx: { width: { xs: '100%', sm: 500 } } }}
            >
                <Box sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h5" sx={{ fontWeight: 600 }}>
                            顧客詳細
                        </Typography>
                        <IconButton onClick={onClose}>
                            <CloseIcon />
                        </IconButton>
                    </Box>

                    <Box sx={{ mb: 3 }}>
                        <Button
                            startIcon={<EditIcon />}
                            onClick={() => setEditMode(true)}
                            sx={{ mr: 1 }}
                        >
                            編集
                        </Button>
                        <Button
                            startIcon={<DeleteIcon />}
                            color="error"
                            onClick={() => setDeleteDialogOpen(true)}
                        >
                            削除
                        </Button>
                    </Box>

                    <Divider sx={{ mb: 3 }} />

                    <Grid container spacing={2}>
                        // @ts-ignore - MUI Grid type`n
                        <Grid item xs={12}>
                            <Typography variant="subtitle2" color="text.secondary">
                                基本情報
                            </Typography>
                        </Grid>

                        // @ts-ignore - MUI Grid type`n

                        <Grid item xs={12}>
                            <Typography variant="body2" color="text.secondary">
                                名前
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                {customer.name}
                            </Typography>
                        </Grid>

                        // @ts-ignore - MUI Grid type`n

                        <Grid item xs={12}>
                            <Typography variant="body2" color="text.secondary">
                                フリガナ
                            </Typography>
                            <Typography variant="body1">
                                {customer.nameKana}
                            </Typography>
                        </Grid>

                        {customer.gender && (
                            // @ts-ignore - MUI Grid type`n
                            <Grid item xs={12}>
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

                        // @ts-ignore - MUI Grid type`n

                        <Grid item xs={12}>
                            <Divider sx={{ my: 2 }} />
                            <Typography variant="subtitle2" color="text.secondary">
                                住所
                            </Typography>
                        </Grid>

                        {customer.address && (
                            <>
                                {customer.address.postalCode && (
                                    // @ts-ignore - MUI Grid type`n
                                    <Grid item xs={12}>
                                        <Typography variant="body2" color="text.secondary">
                                            郵便番号
                                        </Typography>
                                        <Typography variant="body1">
                                            {customer.address.postalCode}
                                        </Typography>
                                    </Grid>
                                )}

                                // @ts-ignore - MUI Grid type`n

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

                        // @ts-ignore - MUI Grid type`n

                        <Grid item xs={12}>
                            <Divider sx={{ my: 2 }} />
                            <Typography variant="subtitle2" color="text.secondary">
                                連絡先
                            </Typography>
                        </Grid>

                        {customer.phone && (
                            // @ts-ignore - MUI Grid type`n
                            <Grid item xs={12}>
                                <Typography variant="body2" color="text.secondary">
                                    電話番号
                                </Typography>
                                <Typography variant="body1">
                                    {customer.phone}
                                </Typography>
                            </Grid>
                        )}

                        {customer.email && (
                            // @ts-ignore - MUI Grid type`n
                            <Grid item xs={12}>
                                <Typography variant="body2" color="text.secondary">
                                    メールアドレス
                                </Typography>
                                <Typography variant="body1">
                                    {customer.email}
                                </Typography>
                            </Grid>
                        )}
                    </Grid>
                </Box>
            </Drawer>

            {editMode && (
                <CustomerForm
                    open={editMode}
                    onClose={() => setEditMode(false)}
                    onSubmit={handleUpdate}
                    initialData={customer}
                    mode="edit"
                />
            )}

            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>顧客の削除</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {customer.name} を削除してもよろしいですか？
                        <br />
                        この操作は取り消せません。
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>
                        キャンセル
                    </Button>
                    <Button onClick={handleDelete} color="error" variant="contained">
                        削除
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};
