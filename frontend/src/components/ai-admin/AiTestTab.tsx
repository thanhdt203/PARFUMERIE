import { useState } from 'react';
import type { FormEvent } from 'react';
import { Send } from 'lucide-react';
import Button from '../common/Button';
import FormField, { TextInput } from '../common/FormField';
import SegmentedControl from '../common/SegmentedControl';
import { getErrorMessage } from '../../lib/errors';
import { formatVnd } from '../../lib/format';
import { aiAdminService } from '../../services/aiAdminService';
import { toast } from '../../store/toastStore';
import type { AiTestMode, AiTestResult } from '../../types/aiAdmin';

const MODES: ReadonlyArray<{ value: AiTestMode; label: string }> = [
  { value: 'basic', label: 'Khách vãng lai' },
  { value: 'deep', label: 'Khách hàng (chuyên sâu)' },
];

interface AiTestTabProps {
  /** Hướng dẫn đang soạn ở tab Cấu hình (null = chưa soạn, dùng bản đã lưu) */
  draft: string | null;
}

export default function AiTestTab({ draft }: AiTestTabProps) {
  const [message, setMessage] = useState('');
  const [mode, setMode] = useState<AiTestMode>('basic');
  const [useDraft, setUseDraft] = useState(true);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<AiTestResult | null>(null);

  const hasDraft = draft !== null;

  const run = async (event: FormEvent) => {
    event.preventDefault();
    const question = message.trim();
    if (!question || running) return;
    setRunning(true);
    setResult(null);
    try {
      setResult(await aiAdminService.test(question, mode, hasDraft && useDraft ? draft : undefined));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setRunning(false);
    }
  };

  return (
    <section className="space-y-4 rounded-card border border-line bg-surface p-5 shadow-card">
      <p className="text-sm text-ink-muted">
        Hỏi thử trợ lý AI như một khách thật, với đúng dữ liệu sản phẩm và tri thức hiện tại. Kết quả không được lưu vào lịch sử.
        Chế độ chuyên sâu thử cách AI phân tích tầng hương (chưa có lịch sử mua, xem của khách cụ thể).
      </p>

      <form onSubmit={(event) => void run(event)} className="space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <SegmentedControl options={MODES} value={mode} onChange={setMode} ariaLabel="Chế độ thử" />
          {hasDraft && (
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" checked={useDraft} onChange={(event) => setUseDraft(event.target.checked)} />
              Dùng hướng dẫn đang soạn (chưa lưu)
            </label>
          )}
        </div>
        <FormField label="Câu hỏi của khách" counter={{ current: message.length, max: 300 }}>
          {(control) => (
            <div className="flex gap-2">
              <TextInput
                {...control}
                value={message}
                maxLength={300}
                placeholder="VD: nước hoa nam ấm áp đi tiệc mùa đông dưới 3 triệu"
                onChange={(event) => setMessage(event.target.value)}
              />
              <Button variant="primary" type="submit" icon={Send} loading={running} disabled={!message.trim()}>
                Hỏi thử
              </Button>
            </div>
          )}
        </FormField>
      </form>

      {running && <p className="text-sm text-ink-muted">AI đang trả lời, có thể mất vài giây...</p>}

      {result && (
        <div className="space-y-3 rounded-card bg-surface-muted p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
            Phản hồi ({result.mode === 'deep' ? 'chuyên sâu' : 'cơ bản'})
          </p>
          <p className="whitespace-pre-wrap text-sm text-ink">{result.reply}</p>
          {result.products.length > 0 && (
            <div className="border-t border-line pt-3">
              <p className="mb-1 text-xs font-medium text-ink-muted">Sản phẩm được gợi ý</p>
              <ul className="space-y-1 text-sm text-ink">
                {result.products.map((product) => (
                  <li key={product._id}>
                    {product.TenSP}
                    <span className="text-ink-muted">
                      {' '}
                      · {formatVnd(product.GiaThapNhat)}
                      {product.GiaCaoNhat !== product.GiaThapNhat && ` – ${formatVnd(product.GiaCaoNhat)}`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
