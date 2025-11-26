"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerForm = void 0;
var react_1 = require("react");
var material_1 = require("@mui/material");
var react_hook_form_1 = require("react-hook-form");
var zod_1 = require("@hookform/resolvers/zod");
var zod_2 = require("zod");
var usePostalCode_1 = require("../../hooks/usePostalCode");
var customerSchema = zod_2.z.object({
    name: zod_2.z.string().min(1, '名前は必須です'),
    nameKana: zod_2.z.string().min(1, 'フリガナは必須です'),
    gender: zod_2.z.enum(['male', 'female', 'other', '']).optional(),
    type: zod_2.z.literal('INDIVIDUAL'),
    postalCode: zod_2.z.string().regex(/^\d{3}-?\d{4}$/, '郵便番号の形式が正しくありません').optional().or(zod_2.z.literal('')),
    prefecture: zod_2.z.string().optional(),
    city: zod_2.z.string().optional(),
    town: zod_2.z.string().optional(),
    building: zod_2.z.string().optional(),
    phone: zod_2.z.string().optional(),
    email: zod_2.z.string().email('メールアドレスの形式が正しくありません').optional().or(zod_2.z.literal('')),
});
var CustomerForm = function (_a) {
    var open = _a.open, onClose = _a.onClose, onSubmit = _a.onSubmit, initialData = _a.initialData, mode = _a.mode;
    var _b = (0, react_hook_form_1.useForm)({
        resolver: (0, zod_1.zodResolver)(customerSchema),
        defaultValues: __assign({ type: 'INDIVIDUAL' }, initialData),
    }), control = _b.control, handleSubmit = _b.handleSubmit, watch = _b.watch, setValue = _b.setValue, _c = _b.formState, errors = _c.errors, isSubmitting = _c.isSubmitting;
    var postalCode = watch('postalCode');
    var _d = (0, usePostalCode_1.usePostalCode)(postalCode || ''), addressData = _d.data, addressLoading = _d.loading;
    // Auto-fill address when postal code data is available
    (0, react_1.useEffect)(function () {
        if (addressData) {
            setValue('prefecture', addressData.prefecture);
            setValue('city', addressData.city);
            setValue('town', addressData.town);
        }
    }, [addressData, setValue]);
    var handleFormSubmit = function (data) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, onSubmit(data)];
                case 1:
                    _a.sent();
                    onClose();
                    return [2 /*return*/];
            }
        });
    }); };
    return (<material_1.Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <material_1.DialogTitle>
                {mode === 'create' ? '新規顧客登録' : '顧客情報編集'}
            </material_1.DialogTitle>
            <material_1.DialogContent>
                <material_1.Box component="form" sx={{ mt: 2 }}>
                    <material_1.Grid container spacing={2}>
                        {/* Basic Information */}
                        <material_1.Grid item xs={12}>
                            <material_1.Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                基本情報
                            </material_1.Typography>
                        </material_1.Grid>

                        <material_1.Grid item xs={12} sm={6}>
                            <react_hook_form_1.Controller name="name" control={control} render={function (_a) {
            var _b;
            var field = _a.field;
            return (<material_1.TextField {...field} label="名前" fullWidth required error={!!errors.name} helperText={(_b = errors.name) === null || _b === void 0 ? void 0 : _b.message}/>);
        }}/>
                        </material_1.Grid>

                        <material_1.Grid item xs={12} sm={6}>
                            <react_hook_form_1.Controller name="nameKana" control={control} render={function (_a) {
            var _b;
            var field = _a.field;
            return (<material_1.TextField {...field} label="フリガナ" fullWidth required error={!!errors.nameKana} helperText={(_b = errors.nameKana) === null || _b === void 0 ? void 0 : _b.message}/>);
        }}/>
                        </material_1.Grid>

                        <material_1.Grid item xs={12} sm={6}>
                            <react_hook_form_1.Controller name="gender" control={control} render={function (_a) {
            var field = _a.field;
            return (<material_1.TextField {...field} select label="性別" fullWidth>
                                        <material_1.MenuItem value="">未設定</material_1.MenuItem>
                                        <material_1.MenuItem value="male">男性</material_1.MenuItem>
                                        <material_1.MenuItem value="female">女性</material_1.MenuItem>
                                        <material_1.MenuItem value="other">その他</material_1.MenuItem>
                                    </material_1.TextField>);
        }}/>
                        </material_1.Grid>

                        {/* Address */}
                        <material_1.Grid item xs={12}>
                            <material_1.Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
                                住所
                            </material_1.Typography>
                        </material_1.Grid>

                        <material_1.Grid item xs={12} sm={6}>
                            <react_hook_form_1.Controller name="postalCode" control={control} render={function (_a) {
            var _b;
            var field = _a.field;
            return (<material_1.TextField {...field} label="郵便番号" fullWidth placeholder="123-4567" error={!!errors.postalCode} helperText={(_b = errors.postalCode) === null || _b === void 0 ? void 0 : _b.message} InputProps={{
                    endAdornment: addressLoading && <material_1.CircularProgress size={20}/>,
                }}/>);
        }}/>
                        </material_1.Grid>

                        <material_1.Grid item xs={12} sm={6}>
                            <react_hook_form_1.Controller name="prefecture" control={control} render={function (_a) {
            var field = _a.field;
            return (<material_1.TextField {...field} label="都道府県" fullWidth/>);
        }}/>
                        </material_1.Grid>

                        <material_1.Grid item xs={12} sm={6}>
                            <react_hook_form_1.Controller name="city" control={control} render={function (_a) {
            var field = _a.field;
            return (<material_1.TextField {...field} label="市区町村" fullWidth/>);
        }}/>
                        </material_1.Grid>

                        <material_1.Grid item xs={12} sm={6}>
                            <react_hook_form_1.Controller name="town" control={control} render={function (_a) {
            var field = _a.field;
            return (<material_1.TextField {...field} label="町名" fullWidth/>);
        }}/>
                        </material_1.Grid>

                        <material_1.Grid item xs={12}>
                            <react_hook_form_1.Controller name="building" control={control} render={function (_a) {
            var field = _a.field;
            return (<material_1.TextField {...field} label="建物名・部屋番号" fullWidth/>);
        }}/>
                        </material_1.Grid>

                        {/* Contact */}
                        <material_1.Grid item xs={12}>
                            <material_1.Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
                                連絡先
                            </material_1.Typography>
                        </material_1.Grid>

                        <material_1.Grid item xs={12} sm={6}>
                            <react_hook_form_1.Controller name="phone" control={control} render={function (_a) {
            var field = _a.field;
            return (<material_1.TextField {...field} label="電話番号" fullWidth/>);
        }}/>
                        </material_1.Grid>

                        <material_1.Grid item xs={12} sm={6}>
                            <react_hook_form_1.Controller name="email" control={control} render={function (_a) {
            var _b;
            var field = _a.field;
            return (<material_1.TextField {...field} label="メールアドレス" fullWidth type="email" error={!!errors.email} helperText={(_b = errors.email) === null || _b === void 0 ? void 0 : _b.message}/>);
        }}/>
                        </material_1.Grid>
                    </material_1.Grid>
                </material_1.Box>
            </material_1.DialogContent>
            <material_1.DialogActions>
                <material_1.Button onClick={onClose} disabled={isSubmitting}>
                    キャンセル
                </material_1.Button>
                <material_1.Button onClick={handleSubmit(handleFormSubmit)} variant="contained" disabled={isSubmitting}>
                    {isSubmitting ? <material_1.CircularProgress size={24}/> : mode === 'create' ? '登録' : '更新'}
                </material_1.Button>
            </material_1.DialogActions>
        </material_1.Dialog>);
};
exports.CustomerForm = CustomerForm;
