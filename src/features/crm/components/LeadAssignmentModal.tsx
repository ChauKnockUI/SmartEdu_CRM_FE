import { useEffect, useRef, useState } from 'react';
import { Alert, Modal, Select, Space, message } from 'antd';
import { leadService } from '../../../services/api/lead.service';
import { canUnassignLead, getLeadAssigneeOptions } from '../leadAssignment';

interface Props {
  leads: any[]; sales: any[]; bulk: boolean;
  onClose: () => void;
  onAssigned: (ids: number[]) => void;
}

export function LeadAssignmentModal({ leads, sales, bulk, onClose, onAssigned }: Props) {
  const [remaining, setRemaining] = useState(leads);
  const [saleId, setSaleId] = useState<number | undefined>(bulk ? undefined : leads[0]?.assigned_to ?? 0);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const busy = useRef(false), mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const single = bulk ? undefined : remaining[0];

  const save = async () => {
    if (busy.current || saleId === undefined || bulk && !saleId) return;
    busy.current = true; setSaving(true); setErrors([]);
    const succeeded: number[] = [], failed: any[] = [], details: string[] = [];
    // Reuse assignment validation and history; keep requests bounded.
    for (let offset = 0; offset < remaining.length; offset += 5) {
      if (!mounted.current) return;
      await Promise.all(remaining.slice(offset, offset + 5).map(async lead => {
        try {
          if ((lead.assigned_to ?? 0) !== saleId) {
            await leadService.update(String(lead.id), { assigned_to: saleId || null });
          }
          succeeded.push(lead.id);
        } catch (error: any) {
          failed.push(lead); details.push(`${lead.full_name}: ${error.message || 'Không phân công được.'}`);
        }
      }));
    }
    if (!mounted.current) return;
    busy.current = false; setSaving(false);
    if (succeeded.length) {
      message.success(bulk ? `Đã xử lý phân công ${succeeded.length} Lead.` : 'Đã cập nhật người phụ trách Lead.');
      onAssigned(succeeded);
    }
    if (failed.length) { setRemaining(failed); setErrors(details); }
    else onClose();
  };

  return <Modal open title={bulk ? `Phân công ${remaining.length} Lead` : 'Phân công Lead'}
    onCancel={onClose} onOk={save} okText={errors.length ? 'Thử lại' : 'Lưu'} cancelText="Hủy"
    confirmLoading={saving} closable={!saving} maskClosable={!saving} keyboard={!saving}
    cancelButtonProps={{ disabled: saving }} okButtonProps={{ disabled: saleId === undefined || bulk && !saleId }}>
    <Space direction="vertical" size={12} className="w-full">
      <div>{bulk ? 'Chọn Sale phụ trách cho các Lead đã chọn.' : single?.full_name}</div>
      <Select className="w-full" aria-label="Sale nhận phân công" placeholder="Chọn Sale phụ trách"
        value={saleId} onChange={setSaleId} disabled={saving} showSearch optionFilterProp="label"
        options={getLeadAssigneeOptions(sales, single).filter(option => !bulk || option.value !== 0)} />
      {!bulk && !canUnassignLead(single) && <div className="text-xs text-gray-500">Lead đang được chăm sóc. Hãy chọn Sale khác để chuyển người phụ trách.</div>}
      {errors.length > 0 && <Alert type="warning" showIcon message={`${errors.length} Lead chưa phân công được`}
        description={<div className="max-h-40 overflow-y-auto">{errors.map((error, index) => <div key={index}>{error}</div>)}</div>} />}
    </Space>
  </Modal>;
}
