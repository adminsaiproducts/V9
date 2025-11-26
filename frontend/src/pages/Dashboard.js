"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Dashboard = void 0;
var react_1 = require("react");
var material_1 = require("@mui/material");
var icons_material_1 = require("@mui/icons-material");
var Dashboard = function () {
    // Mock data - will be replaced with real data from API
    var todaySchedule = [
        { time: '10:00', title: '田中様 - 商談', location: '横浜令和の杜' },
        { time: '14:00', title: '佐藤様 - フォローアップ', location: '電話' },
        { time: '16:30', title: '鈴木様 - 契約締結', location: '町田 久遠の杜' },
    ];
    var keyDeals = [
        { customer: '山田太郎', temple: '池上本門寺', amount: '¥2,500,000', status: '商談中' },
        { customer: '佐々木花子', temple: '広尾の杜', amount: '¥1,800,000', status: '見積提示' },
        { customer: '高橋一郎', temple: '谷中天龍の杜', amount: '¥3,200,000', status: '契約準備' },
    ];
    var salesSummary = {
        thisMonth: '¥15,400,000',
        lastMonth: '¥12,800,000',
        growth: '+20.3%',
    };
    return (<material_1.Box>
            <material_1.Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
                ダッシュボード
            </material_1.Typography>

            <material_1.Grid container spacing={3}>
                {/* Sales Summary */}
                <material_1.Grid item xs={12} md={4}>
                    <material_1.Card>
                        <material_1.CardContent>
                            <material_1.Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <icons_material_1.TrendingUp color="primary" sx={{ mr: 1 }}/>
                                <material_1.Typography variant="h6">今月の売上</material_1.Typography>
                            </material_1.Box>
                            <material_1.Typography variant="h3" sx={{ mb: 1, fontWeight: 600 }}>
                                {salesSummary.thisMonth}
                            </material_1.Typography>
                            <material_1.Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <material_1.Chip label={salesSummary.growth} color="success" size="small" sx={{ mr: 1 }}/>
                                <material_1.Typography variant="body2" color="text.secondary">
                                    前月比
                                </material_1.Typography>
                            </material_1.Box>
                        </material_1.CardContent>
                    </material_1.Card>
                </material_1.Grid>

                {/* Today's Schedule */}
                <material_1.Grid item xs={12} md={8}>
                    <material_1.Card>
                        <material_1.CardContent>
                            <material_1.Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <icons_material_1.Event color="primary" sx={{ mr: 1 }}/>
                                <material_1.Typography variant="h6">本日の予定</material_1.Typography>
                            </material_1.Box>
                            <material_1.List dense>
                                {todaySchedule.map(function (item, index) { return (<react_1.default.Fragment key={index}>
                                        <material_1.ListItem>
                                            <material_1.ListItemText primary={<material_1.Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                        <material_1.Typography variant="body2" sx={{ mr: 2, minWidth: 50, fontWeight: 600 }}>
                                                            {item.time}
                                                        </material_1.Typography>
                                                        <material_1.Typography variant="body1">{item.title}</material_1.Typography>
                                                    </material_1.Box>} secondary={item.location}/>
                                        </material_1.ListItem>
                                        {index < todaySchedule.length - 1 && <material_1.Divider />}
                                    </react_1.default.Fragment>); })}
                            </material_1.List>
                        </material_1.CardContent>
                    </material_1.Card>
                </material_1.Grid>

                {/* Key Deals */}
                <material_1.Grid item xs={12}>
                    <material_1.Card>
                        <material_1.CardContent>
                            <material_1.Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <icons_material_1.Star color="primary" sx={{ mr: 1 }}/>
                                <material_1.Typography variant="h6">注目の商談</material_1.Typography>
                            </material_1.Box>
                            <material_1.List>
                                {keyDeals.map(function (deal, index) { return (<react_1.default.Fragment key={index}>
                                        <material_1.ListItem>
                                            <material_1.ListItemText primary={<material_1.Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <material_1.Box>
                                                            <material_1.Typography variant="body1" sx={{ fontWeight: 600 }}>
                                                                {deal.customer}
                                                            </material_1.Typography>
                                                            <material_1.Typography variant="body2" color="text.secondary">
                                                                {deal.temple}
                                                            </material_1.Typography>
                                                        </material_1.Box>
                                                        <material_1.Box sx={{ textAlign: 'right' }}>
                                                            <material_1.Typography variant="h6" sx={{ fontWeight: 600 }}>
                                                                {deal.amount}
                                                            </material_1.Typography>
                                                            <material_1.Chip label={deal.status} size="small" color="primary" variant="outlined"/>
                                                        </material_1.Box>
                                                    </material_1.Box>}/>
                                        </material_1.ListItem>
                                        {index < keyDeals.length - 1 && <material_1.Divider />}
                                    </react_1.default.Fragment>); })}
                            </material_1.List>
                        </material_1.CardContent>
                    </material_1.Card>
                </material_1.Grid>
            </material_1.Grid>
        </material_1.Box>);
};
exports.Dashboard = Dashboard;
