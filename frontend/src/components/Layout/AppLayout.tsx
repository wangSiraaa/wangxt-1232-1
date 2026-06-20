import React, { useState } from 'react';
import {
  AppBar,
  Box,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Button,
  Avatar,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  Dashboard as DashboardIcon,
  Inventory2 as BatchIcon,
  LocalPrintshop as PrintIcon,
  LocalShipping as EscortIcon,
  Apartment as SiteIcon,
  Warning as ExceptionIcon,
  AssignmentReturn as RecoveryIcon,
  AdminPanelSettings as AdminIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';

const drawerWidth = 240;

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  {
    path: '/dashboard',
    label: '首页',
    icon: <DashboardIcon />,
    roles: [
      UserRole.ADMIN,
      UserRole.PROPOSITION_CENTER,
      UserRole.PRINTING_FACTORY,
      UserRole.ESCORT,
      UserRole.EXAM_SITE,
    ],
  },
  {
    path: '/batches',
    label: '批次管理',
    icon: <BatchIcon />,
    roles: [UserRole.ADMIN, UserRole.PROPOSITION_CENTER],
  },
  {
    path: '/printing',
    label: '印刷封签',
    icon: <PrintIcon />,
    roles: [UserRole.ADMIN, UserRole.PRINTING_FACTORY],
  },
  {
    path: '/escort',
    label: '押运交接',
    icon: <EscortIcon />,
    roles: [UserRole.ADMIN, UserRole.ESCORT, UserRole.PRINTING_FACTORY, UserRole.EXAM_SITE],
  },
  {
    path: '/exam-site',
    label: '考点管理',
    icon: <SiteIcon />,
    roles: [UserRole.ADMIN, UserRole.EXAM_SITE],
  },
  {
    path: '/exceptions',
    label: '异常处理',
    icon: <ExceptionIcon />,
    roles: [
      UserRole.ADMIN,
      UserRole.PROPOSITION_CENTER,
      UserRole.PRINTING_FACTORY,
      UserRole.ESCORT,
      UserRole.EXAM_SITE,
    ],
  },
  {
    path: '/recovery',
    label: '回收归档',
    icon: <RecoveryIcon />,
    roles: [UserRole.ADMIN, UserRole.EXAM_SITE, UserRole.PROPOSITION_CENTER],
  },
];

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, hasRole } = useAuth();

  const toggleDrawer = () => {
    setOpen(!open);
  };

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleClose();
    logout();
    navigate('/login');
  };

  const filteredNavItems = navItems.filter((item) => hasRole(item.roles));

  const roleLabels: Record<UserRole, string> = {
    [UserRole.ADMIN]: '系统管理员',
    [UserRole.PROPOSITION_CENTER]: '命题中心',
    [UserRole.PRINTING_FACTORY]: '印刷厂',
    [UserRole.ESCORT]: '押运人员',
    [UserRole.EXAM_SITE]: '考点主任',
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          transition: (theme) =>
            theme.transitions.create(['width', 'margin'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.leavingScreen,
            }),
          backgroundColor: '#1a237e',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="toggle drawer"
            onClick={toggleDrawer}
            edge="start"
            sx={{ mr: 2 }}
          >
            {open ? <ChevronLeftIcon /> : <MenuIcon />}
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            考试试卷保密流转系统
          </Typography>
          {user && (
            <div>
              <Button
                color="inherit"
                onClick={handleMenu}
                startIcon={
                  <Avatar sx={{ width: 32, height: 32, bgcolor: '#e91e63' }}>
                    {user.name.charAt(0)}
                  </Avatar>
                }
              >
                {user.name}
                <Typography variant="caption" sx={{ ml: 1, opacity: 0.8 }}>
                  ({roleLabels[user.role]})
                </Typography>
              </Button>
              <Menu
                sx={{ mt: '45px' }}
                id="menu-appbar"
                anchorEl={anchorEl}
                anchorOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                open={Boolean(anchorEl)}
                onClose={handleClose}
              >
                <MenuItem disabled>
                  <Typography variant="body2">{user.organization}</Typography>
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleLogout}>退出登录</MenuItem>
              </Menu>
            </div>
          )}
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: open ? drawerWidth : 0,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            whiteSpace: 'nowrap',
            overflowX: 'hidden',
            transition: (theme) =>
              theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
            ...(!open && {
              width: 0,
              transition: (theme) =>
                theme.transitions.create('width', {
                  easing: theme.transitions.easing.sharp,
                  duration: theme.transitions.duration.leavingScreen,
                }),
            }),
          },
        }}
        open={open}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto' }}>
          <List>
            {filteredNavItems.map((item) => (
              <ListItem key={item.path} disablePadding sx={{ display: 'block' }}>
                <ListItemButton
                  sx={{
                    minHeight: 48,
                    justifyContent: open ? 'initial' : 'center',
                    px: 2.5,
                    backgroundColor:
                      location.pathname === item.path
                        ? 'rgba(26, 35, 126, 0.08)'
                        : 'transparent',
                    '&:hover': {
                      backgroundColor: 'rgba(26, 35, 126, 0.04)',
                    },
                  }}
                  onClick={() => navigate(item.path)}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: open ? 3 : 'auto',
                      justifyContent: 'center',
                      color:
                        location.pathname === item.path ? '#1a237e' : 'inherit',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  {open && (
                    <ListItemText
                      primary={item.label}
                      sx={{
                        color:
                          location.pathname === item.path ? '#1a237e' : 'inherit',
                        fontWeight:
                          location.pathname === item.path ? 600 : 400,
                      }}
                    />
                  )}
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          <Divider />
        </Box>
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: 'grey.50',
          p: 3,
          minHeight: '100vh',
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
};

export default AppLayout;
