import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  IconButton,
  LinearProgress,
  Alert,
  Grid,
  Card,
  CardContent,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
  AssignmentReturn as RecoveryIcon,
  Archive as ArchiveIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Visibility as ViewIcon,
  PlayArrow as StartIcon,
} from '@mui/icons-material';
import { recoveryApi, batchesApi, packagesApi } from '@/api/client';
import { RecoveryRecord, ExamBatch, BatchStatus, ExamPackage } from '@/types';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';

const Recovery: React.FC = () => {
  const [recoveryRecords, setRecoveryRecords] = useState<RecoveryRecord[]>([]);
  const [batches, setBatches] = useState<ExamBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openSubmitDialog, setOpenSubmitDialog] = useState(false);
  const [openDetailDialog, setOpenDetailDialog] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<ExamBatch | null>(null);
  const [selectedRecovery, setSelectedRecovery] = useState<RecoveryRecord | null>(null);
  const [packages, setPackages] = useState<ExamPackage[]>([]);
  const [formData, setFormData] = useState({
    batchId: '',
    recoveredPackages: 0,
    missingPackageIds: '',
    remarks: '',
  });
  const [forceArchive, setForceArchive] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [recRes, batchRes] = await Promise.all([
        recoveryApi.list(),
        batchesApi.list({ status: `${BatchStatus.OPENED},${BatchStatus.RECYCLING},${BatchStatus.ARCHIVED}` }),
      ]);
      setRecoveryRecords(Array.isArray(recRes) ? recRes : (recRes as any).data || []);
      setBatches(Array.isArray(batchRes) ? batchRes : (batchRes as any).data || []);
    } catch (error) {
        toast.error('加载数据失败');
      } finally {
        setLoading(false);
      }
    };
  

  useEffect(() => {
    loadData();
  }, []);

  const handleStartRecovery = async (batch: ExamBatch) => {
    if (!confirm(`确认开始回收批次"${batch.examName}"的试卷包？`)) return;
    try {
      await recoveryApi.create({ batchId: batch.id });
      await batchesApi.updateStatus(batch.id, BatchStatus.RECYCLING);
      toast.success('回收已开始');
      loadData();
    } catch (error) {
        toast.error('操作失败');
      }
    };
  

  const handleOpenSubmit = async (record: RecoveryRecord) => {
    const batch = batches.find(b => b.id === record.batchId);
    const pkgsRes = await packagesApi.listByBatch(record.batchId);
    const pkgData = Array.isArray(pkgsRes) ? pkgsRes : (pkgsRes as any).data || [];
    setPackages(pkgData);
    setSelectedRecovery(record);
    setSelectedBatch(batch || null);
    setFormData({
      batchId: record.batchId,
      recoveredPackages: record.recoveredPackages || pkgData.length,
      missingPackageIds: '',
      remarks: '',
    });
    setOpenSubmitDialog(true);
  };

  const handleSubmitRecovery = async () => {
    if (!selectedRecovery) return;

    try {
      const missingPackageIds = formData.missingPackageIds
        .split(',')
        .map(id => id.trim())
        .filter(id => id);

      await recoveryApi.submit(selectedRecovery.id, {
        recoveredPackages: formData.recoveredPackages,
        missingPackageIds,
        remarks: formData.remarks,
      });
      toast.success('回收数据已提交');
      setOpenSubmitDialog(false);
      loadData();
    } catch (error) {
        toast.error('提交失败');
      }
    };
  

  const handleArchive = async (record: RecoveryRecord) => {
    if (!record.countMatched && !forceArchive) {
      toast.warning('数量不匹配，如需强制归档请勾选"强制归档"选项');
      return;
    }

    const action = forceArchive ? '强制归档' : '归档';
    if (!confirm(`确认${action}此回收记录？${!record.countMatched ? '注意：数量不匹配！' : ''}`)) return;

    try {
      await recoveryApi.archive(record.id, forceArchive);
      const batch = batches.find(b => b.id === record.batchId);
      if (batch) {
        await batchesApi.updateStatus(batch.id, BatchStatus.ARCHIVED);
      }
      toast.success('归档成功');
      setForceArchive(false);
      loadData();
    } catch (error: any) {
        const message = error?.response?.data?.message || '归档失败';
        toast.error(message);
      }
    };
  

  const handleViewDetail = async (record: RecoveryRecord) => {
    setSelectedRecovery(record);
    const pkgsRes = await packagesApi.listByBatch(record.batchId);
    setPackages(Array.isArray(pkgsRes) ? pkgsRes : (pkgsRes as any).data || []);
    setOpenDetailDialog(true);
  };

  const recyclableBatches = batches.filter(b => 
    [BatchStatus.OPENED, BatchStatus.RECYCLING].includes(b.status) &&
    !recoveryRecords.find(r => r.batchId === b.id && !r.archived)
  );

  const pendingCount = recoveryRecords.filter(r => !r.archived).length;
  const blockedCount = recoveryRecords.filter(r => !r.countMatched && !r.archived).length;

  const columns: GridColDef<RecoveryRecord>[] = [
    {
      field: 'batchId',
      headerName: '批次',
      width: 150,
      renderCell: (params: GridRenderCellParams<RecoveryRecord>) => {
        const batch = batches.find(b => b.id === params.value);
        return (
          <Box>
            <Typography variant="body2">{batch?.batchCode || params.value.substring(0, 12)}</Typography>
            <Typography variant="caption" color="text.secondary">{batch?.examName}</Typography>
          </Box>
        );
      },
    },
    { field: 'totalPackages', headerName: '总包数', width: 90 },
    { field: 'recoveredPackages', headerName: '已回收', width: 90 },
    { field: 'missingPackages', headerName: '缺失', width: 90 },
    {
      field: 'countMatched',
      headerName: '数量匹配',
      width: 110,
      renderCell: (params: GridRenderCellParams<RecoveryRecord>) => (
        <Chip
          label={params.value ? '是' : '否'}
          size="small"
          color={params.value ? 'success' : 'error'}
        />
      ),
    },
    {
      field: 'archived',
      headerName: '归档状态',
      width: 100,
      renderCell: (params: GridRenderCellParams<RecoveryRecord>) => (
        <Chip
          label={params.value ? '已归档' : '未归档'}
          size="small"
          color={params.value ? 'default' : 'warning'}
        />
      ),
    },
    {
      field: 'recoveredAt',
      headerName: '回收时间',
      width: 180,
      valueFormatter: (params) => params.value ? dayjs(params.value).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      field: 'actions',
      headerName: '操作',
      width: 200,
      sortable: false,
      renderCell: (params: GridRenderCellParams<RecoveryRecord>) => (
        <Box>
          <IconButton
            size="small"
            color="primary"
            onClick={() => handleViewDetail(params.row)}
            title="查看详情"
          >
            <ViewIcon fontSize="small" />
          </IconButton>
          {!params.row.recoveredAt && (
            <IconButton
              size="small"
              color="info"
              onClick={() => handleOpenSubmit(params.row)}
              title="提交回收数据"
            >
              <CheckIcon fontSize="small" />
            </IconButton>
          )}
          {params.row.recoveredAt && !params.row.archived && (
            <IconButton
              size="small"
              color={params.row.countMatched ? 'success' : 'warning'}
              onClick={() => handleArchive(params.row)}
              title={params.row.countMatched ? '归档' : '数量不匹配'}
              disabled={!params.row.countMatched && !forceArchive}
            >
              <ArchiveIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <div>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            回收归档
          </Typography>
          <Typography variant="body2" color="text.secondary">
            考后试卷回收核验与归档管理
          </Typography>
        </div>
      </Box>

      {blockedCount > 0 && (
        <Alert severity="error" sx={{ mb: 3 }} icon={<ErrorIcon />}>
          有 {blockedCount} 个回收记录因数量不匹配被阻断归档！
        </Alert>
      )}

      {pendingCount > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }} icon={<WarningIcon />}>
          有 {pendingCount} 个批次待回收完成或归档
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card sx={{ height: '100%', borderRadius: 3 }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" fontWeight="bold" color="#ff9800">
                {recyclableBatches.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                待开始回收
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ height: '100%', borderRadius: 3 }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" fontWeight="bold" color="#2196f3">
                {recoveryRecords.filter(r => !r.recoveredAt).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                回收中
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ height: '100%', borderRadius: 3 }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" fontWeight="bold" color="#4caf50">
                {recoveryRecords.filter(r => r.countMatched && r.archived).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                已完成归档
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ height: '100%', borderRadius: 3 }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" fontWeight="bold" color="#f44336">
                {blockedCount}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                待处理阻断
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {recyclableBatches.length > 0 && (
        <Paper sx={{ p: 3, mb: 3, borderRadius: 3, bgcolor: '#fff3e0' }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            待开始回收的批次
          </Typography>
          <Grid container spacing={2}>
            {recyclableBatches.map((batch) => (
              <Grid item xs={12} md={4} key={batch.id}>
                <Paper sx={{ p: 2, borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="body1" fontWeight="bold">{batch.examName}</Typography>
                      <Typography variant="body2" color="text.secondary">{batch.batchCode}</Typography>
                      <Typography variant="caption">
                        科目：{batch.subject} | {batch.totalPackages}份
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<StartIcon />}
                      onClick={() => handleStartRecovery(batch)}
                    >
                      开始回收
                    </Button>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {loading ? (
        <LinearProgress />
      ) : (
        <Paper sx={{ borderRadius: 3 }}>
          <DataGrid
            rows={recoveryRecords}
            columns={columns}
            getRowId={(row) => row.id}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } }}}
            pageSizeOptions={[5, 10, 25]}
            disableRowSelectionOnClick
            sx={{ p: 2 }}
          />
        </Paper>
      )}

      <Dialog
        open={openSubmitDialog}
        onClose={() => { setOpenSubmitDialog(false); setSelectedRecovery(null); }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>提交回收数据</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {selectedBatch && (
              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  {selectedBatch.examName}
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">批次号</Typography>
                    <Typography variant="body1">{selectedBatch.batchCode}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">总包数</Typography>
                    <Typography variant="body1">{selectedBatch.totalPackages}份</Typography>
                  </Grid>
                </Grid>
              </Paper>
            )}
            <TextField
              label="已回收份数"
              type="number"
              fullWidth
              value={formData.recoveredPackages}
              onChange={(e) => setFormData({ ...formData, recoveredPackages: parseInt(e.target.value) || 0 })}
              InputProps={{ inputProps: { min: 0 } }}
            />
            <TextField
              label="缺失试卷包ID（多个用逗号分隔）"
              fullWidth
              value={formData.missingPackageIds}
              onChange={(e) => setFormData({ ...formData, missingPackageIds: e.target.value })}
              placeholder="例如：pkg-001, pkg-003"
            />
            <TextField
              label="备注"
              fullWidth
              multiline
              rows={2}
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              placeholder="回收情况说明..."
            />
            {formData.recoveredPackages !== selectedBatch?.totalPackages && (
              <Alert severity="warning" icon={<WarningIcon />}>
                回收数量与总包数不匹配，将触发异常流程！
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpenSubmitDialog(false); setSelectedRecovery(null); }}>取消</Button>
          <Button onClick={handleSubmitRecovery} variant="contained" sx={{ backgroundColor: '#1a237e' }}>
            提交
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openDetailDialog}
        onClose={() => { setOpenDetailDialog(false); setSelectedRecovery(null); }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>回收详情</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {selectedRecovery && (
              <>
                <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={6} md={3}>
                      <Typography variant="body2" color="text.secondary">总包数</Typography>
                      <Typography variant="h6" fontWeight="bold">{selectedRecovery.totalPackages}</Typography>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Typography variant="body2" color="text.secondary">已回收</Typography>
                      <Typography variant="h6" fontWeight="bold" color="success.main">
                        {selectedRecovery.recoveredPackages}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Typography variant="body2" color="text.secondary">缺失</Typography>
                      <Typography variant="h6" fontWeight="bold" color="error.main">
                        {selectedRecovery.missingPackages}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Typography variant="body2" color="text.secondary">数量匹配</Typography>
                      <Chip
                        label={selectedRecovery.countMatched ? '是' : '否'}
                        color={selectedRecovery.countMatched ? 'success' : 'error'}
                      />
                    </Grid>
                  </Grid>
                  {!selectedRecovery.countMatched && selectedRecovery.blockingReason && (
                    <Alert severity="error" sx={{ mt: 2 }} icon={<ErrorIcon />}>
                      阻断原因：{selectedRecovery.blockingReason}
                    </Alert>
                  )}
                  {selectedRecovery.remarks && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" color="text.secondary">备注</Typography>
                      <Typography variant="body1">{selectedRecovery.remarks}</Typography>
                    </Box>
                  )}
                </Paper>

                {!selectedRecovery.archived && !selectedRecovery.countMatched && (
                  <Box sx={{ mb: 2 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={forceArchive}
                          onChange={(e) => setForceArchive(e.target.checked)}
                        />
                      }
                      label="我已核实情况，申请强制归档"
                    />
                  </Box>
                )}

                {selectedRecovery.archived && (
                  <Paper sx={{ p: 2, bgcolor: '#e8f5e9', mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">归档时间</Typography>
                    <Typography variant="body1">
                      {selectedRecovery.archivedAt ? dayjs(selectedRecovery.archivedAt).format('YYYY-MM-DD HH:mm') : '-'}
                    </Typography>
                  </Paper>
                )}

                <Typography variant="subtitle2" gutterBottom>
                  试卷包列表 ({packages.length}个)
                </Typography>
                {packages.map((pkg) => (
                  <Paper key={pkg.id} sx={{ p: 2, mb: 1, borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="body1" fontWeight="medium">{pkg.packageCode}</Typography>
                        <Typography variant="body2" color="text.secondary">科目：{pkg.subject}</Typography>
                      </Box>
                      <Chip
                        label={pkg.sealed ? '已回收' : '已启封'}
                        size="small"
                        color={pkg.sealed ? 'success' : 'default'}
                      />
                    </Box>
                  </Paper>
                ))}
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpenDetailDialog(false); setSelectedRecovery(null); setForceArchive(false); }}>
            关闭
          </Button>
          {!selectedRecovery?.archived && selectedRecovery?.recoveredAt && (
            <Button
              onClick={() => selectedRecovery && handleArchive(selectedRecovery)}
              variant="contained"
              startIcon={<ArchiveIcon />}
              sx={{ backgroundColor: selectedRecovery?.countMatched ? '#4caf50' : '#ff9800' }}
            >
              {forceArchive ? '强制归档' : '归档'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Recovery;
