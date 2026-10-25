import { useEffect, useState } from 'react';
import Button from '../common/Button';
import ErrorState from '../common/ErrorState';
import FormField, { TextArea } from '../common/FormField';
import Skeleton from '../common/Skeleton';
import { useAsyncData } from '../../hooks/useAsyncData';
import { getErrorMessage } from '../../lib/errors';
import { aiAdminService } from '../../services/aiAdminService';
import { toast } from '../../store/toastStore';

const EXAMPLE =
  'Luôn xưng là "Parfumerie" và gọi khách là "bạn".\nKhông so sánh trực tiếp với đối thủ.\nNếu khách hỏi về đổi trả, hướng dẫn liên hệ hotline 0888070308.';

interface AiConfigTabProps {
  /** Bản nháp đang soạn, dùng chung với tab Thử nghiệm để thử trước khi lưu */
  draft: string | null;
  onDraftChange: (value: string) => void;
}

export default function AiConfigTab({ draft, onDraftChange }: AiConfigTabProps) {
  const { data, loading, error, reload } = useAsyncData(aiAdminService.getConfig);
  const [saving, setSaving] = useState(false);
  const [savedText, setSavedText] = useState<string | null>(null);

  // lần đầu có dữ liệu: nạp bản đã lưu vào ô soạn (nếu chưa có bản nháp)
  useEffect(() => {
    if (data && draft === null) {
      onDraftChange(data.HuongDanBoSung);
      setSavedText(data.HuongDanBoSung);
    }
  }, [data, draft, onDraftChange]);

  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (loading && !data) return <Skeleton className="h-64 w-full" />;

  const text = draft ?? '';
  const max = data?.maxLength ?? 2000;
  const baseline = savedText ?? data?.HuongDanBoSung ?? '';
  const dirty = text.trim() !== baseline.trim();
  const tooLong = text.length > max;

  const save = async () => {
    setSaving(true);
    try {
      const saved = await aiAdminService.saveConfig(text);
      setSavedText(saved.HuongDanBoSung);
      onDraftChange(saved.HuongDanBoSung);
      toast.success('Đã lưu hướng dẫn cho trợ lý AI');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-4 rounded-card border border-line bg-surface p-5 shadow-card">
      <div>
        <h3 className="text-base font-semibold text-ink">Hướng dẫn riêng của cửa hàng</h3>
        <p className="mt-1 text-sm text-ink-muted">
          Nội dung này được thêm vào cuối prompt tư vấn của mọi khách. Các quy tắc gốc (chỉ dùng dữ liệu thật, không bịa giá,
          nêu giá kèm dung tích...) vẫn được giữ và không thể bị ghi đè. Bạn có thể thử bản đang soạn ở tab Thử nghiệm trước khi lưu.
        </p>
      </div>

      <FormField label="Hướng dẫn bổ sung" counter={{ current: text.length, max }} hint="Mỗi ý nên viết một dòng, ngắn gọn và rõ ràng.">
        {(control) => (
          <TextArea
            {...control}
            rows={10}
            value={text}
            placeholder={EXAMPLE}
            onChange={(event) => onDraftChange(event.target.value)}
            invalid={tooLong}
          />
        )}
      </FormField>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-ink-faint">
          {data?.updatedAt ? `Lưu lần cuối: ${new Date(data.updatedAt).toLocaleString('vi-VN')}` : 'Chưa lưu hướng dẫn nào'}
          {dirty && ' · Có thay đổi chưa lưu'}
        </p>
        <Button variant="primary" onClick={() => void save()} loading={saving} disabled={!dirty || tooLong}>
          Lưu hướng dẫn
        </Button>
      </div>
    </section>
  );
}
