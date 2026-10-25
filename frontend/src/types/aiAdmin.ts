import type { AiProductCardData } from './shop';

export interface AiConfig {
  HuongDanBoSung: string;
  updatedAt: string | null;
  maxLength: number;
}

export interface KnowledgeEntry {
  _id: string;
  TieuDe: string;
  NoiDung: string;
  DangBat: boolean;
  updatedAt: string;
}

export interface KnowledgeInput {
  TieuDe: string;
  NoiDung: string;
  DangBat?: boolean;
}

export interface KnowledgeList {
  data: KnowledgeEntry[];
  usage: { activeCount: number; sentCount: number; maxItems: number; charBudget: number };
}

export interface CustomerBrief {
  Ho?: string;
  Ten?: string;
  Email?: string;
}

export interface AdminConversationRow {
  _id: string;
  TieuDe: string;
  SoTin: number;
  updatedAt: string;
  KhachHang?: CustomerBrief;
}

export interface AdminConversationList {
  data: AdminConversationRow[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface AdminConversation {
  _id: string;
  TieuDe: string;
  KhachHang: CustomerBrief | null;
  messages: { role: 'user' | 'assistant'; text: string; createdAt?: string; products: string[] }[];
}

export type AiTestMode = 'basic' | 'deep';

export interface AiTestResult {
  reply: string;
  mode: AiTestMode;
  products: AiProductCardData[];
}
