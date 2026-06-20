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
  MenuItem,
  LinearProgress,
  Alert,
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { batchesApi } from '@/api/client';
import { ExamBatch, BatchStatus } from '@/types';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';

const Batches: React.FC = () => {
  const [batches, setBatches] = useState<ExamBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<ExamBatch | null>(null);
  const [formData, setFormData] = useState({
    examName: '',
    subject: '',
    examDate: '',
    unsealTime: '',
    totalPackages: 30,
  });

  const loadBatches = async () => {
    setLoading(true);
    try {
      const res = await batchesApi.list();
      const data = Array.isArray(res) ? res : (res as any).data || [];
      setBatches(data);
    } catch (error) {
        toast.error('加载批次列表失败');
      } finally {
        setLoading(false);
      }
    };
  

  useEffect(() => {
    loadBatches();
  }, []);

  const handleSubmit = async () => {
    if (!formData.examName || !formData.subject || !formData.examDate || !formData.unsealTime) {
      toast.error('请填写完整信息');
      return;
    }

    try {
      if (selectedBatch) {
        await batchesApi.update(selectedBatch.id, formData);
        toast.success('批次更新成功');
      } else {
        await batchesApi.create(formData);
        toast.success('批次创建成功');
      }
      setOpenDialog(false);
      loadBatches();
      resetForm();
    } catch (error) {
        toast.error(selectedBatch ? '更新失败' : '创建失败');
      }
    };
  

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除此批次吗？')) return;
    try {
      await batchesApi.delete(id);
      toast.success('删除成功');
      loadBatches();
    } catch (error) {
        toast.error('删除失败');
      }
    };
  

  const resetForm = () => {
    setFormData({
      examName: '',
      subject: '',
      examDate: '',
      unsealTime: '',
      totalPackages: 30,
    });
    setSelectedBatch(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setOpenDialog(true);
  };

  const handleEdit = (batch: ExamBatch) => {
    setSelectedBatch(batch);
    setFormData({
      examName: batch.examName,
      subject: batch.subject,
      examDate: batch.examDate,
      unsealTime: batch.unsealTime,
      totalPackages: batch.totalPackages,
    });
    setOpenDialog(true);
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

  const canEdit = (status: BatchStatus) => {
    return [BatchStatus.CREATED, BatchStatus.PRINTING].includes(status);
  };

  const canDelete = (status: BatchStatus) => {
    return status === BatchStatus.CREATED;
  };

  const columns: GridColDef<ExamBatch>[] = [
    { field: 'batchCode', headerName: '批次号', width: 130 },
    { field: 'examName', headerName: '考试名称', width: 180 },
    { field: 'subject', headerName: '科目', width: 120 },
    {
      field: 'examDate',
      headerName: '考试时间',
      width: 180,
      valueFormatter: (params) => dayjs(params.value).format('YYYY-MM-DD HH:mm'),
    },
    {
      field: 'unsealTime',
      headerName: '启封时间',
      width: 180,
      valueFormatter: (params) => dayjs(params.value).format('YYYY-MM-DD HH:mm'),
    },
    { field: 'totalPackages', headerName: '试卷包数', width: 100 },
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
      renderCell: (params: GridRenderCellParams<ExamBatch>) => (
        <Box>
          <IconButton
            size="small"
            color="primary"
            onClick={() => handleEdit(params.row)}
            disabled={!canEdit(params.row.status)}
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={() => handleDelete(params.row.id)}
            disabled={!canDelete(params.row.status)}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <div>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            批次管理
          </Typography>
          <Typography variant="body2" color="text.secondary">
            命题中心 - 创建和管理考试批次
          </Typography>
        </div>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenCreate}
          sx={{ backgroundColor: '#1a237e' }}
        >
          新建批次
        </Button>
      </Box>

      {loading ? (
        <LinearProgress />
      ) : (
        <Paper sx={{ borderRadius: 3 }}>
          <DataGrid
            rows={batches}
            columns={columns}
            getRowId={(row) => row.id}
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } },
            }}
            pageSizeOptions={[5, 10, 25]}
            disableRowSelectionOnClick
            sx={{ p: 2 }}
          />
        </Paper>
      )}

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {selectedBatch ? '编辑批次' : '新建批次'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="考试名称"
              fullWidth
              value={formData.examName}
              onChange={(e) => setFormData({ ...formData, examName: e.target.value })}
              placeholder="例如：2024年上半年度全国统一考试"
            />
            <TextField
              label="科目"
              fullWidth
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="例如：高等数学"
            />
            <TextField
              label="考试时间"
              type="datetime-local"
              fullWidth
              value={formData.examDate}
              onChange={(e) => setFormData({ ...formData, examDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="启封时间"
              type="datetime-local"
              fullWidth
              value={formData.unsealTime}
              onChange={(e) => setFormData({ ...formData, unsealTime: e.target.value })}
              InputLabelProps={{ shrink: true }}
              helperText="启封时间必须在考试时间之前"
            />
            <TextField
              label="试卷包数量"
              type="number"
              fullWidth
              value={formData.totalPackages}
              onChange={(e) => setFormData({ ...formData, totalPackages: parseInt(e.target.value) || 0 })}
              InputProps={{ inputProps: { min: 1 } }}
            />
            {selectedBatch && selectedBatch.status !== BatchStatus.CREATED && (
              <Alert severity="warning">
                批次已进入流程，部分字段可能无法修改
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>取消</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            sx={{ backgroundColor: '#1a237e' }}
          >
            {selectedBatch ? '保存' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Batches;
