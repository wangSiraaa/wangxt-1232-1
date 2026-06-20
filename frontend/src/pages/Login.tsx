import React, { useState } from 'react';
import {
  Avatar,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
  Link,
  Paper,
  Box,
  Grid,
  Typography,
  Container,
  Alert,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-toastify';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!username || !password) {
      setError('请输入用户名和密码');
      return;
    }

    setLoading(true);
    try {
      await login(username, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      const message = err?.response?.data?.message || '登录失败，请检查用户名和密码';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const testAccounts = [
    { username: 'admin', name: '系统管理员', desc: 'admin123' },
    { username: 'proposition', name: '命题中心', desc: 'test123' },
    { username: 'printing', name: '印刷厂', desc: 'test123' },
    { username: 'escort', name: '押运人员', desc: 'test123' },
    { username: 'examsite', name: '考点主任', desc: 'test123' },
  ];

  const quickLogin = (uname: string, pwd: string) => {
    setUsername(uname);
    setPassword(pwd);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a237e 0%, #283593 50%, #3949ab 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4} alignItems="center" justifyContent="center">
          <Grid item xs={12} md={6} sx={{ display: { xs: 'none', md: 'block' } }}>
            <Box sx={{ color: 'white', textAlign: 'left' }}>
              <Typography variant="h3" fontWeight="bold" gutterBottom>
                考试试卷保密流转系统
              </Typography>
              <Typography variant="h6" sx={{ mb: 4, opacity: 0.9 }}>
                全流程保密管理，确保试卷安全
              </Typography>
              <Box sx={{ mt: 4 }}>
                <Typography variant="body1" sx={{ mb: 2, opacity: 0.8 }}>
                  ✓ 命题中心批次管理
                </Typography>
                <Typography variant="body1" sx={{ mb: 2, opacity: 0.8 }}>
                  ✓ 印刷厂封签登记
                </Typography>
                <Typography variant="body1" sx={{ mb: 2, opacity: 0.8 }}>
                  ✓ 押运人员扫码交接
                </Typography>
                <Typography variant="body1" sx={{ mb: 2, opacity: 0.8 }}>
                  ✓ 考点主任确认入库
                </Typography>
                <Typography variant="body1" sx={{ mb: 2, opacity: 0.8 }}>
                  ✓ 异常流程自动处理
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.8 }}>
                  ✓ 回收核验与归档
                </Typography>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} md={6} lg={5}>
            <Paper
              elevation={6}
              sx={{
                p: 4,
                borderRadius: 3,
                backdropFilter: 'blur(10px)',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <Avatar sx={{ m: 1, bgcolor: '#e91e63', width: 56, height: 56 }}>
                  <LockOutlinedIcon sx={{ fontSize: 32 }} />
                </Avatar>
                <Typography component="h1" variant="h5" sx={{ mt: 1, mb: 3 }}>
                  用户登录
                </Typography>

                {error && (
                  <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
                    {error}
                  </Alert>
                )}

                <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    id="username"
                    label="用户名"
                    name="username"
                    autoComplete="username"
                    autoFocus
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={loading}
                  />
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    name="password"
                    label="密码"
                    type="password"
                    id="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                        color="primary"
                      />
                    }
                    label="记住我"
                  />
                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    disabled={loading}
                    sx={{
                      mt: 2,
                      mb: 2,
                      py: 1.5,
                      backgroundColor: '#1a237e',
                      '&:hover': {
                        backgroundColor: '#283593',
                      },
                    }}
                  >
                    {loading ? '登录中...' : '登 录'}
                  </Button>

                  <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary" gutterBottom sx={{ display: 'block' }}>
                      测试账号（密码均为 test123）：
                    </Typography>
                    <Grid container spacing={1}>
                      {testAccounts.map((acc) => (
                        <Grid item xs={6} sm={4} key={acc.username}>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => quickLogin(acc.username, acc.desc)}
                            sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                            fullWidth
                          >
                            {acc.name}
                          </Button>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default Login;
