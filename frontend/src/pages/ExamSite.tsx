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
  Grid,
  Card,
  CardContent,
  Alert,
  Tabs,
  Tab,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
  Inventory as InventoryIcon,
  LockOpen as UnsealIcon,
  Visibility as ViewIcon,
  Check as CheckIcon,
  Warning as WarningIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import { batchesApi, sealBoxesApi, unsealApi, packagesApi, handoverApi } from '@/api/client';
import { ExamBatch, BatchStatus, SealBox, ExamPackage, UnsealRecord, HandoverRecord } from '@/types';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
};

const ExamSite: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [deliveredBatches, setDeliveredBatches] = useState<ExamBatch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<ExamBatch | null>(null);
  const [sealBoxes, setSealBoxes] = useState<SealBox[]>([]);
  const [packages, setPackages] = useState<ExamPackage[]>([]);
  const [unsealRecords, setUnsealRecords] = useState<UnsealRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [openPackageDialog, setOpenPackageDialog] = useState(false);
  const [openUnsealDialog, setOpenUnsealDialog] = useState(false);
  const [openDeliveryDialog, setOpenDeliveryDialog] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<ExamPackage | null>(null);
  const [packageInfo, setPackageInfo] = useState<any>(null);
  const [deliveryBatch, setDeliveryBatch] = useState<ExamBatch | null>(null);
  const [deliveryHandoverRecords, setDeliveryHandoverRecords] = useState<HandoverRecord[]>([]);
  const [formData, setFormData] = useState({
    witnesses: '',
    remarks: '',
  });
  const [canUnseal, setCanUnseal] = useState(false);
  const [timeUntilUnseal, setTimeUntilUnseal] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [batchesRes, boxesRes] = await Promise.all([
        batchesApi.list({ status: `${BatchStatus.DELIVERED},${BatchStatus.OPENED},${BatchStatus.IN_TRANSIT}` }),
        sealBoxesApi.list(),
      ]);

      const batches = Array.isArray(batchesRes) ? batchesRes : (batchesRes as any).data || [];
      setDeliveredBatches(batches);
      setSealBoxes(Array.isArray(boxesRes) ? boxesRes : (boxesRes as any).data || []);
    } catch (error) {
        toast.error('加载数据失败');
      } finally {
        setLoading(false);
      }
    };
  

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedBatch) {
      const loadBatchData = async () => {
        try {
          const [pkgsRes, unsealRes, timeRes] = await Promise.all([
            packagesApi.listByBatch(selectedBatch.id),
            unsealApi.listByBatch(selectedBatch.id),
            unsealApi.validateTime(selectedBatch.id).catch(() => ({ canUnseal: false })),
          ]);

          setPackages(Array.isArray(pkgsRes) ? pkgsRes : (pkgsRes as any).data || []);
          setUnsealRecords(Array.isArray(unsealRes) ? unsealRes : (unsealRes as any).data || []);
          setCanUnseal((timeRes as any).canUnseal || false);

          if (!(timeRes as any).canUnseal) {
            const now = dayjs();
            const unsealTime = dayjs(selectedBatch.unsealTime);
            const diffMinutes = unsealTime.diff(now, 'minute');
            if (diffMinutes > 0) {
              const hours = Math.floor(diffMinutes / 60);
              const mins = diffMinutes % 60;
              setTimeUntilUnseal(`${hours}小时${mins}分钟`);
            }
          }
        } catch (error) {
          console.error('加载批次详情失败', error);
        }
      };
      loadBatchData();
    }
  }, [selectedBatch]);

  const handleViewPackage = async (pkg: ExamPackage) => {
    setSelectedPackage(pkg);
    try {
      const info = await unsealApi.getPackageInfo(pkg.id);
      setPackageInfo(info);
      setOpenPackageDialog(true);
    } catch (error: any) {
        const message = error?.response?.data?.message || '无法查看试卷包信息';
        if (message.includes('启封时间')) {
          const now = dayjs();
          const unsealTime = dayjs(pkg.createdAt).add(30, 'minute');
          const diff = unsealTime.diff(now, 'minute');
          if (diff > 0) {
            toast.warning(`未到启封时间，还需等待 ${Math.floor(diff / 60)}小时${diff % 60}分钟`);
          } else {
            toast.error(message);
          }
        } else {
          toast.error(message);
        }
      }
    };
  

  const handleUnseal = async (pkg: ExamPackage) => {
    if (!canUnseal) {
      toast.error('未到启封时间，无法启封');
      return;
    }
    setSelectedPackage(pkg);
    setFormData({ witnesses: '', remarks: '' });
    setOpenUnsealDialog(true);
  };

  const handleConfirmUnseal = async () => {
    if (!selectedPackage) return;

    try {
      await unsealApi.unseal({
        packageId: selectedPackage.id,
        witnesses: formData.witnesses.split(',').map(w => w.trim()).filter(w => w),
        remarks: formData.remarks,
      });
      toast.success('启封成功！');
      setOpenUnsealDialog(false);
      if (selectedBatch) {
        const [pkgsRes, unsealRes] = await Promise.all([
          packagesApi.listByBatch(selectedBatch.id),
          unsealApi.listByBatch(selectedBatch.id),
        ]);
        setPackages(Array.isArray(pkgsRes) ? pkgsRes : (pkgsRes as any).data || []);
        setUnsealRecords(Array.isArray(unsealRes) ? unsealRes : (unsealRes as any).data || []);
        await batchesApi.updateStatus(selectedBatch.id, BatchStatus.OPENED);
      }
    } catch (error) {
        toast.error('启封失败');
      }
    };
  

  const handleConfirmDelivery = async (batch: ExamBatch) => {
    setDeliveryBatch(batch);
    try {
      const records = await handoverApi.list({ batchId: batch.id, status: 'pending' });
      const recordsData = Array.isArray(records) ? records : (records as any).data || [];
      setDeliveryHandoverRecords(recordsData);
      setOpenDeliveryDialog(true);
    } catch (error) {
      toast.error('加载交接记录失败');
    }
  };

  const handleConfirmDeliverySubmit = async () => {
    if (!deliveryBatch) return;
    try {
      await batchesApi.updateStatus(deliveryBatch.id, BatchStatus.DELIVERED);
      toast.success('已确认入库');
      setOpenDeliveryDialog(false);
      setDeliveryBatch(null);
      setDeliveryHandoverRecords([]);
      loadData();
    } catch (error) {
        toast.error('确认失败');
      }
    };
  

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

  const batchColumns: GridColDef<ExamBatch>[] = [
    { field: 'batchCode', headerName: '批次号', width: 130 },
    { field: 'examName', headerName: '考试名称', width: 180 },
    { field: 'subject', headerName: '科目', width: 120 },
    {
      field: 'unsealTime',
      headerName: '启封时间',
      width: 180,
      valueFormatter: (params) => dayjs(params.value).format('YYYY-MM-DD HH:mm'),
    },
    {
      field: 'status',
      headerName: '状态',
      width: 120,
      renderCell: (params: GridRenderCellParams<ExamBatch>) => (
        <Chip
          label={statusLabels[params.value as BatchStatus]}
          size="small"
          sx={{
            bgcolor: `${statusColors[params.value as BatchStatus]}25`,
            color: statusColors[params.value as BatchStatus],
          }}
        />
      ),
    },
    {
      field: 'actions',
      headerName: '操作',
      width: 200,
      sortable: false,
      renderCell: (params: GridRenderCellParams<ExamBatch>) => (
        <Box>
          <IconButton
            size="small"
            color="primary"
            onClick={() => setSelectedBatch(params.row)}
            title="查看详情"
          >
            <ViewIcon fontSize="small" />
          </IconButton>
          {params.row.status === BatchStatus.IN_TRANSIT && (
            <IconButton
              size="small"
              color="success"
              onClick={() => handleConfirmDelivery(params.row)}
              title="确认入库"
            >
              <CheckIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      ),
    },
  ];

  const packageColumns: GridColDef<ExamPackage>[] = [
    { field: 'packageCode', headerName: '试卷包编号', width: 150 },
    { field: 'subject', headerName: '科目', width: 120 },
    { field: 'examSite', headerName: '考点', width: 150 },
    {
      field: 'sealed',
      headerName: '密封状态',
      width: 100,
      renderCell: (params: GridRenderCellParams<ExamPackage>) => (
        <Chip
          label={params.value ? '已密封' : '已启封'}
          size="small"
          color={params.value ? 'success' : 'default'}
        />
      ),
    },
    {
      field: 'actions',
      headerName: '操作',
      width: 200,
      sortable: false,
      renderCell: (params: GridRenderCellParams<ExamPackage>) => (
        <Box>
          <IconButton
            size="small"
            color="primary"
            onClick={() => handleViewPackage(params.row)}
            title="查看信息"
          >
            <ViewIcon fontSize="small" />
          </IconButton>
          {params.row.sealed && (
            <IconButton
              size="small"
              color="success"
              onClick={() => handleUnseal(params.row)}
              title="启封"
              disabled={!canUnseal}
            >
              <UnsealIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      ),
    },
  ];

  const inTransitCount = deliveredBatches.filter(b => b.status === BatchStatus.IN_TRANSIT).length;
  const deliveredCount = deliveredBatches.filter(b => b.status === BatchStatus.DELIVERED).length;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <div>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            考点管理
          </Typography>
          <Typography variant="body2" color="text.secondary">
            考点主任 - 确认入库与启封管理
          </Typography>
        </div>
      </Box>

      {!canUnseal && selectedBatch && (
        <Alert severity="warning" sx={{ mb: 3 }} icon={<TimeIcon />}>
          未到启封时间，请在 {dayjs(selectedBatch.unsealTime).format('YYYY-MM-DD HH:mm:ss')} 后启封
          {timeUntilUnseal && `（还需等待：${timeUntilUnseal}）`}
        </Alert>
      )}

      {canUnseal && selectedBatch && (
        <Alert severity="success" sx={{ mb: 3 }} icon={<UnsealIcon />}>
          已到启封时间，可以进行启封操作
        </Alert>
      )}

      {inTransitCount > 0 && (
        <Alert severity="info" sx={{ mb: 3 }} icon={<InventoryIcon />}>
          您有 {inTransitCount} 个批次正在运输中，待确认入库
        </Alert>
      )}

      {loading ? (
        <LinearProgress />
      ) : (
        <>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={3}>
              <Card sx={{ height: '100%', borderRadius: 3 }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" fontWeight="bold" color="#ff5722">
                    {inTransitCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    待入库
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ height: '100%', borderRadius: 3 }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" fontWeight="bold" color="#4caf50">
                    {deliveredCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    已入库
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ height: '100%', borderRadius: 3 }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" fontWeight="bold" color="#00bcd4">
                    {unsealRecords.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    已启封
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ height: '100%', borderRadius: 3 }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" fontWeight="bold" color="#9c27b0">
                    {deliveredBatches.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    总批次
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {selectedBatch ? (
            <Box>
              <Button onClick={() => setSelectedBatch(null)} sx={{ mb: 2 }}>
                ← 返回批次列表
              </Button>
              <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  {selectedBatch.examName} - 批次详情
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="text.secondary">批次号</Typography>
                    <Typography variant="body1" fontWeight="medium">{selectedBatch.batchCode}</Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="text.secondary">科目</Typography>
                    <Typography variant="body1" fontWeight="medium">{selectedBatch.subject}</Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="text.secondary">考试时间</Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {dayjs(selectedBatch.examDate).format('YYYY-MM-DD HH:mm')}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="text.secondary">启封时间</Typography>
                    <Typography variant="body1" fontWeight="medium" color={canUnseal ? 'success.main' : 'warning.main'}>
                      {dayjs(selectedBatch.unsealTime).format('YYYY-MM-DD HH:mm')}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="text.secondary">试卷包总数</Typography>
                    <Typography variant="body1" fontWeight="medium">{selectedBatch.totalPackages}份</Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="text.secondary">状态</Typography>
                    <Chip
                      label={statusLabels[selectedBatch.status]}
                      size="small"
                      sx={{
                        bgcolor: `${statusColors[selectedBatch.status]}25`,
                        color: statusColors[selectedBatch.status],
                      }}
                    />
                  </Grid>
                </Grid>
              </Paper>

              <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <Tabs
                  value={tabValue}
                  onChange={(_, newValue) => setTabValue(newValue)}
                  textColor="primary"
                  indicatorColor="primary"
                >
                  <Tab label="试卷包列表" />
                  <Tab label="启封记录" />
                </Tabs>
              </Box>

              <TabPanel value={tabValue} index={0}>
                <Paper sx={{ borderRadius: 3 }}>
                  <DataGrid
                    rows={packages}
                    columns={packageColumns}
                    getRowId={(row) => row.id}
                    initialState={{ pagination: { paginationModel: { pageSize: 10 } }}}
                    pageSizeOptions={[5, 10, 25]}
                    disableRowSelectionOnClick
                    sx={{ p: 2 }}
                  />
                </Paper>
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                <Paper sx={{ p: 3, borderRadius: 3 }}>
                  {unsealRecords.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" align="center">
                      暂无启封记录
                    </Typography>
                  ) : (
                    unsealRecords.map((record) => (
                      <Paper key={record.id} sx={{ p: 2, mb: 2, borderRadius: 2 }}>
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={3}>
                            <Typography variant="body2" color="text.secondary">试卷包ID</Typography>
                            <Typography variant="body1">{record.packageId.substring(0, 12)}</Typography>
                          </Grid>
                          <Grid item xs={12} md={3}>
                            <Typography variant="body2" color="text.secondary">启封时间</Typography>
                            <Typography variant="body1">{dayjs(record.unsealedAt).format('YYYY-MM-DD HH:mm')}</Typography>
                          </Grid>
                          <Grid item xs={12} md={3}>
                            <Typography variant="body2" color="text.secondary">启封人</Typography>
                            <Typography variant="body1">{record.unsealedBy}</Typography>
                          </Grid>
                          <Grid item xs={12} md={3}>
                            <Typography variant="body2" color="text.secondary">见证人</Typography>
                            <Typography variant="body1">{record.witnesses.join(', ') || '-'}</Typography>
                          </Grid>
                        </Grid>
                      </Paper>
                    ))
                  )}
                </Paper>
              </TabPanel>
            </Box>
          ) : (
            <Paper sx={{ borderRadius: 3 }}>
              <DataGrid
                rows={deliveredBatches}
                columns={batchColumns}
                getRowId={(row) => row.id}
                initialState={{ pagination: { paginationModel: { pageSize: 10 } }}}
                pageSizeOptions={[5, 10, 25]}
                disableRowSelectionOnClick
                sx={{ p: 2 }}
              />
            </Paper>
          )}
        </>
      )}

      <Dialog
        open={openPackageDialog}
        onClose={() => { setOpenPackageDialog(false); setPackageInfo(null); setSelectedPackage(null); }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>试卷包信息</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {packageInfo && selectedPackage && (
              <>
                <Paper sx={{ p: 3, bgcolor: 'grey.50', mb: 2 }}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    {selectedPackage.packageCode}
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="text.secondary">科目</Typography>
                      <Typography variant="body1">{packageInfo.subject || selectedPackage.subject}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="text.secondary">考点</Typography>
                      <Typography variant="body1">{packageInfo.examSite || selectedPackage.examSite || '未分配'}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="text.secondary">密封状态</Typography>
                      <Chip
                        label={packageInfo.sealed ? '已密封' : '已启封'}
                        size="small"
                        color={packageInfo.sealed ? 'success' : 'default'}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="text.secondary">试卷份数</Typography>
                      <Typography variant="body1">{packageInfo.paperCount || '30份'}</Typography>
                    </Grid>
                  </Grid>
                </Paper>
                {packageInfo.contents && (
                  <Paper sx={{ p: 3, borderRadius: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>试卷内容</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {packageInfo.contents}
                    </Typography>
                  </Paper>
                )}
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpenPackageDialog(false); setPackageInfo(null); setSelectedPackage(null); }}>
            关闭
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openUnsealDialog}
        onClose={() => { setOpenUnsealDialog(false); setSelectedPackage(null); }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>启封试卷包</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert severity="warning" icon={<WarningIcon />}>
              启封操作不可逆，请确认在规定时间和地点进行，并有见证人在场
            </Alert>
            {selectedPackage && (
              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="body1" fontWeight="bold">
                  {selectedPackage.packageCode}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  科目：{selectedPackage.subject}
                </Typography>
              </Paper>
            )}
            <TextField
              label="见证人（多人用逗号分隔）"
              fullWidth
              value={formData.witnesses}
              onChange={(e) => setFormData({ ...formData, witnesses: e.target.value })}
              placeholder="例如：张三, 李四"
            />
            <TextField
              label="备注"
              fullWidth
              multiline
              rows={2}
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              placeholder="可选：启封情况说明"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpenUnsealDialog(false); setSelectedPackage(null); }}>取消</Button>
          <Button
            onClick={handleConfirmUnseal}
            variant="contained"
            color="success"
            startIcon={<UnsealIcon />}
          >
            确认启封
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openDeliveryDialog}
        onClose={() => { setOpenDeliveryDialog(false); setDeliveryBatch(null); setDeliveryHandoverRecords([]); }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>确认入库</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert severity="info" icon={<InventoryIcon />}>
              请核对以下封签箱的封签状态和到达说明，确认无误后再进行入库操作
            </Alert>
            {deliveryBatch && (
              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  批次信息
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">批次号</Typography>
                    <Typography variant="body1">{deliveryBatch.batchCode}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">考试名称</Typography>
                    <Typography variant="body1">{deliveryBatch.examName}</Typography>
                  </Grid>
                </Grid>
              </Paper>
            )}
            {deliveryHandoverRecords.length === 0 ? (
              <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
                暂无待接收的交接记录
              </Typography>
            ) : (
              deliveryHandoverRecords.map((record) => {
                const box = sealBoxes.find(b => b.id === record.boxId);
                return (
                  <Paper key={record.id} sx={{ p: 2, borderRadius: 2 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={4}>
                        <Typography variant="body2" color="text.secondary">封签箱</Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {box?.boxNumber || record.boxId.substring(0, 8)}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Typography variant="body2" color="text.secondary">封签状态</Typography>
                        <Chip
                          label={record.sealIntact ? '完好' : '破损'}
                          size="small"
                          color={record.sealIntact ? 'success' : 'error'}
                          sx={{ mt: 0.5 }}
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Typography variant="body2" color="text.secondary">押运员</Typography>
                        <Typography variant="body1">
                          {record.fromUserId ? record.fromUserId.substring(0, 8) : '-'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          到达说明
                        </Typography>
                        <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'grey.50' }}>
                          <Typography variant="body2">
                            {record.arrivalRemark || '暂无到达说明'}
                          </Typography>
                        </Paper>
                      </Grid>
                    </Grid>
                  </Paper>
                );
              })
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpenDeliveryDialog(false); setDeliveryBatch(null); setDeliveryHandoverRecords([]); }}>
            取消
          </Button>
          <Button
            onClick={handleConfirmDeliverySubmit}
            variant="contained"
            color="success"
            startIcon={<CheckIcon />}
          >
            确认入库
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExamSite;
