import { useState } from 'react';
import AiConfigTab from '../../components/ai-admin/AiConfigTab';
import AiTestTab from '../../components/ai-admin/AiTestTab';
import ConversationsTab from '../../components/ai-admin/ConversationsTab';
import KnowledgeTab from '../../components/ai-admin/KnowledgeTab';
import PageHeader from '../../components/common/PageHeader';
import SegmentedControl from '../../components/common/SegmentedControl';

type Tab = 'config' | 'knowledge' | 'history' | 'test';

const TABS: ReadonlyArray<{ value: Tab; label: string }> = [
  { value: 'config', label: 'Hướng dẫn AI' },
  { value: 'knowledge', label: 'Cơ sở tri thức' },
  { value: 'history', label: 'Lịch sử phản hồi' },
  { value: 'test', label: 'Thử nghiệm' },
];

export default function AiKnowledgePage() {
  const [tab, setTab] = useState<Tab>('config');
  // bản hướng dẫn đang soạn, giữ khi chuyển tab để thử ở tab Thử nghiệm trước khi lưu
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader description="Quản lý hướng dẫn, tri thức của trợ lý AI, xem lịch sử phản hồi và thử câu trả lời trước khi áp dụng." />
      <SegmentedControl options={TABS} value={tab} onChange={setTab} ariaLabel="Mục quản lý AI" />
      {tab === 'config' && <AiConfigTab draft={draft} onDraftChange={setDraft} />}
      {tab === 'knowledge' && <KnowledgeTab />}
      {tab === 'history' && <ConversationsTab />}
      {tab === 'test' && <AiTestTab draft={draft} />}
    </div>
  );
}
