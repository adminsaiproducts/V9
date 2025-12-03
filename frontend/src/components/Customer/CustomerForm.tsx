import React, { useEffect, useState, useCallback } from 'react';
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
    List,
    ListItemButton,
    ListItemText,
    Paper,
    Alert,
    IconButton,
    Tooltip,
    Collapse,
} from '@mui/material';
import {
    Search as SearchIcon,
    Warning as WarningIcon,
    CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { usePostalCode, PostalCodeResult } from '../../hooks/usePostalCode';
import { useAddressToPostalCode, validatePostalCodeAddress, AddressSearchResult } from '../../hooks/useAddressToPostalCode';

const customerSchema = z.object({
    name: z.string().min(1, '名前は必須です'),
    nameKana: z.string().min(1, 'フリガナは必須です'),
    gender: z.enum(['male', 'female', 'other', '男', '女', '']).optional(),
    type: z.literal('INDIVIDUAL'),
    postalCode: z.string().regex(/^\d{3,7}-?\d{0,4}$/, '郵便番号の形式が正しくありません').optional().or(z.literal('')),
    prefecture: z.string().optional(),
    city: z.string().optional(),
    town: z.string().optional(),
    building: z.string().optional(),
    phone: z.string().optional(),
    mobile: z.string().optional(),
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
    const prefecture = watch('prefecture');
    const city = watch('city');
    const town = watch('town');

    // Postal code to address lookup
    const {
        data: addressData,
        results: addressResults,
        loading: addressLoading,
        hasMultipleResults,
    } = usePostalCode(postalCode || '');

    // Address to postal code lookup
    const {
        results: postalCodeResults,
        loading: postalCodeLoading,
        error: postalCodeError,
        search: searchPostalCode,
        clear: clearPostalCodeResults,
    } = useAddressToPostalCode();

    const [showAddressSelector, setShowAddressSelector] = useState(false);
    const [showPostalCodeSelector, setShowPostalCodeSelector] = useState(false);
    const [validationStatus, setValidationStatus] = useState<{
        isValid: boolean;
        message?: string;
        suggestions?: AddressSearchResult[];
    } | null>(null);
    const [isValidating, setIsValidating] = useState(false);

    // Show address selector when multiple results are available
    useEffect(() => {
        if (hasMultipleResults) {
            setShowAddressSelector(true);
        } else {
            setShowAddressSelector(false);
        }
    }, [hasMultipleResults]);

    // Auto-fill address when single result or user selected
    useEffect(() => {
        if (addressData) {
            setValue('prefecture', addressData.prefecture);
            setValue('city', addressData.city);
            setValue('town', addressData.town);
            setShowAddressSelector(false);
            setValidationStatus({ isValid: true });
        }
    }, [addressData, setValue]);

    // Validate postal code and address consistency when values change
    const validateConsistency = useCallback(async () => {
        if (!postalCode || postalCode.replace(/[^0-9]/g, '').length !== 7) {
            setValidationStatus(null);
            return;
        }
        if (!prefecture && !city) {
            setValidationStatus(null);
            return;
        }

        setIsValidating(true);
        const result = await validatePostalCodeAddress(postalCode, prefecture || '', city || '', town);
        setValidationStatus(result);
        setIsValidating(false);
    }, [postalCode, prefecture, city, town]);

    // Debounced validation
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            validateConsistency();
        }, 1000);
        return () => clearTimeout(timeoutId);
    }, [validateConsistency]);

    const handleAddressSelect = (result: PostalCodeResult) => {
        setValue('prefecture', result.prefecture);
        setValue('city', result.city);
        setValue('town', result.town);
        setShowAddressSelector(false);
        setValidationStatus({ isValid: true });
    };

    const handleSearchPostalCode = async () => {
        if (!prefecture || !city) {
            return;
        }
        await searchPostalCode(prefecture, city, town);
        setShowPostalCodeSelector(true);
    };

    const handlePostalCodeSelect = (result: AddressSearchResult) => {
        setValue('postalCode', result.postalCode);
        setValue('prefecture', result.prefecture);
        setValue('city', result.city);
        setValue('town', result.town);
        setShowPostalCodeSelector(false);
        clearPostalCodeResults();
        setValidationStatus({ isValid: true });
    };

    const handleSuggestionSelect = (result: AddressSearchResult) => {
        setValue('prefecture', result.prefecture);
        setValue('city', result.city);
        setValue('town', result.town);
        setValidationStatus({ isValid: true });
    };

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
                    <Grid container spacing={2}>
                        {/* Basic Information */}
                        <Grid size={12}>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                基本情報
                            </Typography>
                        </Grid>

                        <Grid size={{ xs: 12, sm: 6 }}>
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

                        <Grid size={{ xs: 12, sm: 6 }}>
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

                        <Grid size={{ xs: 12, sm: 6 }}>
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
                                        <MenuItem value="男">男性</MenuItem>
                                        <MenuItem value="女">女性</MenuItem>
                                        <MenuItem value="other">その他</MenuItem>
                                    </TextField>
                                )}
                            />
                        </Grid>

                        {/* Address */}
                        <Grid size={12}>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
                                住所
                            </Typography>
                        </Grid>

                        <Grid size={{ xs: 12, sm: 6 }}>
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
                                        helperText={errors.postalCode?.message || (hasMultipleResults ? '複数の住所が見つかりました。下から選択してください。' : '')}
                                        slotProps={{
                                            input: {
                                                endAdornment: (
                                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                        {addressLoading && <CircularProgress size={20} />}
                                                        {isValidating && <CircularProgress size={20} />}
                                                        {!addressLoading && !isValidating && validationStatus && (
                                                            validationStatus.isValid ? (
                                                                <CheckCircleIcon color="success" fontSize="small" />
                                                            ) : (
                                                                <Tooltip title={validationStatus.message}>
                                                                    <WarningIcon color="warning" fontSize="small" />
                                                                </Tooltip>
                                                            )
                                                        )}
                                                    </Box>
                                                ),
                                            }
                                        }}
                                    />
                                )}
                            />
                        </Grid>

                        {/* Validation Warning */}
                        <Collapse in={validationStatus !== null && !validationStatus.isValid} sx={{ width: '100%' }}>
                            <Grid size={12}>
                                <Alert
                                    severity="warning"
                                    sx={{ mt: 1 }}
                                    action={
                                        validationStatus?.suggestions && validationStatus.suggestions.length > 0 && (
                                            <Button
                                                color="inherit"
                                                size="small"
                                                onClick={() => {
                                                    if (validationStatus.suggestions && validationStatus.suggestions.length > 0) {
                                                        handleSuggestionSelect(validationStatus.suggestions[0]);
                                                    }
                                                }}
                                            >
                                                修正する
                                            </Button>
                                        )
                                    }
                                >
                                    {validationStatus?.message}
                                    {validationStatus?.suggestions && validationStatus.suggestions.length > 0 && (
                                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                                            正しい住所: {validationStatus.suggestions[0].prefecture} {validationStatus.suggestions[0].city} {validationStatus.suggestions[0].town}
                                        </Typography>
                                    )}
                                </Alert>
                            </Grid>
                        </Collapse>

                        {/* Address Selection List (from postal code) */}
                        {showAddressSelector && addressResults.length > 1 && (
                            <Grid size={12}>
                                <Paper variant="outlined" sx={{ mt: 1, mb: 2 }}>
                                    <Alert severity="info" sx={{ borderRadius: 0 }}>
                                        この郵便番号には{addressResults.length}件の住所が該当します。選択してください。
                                    </Alert>
                                    <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
                                        {addressResults.map((result, index) => (
                                            <ListItemButton
                                                key={index}
                                                onClick={() => handleAddressSelect(result)}
                                                sx={{
                                                    '&:hover': {
                                                        backgroundColor: 'primary.light',
                                                        color: 'primary.contrastText',
                                                    }
                                                }}
                                            >
                                                <ListItemText
                                                    primary={`${result.prefecture} ${result.city} ${result.town}`}
                                                    primaryTypographyProps={{
                                                        variant: 'body2',
                                                    }}
                                                />
                                            </ListItemButton>
                                        ))}
                                    </List>
                                </Paper>
                            </Grid>
                        )}

                        <Grid size={{ xs: 12, sm: 6 }}>
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

                        <Grid size={{ xs: 12, sm: 6 }}>
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

                        {/* Postal Code Search Results (from address) */}
                        {showPostalCodeSelector && postalCodeResults.length > 0 && (
                            <Grid size={12}>
                                <Paper variant="outlined" sx={{ mt: 1, mb: 2 }}>
                                    <Alert severity="info" sx={{ borderRadius: 0 }}>
                                        {postalCodeResults.length}件の郵便番号が見つかりました。選択してください。
                                    </Alert>
                                    <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
                                        {postalCodeResults.map((result, index) => (
                                            <ListItemButton
                                                key={index}
                                                onClick={() => handlePostalCodeSelect(result)}
                                                sx={{
                                                    '&:hover': {
                                                        backgroundColor: 'primary.light',
                                                        color: 'primary.contrastText',
                                                    }
                                                }}
                                            >
                                                <ListItemText
                                                    primary={`〒${result.postalCode}`}
                                                    secondary={`${result.prefecture} ${result.city} ${result.town}`}
                                                    primaryTypographyProps={{
                                                        variant: 'body2',
                                                        fontWeight: 'bold',
                                                    }}
                                                    secondaryTypographyProps={{
                                                        variant: 'caption',
                                                    }}
                                                />
                                            </ListItemButton>
                                        ))}
                                    </List>
                                </Paper>
                            </Grid>
                        )}

                        {/* Postal Code Search Error */}
                        {postalCodeError && showPostalCodeSelector && (
                            <Grid size={12}>
                                <Alert severity="error" sx={{ mt: 1 }} onClose={() => setShowPostalCodeSelector(false)}>
                                    {postalCodeError}
                                </Alert>
                            </Grid>
                        )}

                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Controller
                                name="town"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        label="町名"
                                        fullWidth
                                        slotProps={{
                                            input: {
                                                endAdornment: (
                                                    <Tooltip title="住所から郵便番号を検索">
                                                        <IconButton
                                                            size="small"
                                                            onClick={handleSearchPostalCode}
                                                            disabled={!prefecture || !city || postalCodeLoading}
                                                        >
                                                            {postalCodeLoading ? (
                                                                <CircularProgress size={20} />
                                                            ) : (
                                                                <SearchIcon fontSize="small" />
                                                            )}
                                                        </IconButton>
                                                    </Tooltip>
                                                ),
                                            }
                                        }}
                                    />
                                )}
                            />
                        </Grid>

                        <Grid size={12}>
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
                        <Grid size={12}>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
                                連絡先
                            </Typography>
                        </Grid>

                        <Grid size={{ xs: 12, sm: 6 }}>
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

                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Controller
                                name="mobile"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        label="携帯番号"
                                        fullWidth
                                    />
                                )}
                            />
                        </Grid>

                        <Grid size={{ xs: 12, sm: 6 }}>
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
