import api from '../lib/api';
import type {
  AdminConversation,
  AdminConversationList,
  AiConfig,
  AiTestMode,
  AiTestResult,
  KnowledgeEntry,
  KnowledgeInput,
  KnowledgeList,
} from '../types/aiAdmin';

const BASE = '/admin/ai';

// API quản trị trợ lý AI (chỉ admin)
export const aiAdminService = {
  async getConfig(): Promise<AiConfig> {
    const { data } = await api.get<AiConfig>(`${BASE}/config`);
    return data;
  },

  async saveConfig(HuongDanBoSung: string): Promise<Pick<AiConfig, 'HuongDanBoSung' | 'updatedAt'>> {
    const { data } = await api.put<Pick<AiConfig, 'HuongDanBoSung' | 'updatedAt'>>(`${BASE}/config`, { HuongDanBoSung });
    return data;
  },

  async listKnowledge(): Promise<KnowledgeList> {
    const { data } = await api.get<KnowledgeList>(`${BASE}/knowledge`);
    return data;
  },

  async createKnowledge(body: KnowledgeInput): Promise<KnowledgeEntry> {
    const { data } = await api.post<{ data: KnowledgeEntry }>(`${BASE}/knowledge`, body);
    return data.data;
  },

  async updateKnowledge(id: string, body: Partial<KnowledgeInput>): Promise<KnowledgeEntry> {
    const { data } = await api.put<{ data: KnowledgeEntry }>(`${BASE}/knowledge/${id}`, body);
    return data.data;
  },

  async removeKnowledge(id: string): Promise<void> {
    await api.delete(`${BASE}/knowledge/${id}`);
  },

  async listConversations(page: number, limit: number): Promise<AdminConversationList> {
    const { data } = await api.get<AdminConversationList>(`${BASE}/conversations`, { params: { page, limit } });
    return data;
  },

  async getConversation(id: string): Promise<AdminConversation> {
    const { data } = await api.get<AdminConversation>(`${BASE}/conversations/${id}`);
    return data;
  },

  /** Chạy thử đúng quy trình tư vấn thật; `huongDan` là bản nháp chưa lưu (bỏ trống thì dùng bản đã lưu) */
  async test(message: string, mode: AiTestMode, huongDan?: string): Promise<AiTestResult> {
    const { data } = await api.post<AiTestResult>(`${BASE}/test`, { message, mode, huongDan }, { timeout: 60_000 });
    return data;
  },
};
