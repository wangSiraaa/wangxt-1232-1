import React, { useState, useEffect, useRef } from 'react';
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
  Divider,
  FormControlLabel,
  Checkbox,
  Alert,
  Tabs,
  Tab,
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
  QrCodeScanner as ScanIcon,
  Check as AcceptIcon,
  Close as RejectIcon,
  Send as SendIcon,
  LocalShipping as ShippingIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { handoverApi, sealBoxesApi, batchesApi } from '@/api/client';
import { HandoverRecord, HandoverStatus, SealBox, ExamBatch, BatchStatus, UserRole } from '@/types';
import { toast } from 'react-toastify';
import { useAuth } from '@/hooks/useAuth';
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

const Escort: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [incoming, setIncoming] = useState<HandoverRecord[]>([]);
  const [outgoing, setOutgoing] = useState<HandoverRecord[]>([]);
  const [allBatches, setAllBatches] = useState<ExamBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [openScanDialog, setOpenScanDialog] = useState(false);
  const [openHandoverDialog, setOpenHandoverDialog] = useState(false);
  const [scannedBox, setScannedBox] = useState<SealBox | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<ExamBatch | null>(null);
  const [formData, setFormData] = useState({
    toUserId: '',
    remarks: '',
    sealIntact: true,
  });
  const [qrInput, setQrInput] = useState('');
  const { hasRole } = useAuth();

  const loadData = async () => {
    setLoading(true);
    try {
      const [incomingRes, outgoingRes, batchesRes] = await Promise.all([
        handoverApi.myIncoming(),
        handoverApi.myOutgoing(),
        batchesApi.list({ status: `${BatchStatus.SEALED},${BatchStatus.IN_TRANSIT}` }),
      ]);

      setIncoming(Array.isArray(incomingRes) ? incomingRes : (incomingRes as any).data || []);
      setOutgoing(Array.isArray(outgoingRes) ? outgoingRes : (outgoingRes as any).data || []);
      setAllBatches(Array.isArray(batchesRes) ? batchesRes : (batchesRes as any).data || []);
    } catch (error) {
        toast.error('加载数据失败');
      } finally {
        setLoading(false);
      }
    };
  

  useEffect(() => {
    loadData();
  }, []);

  const handleScan = async () => {
    if (!qrInput.trim()) {
      toast.error('请输入或扫描二维码数据');
      return;
    }

    try {
      const res = await handoverApi.scan(qrInput);
      const box = (res as any).box || res;
      setScannedBox(box);
      setQrInput('');
      setOpenScanDialog(false);
      setOpenHandoverDialog(true);
    } catch (error) {
        toast.error('二维码无效或已过期');
      }
    };
  

  const handleCreateHandover = async () => {
    if (!scannedBox || !formData.toUserId) {
      toast.error('请选择接收人');
      return;
    }

    try {
      await handoverApi.create({
        boxId: scannedBox.id,
        toUserId: formData.toUserId,
        sealIntact: formData.sealIntact,
        remarks: formData.remarks,
      });
      toast.success('交接创建成功');
      setOpenHandoverDialog(false);
      setScannedBox(null);
      setFormData({ toUserId: '', remarks: '', sealIntact: true });
      loadData();
    } catch (error) {
        toast.error('创建交接失败');
      }
    };
  

  const handleAccept = async (record: HandoverRecord) => {
    if (!confirm('确认接收此封签箱？请检查封签是否完好。')) return;
    try {
      await handoverApi.accept(record.id, {
        sealIntact: true,
        remarks: '已确认接收',
      });
      toast.success('接收成功');
      loadData();
    } catch (error) {
        toast.error('接收失败');
      }
    };
  

  const handleReject = async (record: HandoverRecord) => {
    const reason = prompt('请输入拒绝原因：');
    if (!reason) return;
    try {
      await handoverApi.reject(record.id, {
        sealIntact: false,
        remarks: reason,
      });
      toast.success('已拒绝');
      loadData();
    } catch (error) {
        toast.error('操作失败');
      }
    };
  

  const statusColors: Record<HandoverStatus, string> = {
    [HandoverStatus.PENDING]: '#ff9800',
    [HandoverStatus.CONFIRMED]: '#4caf50',
    [HandoverStatus.REJECTED]: '#f44336',
  };

  const statusLabels: Record<HandoverStatus, string> = {
    [HandoverStatus.PENDING]: '待确认',
    [HandoverStatus.CONFIRMED]: '已确认',
    [HandoverStatus.REJECTED]: '已拒绝',
  };

  const roleLabels: Record<UserRole, string> = {
    [UserRole.ADMIN]: '管理员',
    [UserRole.PROPOSITION_CENTER]: '命题中心',
    [UserRole.PRINTING_FACTORY]: '印刷厂',
    [UserRole.ESCORT]: '押运人员',
    [UserRole.EXAM_SITE]: '考点主任',
  };

  const incomingColumns: GridColDef<HandoverRecord>[] = [
    {
      field: 'boxId',
      headerName: '箱号',
      width: 120,
      renderCell: (params: GridRenderCellParams<HandoverRecord>) => {
        const batch = allBatches.find(b => b.id === params.row.batchId);
        const boxNum = batch ? `BOX-${params.row.boxId.substring(0, 4)}` : params.row.boxId.substring(0, 8);
        return <Typography variant="body2">{boxNum}</Typography>;
      },
    },
    {
      field: 'fromRole',
      headerName: '来自',
      width: 120,
      valueFormatter: (params) => roleLabels[params.value as UserRole] || params.value,
    },
    {
      field: 'status',
      headerName: '状态',
      width: 100,
      renderCell: (params: GridRenderCellParams<HandoverRecord>) => (
        <Chip
          label={statusLabels[params.value as HandoverStatus]}
          size="small"
          sx={{
            bgcolor: `${statusColors[params.value as HandoverStatus]}25`,
            color: statusColors[params.value as HandoverStatus],
          }}
        />
      ),
    },
    {
      field: 'sealIntact',
      headerName: '封签状态',
      width: 100,
      renderCell: (params: GridRenderCellParams<HandoverRecord>) => (
        <Chip
          label={params.value ? '完好' : '破损'}
          size="small"
          color={params.value ? 'success' : 'error'}
        />
      ),
    },
    {
      field: 'createdAt',
      headerName: '创建时间',
      width: 180,
      valueFormatter: (params) => dayjs(params.value).format('YYYY-MM-DD HH:mm'),
    },
    {
      field: 'actions',
      headerName: '操作',
      width: 150,
      sortable: false,
      renderCell: (params: GridRenderCellParams<HandoverRecord>) => {
        if (params.row.status !== HandoverStatus.PENDING) return null;
        return (
          <Box>
            <IconButton
              size="small"
              color="success"
              onClick={() => handleAccept(params.row)}
              title="确认接收"
            >
              <AcceptIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              color="error"
              onClick={() => handleReject(params.row)}
              title="拒绝"
            >
              <RejectIcon fontSize="small" />
            </IconButton>
          </Box>
        );
      },
    },
  ];

  const outgoingColumns: GridColDef<HandoverRecord>[] = [
    {
      field: 'boxId',
      headerName: '箱号',
      width: 120,
      renderCell: (params: GridRenderCellParams<HandoverRecord>) => {
        return params.row.boxId.substring(0, 8);
      },
    },
    {
      field: 'toRole',
      headerName: '发往',
      width: 120,
      valueFormatter: (params) => roleLabels[params.value as UserRole] || params.value,
    },
    {
      field: 'status',
      headerName: '状态',
      width: 100,
      renderCell: (params: GridRenderCellParams<HandoverRecord>) => (
        <Chip
          label={statusLabels[params.value as HandoverStatus]}
          size="small"
          sx={{
            bgcolor: `${statusColors[params.value as HandoverStatus]}25`,
            color: statusColors[params.value as HandoverStatus],
          }}
        />
      ),
    },
    {
      field: 'createdAt',
      headerName: '创建时间',
      width: 180,
      valueFormatter: (params) => dayjs(params.value).format('YYYY-MM-DD HH:mm'),
    },
    {
      field: 'confirmedAt',
      headerName: '确认时间',
      width: 180,
      valueFormatter: (params) => params.value ? dayjs(params.value).format('YYYY-MM-DD HH:mm') : '-',
    },
  ];

  const canSendOut = hasRole([UserRole.PRINTING_FACTORY, UserRole.ESCORT]);
  const pendingCount = incoming.filter(h => h.status === HandoverStatus.PENDING).length;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <div>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            押运交接
          </Typography>
          <Typography variant="body2" color="text.secondary">
            扫描二维码进行交接流转
          </Typography>
        </div>
        {canSendOut && (
          <Button
            variant="contained"
            startIcon={<ScanIcon />}
            onClick={() => setOpenScanDialog(true)}
            sx={{ backgroundColor: '#1a237e' }}
          >
            扫码交接
          </Button>
        )}
      </Box>

      {pendingCount > 0 && (
        <Alert severity="info" sx={{ mb: 3 }} icon={<ShippingIcon />}>
          您有 {pendingCount} 个待接收的交接，请及时处理！
        </Alert>
      )}

      {loading ? (
        <LinearProgress />
      ) : (
        <>
          <Paper sx={{ borderRadius: 3, mb: 3 }}>
            <Grid container spacing={0}>
              <Grid item xs={12} md={3}>
                <Card sx={{ height: '100%', borderRadius: 3, borderRight: { md: 1, xs: 0 }, borderBottom: { md: 0, xs: 1 }, borderColor: 'divider' }}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" fontWeight="bold" color="#1a237e">
                      {incoming.filter(h => h.status === HandoverStatus.PENDING).length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      待接收
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card sx={{ height: '100%', borderRadius: 3, borderRight: { md: 1, xs: 0 }, borderBottom: { md: 0, xs: 1 }, borderColor: 'divider' }}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" fontWeight="bold" color="#4caf50">
                      {incoming.filter(h => h.status === HandoverStatus.CONFIRMED).length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      已接收
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card sx={{ height: '100%', borderRadius: 3, borderRight: { md: 1, xs: 0 }, borderBottom: { md: 0, xs: 1 }, borderColor: 'divider' }}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" fontWeight="bold" color="#ff9800">
                      {outgoing.filter(h => h.status === HandoverStatus.PENDING).length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      待确认发出
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card sx={{ height: '100%', borderRadius: 3 }}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" fontWeight="bold" color="#9c27b0">
                      {outgoing.filter(h => h.status === HandoverStatus.CONFIRMED).length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      已完成发出
                    </Typography>
                  </CardContent>
                </Card>
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
              <Tab label="待接收" />
              <Tab label="已发出" />
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={0}>
            <Paper sx={{ borderRadius: 3 }}>
              <DataGrid
                rows={incoming}
                columns={incomingColumns}
                getRowId={(row) => row.id}
                initialState={{ pagination: { paginationModel: { pageSize: 10 } }}}
                pageSizeOptions={[5, 10, 25]}
                disableRowSelectionOnClick
                sx={{ p: 2 }}
              />
            </Paper>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Paper sx={{ borderRadius: 3 }}>
              <DataGrid
                rows={outgoing}
                columns={outgoingColumns}
                getRowId={(row) => row.id}
                initialState={{ pagination: { paginationModel: { pageSize: 10 } }}}
                pageSizeOptions={[5, 10, 25]}
                disableRowSelectionOnClick
                sx={{ p: 2 }}
              />
            </Paper>
          </TabPanel>
        </>
      )}

      <Dialog
        open={openScanDialog}
        onClose={() => { setOpenScanDialog(false); setQrInput(''); }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>扫描二维码</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert severity="info">
              请使用摄像头扫描封签箱上的二维码，或手动输入二维码数据
            </Alert>
            <TextField
              label="二维码数据"
              fullWidth
              multiline
              rows={4}
              value={qrInput}
              onChange={(e) => setQrInput(e.target.value)}
              placeholder="在此粘贴或输入扫描到的二维码数据..."
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => toast.info('摄像头扫描功能需要在实际设备上使用')}
              >
                摄像头扫描
              </Button>
              <Button
                fullWidth
                variant="contained"
                onClick={handleScan}
                sx={{ backgroundColor: '#1a237e' }}
              >
                确认扫描
              </Button>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpenScanDialog(false); setQrInput(''); }}>取消</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openHandoverDialog}
        onClose={() => { setOpenHandoverDialog(false); setScannedBox(null); }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>创建交接</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {scannedBox && (
              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  封签箱信息
                </Typography>
                <Typography variant="body2">箱号：{scannedBox.boxNumber}</Typography>
                <Typography variant="body2">试卷包数：{scannedBox.packageCount}</Typography>
                <Typography variant="body2">
                  封签状态：
                  <Chip
                    label={scannedBox.sealStatus === 'intact' ? '完好' : '破损'}
                    size="small"
                    sx={{ ml: 1 }}
                    color={scannedBox.sealStatus === 'intact' ? 'success' : 'error'}
                  />
                </Typography>
              </Paper>
            )}
            <TextField
              label="接收人ID"
              fullWidth
              value={formData.toUserId}
              onChange={(e) => setFormData({ ...formData, toUserId: e.target.value })}
              placeholder="输入接收人用户ID"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.sealIntact}
                  onChange={(e) => setFormData({ ...formData, sealIntact: e.target.checked })}
                />
              }
              label="封签完好"
            />
            {!formData.sealIntact && (
              <Alert severity="warning" icon={<WarningIcon />}>
                封签破损将自动进入异常流程！
              </Alert>
            )}
            <TextField
              label="备注"
              fullWidth
              multiline
              rows={2}
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              placeholder="可选：添加备注信息"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpenHandoverDialog(false); setScannedBox(null); }}>取消</Button>
          <Button
            onClick={handleCreateHandover}
            variant="contained"
            startIcon={<SendIcon />}
            sx={{ backgroundColor: '#1a237e' }}
          >
            发送交接
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Escort;
