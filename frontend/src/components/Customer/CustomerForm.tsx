import React, { useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Grid,
    MenuItem,
    CircularProgress,
    Box,
    Typography,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { usePostalCode } from '../../hooks/usePostalCode';

const customerSchema = z.object({
    name: z.string().min(1, '名前は必須です'),
    nameKana: z.string().min(1, 'フリガナは必須です'),
    gender: z.enum(['male', 'female', 'other', '']).optional(),
    type: z.literal('INDIVIDUAL'),
    postalCode: z.string().regex(/^\d{3}-?\d{4}$/, '郵便番号の形式が正しくありません').optional().or(z.literal('')),
    prefecture: z.string().optional(),
    city: z.string().optional(),
    town: z.string().optional(),
    building: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email('メールアドレスの形式が正しくありません').optional().or(z.literal('')),
});

type CustomerFormData = z.infer<typeof customerSchema>;

interface CustomerFormProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: CustomerFormData) => Promise<void>;
    initialData?: Partial<CustomerFormData>;
    mode: 'create' | 'edit';
}

export const CustomerForm: React.FC<CustomerFormProps> = ({
    open,
    onClose,
    onSubmit,
    initialData,
    mode,
}) => {
    const {
        control,
        handleSubmit,
        watch,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<CustomerFormData>({
        resolver: zodResolver(customerSchema),
        defaultValues: {
            type: 'INDIVIDUAL',
            ...initialData,
        },
    });

    const postalCode = watch('postalCode');
    const { data: addressData, loading: addressLoading } = usePostalCode(postalCode || '');

    // Auto-fill address when postal code data is available
    useEffect(() => {
        if (addressData) {
            setValue('prefecture', addressData.prefecture);
            setValue('city', addressData.city);
            setValue('town', addressData.town);
        }
    }, [addressData, setValue]);

    const handleFormSubmit = async (data: CustomerFormData) => {
        await onSubmit(data);
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                {mode === 'create' ? '新規顧客登録' : '顧客情報編集'}
            </DialogTitle>
            <DialogContent>
                <Box component="form" sx={{ mt: 2 }}>
                    {/* @ts-ignore - MUI Grid type issue */}
                    <Grid container spacing={2}>
                        {/* Basic Information */}
                        // @ts-ignore - MUI Grid type`n
                        <Grid item xs={12}>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                基本情報
                            </Typography>
                        </Grid>

                        // @ts-ignore - MUI Grid type`n

                        <Grid item xs={12} sm={6}>
                            <Controller
                                name="name"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        label="名前"
                                        fullWidth
                                        required
                                        error={!!errors.name}
                                        helperText={errors.name?.message}
                                    />
                                )}
                            />
                        </Grid>

                        // @ts-ignore - MUI Grid type`n

                        <Grid item xs={12} sm={6}>
                            <Controller
                                name="nameKana"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        label="フリガナ"
                                        fullWidth
                                        required
                                        error={!!errors.nameKana}
                                        helperText={errors.nameKana?.message}
                                    />
                                )}
                            />
                        </Grid>

                        // @ts-ignore - MUI Grid type`n

                        <Grid item xs={12} sm={6}>
                            <Controller
                                name="gender"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        select
                                        label="性別"
                                        fullWidth
                                    >
                                        <MenuItem value="">未設定</MenuItem>
                                        <MenuItem value="male">男性</MenuItem>
                                        <MenuItem value="female">女性</MenuItem>
                                        <MenuItem value="other">その他</MenuItem>
                                    </TextField>
                                )}
                            />
                        </Grid>

                        {/* Address */}
                        // @ts-ignore - MUI Grid type`n
                        <Grid item xs={12}>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
                                住所
                            </Typography>
                        </Grid>

                        // @ts-ignore - MUI Grid type`n

                        <Grid item xs={12} sm={6}>
                            <Controller
                                name="postalCode"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        label="郵便番号"
                                        fullWidth
                                        placeholder="123-4567"
                                        error={!!errors.postalCode}
                                        helperText={errors.postalCode?.message}
                                        InputProps={{
                                            endAdornment: addressLoading && <CircularProgress size={20} />,
                                        }}
                                    />
                                )}
                            />
                        </Grid>

                        // @ts-ignore - MUI Grid type`n

                        <Grid item xs={12} sm={6}>
                            <Controller
                                name="prefecture"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        label="都道府県"
                                        fullWidth
                                    />
                                )}
                            />
                        </Grid>

                        // @ts-ignore - MUI Grid type`n

                        <Grid item xs={12} sm={6}>
                            <Controller
                                name="city"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        label="市区町村"
                                        fullWidth
                                    />
                                )}
                            />
                        </Grid>

                        // @ts-ignore - MUI Grid type`n

                        <Grid item xs={12} sm={6}>
                            <Controller
                                name="town"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        label="町名"
                                        fullWidth
                                    />
                                )}
                            />
                        </Grid>

                        // @ts-ignore - MUI Grid type`n

                        <Grid item xs={12}>
                            <Controller
                                name="building"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        label="建物名・部屋番号"
                                        fullWidth
                                    />
                                )}
                            />
                        </Grid>

                        {/* Contact */}
                        // @ts-ignore - MUI Grid type`n
                        <Grid item xs={12}>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
                                連絡先
                            </Typography>
                        </Grid>

                        // @ts-ignore - MUI Grid type`n

                        <Grid item xs={12} sm={6}>
                            <Controller
                                name="phone"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        label="電話番号"
                                        fullWidth
                                    />
                                )}
                            />
                        </Grid>

                        // @ts-ignore - MUI Grid type`n

                        <Grid item xs={12} sm={6}>
                            <Controller
                                name="email"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        label="メールアドレス"
                                        fullWidth
                                        type="email"
                                        error={!!errors.email}
                                        helperText={errors.email?.message}
                                    />
                                )}
                            />
                        </Grid>
                    </Grid>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={isSubmitting}>
                    キャンセル
                </Button>
                <Button
                    onClick={handleSubmit(handleFormSubmit)}
                    variant="contained"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? <CircularProgress size={24} /> : mode === 'create' ? '登録' : '更新'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
