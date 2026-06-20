import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  LinearProgress,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Alert,
} from '@mui/material';
import {
  Inventory2 as BatchIcon,
  LocalPrintshop as PrintIcon,
  LocalShipping as EscortIcon,
  Apartment as SiteIcon,
  Warning as ExceptionIcon,
  AssignmentReturn as RecoveryIcon,
  CheckCircle as SuccessIcon,
  AccessTime as TimeIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { batchesApi, exceptionsApi, handoverApi, recoveryApi } from '@/api/client';
import { useAuth } from '@/contexts/AuthContext';
import { BatchStatus, ExamBatch, ExceptionRecord, HandoverRecord, UserRole } from '@/types';
import dayjs from 'dayjs';

const Dashboard: React.FC = () => {
  const [statistics, setStatistics] = useState<any>(null);
  const [recentBatches, setRecentBatches] = useState<ExamBatch[]>([]);
  const [pendingHandovers, setPendingHandovers] = useState<HandoverRecord[]>([]);
  const [activeExceptions, setActiveExceptions] = useState<ExceptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, hasRole } = useAuth();

  useEffect(() => {
    const loadData = async () => {
      try {
        const [statsRes, batchesRes, exceptionsRes] = await Promise.all([
          batchesApi.statistics(),
          batchesApi.list({ page: 1, limit: 5 }),
          exceptionsApi.list({ status: 'reported,investigating' }),
        ]);

        setStatistics(statsRes);
        setRecentBatches((batchesRes as any).data || batchesRes || []);
        setActiveExceptions(Array.isArray(exceptionsRes) ? exceptionsRes : (exceptionsRes as any).data || []);

        if (hasRole([UserRole.ESCORT, UserRole.EXAM_SITE, UserRole.PRINTING_FACTORY])) {
          const handoverRes = await handoverApi.myIncoming();
          const handoverData = Array.isArray(handoverRes) ? handoverRes : (handoverRes as any).data || [];
          setPendingHandovers(handoverData.filter((h: any) => h.status === 'pending').slice(0, 5));
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [hasRole]);

  const statusColors: Record<BatchStatus, string> = {
    [BatchStatus.CREATED]: '#2196f3',
    [BatchStatus.PRINTING]: '#ff9800',
    [BatchStatus.SEALED]: '#9c27b0',
    [BatchStatus.IN_TRANSIT]: '#ff5722',
    [BatchStatus.DELIVERED]: '#4caf50',
    [BatchStatus.OPENED]: '#00bcd4',
    [BatchStatus.RECYCLING]: '#795548',
    [BatchStatus.ARCHIVED]: '#607d8b',
    [BatchStatus.EXCEPTION]: '#f44336',
  };

  const statusLabels: Record<BatchStatus, string> = {
    [BatchStatus.CREATED]: '已创建',
    [BatchStatus.PRINTING]: '印刷中',
    [BatchStatus.SEALED]: '已封签',
    [BatchStatus.IN_TRANSIT]: '运输中',
    [BatchStatus.DELIVERED]: '已送达',
    [BatchStatus.OPENED]: '已启封',
    [BatchStatus.RECYCLING]: '回收中',
    [BatchStatus.ARCHIVED]: '已归档',
    [BatchStatus.EXCEPTION]: '异常',
  };

  const StatCard: React.FC<{
    title: string;
    value: number | string;
    icon: React.ReactNode;
    color: string;
    subtitle?: string;
  }> = ({ title, value, icon, color, subtitle }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: `${color}15`,
              color,
              mr: 2,
            }}
          >
            {icon}
          </Box>
          <Box>
            <Typography variant="h4" fontWeight="bold">
              {value}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
          </Box>
        </Box>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box>
        <LinearProgress />
        <Typography sx={{ mt: 2 }}>加载中...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          欢迎回来，{user?.name}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {dayjs().format('YYYY年MM月DD日 dddd')}
        </Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="总批次"
            value={statistics?.total || 0}
            icon={<BatchIcon />}
            color="#1a237e"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="进行中"
            value={statistics?.inProgress || 0}
            icon={<EscortIcon />}
            color="#ff9800"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="已完成"
            value={statistics?.completed || 0}
            icon={<SuccessIcon />}
            color="#4caf50"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="异常数"
            value={statistics?.exceptions || 0}
            icon={<ExceptionIcon />}
            color="#f44336"
            subtitle={
              statistics?.exceptions > 0 ? '需要及时处理' : '暂无异常'
            }
          />
        </Grid>
      </Grid>

      {activeExceptions.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }} icon={<ExceptionIcon />}>
          当前有 {activeExceptions.length} 个异常待处理，请及时关注！
        </Alert>
      )}

      {pendingHandovers.length > 0 && (
        <Alert severity="info" sx={{ mb: 3 }} icon={<TimeIcon />}>
          您有 {pendingHandovers.length} 个待交接的任务，请及时处理！
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
              最近批次
            </Typography>
            <List>
              {recentBatches.length === 0 ? (
                <ListItem>
                  <ListItemText primary="暂无批次数据" />
                </ListItem>
              ) : (
                recentBatches.map((batch, index) => (
                  <React.Fragment key={batch.id}>
                    {index > 0 && <Divider variant="inset" />}
                    <ListItem sx={{ py: 2 }}>
                      <ListItemIcon>
                        <Box
                          sx={{
                            p: 1,
                            borderRadius: 1,
                            bgcolor: `${statusColors[batch.status]}15`,
                            color: statusColors[batch.status],
                          }}
                        >
                          <BatchIcon />
                        </Box>
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle1" fontWeight="medium">
                              {batch.examName}
                            </Typography>
                            <Chip
                              label={statusLabels[batch.status]}
                              size="small"
                              sx={{
                                bgcolor: `${statusColors[batch.status]}20`,
                                color: statusColors[batch.status],
                              }}
                            />
                          </Box>
                        }
                        secondary={
                          <Box sx={{ mt: 0.5 }}>
                            <Typography variant="body2" color="text.secondary">
                              批次号：{batch.batchCode} | 科目：{batch.subject} | 试卷包：{batch.totalPackages}份
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              考试时间：{dayjs(batch.examDate).format('YYYY-MM-DD HH:mm')} | 启封时间：{dayjs(batch.unsealTime).format('YYYY-MM-DD HH:mm')}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  </React.Fragment>
                ))
              )}
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Paper sx={{ p: 3, borderRadius: 3 }}>
                <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                  流程概览
                </Typography>
                <Box>
                  {[
                    { label: '命题中心', icon: <BatchIcon />, color: '#2196f3', role: UserRole.PROPOSITION_CENTER },
                    { label: '印刷厂', icon: <PrintIcon />, color: '#ff9800', role: UserRole.PRINTING_FACTORY },
                    { label: '押运', icon: <EscortIcon />, color: '#ff5722', role: UserRole.ESCORT },
                    { label: '考点', icon: <SiteIcon />, color: '#4caf50', role: UserRole.EXAM_SITE },
                    { label: '回收归档', icon: <RecoveryIcon />, color: '#9c27b0', role: UserRole.EXAM_SITE },
                  ].map((step, index, arr) => (
                    <Box key={step.label} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Box
                        sx={{
                          p: 1,
                          borderRadius: '50%',
                          bgcolor: hasRole(step.role) ? `${step.color}25` : '#e0e0e0',
                          color: hasRole(step.role) ? step.color : '#9e9e9e',
                        }}
                      >
                        {step.icon}
                      </Box>
                      <Typography
                        variant="body2"
                        sx={{
                          ml: 2,
                          fontWeight: hasRole(step.role) ? 600 : 400,
                          color: hasRole(step.role) ? 'text.primary' : 'text.secondary',
                        }}
                      >
                        {step.label}
                      </Typography>
                      {index < arr.length - 1 && (
                        <Box
                          sx={{
                            flexGrow: 1,
                            height: 2,
                            bgcolor: '#e0e0e0',
                            mx: 1,
                          }}
                        />
                      )}
                    </Box>
                  ))}
                </Box>
              </Paper>
            </Grid>

            {activeExceptions.length > 0 && (
              <Grid item xs={12}>
                <Paper sx={{ p: 3, borderRadius: 3, bgcolor: '#fff8e1' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <ErrorIcon color="error" sx={{ mr: 1 }} />
                    <Typography variant="h6" fontWeight="bold" color="error">
                      待处理异常
                    </Typography>
                  </Box>
                  <List dense>
                    {activeExceptions.slice(0, 3).map((exc) => (
                      <ListItem key={exc.id} sx={{ px: 0 }}>
                        <ListItemText
                          primary={
                            <Typography variant="body2" fontWeight="medium">
                              {exc.type === 'seal_damaged' ? '封签破损' :
                               exc.type === 'package_missing' ? '试卷包缺失' :
                               exc.type === 'quantity_mismatch' ? '数量不匹配' : '其他异常'}
                            </Typography>
                          }
                          secondary={
                            <Typography variant="caption" color="text.secondary">
                              {exc.description.substring(0, 30)}...
                            </Typography>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              </Grid>
            )}
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
