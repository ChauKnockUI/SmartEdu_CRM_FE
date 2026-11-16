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
import { hasLeadAssignee, LEAD_ASSIGNMENT_REQUIRED, leadContactBlockReason, leadTransitionBlockReason } from '../leadAssignment';
import { leadNeedsCare } from '../leadFilters';
import { LEAD_STATUSES, LEAD_OPEN_STAGES, LEAD_ACTIONS, LEAD_MESSAGES, type LeadStatus } from '../leadStatus';

interface LeadPipelineBoardProps {
  sourceOptions: LeadSourceOption[];
  leads: any[];
  loading: boolean;
  onRefresh: () => void;
  onConvert: (lead: any) => void;
  includeLost?: boolean;
}

export type PipelineStageKey = LeadStatus;

interface PipelineColumnDef {
  key: PipelineStageKey;
  label: string;
  color: string;
  nextStage?: PipelineStageKey;
  nextLabel?: string;
}

const PIPELINE_COLUMNS: PipelineColumnDef[] = LEAD_STATUSES.map((stage, index) => {
  const next = stage.value !== 'lost' ? LEAD_OPEN_STAGES[index + 1] : undefined;
  return { key: stage.value, label: stage.label, color: stage.hex, nextStage: next?.value,
    nextLabel: next ? next.value === 'enrolled' ? LEAD_ACTIONS.convert : `Chuyển sang ${next.label}` : undefined };
});

export function LeadPipelineBoard({
  sourceOptions,
  leads,
  loading,
  onRefresh,
  onConvert,
  includeLost = false,
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
    if (movingLeadId !== null) return;
    const lead = leads.find(item => item.id === leadId);
    if (!lead) return;
    const reason = leadTransitionBlockReason(lead, targetStage);
    if (reason) {
      message.warning(reason);
      return;
    }
    if (targetStage === 'enrolled') {
      onConvert(lead);
      return;
    }
    if (targetStage === 'lost') {
      setLostTargetLead(lead);
      return;
    }

    try {
      setMovingLeadId(leadId);
      await leadService.update(String(leadId), { status: targetStage });
      message.success(LEAD_MESSAGES.stageUpdated);
      onRefresh();
    } catch (err: any) {
      message.error(err.message || LEAD_MESSAGES.stageFailed);
    } finally {
      setMovingLeadId(null);
    }
  };

  const visibleColumns = useMemo(() => {
    if (showLostColumn || includeLost) return PIPELINE_COLUMNS;
    return PIPELINE_COLUMNS.filter((col) => col.key !== 'lost');
  }, [showLostColumn, includeLost]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Space size={12} wrap>
          <Space size={6}>
            <Switch size="small" checked={showLostColumn || includeLost} disabled={includeLost} onChange={setShowLostColumn} />
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
        {visibleColumns.map((col, index) => {
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
                    <span className="font-semibold text-gray-800">{col.key === 'lost' ? col.label : `${index + 1}. ${col.label}`}</span>
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
                    const canCare = hasLeadAssignee(lead);
                    const contactBlocked = leadContactBlockReason(lead);
                    const guidance = getLeadGuidance(lead);
                    const daysSinceContact = lead.last_contacted
                      ? dayjs().diff(dayjs(lead.last_contacted), 'day')
                      : null;
                    const isStale = leadNeedsCare(lead);

                    const menuItems = PIPELINE_COLUMNS.filter((c) => c.key !== lead.status).map(
                      (c) => ({
                        key: c.key,
                        label: <Tooltip title={leadTransitionBlockReason(lead, c.key)}><span>{
                          c.key === 'enrolled' ? LEAD_ACTIONS.convert : c.key === 'lost' ? LEAD_ACTIONS.lost : `Chuyển sang ${c.label}`}</span></Tooltip>,
                        disabled: !!leadTransitionBlockReason(lead, c.key),
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
                              href={!contactBlocked ? `tel:${lead.phone}` : undefined}
                              title="Mở ứng dụng gọi trên thiết bị; ghi nhận kết quả sau cuộc gọi."
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

                        {!guidance.closed && <Tooltip title={canCare ? guidance.action : LEAD_ASSIGNMENT_REQUIRED}>
                          <div className="mt-2 rounded-md bg-gray-50 px-2 py-1.5 text-xs text-gray-600 line-clamp-2">Tiếp: {canCare ? guidance.title : 'Phân công Sale phụ trách'}</div>
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
                            <Tooltip title={contactBlocked}><span><Button type="primary" size="small" disabled={!!contactBlocked || movingLeadId !== null}
                              onClick={() => navigate(`/crm/leads/${lead.id}?contact=1`)}>{LEAD_ACTIONS.contact}</Button></span></Tooltip>
                          ) : col.nextStage ? (
                            <Tooltip title={leadTransitionBlockReason(lead, col.nextStage)}><span>
                            <Button
                              type="primary"
                              size="small"
                              icon={<ArrowRightOutlined />}
                              loading={movingLeadId === lead.id}
                              disabled={!!leadTransitionBlockReason(lead, col.nextStage) || movingLeadId !== null}
                              className="text-xs"
                              onClick={() => handleMoveStage(lead.id, col.nextStage!)}
                            >
                              {col.nextLabel || 'Tiếp theo'}
                            </Button>
                            </span></Tooltip>
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

                          <Tooltip title={col.key === 'enrolled' ? leadTransitionBlockReason(lead, 'new') : undefined}><span>
                          <Dropdown disabled={col.key === 'enrolled' || movingLeadId !== null} menu={{ items: menuItems }} trigger={['click']}>
                            <Button
                              size="small"
                              type="text"
                              icon={<EllipsisOutlined />}
                              className="text-gray-500 hover:text-gray-800"
                            />
                          </Dropdown>
                          </span></Tooltip>
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
