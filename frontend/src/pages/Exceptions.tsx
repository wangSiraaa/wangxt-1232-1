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
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Grid,
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
  Warning as WarningIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  CheckCircle as CheckIcon,
  BugReport as BugIcon,
  Build as BuildIcon,
  Close as CloseIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { exceptionsApi, batchesApi } from '@/api/client';
import { ExceptionRecord, ExceptionType, ExceptionStatus, ExamBatch } from '@/types';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';

const Exceptions: React.FC = () => {
  const [exceptions, setExceptions] = useState<ExceptionRecord[]>([]);
  const [batches, setBatches] = useState<ExamBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [selectedException, setSelectedException] = useState<ExceptionRecord | null>(null);
  const [formData, setFormData] = useState({
    batchId: '',
    type: ExceptionType.OTHER,
    description: '',
    investigation: '',
    resolution: '',
  });
  const [isEdit, setIsEdit] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [excRes, batchRes] = await Promise.all([
        exceptionsApi.list(),
        batchesApi.list(),
      ]);
      setExceptions(Array.isArray(excRes) ? excRes : (excRes as any).data || []);
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

  const handleSubmit = async () => {
    if (!formData.batchId || !formData.type || !formData.description) {
      toast.error('请填写完整信息');
      return;
    }

    try {
      if (isEdit && selectedException) {
        await exceptionsApi.updateStatus(selectedException.id, selectedException.status, {
          investigation: formData.investigation,
          resolution: formData.resolution,
          description: formData.description,
        });
        toast.success('异常记录更新成功');
      } else {
        await exceptionsApi.create({
          batchId: formData.batchId,
          type: formData.type,
          description: formData.description,
        });
        toast.success('异常报告成功');
      }
      setOpenDialog(false);
      resetForm();
      loadData();
    } catch (error) {
        toast.error(isEdit ? '更新失败' : '报告失败');
      }
    };
  

  const handleUpdateStatus = async (id: string, status: ExceptionStatus) => {
    const statusLabels: Record<ExceptionStatus, string> = {
      [ExceptionStatus.REPORTED]: '已报告',
      [ExceptionStatus.INVESTIGATING]: '调查中',
      [ExceptionStatus.RESOLVED]: '已解决',
      [ExceptionStatus.CLOSED]: '已关闭',
    };

    if (!confirm(`确认将异常状态更新为"${statusLabels[status]}"吗？`)) return;

    try {
      await exceptionsApi.updateStatus(id, status);
      toast.success('状态更新成功');
      loadData();
    } catch (error) {
        toast.error('状态更新失败');
      }
    };
  

  const handleView = (record: ExceptionRecord) => {
    setSelectedException(record);
    setOpenViewDialog(true);
  };

  const handleEdit = (record: ExceptionRecord) => {
    setSelectedException(record);
    setFormData({
      batchId: record.batchId,
      type: record.type,
      description: record.description,
      investigation: record.investigation || '',
      resolution: record.resolution || '',
    });
    setIsEdit(true);
    setOpenDialog(true);
  };

  const resetForm = () => {
    setFormData({
      batchId: '',
      type: ExceptionType.OTHER,
      description: '',
      investigation: '',
      resolution: '',
    });
    setSelectedException(null);
    setIsEdit(false);
  };

  const typeLabels: Record<ExceptionType, string> = {
    [ExceptionType.SEAL_DAMAGED]: '封签破损',
    [ExceptionType.PACKAGE_MISSING]: '试卷包缺失',
    [ExceptionType.QUANTITY_MISMATCH]: '数量不匹配',
    [ExceptionType.OTHER]: '其他异常',
  };

  const statusLabels: Record<ExceptionStatus, string> = {
    [ExceptionStatus.REPORTED]: '已报告',
    [ExceptionStatus.INVESTIGATING]: '调查中',
    [ExceptionStatus.RESOLVED]: '已解决',
    [ExceptionStatus.CLOSED]: '已关闭',
  };

  const typeColors: Record<ExceptionType, string> = {
    [ExceptionType.SEAL_DAMAGED]: '#f44336',
    [ExceptionType.PACKAGE_MISSING]: '#ff9800',
    [ExceptionType.QUANTITY_MISMATCH]: '#9c27b0',
    [ExceptionType.OTHER]: '#607d8b',
  };

  const statusColors: Record<ExceptionStatus, string> = {
    [ExceptionStatus.REPORTED]: '#f44336',
    [ExceptionStatus.INVESTIGATING]: '#ff9800',
    [ExceptionStatus.RESOLVED]: '#4caf50',
    [ExceptionStatus.CLOSED]: '#607d8b',
  };

  const columns: GridColDef<ExceptionRecord>[] = [
    {
      field: 'type',
      headerName: '异常类型',
      width: 130,
      renderCell: (params: GridRenderCellParams<ExceptionRecord>) => (
        <Chip
          label={typeLabels[params.value as ExceptionType]}
          size="small"
          sx={{
            bgcolor: `${typeColors[params.value as ExceptionType]}25`,
            color: typeColors[params.value as ExceptionType],
          }}
        />
      ),
    },
    {
      field: 'batchId',
      headerName: '关联批次',
      width: 150,
      renderCell: (params: GridRenderCellParams<ExceptionRecord>) => {
        const batch = batches.find(b => b.id === params.value);
        return <Typography variant="body2">{batch?.batchCode || params.value.substring(0, 12)}</Typography>;
      },
    },
    {
      field: 'description',
      headerName: '异常描述',
      width: 250,
      valueFormatter: (params) => params.value?.substring(0, 50) + (params.value?.length > 50 ? '...' : ''),
    },
    {
      field: 'status',
      headerName: '状态',
      width: 120,
      renderCell: (params: GridRenderCellParams<ExceptionRecord>) => (
        <Chip
          label={statusLabels[params.value as ExceptionStatus]}
          size="small"
          sx={{
            bgcolor: `${statusColors[params.value as ExceptionStatus]}25`,
            color: statusColors[params.value as ExceptionStatus],
          }}
        />
      ),
    },
    {
      field: 'reportedBy',
      headerName: '报告人',
      width: 120,
    },
    {
      field: 'createdAt',
      headerName: '报告时间',
      width: 180,
      valueFormatter: (params) => dayjs(params.value).format('YYYY-MM-DD HH:mm'),
    },
    {
      field: 'actions',
      headerName: '操作',
      width: 250,
      sortable: false,
      renderCell: (params: GridRenderCellParams<ExceptionRecord>) => (
        <Box>
          <IconButton
            size="small"
            color="primary"
            onClick={() => handleView(params.row)}
            title="查看详情"
          >
            <ViewIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="warning"
            onClick={() => handleEdit(params.row)}
            title="编辑"
          >
            <EditIcon fontSize="small" />
          </IconButton>
          {params.row.status === ExceptionStatus.REPORTED && (
            <IconButton
              size="small"
              color="info"
              onClick={() => handleUpdateStatus(params.row.id, ExceptionStatus.INVESTIGATING)}
              title="开始调查"
            >
              <BuildIcon fontSize="small" />
            </IconButton>
          )}
          {params.row.status === ExceptionStatus.INVESTIGATING && (
            <IconButton
              size="small"
              color="success"
              onClick={() => handleUpdateStatus(params.row.id, ExceptionStatus.RESOLVED)}
              title="标记已解决"
            >
              <CheckIcon fontSize="small" />
            </IconButton>
          )}
          {params.row.status === ExceptionStatus.RESOLVED && (
            <IconButton
              size="small"
              color="default"
              onClick={() => handleUpdateStatus(params.row.id, ExceptionStatus.CLOSED)}
              title="关闭"
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      ),
    },
  ];

  const activeCount = exceptions.filter(e => 
    [ExceptionStatus.REPORTED, ExceptionStatus.INVESTIGATING].includes(e.status)
  ).length;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <div>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            异常处理
          </Typography>
          <Typography variant="body2" color="text.secondary">
            处理试卷流转过程中的各类异常
          </Typography>
        </div>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => { resetForm(); setOpenDialog(true); }}
          sx={{ backgroundColor: '#f44336' }}
        >
          报告异常
        </Button>
      </Box>

      {activeCount > 0 && (
        <Alert severity="error" sx={{ mb: 3 }} icon={<WarningIcon />}>
          当前有 {activeCount} 个待处理异常，请及时处理！
        </Alert>
      )}

      {loading ? (
        <LinearProgress />
      ) : (
        <Paper sx={{ borderRadius: 3 }}>
          <DataGrid
            rows={exceptions}
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
        open={openDialog}
        onClose={() => { setOpenDialog(false); resetForm(); }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {isEdit ? '编辑异常记录' : '报告异常'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {!isEdit && (
              <Alert severity="warning" icon={<BugIcon />}>
                请如实报告异常情况，异常记录将作为审计依据
              </Alert>
            )}
            <FormControl fullWidth>
              <InputLabel>关联批次</InputLabel>
              <Select
                value={formData.batchId}
                label="关联批次"
                onChange={(e) => setFormData({ ...formData, batchId: e.target.value })}
                disabled={isEdit}
              >
                {batches.map((batch) => (
                  <MenuItem key={batch.id} value={batch.id}>
                    {batch.batchCode} - {batch.examName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>异常类型</InputLabel>
              <Select
                value={formData.type}
                label="异常类型"
                onChange={(e) => setFormData({ ...formData, type: e.target.value as ExceptionType })}
              >
                <MenuItem value={ExceptionType.SEAL_DAMAGED}>封签破损</MenuItem>
                <MenuItem value={ExceptionType.PACKAGE_MISSING}>试卷包缺失</MenuItem>
                <MenuItem value={ExceptionType.QUANTITY_MISMATCH}>数量不匹配</MenuItem>
                <MenuItem value={ExceptionType.OTHER}>其他异常</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="异常描述"
              fullWidth
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="请详细描述异常情况..."
            />
            {isEdit && (
              <>
                <TextField
                  label="调查情况"
                  fullWidth
                  multiline
                  rows={2}
                  value={formData.investigation}
                  onChange={(e) => setFormData({ ...formData, investigation: e.target.value })}
                  placeholder="调查过程和发现..."
                />
                <TextField
                  label="解决方案"
                  fullWidth
                  multiline
                  rows={2}
                  value={formData.resolution}
                  onChange={(e) => setFormData({ ...formData, resolution: e.target.value })}
                  placeholder="处理措施和结果..."
                />
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpenDialog(false); resetForm(); }}>取消</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            sx={{ backgroundColor: isEdit ? '#1a237e' : '#f44336' }}
          >
            {isEdit ? '保存' : '提交报告'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openViewDialog}
        onClose={() => { setOpenViewDialog(false); setSelectedException(null); }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>异常详情</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {selectedException && (
              <>
                <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                  <Chip
                    label={typeLabels[selectedException.type]}
                    sx={{
                      bgcolor: `${typeColors[selectedException.type]}25`,
                      color: typeColors[selectedException.type],
                    }}
                  />
                  <Chip
                    label={statusLabels[selectedException.status]}
                    sx={{
                      bgcolor: `${statusColors[selectedException.status]}25`,
                      color: statusColors[selectedException.status],
                    }}
                  />
                </Box>
                <Paper sx={{ p: 3, mb: 2, borderRadius: 2 }}>
                  <Typography variant="subtitle2" gutterBottom color="text.secondary">
                    异常描述
                  </Typography>
                  <Typography variant="body1">{selectedException.description}</Typography>
                </Paper>
                {selectedException.investigation && (
                  <Paper sx={{ p: 3, mb: 2, borderRadius: 2, bgcolor: '#fff3e0' }}>
                    <Typography variant="subtitle2" gutterBottom color="text.secondary">
                      调查情况
                    </Typography>
                    <Typography variant="body1">{selectedException.investigation}</Typography>
                  </Paper>
                )}
                {selectedException.resolution && (
                  <Paper sx={{ p: 3, mb: 2, borderRadius: 2, bgcolor: '#e8f5e9' }}>
                    <Typography variant="subtitle2" gutterBottom color="text.secondary">
                      解决方案
                    </Typography>
                    <Typography variant="body1">{selectedException.resolution}</Typography>
                  </Paper>
                )}
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="text.secondary">报告人</Typography>
                    <Typography variant="body1">{selectedException.reportedBy}</Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="text.secondary">报告时间</Typography>
                    <Typography variant="body1">
                      {dayjs(selectedException.createdAt).format('YYYY-MM-DD HH:mm')}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="text.secondary">更新时间</Typography>
                    <Typography variant="body1">
                      {dayjs(selectedException.updatedAt).format('YYYY-MM-DD HH:mm')}
                    </Typography>
                  </Grid>
                </Grid>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpenViewDialog(false); setSelectedException(null); }}>
            关闭
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Exceptions;
