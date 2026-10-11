import api from '../lib/api';
import type { DashboardData, DashboardRange } from '../types/dashboard';
import { mockDelay, USE_MOCK } from './config';
import { getDashboardMock } from './mock/dashboardMock';

export interface DashboardService {
  getDashboard(range: DashboardRange): Promise<DashboardData>;
}

const mockService: DashboardService = {
  async getDashboard(range) {
    await mockDelay();
    return getDashboardMock(range);
  },
};

// Endpoint dự kiến, backend chưa có. Trả về đúng dạng DashboardData.
const apiService: DashboardService = {
  async getDashboard(range) {
    const { data } = await api.get<DashboardData>('/admin/dashboard', { params: { range } });
    return data;
  },
};

export const dashboardService: DashboardService = USE_MOCK ? mockService : apiService;
