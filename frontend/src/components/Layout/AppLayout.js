"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppLayout = void 0;
var react_1 = require("react");
var material_1 = require("@mui/material");
var icons_material_1 = require("@mui/icons-material");
var react_router_dom_1 = require("react-router-dom");
var DRAWER_WIDTH = 240;
var AppLayout = function (_a) {
    var _b;
    var children = _a.children;
    var _c = react_1.default.useState(false), mobileOpen = _c[0], setMobileOpen = _c[1];
    var theme = (0, material_1.useTheme)();
    var isMobile = (0, material_1.useMediaQuery)(theme.breakpoints.down('md'));
    var navigate = (0, react_router_dom_1.useNavigate)();
    var location = (0, react_router_dom_1.useLocation)();
    var handleDrawerToggle = function () {
        setMobileOpen(!mobileOpen);
    };
    var menuItems = [
        { text: 'ダッシュボード', icon: <icons_material_1.Dashboard />, path: '/' },
        { text: '顧客管理', icon: <icons_material_1.People />, path: '/customers' },
        { text: '商談管理', icon: <icons_material_1.BusinessCenter />, path: '/deals' },
        { text: 'レポート', icon: <icons_material_1.Assessment />, path: '/reports' },
    ];
    var drawer = (<material_1.Box>
            <material_1.Toolbar>
                <material_1.Typography variant="h6" noWrap component="div" sx={{ fontWeight: 600 }}>
                    CRM V9
                </material_1.Typography>
            </material_1.Toolbar>
            <material_1.Divider />
            <material_1.List>
                {menuItems.map(function (item) { return (<material_1.ListItem key={item.text} disablePadding>
                        <material_1.ListItemButton selected={location.pathname === item.path} onClick={function () {
                navigate(item.path);
                if (isMobile)
                    setMobileOpen(false);
            }}>
                            <material_1.ListItemIcon>{item.icon}</material_1.ListItemIcon>
                            <material_1.ListItemText primary={item.text}/>
                        </material_1.ListItemButton>
                    </material_1.ListItem>); })}
            </material_1.List>
        </material_1.Box>);
    return (<material_1.Box sx={{ display: 'flex' }}>
            <material_1.AppBar position="fixed" sx={{
            width: { md: "calc(100% - ".concat(DRAWER_WIDTH, "px)") },
            ml: { md: "".concat(DRAWER_WIDTH, "px") },
        }}>
                <material_1.Toolbar>
                    <material_1.IconButton color="inherit" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2, display: { md: 'none' } }}>
                        <icons_material_1.Menu />
                    </material_1.IconButton>
                    <material_1.Typography variant="h6" noWrap component="div">
                        {((_b = menuItems.find(function (item) { return item.path === location.pathname; })) === null || _b === void 0 ? void 0 : _b.text) || 'CRM V9'}
                    </material_1.Typography>
                </material_1.Toolbar>
            </material_1.AppBar>

            <material_1.Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
                <material_1.Drawer variant="temporary" open={mobileOpen} onClose={handleDrawerToggle} ModalProps={{ keepMounted: true }} sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
        }}>
                    {drawer}
                </material_1.Drawer>
                <material_1.Drawer variant="permanent" sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
        }} open>
                    {drawer}
                </material_1.Drawer>
            </material_1.Box>

            <material_1.Box component="main" sx={{
            flexGrow: 1,
            p: 3,
            width: { md: "calc(100% - ".concat(DRAWER_WIDTH, "px)") },
            mt: 8,
        }}>
                {children}
            </material_1.Box>
        </material_1.Box>);
};
exports.AppLayout = AppLayout;
