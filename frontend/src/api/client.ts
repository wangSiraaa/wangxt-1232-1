import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { toast } from 'react-toastify';

const API_BASE_URL = '/api';

class ApiClient {
  private instance: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.instance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.instance.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.instance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          const { status, data } = error.response;
          const message = data?.message || data?.error || '请求失败';

          if (status === 401) {
            this.token = null;
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            toast.error('登录已过期，请重新登录');
            window.location.href = '/login';
          } else if (status === 403) {
            toast.error('没有权限执行此操作');
          } else if (status === 400) {
            toast.error(message);
          } else if (status >= 500) {
            toast.error('服务器错误，请稍后重试');
          } else {
            toast.error(message);
          }
        } else if (error.request) {
          toast.error('网络错误，请检查网络连接');
        } else {
          toast.error(error.message || '请求失败');
        }
        return Promise.reject(error);
      }
    );
  }

  setToken(token: string) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.put<T>(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.patch<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.delete<T>(url, config);
    return response.data;
  }
}

export const apiClient = new ApiClient();

export const authApi = {
  login: (username: string, password: string) =>
    apiClient.post<{ accessToken: string; user: any }>('/auth/login', { username, password }),
  logout: () => apiClient.post('/auth/logout'),
  getProfile: () => apiClient.get('/auth/profile'),
};

export const batchesApi = {
  list: (params?: any) => apiClient.get('/batches', { params }),
  get: (id: string) => apiClient.get(`/batches/${id}`),
  create: (data: any) => apiClient.post('/batches', data),
  update: (id: string, data: any) => apiClient.put(`/batches/${id}`, data),
  updateStatus: (id: string, status: string) => apiClient.patch(`/batches/${id}/status`, { status }),
  delete: (id: string) => apiClient.delete(`/batches/${id}`),
  statistics: () => apiClient.get('/batches/statistics'),
};

export const sealBoxesApi = {
  list: (params?: any) => apiClient.get('/seal-boxes', { params }),
  get: (id: string) => apiClient.get(`/seal-boxes/${id}`),
  create: (data: any) => apiClient.post('/seal-boxes', data),
  seal: (id: string) => apiClient.post(`/seal-boxes/${id}/seal`),
  getQrCode: (id: string) => apiClient.get(`/seal-boxes/${id}/qrcode`),
  scan: (qrData: string) => apiClient.post('/seal-boxes/scan', { qrData }),
  listByBatch: (batchId: string) => apiClient.get(`/seal-boxes/batch/${batchId}`),
};

export const handoverApi = {
  list: (params?: any) => apiClient.get('/handover', { params }),
  get: (id: string) => apiClient.get(`/handover/${id}`),
  create: (data: any) => apiClient.post('/handover', data),
  scan: (qrData: string) => apiClient.post('/handover/scan', { qrData }),
  accept: (id: string, data?: any) => apiClient.post(`/handover/${id}/accept`, data),
  reject: (id: string, data?: any) => apiClient.post(`/handover/${id}/reject`, data),
  myIncoming: () => apiClient.get('/handover/incoming'),
  myOutgoing: () => apiClient.get('/handover/outgoing'),
};

export const unsealApi = {
  getPackageInfo: (packageId: string) => apiClient.get(`/unseal/package/${packageId}`),
  unseal: (data: any) => apiClient.post('/unseal', data),
  listByBatch: (batchId: string) => apiClient.get(`/unseal/batch/${batchId}`),
  validateTime: (batchId: string) => apiClient.get(`/unseal/validate-time/${batchId}`),
};

export const exceptionsApi = {
  list: (params?: any) => apiClient.get('/exceptions', { params }),
  get: (id: string) => apiClient.get(`/exceptions/${id}`),
  create: (data: any) => apiClient.post('/exceptions', data),
  updateStatus: (id: string, status: string, data?: any) =>
    apiClient.patch(`/exceptions/${id}/status`, { status, ...data }),
  listByBatch: (batchId: string) => apiClient.get(`/exceptions/batch/${batchId}`),
};

export const recoveryApi = {
  list: (params?: any) => apiClient.get('/recovery', { params }),
  get: (id: string) => apiClient.get(`/recovery/${id}`),
  create: (data: any) => apiClient.post('/recovery', data),
  submit: (id: string, data: any) => apiClient.post(`/recovery/${id}/submit`, data),
  archive: (id: string, force?: boolean) =>
    apiClient.post(`/recovery/${id}/archive`, { force }),
  getByBatch: (batchId: string) => apiClient.get(`/recovery/batch/${batchId}`),
};

export const packagesApi = {
  listByBox: (boxId: string) => apiClient.get(`/seal-boxes/${boxId}/packages`),
  listByBatch: (batchId: string) => apiClient.get(`/batches/${batchId}/packages`),
};
