import React from 'react';
import {
    Grid,
    Card,
    CardContent,
    Typography,
    Box,
    Chip,
    List,
    ListItem,
    ListItemText,
    Divider,
} from '@mui/material';
import {
    TrendingUp as TrendingUpIcon,
    Event as EventIcon,
    Star as StarIcon,
} from '@mui/icons-material';

export const Dashboard: React.FC = () => {
    // Mock data - will be replaced with real data from API
    const todaySchedule = [
        { time: '10:00', title: '田中様 - 商談', location: '横浜令和の杜' },
        { time: '14:00', title: '佐藤様 - フォローアップ', location: '電話' },
        { time: '16:30', title: '鈴木様 - 契約締結', location: '町田 久遠の杜' },
    ];

    const keyDeals = [
        { customer: '山田太郎', temple: '池上本門寺', amount: '¥2,500,000', status: '商談中' },
        { customer: '佐々木花子', temple: '広尾の杜', amount: '¥1,800,000', status: '見積提示' },
        { customer: '高橋一郎', temple: '谷中天龍の杜', amount: '¥3,200,000', status: '契約準備' },
    ];

    const salesSummary = {
        thisMonth: '¥15,400,000',
        lastMonth: '¥12,800,000',
        growth: '+20.3%',
    };

    return (
        <Box>
            <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
                ダッシュボード (v9.1)
            </Typography>

            <Grid container spacing={3}>
                {/* Sales Summary */}
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <TrendingUpIcon color="primary" sx={{ mr: 1 }} />
                                <Typography variant="h6">今月の売上</Typography>
                            </Box>
                            <Typography variant="h3" sx={{ mb: 1, fontWeight: 600 }}>
                                {salesSummary.thisMonth}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Chip
                                    label={salesSummary.growth}
                                    color="success"
                                    size="small"
                                    sx={{ mr: 1 }}
                                />
                                <Typography variant="body2" color="text.secondary">
                                    前月比
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Today's Schedule */}
                <Grid item xs={12} md={8}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <EventIcon color="primary" sx={{ mr: 1 }} />
                                <Typography variant="h6">本日の予定</Typography>
                            </Box>
                            <List dense>
                                {todaySchedule.map((item, index) => (
                                    <React.Fragment key={index}>
                                        <ListItem>
                                            <ListItemText
                                                primary={
                                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                        <Typography variant="body2" sx={{ mr: 2, minWidth: 50, fontWeight: 600 }}>
                                                            {item.time}
                                                        </Typography>
                                                        <Typography variant="body1">{item.title}</Typography>
                                                    </Box>
                                                }
                                                secondary={item.location}
                                            />
                                        </ListItem>
                                        {index < todaySchedule.length - 1 && <Divider />}
                                    </React.Fragment>
                                ))}
                            </List>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Key Deals */}
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <StarIcon color="primary" sx={{ mr: 1 }} />
                                <Typography variant="h6">注目の商談</Typography>
                            </Box>
                            <List>
                                {keyDeals.map((deal, index) => (
                                    <React.Fragment key={index}>
                                        <ListItem>
                                            <ListItemText
                                                primary={
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <Box>
                                                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                                                {deal.customer}
                                                            </Typography>
                                                            <Typography variant="body2" color="text.secondary">
                                                                {deal.temple}
                                                            </Typography>
                                                        </Box>
                                                        <Box sx={{ textAlign: 'right' }}>
                                                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                                                {deal.amount}
                                                            </Typography>
                                                            <Chip label={deal.status} size="small" color="primary" variant="outlined" />
                                                        </Box>
                                                    </Box>
                                                }
                                            />
                                        </ListItem>
                                        {index < keyDeals.length - 1 && <Divider />}
                                    </React.Fragment>
                                ))}
                            </List>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};
