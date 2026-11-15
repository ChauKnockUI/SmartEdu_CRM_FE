import { useMemo, useState } from 'react';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Dropdown,
  Space,
  Switch,
  Tag,
  Tooltip,
  message,
} from 'antd';
import {
  ArrowRightOutlined,
  ClockCircleOutlined,
  EllipsisOutlined,
  PhoneOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router';
import { leadService, type LeadSourceOption } from '@/services/api/lead.service';
import { MarkLostModal } from './MarkLostModal';
import { getLeadSourceLabel } from '../leadSources';
import { getLeadGuidance } from '../leadGuidance';
import { LeadCareSummary } from './LeadCareSummary';

interface LeadPipelineBoardProps {
  sourceOptions: LeadSourceOption[];
  leads: any[];
  loading: boolean;
  onRefresh: () => void;
  onConvert: (lead: any) => void;
}

export type PipelineStageKey = 'new' | 'contacted' | 'interested' | 'trial' | 'enrolled' | 'lost';

interface PipelineColumnDef {
  key: PipelineStageKey;
  label: string;
  color: string;
  nextStage?: PipelineStageKey;
  nextLabel?: string;
}

const PIPELINE_COLUMNS: PipelineColumnDef[] = [
  {
    key: 'new',
    label: '1. Mới tiếp nhận',
    color: '#1677ff',
    nextStage: 'contacted',
    nextLabel: 'Đã liên hệ',
  },
  {
    key: 'contacted',
    label: '2. Đã liên hệ',
    color: '#13c2c2',
    nextStage: 'interested',
    nextLabel: 'Quan tâm',
  },
  {
    key: 'interested',
    label: '3. Quan tâm cao',
    color: '#faad14',
    nextStage: 'trial',
    nextLabel: 'Học thử',
  },
  {
    key: 'trial',
    label: '4. Đang học thử',
    color: '#722ed1',
    nextStage: 'enrolled',
    nextLabel: 'Chốt đăng ký',
  },
  {
    key: 'enrolled',
    label: '5. Đã đăng ký (Won)',
    color: '#52c41a',
  },
  {
    key: 'lost',
    label: 'Thất bại (Lost)',
    color: '#ff4d4f',
  },
];

export function LeadPipelineBoard({
  sourceOptions,
  leads,
  loading,
  onRefresh,
  onConvert,
}: LeadPipelineBoardProps) {
  const navigate = useNavigate();

  const [showLostColumn, setShowLostColumn] = useState(false);

  const [lostTargetLead, setLostTargetLead] = useState<any | null>(null);

  const [movingLeadId, setMovingLeadId] = useState<number | null>(null);

  const columnsData = useMemo(() => {
    const grouped: Record<PipelineStageKey, any[]> = {
      new: [],
      contacted: [],
      interested: [],
      trial: [],
      enrolled: [],
      lost: [],
    };

    leads.forEach((lead) => {
      const stage = (lead.status as PipelineStageKey) || 'new';
      if (grouped[stage]) {
        grouped[stage].push(lead);
      } else {
        grouped.new.push(lead);
      }
    });

    return grouped;
  }, [leads]);

  const handleMoveStage = async (leadId: number, targetStage: PipelineStageKey) => {
    if (targetStage === 'enrolled') {
      const lead = leads.find(item => item.id === leadId);
      if (lead) onConvert(lead);
      return;
    }
    if (targetStage === 'lost') {
      const lead = leads.find((l) => l.id === leadId);
      setLostTargetLead(lead);
      return;
    }

    try {
      setMovingLeadId(leadId);
      await leadService.update(String(leadId), { status: targetStage });
      message.success('Đã cập nhật giai đoạn phễu');
      onRefresh();
    } catch (err: any) {
      message.error(err.message || 'Không thể chuyển giai đoạn');
    } finally {
      setMovingLeadId(null);
    }
  };

  const visibleColumns = useMemo(() => {
    if (showLostColumn) return PIPELINE_COLUMNS;
    return PIPELINE_COLUMNS.filter((col) => col.key !== 'lost');
  }, [showLostColumn]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Space size={12} wrap>
          <Space size={6}>
            <Switch size="small" checked={showLostColumn} onChange={setShowLostColumn} />
            <span className="text-xs text-gray-600">Hiện lead thất bại</span>
          </Space>
        </Space>

        <div className="text-xs text-gray-500">
          {loading ? 'Đang tải...' : `${leads.length} lead trên trang hiện tại`}
        </div>
      </div>

      <div
        className="flex gap-3.5 overflow-x-auto pb-4"
        style={{ minHeight: 360 }}
      >
        {visibleColumns.map((col) => {
          const colLeads = columnsData[col.key] || [];

          return (
            <div
              key={col.key}
              className="flex w-72 shrink-0 flex-col rounded-lg border border-gray-200 bg-gray-50/80 p-3"
            >
              <div className="mb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: col.color }}
                    />
                    <span className="font-semibold text-gray-800">{col.label}</span>
                  </div>
                  <Badge
                    count={colLeads.length}
                    style={{ backgroundColor: col.color }}
                    overflowCount={999}
                  />
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto pr-1">
                {colLeads.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-gray-200 p-6 text-center text-xs text-gray-400">
                    Chưa có lead ở giai đoạn này
                  </div>
                ) : (
                  colLeads.map((lead) => {
                    const guidance = getLeadGuidance(lead);
                    const daysSinceContact = lead.last_contacted
                      ? dayjs().diff(dayjs(lead.last_contacted), 'day')
                      : null;
                    const isStale =
                      ['new', 'contacted', 'interested', 'trial'].includes(lead.status) &&
                      (daysSinceContact === null || daysSinceContact >= 3);

                    const menuItems = PIPELINE_COLUMNS.filter((c) => c.key !== lead.status).map(
                      (c) => ({
                        key: c.key,
                        label: `Chuyển sang: ${c.label}`,
                        onClick: () => handleMoveStage(lead.id, c.key),
                      })
                    );

                    return (
                      <Card
                        key={lead.id}
                        size="small"
                        hoverable
                        className="cursor-pointer border border-gray-200 bg-white transition-all hover:border-blue-400"
                        styles={{ body: { padding: '10px 12px' } }}
                        onClick={() => navigate(`/crm/leads/${lead.id}`)}
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="flex items-center gap-2">
                            <Avatar
                              size={28}
                              style={{
                                backgroundColor: '#e6f4ff',
                                color: '#1677ff',
                                fontSize: '12px',
                              }}
                            >
                              {lead.full_name?.charAt(0)?.toUpperCase() || 'L'}
                            </Avatar>
                            <div>
                              <div className="font-semibold text-gray-900 line-clamp-1 hover:text-blue-600">
                                {lead.full_name}
                              </div>
                              <div className="text-[11px] text-gray-400">#{lead.id}</div>
                            </div>
                          </div>

                          <div className="shrink-0"><LeadCareSummary lead={lead} compact /></div>
                        </div>

                        {lead.course && (
                          <div className="mt-2.5 text-xs">
                            <div className="text-gray-600 line-clamp-1">
                              {lead.course.name}
                            </div>
                          </div>
                        )}

                        <div className="mt-2 flex flex-wrap items-center justify-between gap-1 text-xs text-gray-500">
                          {lead.phone && (
                            <a
                              href={`tel:${lead.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1 text-gray-600 hover:text-blue-600"
                            >
                              <PhoneOutlined /> {lead.phone}
                            </a>
                          )}
                          <Tag className="m-0 text-[10px]">
                            {getLeadSourceLabel(lead.lead_source, sourceOptions)}
                          </Tag>
                        </div>

                        {!guidance.closed && <Tooltip title={guidance.action}>
                          <div className="mt-2 rounded-md bg-gray-50 px-2 py-1.5 text-xs text-gray-600 line-clamp-2">Tiếp: {guidance.title}</div>
                        </Tooltip>}

                        <div className="mt-2 flex items-center justify-between pt-1 border-t border-gray-100 text-[11px] text-gray-500">
                          <span className="flex items-center gap-1 line-clamp-1">
                            {lead.assignedUser?.full_name || (
                              <span className="italic text-gray-400">Chưa phân công</span>
                            )}
                          </span>

                          {isStale ? (
                            <Tooltip title={lead.last_contacted ? `Chưa liên hệ lại ${daysSinceContact} ngày` : 'Chưa từng liên hệ'}>
                              <span className="flex items-center gap-1 font-medium text-red-500">
                                <ClockCircleOutlined /> {lead.last_contacted ? '>3 ngày' : 'Chưa liên hệ'}
                              </span>
                            </Tooltip>
                          ) : (
                            lead.last_contacted && (
                              <span className="text-gray-400">
                                {dayjs(lead.last_contacted).format('DD/MM')}
                              </span>
                            )
                          )}
                        </div>

                        <div
                          className="mt-2.5 flex items-center justify-between pt-2 border-t border-gray-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {['new', 'contacted'].includes(col.key) ? (
                            <Button type="primary" size="small" onClick={() => navigate(`/crm/leads/${lead.id}?contact=1`)}>Ghi nhận liên hệ</Button>
                          ) : col.nextStage ? (
                            <Button
                              type="primary"
                              size="small"
                              icon={<ArrowRightOutlined />}
                              loading={movingLeadId === lead.id}
                              className="text-xs"
                              onClick={() => handleMoveStage(lead.id, col.nextStage!)}
                            >
                              {col.nextLabel || 'Tiếp theo'}
                            </Button>
                          ) : col.key === 'enrolled' ? (
                            <Button
                              type="primary"
                              size="small"
                              style={{ backgroundColor: '#52c41a' }}
                              onClick={() => navigate(`/crm/leads/${lead.id}`)}
                            >
                              Xem chi tiết
                            </Button>
                          ) : (
                            <Tag color="red">Đã đóng</Tag>
                          )}

                          <Dropdown disabled={col.key === 'enrolled'} menu={{ items: menuItems }} trigger={['click']}>
                            <Button
                              size="small"
                              type="text"
                              icon={<EllipsisOutlined />}
                              className="text-gray-500 hover:text-gray-800"
                            />
                          </Dropdown>
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      <MarkLostModal
        open={!!lostTargetLead}
        lead={lostTargetLead}
        onCancel={() => setLostTargetLead(null)}
        onSuccess={() => {
          setLostTargetLead(null);
          onRefresh();
        }}
      />
    </div>
  );
}
