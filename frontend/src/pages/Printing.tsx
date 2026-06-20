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
  CardActions,
  Divider,
  MenuItem,
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
  Add as AddIcon,
  Lock as SealIcon,
  QrCode as QrCodeIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { batchesApi, sealBoxesApi, packagesApi } from '@/api/client';
import { ExamBatch, BatchStatus, SealBox, ExamPackage } from '@/types';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';

const Printing: React.FC = () => {
  const [batches, setBatches] = useState<ExamBatch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<ExamBatch | null>(null);
  const [sealBoxes, setSealBoxes] = useState<SealBox[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openQrDialog, setOpenQrDialog] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const [formData, setFormData] = useState({
    batchId: '',
    boxNumber: '',
    packageCount: 5,
  });
  const [packages, setPackages] = useState<ExamPackage[]>([]);
  const [viewBox, setViewBox] = useState<SealBox | null>(null);

  const loadBatches = async () => {
    setLoading(true);
    try {
      const res = await batchesApi.list({ status: `${BatchStatus.CREATED},${BatchStatus.PRINTING}` });
      const data = Array.isArray(res) ? res : (res as any).data || [];
      setBatches(data);
    } catch (error) {
        toast.error('加载批次列表失败');
      } finally {
        setLoading(false);
      }
    };
  

  const loadSealBoxes = async (batchId?: string) => {
    setLoading(true);
    try {
      const params = batchId ? { batchId } : {};
      const res = await sealBoxesApi.list(params);
      const data = Array.isArray(res) ? res : (res as any).data || [];
      setSealBoxes(data);
    } catch (error) {
        toast.error('加载封签箱列表失败');
      } finally {
        setLoading(false);
      }
    };
  

  useEffect(() => {
    loadBatches();
    loadSealBoxes();
  }, []);

  useEffect(() => {
    if (selectedBatch) {
      loadSealBoxes(selectedBatch.id);
    }
  }, [selectedBatch]);

  const handleCreateBox = async () => {
    if (!formData.batchId || !formData.boxNumber || formData.packageCount <= 0) {
      toast.error('请填写完整信息');
      return;
    }

    try {
      await sealBoxesApi.create(formData);
      toast.success('封签箱创建成功');
      setOpenDialog(false);
      loadSealBoxes(formData.batchId);
      setFormData({ batchId: '', boxNumber: '', packageCount: 5 });
    } catch (error) {
        toast.error('创建失败');
      }
    };
  

  const handleSeal = async (id: string) => {
    if (!confirm('确认封签？封签后将生成加密二维码。')) return;
    try {
      await sealBoxesApi.seal(id);
      toast.success('封签成功，二维码已生成');
      loadSealBoxes(selectedBatch?.id);
    } catch (error) {
        toast.error('封签失败');
      }
    };
  

  const handleViewQr = async (boxId: string) => {
    try {
      const res = await sealBoxesApi.getQrCode(boxId);
      setQrCodeData((res as any).qrCode || res);
      setOpenQrDialog(true);
    } catch (error) {
        toast.error('获取二维码失败');
      }
    };
  

  const handleViewPackages = async (box: SealBox) => {
    setViewBox(box);
    const res = await packagesApi.listByBox(box.id);
    const data = Array.isArray(res) ? res : (res as any).data || [];
    setPackages(data);
  };

  const handleUpdateBatchStatus = async (batchId: string, status: BatchStatus) => {
    if (!confirm(`确认将批次状态更新为"${status === BatchStatus.PRINTING ? '印刷中' : '已封签'}"吗？`)) return;
    try {
      await batchesApi.updateStatus(batchId, status);
      toast.success('状态更新成功');
      loadBatches();
      if (selectedBatch?.id === batchId) {
        setSelectedBatch({ ...selectedBatch, status });
      }
    } catch (error) {
        toast.error('状态更新失败');
      }
    };
  

  const columns: GridColDef<SealBox>[] = [
    { field: 'boxNumber', headerName: '箱号', width: 120 },
    { field: 'packageCount', headerName: '试卷包数', width: 100 },
    {
      field: 'sealStatus',
      headerName: '封签状态',
      width: 100,
      renderCell: (params: GridRenderCellParams<SealBox>) => (
        <Chip
          label={params.value === 'intact' ? '完好' : '破损'}
          size="small"
          color={params.value === 'intact' ? 'success' : 'error'}
        />
      ),
    },
    {
      field: 'sealedAt',
      headerName: '封签时间',
      width: 180,
      valueFormatter: (params) => params.value ? dayjs(params.value).format('YYYY-MM-DD HH:mm') : '未封签',
    },
    {
      field: 'actions',
      headerName: '操作',
      width: 200,
      sortable: false,
      renderCell: (params: GridRenderCellParams<SealBox>) => (
        <Box>
          {!params.row.sealedAt && (
            <IconButton
            size="small"
            color="primary"
            onClick={() => handleSeal(params.row.id)}
            title="封签"
          >
            <SealIcon fontSize="small" />
          </IconButton>
          )}
          {params.row.sealedAt && (
            <IconButton
            size="small"
            color="secondary"
            onClick={() => handleViewQr(params.row.id)}
            title="查看二维码"
          >
            <QrCodeIcon fontSize="small" />
          </IconButton>
          )}
          <IconButton
            size="small"
            onClick={() => handleViewPackages(params.row)}
            title="查看试卷包"
          >
            <ViewIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  const availableBatches = batches.filter(b => 
    [BatchStatus.CREATED, BatchStatus.PRINTING].includes(b.status)
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <div>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            印刷封签
          </Typography>
          <Typography variant="body2" color="text.secondary">
            印刷厂 - 登记封签箱号并生成加密二维码
          </Typography>
        </div>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
          sx={{ backgroundColor: '#1a237e' }}
          disabled={!selectedBatch}
        >
          登记封签箱
        </Button>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {availableBatches.length === 0 ? (
          <Grid item xs={12}>
          <Paper sx={{ p: 3, borderRadius: 3, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              暂无待印刷的批次
            </Typography>
          </Paper>
        </Grid>
        ) : (
          availableBatches.map((batch) => (
          <Grid item xs={12} md={6} lg={4} key={batch.id}>
            <Card
              sx={{
                borderRadius: 3,
                border: selectedBatch?.id === batch.id ? 2 : 0,
                borderColor: '#1a237e',
                cursor: 'pointer',
              }}
              onClick={() => setSelectedBatch(batch)}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      {batch.examName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {batch.batchCode}
                    </Typography>
                  </Box>
                  <Chip
                    label={batch.status === BatchStatus.CREATED ? '待印刷' : '印刷中'}
                    size="small"
                    color={batch.status === BatchStatus.CREATED ? 'default' : 'primary'}
                  />
                </Box>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2">
                    <strong>科目：</strong>{batch.subject}
                  </Typography>
                  <Typography variant="body2">
                    <strong>考试时间：</strong>
                    {dayjs(batch.examDate).format('YYYY-MM-DD HH:mm')}
                  </Typography>
                  <Typography variant="body2">
                    <strong>启封时间：</strong>
                    {dayjs(batch.unsealTime).format('YYYY-MM-DD HH:mm')}
                  </Typography>
                  <Typography variant="body2">
                    <strong>试卷包总数：</strong>{batch.totalPackages}份
                  </Typography>
                </Box>
              </CardContent>
              <CardActions>
                {batch.status === BatchStatus.CREATED && (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUpdateBatchStatus(batch.id, BatchStatus.PRINTING);
                    }}
                  >
                    开始印刷
                  </Button>
                )}
                {batch.status === BatchStatus.PRINTING && sealBoxes.filter(
                  sb => sb.batchId === batch.id && sb.sealedAt).length > 0 && (
                  <Button
                    size="small"
                    variant="outlined"
                    color="success"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUpdateBatchStatus(batch.id, BatchStatus.SEALED);
                    }}
                  >
                    完成封签
                  </Button>
                )}
              </CardActions>
            </Card>
          </Grid>
        ))
      )}
      </Grid>

      {selectedBatch && (
        <Box>
          <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
            {selectedBatch.examName} - 封签箱列表
          </Typography>
          {loading ? (
            <LinearProgress />
          ) : (
            <Paper sx={{ borderRadius: 3 }}>
              <DataGrid
                rows={sealBoxes.filter(sb => sb.batchId === selectedBatch.id)}
                columns={columns}
                getRowId={(row) => row.id}
                initialState={{
                  pagination: { paginationModel: { pageSize: 10 } }
                }}
                pageSizeOptions={[5, 10, 25]}
                disableRowSelectionOnClick
                sx={{ p: 2 }}
              />
            </Paper>
          )}
        </Box>
      )}

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>登记封签箱</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              select
              label="选择批次"
              fullWidth
              value={formData.batchId}
              onChange={(e) => setFormData({ ...formData, batchId: e.target.value })}
            >
              {availableBatches.map((batch) => (
                <MenuItem key={batch.id} value={batch.id}>
                  {batch.examName} ({batch.batchCode})
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="箱号"
              fullWidth
              value={formData.boxNumber}
              onChange={(e) => setFormData({ ...formData, boxNumber: e.target.value })}
              placeholder="例如：BOX-001"
            />
            <TextField
              label="试卷包数量"
              type="number"
              fullWidth
              value={formData.packageCount}
              onChange={(e) => setFormData({ ...formData, packageCount: parseInt(e.target.value) || 0 })}
              InputProps={{ inputProps: { min: 1 } }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>取消</Button>
          <Button onClick={handleCreateBox} variant="contained" sx={{ backgroundColor: '#1a237e' }}>
            创建
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openQrDialog}
        onClose={() => setOpenQrDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>封签二维码</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            {qrCodeData && (
              <img
                src={`data:image/png;base64,${qrCodeData}`}
                alt="二维码"
                style={{ width: 256, height: 256 }}
              />
            )}
          </Box>
          <Typography variant="body2" color="text.secondary" align="center">
            扫描此二维码进行交接
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenQrDialog(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!viewBox}
        onClose={() => { setViewBox(null); setPackages([]); }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {viewBox?.boxNumber} - 试卷包列表
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {packages.map((pkg) => (
              <Paper key={pkg.id} sx={{ p: 2, mb: 1, borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="body1" fontWeight="medium">
                      {pkg.packageCode}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      科目：{pkg.subject} | 考点：{pkg.examSite || '未分配'}
                    </Typography>
                  </Box>
                  <Chip
                    label={pkg.sealed ? '已密封' : '未密封'}
                    size="small"
                    color={pkg.sealed ? 'success' : 'warning'}
                  />
                </Box>
              </Paper>
            ))}
            {packages.length === 0 && (
              <Typography variant="body2" color="text.secondary" align="center">
                暂无试卷包
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setViewBox(null); setPackages([]); }}>
            关闭
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Printing;
