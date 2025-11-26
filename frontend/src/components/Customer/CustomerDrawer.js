"use strict";
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
exports.CustomerDrawer = void 0;
var react_1 = require("react");
var material_1 = require("@mui/material");
var icons_material_1 = require("@mui/icons-material");
var CustomerForm_1 = require("./CustomerForm");
var CustomerDrawer = function (_a) {
    var open = _a.open, onClose = _a.onClose, customer = _a.customer, onUpdate = _a.onUpdate, onDelete = _a.onDelete;
    var _b = (0, react_1.useState)(false), editMode = _b[0], setEditMode = _b[1];
    var _c = (0, react_1.useState)(false), deleteDialogOpen = _c[0], setDeleteDialogOpen = _c[1];
    var handleUpdate = function (data) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, onUpdate(customer.id, data)];
                case 1:
                    _a.sent();
                    setEditMode(false);
                    return [2 /*return*/];
            }
        });
    }); };
    var handleDelete = function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, onDelete(customer.id)];
                case 1:
                    _a.sent();
                    setDeleteDialogOpen(false);
                    return [2 /*return*/];
            }
        });
    }); };
    return (<>
            <material_1.Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 500 } } }}>
                <material_1.Box sx={{ p: 3 }}>
                    <material_1.Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <material_1.Typography variant="h5" sx={{ fontWeight: 600 }}>
                            顧客詳細
                        </material_1.Typography>
                        <material_1.IconButton onClick={onClose}>
                            <icons_material_1.Close />
                        </material_1.IconButton>
                    </material_1.Box>

                    <material_1.Box sx={{ mb: 3 }}>
                        <material_1.Button startIcon={<icons_material_1.Edit />} onClick={function () { return setEditMode(true); }} sx={{ mr: 1 }}>
                            編集
                        </material_1.Button>
                        <material_1.Button startIcon={<icons_material_1.Delete />} color="error" onClick={function () { return setDeleteDialogOpen(true); }}>
                            削除
                        </material_1.Button>
                    </material_1.Box>

                    <material_1.Divider sx={{ mb: 3 }}/>

                    <material_1.Grid container spacing={2}>
                        <material_1.Grid item xs={12}>
                            <material_1.Typography variant="subtitle2" color="text.secondary">
                                基本情報
                            </material_1.Typography>
                        </material_1.Grid>

                        <material_1.Grid item xs={12}>
                            <material_1.Typography variant="body2" color="text.secondary">
                                名前
                            </material_1.Typography>
                            <material_1.Typography variant="body1" sx={{ fontWeight: 500 }}>
                                {customer.name}
                            </material_1.Typography>
                        </material_1.Grid>

                        <material_1.Grid item xs={12}>
                            <material_1.Typography variant="body2" color="text.secondary">
                                フリガナ
                            </material_1.Typography>
                            <material_1.Typography variant="body1">
                                {customer.nameKana}
                            </material_1.Typography>
                        </material_1.Grid>

                        {customer.gender && (<material_1.Grid item xs={12}>
                                <material_1.Typography variant="body2" color="text.secondary">
                                    性別
                                </material_1.Typography>
                                <material_1.Chip label={customer.gender === 'male' ? '男性' :
                customer.gender === 'female' ? '女性' : 'その他'} size="small"/>
                            </material_1.Grid>)}

                        <material_1.Grid item xs={12}>
                            <material_1.Divider sx={{ my: 2 }}/>
                            <material_1.Typography variant="subtitle2" color="text.secondary">
                                住所
                            </material_1.Typography>
                        </material_1.Grid>

                        {customer.address && (<>
                                {customer.address.postalCode && (<material_1.Grid item xs={12}>
                                        <material_1.Typography variant="body2" color="text.secondary">
                                            郵便番号
                                        </material_1.Typography>
                                        <material_1.Typography variant="body1">
                                            {customer.address.postalCode}
                                        </material_1.Typography>
                                    </material_1.Grid>)}

                                <material_1.Grid item xs={12}>
                                    <material_1.Typography variant="body2" color="text.secondary">
                                        住所
                                    </material_1.Typography>
                                    <material_1.Typography variant="body1">
                                        {customer.address.prefecture}
                                        {customer.address.city}
                                        {customer.address.town}
                                        {customer.address.building && <><br />{customer.address.building}</>}
                                    </material_1.Typography>
                                </material_1.Grid>
                            </>)}

                        <material_1.Grid item xs={12}>
                            <material_1.Divider sx={{ my: 2 }}/>
                            <material_1.Typography variant="subtitle2" color="text.secondary">
                                連絡先
                            </material_1.Typography>
                        </material_1.Grid>

                        {customer.phone && (<material_1.Grid item xs={12}>
                                <material_1.Typography variant="body2" color="text.secondary">
                                    電話番号
                                </material_1.Typography>
                                <material_1.Typography variant="body1">
                                    {customer.phone}
                                </material_1.Typography>
                            </material_1.Grid>)}

                        {customer.email && (<material_1.Grid item xs={12}>
                                <material_1.Typography variant="body2" color="text.secondary">
                                    メールアドレス
                                </material_1.Typography>
                                <material_1.Typography variant="body1">
                                    {customer.email}
                                </material_1.Typography>
                            </material_1.Grid>)}
                    </material_1.Grid>
                </material_1.Box>
            </material_1.Drawer>

            {editMode && (<CustomerForm_1.CustomerForm open={editMode} onClose={function () { return setEditMode(false); }} onSubmit={handleUpdate} initialData={customer} mode="edit"/>)}

            <material_1.Dialog open={deleteDialogOpen} onClose={function () { return setDeleteDialogOpen(false); }}>
                <material_1.DialogTitle>顧客の削除</material_1.DialogTitle>
                <material_1.DialogContent>
                    <material_1.DialogContentText>
                        {customer.name} を削除してもよろしいですか？
                        <br />
                        この操作は取り消せません。
                    </material_1.DialogContentText>
                </material_1.DialogContent>
                <material_1.DialogActions>
                    <material_1.Button onClick={function () { return setDeleteDialogOpen(false); }}>
                        キャンセル
                    </material_1.Button>
                    <material_1.Button onClick={handleDelete} color="error" variant="contained">
                        削除
                    </material_1.Button>
                </material_1.DialogActions>
            </material_1.Dialog>
        </>);
};
exports.CustomerDrawer = CustomerDrawer;
