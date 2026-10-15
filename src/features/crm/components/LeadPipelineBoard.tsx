import { useMemo, useState } from 'react';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Dropdown,
  Input,
  Select,
  Space,
  Switch,
  Tag,
  Tooltip,
  message,
} from 'antd';
import {
  ArrowRightOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  EllipsisOutlined,
  FireOutlined,
  PhoneOutlined,
  UserAddOutlined,
  UserOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router';
import { leadService } from '@/services/api/lead.service';
import { MarkLostModal } from './MarkLostModal';

interface LeadPipelineBoardProps {
  leads: any[];
  loading: boolean;
  courses: any[];
  sales: any[];
  currentUserId?: number;
  userRole?: string;
  onRefresh: () => void;
  onConvert: (lead: any) => void;
  onOpenCreate?: () => void;
}

export type PipelineStageKey = 'new' | 'contacted' | 'interested' | 'trial' | 'enrolled' | 'lost';

interface PipelineColumnDef {
  key: PipelineStageKey;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  nextStage?: PipelineStageKey;
  nextLabel?: string;
}

const PIPELINE_COLUMNS: PipelineColumnDef[] = [
  {
    key: 'new',
    label: '1. Mới tiếp nhận',
    color: '#1677ff',
    bgColor: '#e6f4ff',
    borderColor: '#91caff',
    nextStage: 'contacted',
    nextLabel: 'Đã liên hệ',
  },
  {
    key: 'contacted',
    label: '2. Đã liên hệ',
    color: '#13c2c2',
    bgColor: '#e6fffb',
    borderColor: '#87e8de',
    nextStage: 'interested',
    nextLabel: 'Quan tâm',
  },
  {
    key: 'interested',
    label: '3. Quan tâm cao',
    color: '#faad14',
    bgColor: '#fffbe6',
    borderColor: '#ffe58f',
    nextStage: 'trial',
    nextLabel: 'Học thử',
  },
  {
    key: 'trial',
    label: '4. Đang học thử',
    color: '#722ed1',
    bgColor: '#f9f0ff',
    borderColor: '#d3adf7',
    nextStage: 'enrolled',
    nextLabel: 'Chốt đăng ký',
  },
  {
    key: 'enrolled',
    label: '5. Đã đăng ký (Won)',
    color: '#52c41a',
    bgColor: '#f6ffed',
    borderColor: '#b7eb8f',
  },
  {
    key: 'lost',
    label: 'Thất bại (Lost)',
    color: '#ff4d4f',
    bgColor: '#fff1f0',
    borderColor: '#ffa39e',
  },
];

const sourceLabels: Record<string, string> = {
  facebook: 'Facebook Ads',
  google_ads: 'Google Ads',
  website_organic: 'Website',
  tiktok: 'TikTok',
  referral: 'Giới thiệu',
  other: 'Khác',
};

const formatCurrency = (val: number) => {
  if (val >= 1000000) {
    return `${(val / 1000000).toFixed(1)} tr đ`;
  }
  return `${new Intl.NumberFormat('vi-VN').format(val)} đ`;
};

export function LeadPipelineBoard({
  leads,
  loading,
  courses,
  sales,
  currentUserId,
  userRole,
  onRefresh,
  onConvert,
  onOpenCreate,
}: LeadPipelineBoardProps) {
  const navigate = useNavigate();

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState<number | undefined>();
  const [selectedSaleId, setSelectedSaleId] = useState<number | undefined>();
  const [onlyHot, setOnlyHot] = useState(false);
  const [onlyStale, setOnlyStale] = useState(false);
  const [showLostColumn, setShowLostColumn] = useState(false);

  // Lost modal state
  const [lostTargetLead, setLostTargetLead] = useState<any | null>(null);

  // Quick stage changing state
  const [movingLeadId, setMovingLeadId] = useState<number | null>(null);

  // Filter leads
  const filteredLeads = useMemo(() => {
    const now = dayjs();
    return leads.filter((lead) => {
      if (search) {
        const query = search.toLowerCase();
        const matchesName = lead.full_name?.toLowerCase().includes(query);
        const matchesPhone = lead.phone?.includes(query);
        const matchesEmail = lead.email?.toLowerCase().includes(query);
        if (!matchesName && !matchesPhone && !matchesEmail) return false;
      }

      if (selectedCourseId && lead.course_id !== selectedCourseId) return false;
      if (selectedSaleId && lead.assigned_to !== selectedSaleId) return false;

      if (onlyHot) {
        const rawScore = Number(lead.aiScore?.probability_score || 0);
        const scorePercent = rawScore <= 1 ? Math.round(rawScore * 100) : Math.round(rawScore);
        if (scorePercent < 75) return false;
      }

      if (onlyStale) {
        if (!['new', 'contacted', 'interested', 'trial'].includes(lead.status)) return false;
        if (lead.last_contacted) {
          const days = now.diff(dayjs(lead.last_contacted), 'day');
          if (days < 3) return false;
        }
      }

      return true;
    });
  }, [leads, search, selectedCourseId, selectedSaleId, onlyHot, onlyStale]);

  // Group leads by stage
  const columnsData = useMemo(() => {
    const grouped: Record<PipelineStageKey, any[]> = {
      new: [],
      contacted: [],
      interested: [],
      trial: [],
      enrolled: [],
      lost: [],
    };

    filteredLeads.forEach((lead) => {
      const stage = (lead.status as PipelineStageKey) || 'new';
      if (grouped[stage]) {
        grouped[stage].push(lead);
      } else {
        grouped.new.push(lead);
      }
    });

    return grouped;
  }, [filteredLeads]);

  const handleMoveStage = async (leadId: number, targetStage: PipelineStageKey) => {
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

  const totalActivePipelineValue = useMemo(() => {
    return filteredLeads
      .filter((l) => ['new', 'contacted', 'interested', 'trial'].includes(l.status))
      .reduce((sum, l) => sum + (l.course?.fee ? Number(l.course.fee) : 0), 0);
  }, [filteredLeads]);

  return (
    <div>
      {/* Controls Bar matching standard Ant Design page filters */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Space size={12} wrap>
          <Input.Search
            placeholder="Tìm theo tên, SĐT, email..."
            style={{ width: 220 }}
            allowClear
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <Select
            placeholder="Khóa học quan tâm"
            style={{ width: 180 }}
            allowClear
            value={selectedCourseId}
            onChange={setSelectedCourseId}
            options={courses.map((c) => ({ label: c.name, value: c.id }))}
          />

          {userRole === 'admin' && (
            <Select
              placeholder="Sale phụ trách"
              style={{ width: 170 }}
              allowClear
              value={selectedSaleId}
              onChange={setSelectedSaleId}
              options={sales.map((s) => ({ label: s.full_name, value: s.id }))}
            />
          )}

          <Space size={6}>
            <Switch size="small" checked={onlyHot} onChange={setOnlyHot} />
            <span className="text-xs text-gray-600">Lead nóng (AI &ge; 75%)</span>
          </Space>

          <Space size={6}>
            <Switch size="small" checked={onlyStale} onChange={setOnlyStale} />
            <span className="text-xs text-gray-600">Cần chăm sóc (&gt;3 ngày)</span>
          </Space>

          <Space size={6}>
            <Switch size="small" checked={showLostColumn} onChange={setShowLostColumn} />
            <span className="text-xs text-gray-600">Hiện cột Lost</span>
          </Space>
        </Space>

        <div className="text-xs text-gray-500">
          Tổng giá trị Pipeline: <strong className="text-blue-600 font-semibold">{formatCurrency(totalActivePipelineValue)}</strong>
        </div>
      </div>

      {/* Kanban Board Container */}
      <div
        className="flex gap-3.5 overflow-x-auto pb-4"
        style={{ minHeight: 'calc(100vh - 330px)' }}
      >
        {visibleColumns.map((col) => {
          const colLeads = columnsData[col.key] || [];
          const colValue = colLeads.reduce(
            (sum, l) => sum + (l.course?.fee ? Number(l.course.fee) : 0),
            0
          );

          return (
            <div
              key={col.key}
              className="flex w-72 shrink-0 flex-col rounded-lg border border-gray-200 bg-gray-50/80 p-3"
            >
              {/* Column Header */}
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
                <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                  <span>Tiềm năng:</span>
                  <span className="font-medium text-gray-700">{formatCurrency(colValue)}</span>
                </div>
              </div>

              {/* Column Cards List */}
              <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto pr-1">
                {colLeads.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-gray-200 p-6 text-center text-xs text-gray-400">
                    Chưa có lead ở giai đoạn này
                  </div>
                ) : (
                  colLeads.map((lead) => {
                    const rawScore = Number(lead.aiScore?.probability_score || 0);
                    const scorePercent =
                      rawScore <= 1 ? Math.round(rawScore * 100) : Math.round(rawScore);

                    const isHot = scorePercent >= 75;
                    const isWarm = scorePercent >= 50 && scorePercent < 75;

                    const daysSinceContact = lead.last_contacted
                      ? dayjs().diff(dayjs(lead.last_contacted), 'day')
                      : null;
                    const isStale =
                      ['new', 'contacted', 'interested', 'trial'].includes(lead.status) &&
                      (daysSinceContact === null || daysSinceContact >= 3);

                    // More actions dropdown menu
                    const menuItems = PIPELINE_COLUMNS.filter((c) => c.key !== lead.status).map(
                      (c) => ({
                        key: c.key,
                        label: `Chuyển sang: ${c.label}`,
                        icon:
                          c.key === 'lost' ? (
                            <CloseCircleOutlined className="text-red-500" />
                          ) : c.key === 'enrolled' ? (
                            <CheckCircleOutlined className="text-green-500" />
                          ) : (
                            <ArrowRightOutlined />
                          ),
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
                        {/* Header: Lead Name & AI Tag */}
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="flex items-center gap-2">
                            <Avatar
                              size={28}
                              style={{
                                backgroundColor: isHot ? '#52c41a' : isWarm ? '#faad14' : '#1677ff',
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

                          <Tag
                            color={isHot ? 'green' : isWarm ? 'gold' : 'default'}
                            className="m-0 flex items-center gap-0.5 text-[11px] font-medium"
                          >
                            {isHot && <FireOutlined />}
                            {scorePercent}%
                          </Tag>
                        </div>

                        {/* Course & Value */}
                        {lead.course && (
                          <div className="mt-2.5 rounded-md bg-blue-50/60 px-2 py-1 text-xs">
                            <div className="font-medium text-blue-900 line-clamp-1">
                              {lead.course.name}
                            </div>
                            {lead.course.fee && (
                              <div className="text-[11px] text-blue-700">
                                Học phí: {formatCurrency(Number(lead.course.fee))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Phone & Source */}
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
                            {sourceLabels[lead.lead_source] || lead.lead_source || 'Khác'}
                          </Tag>
                        </div>

                        {/* Assignee & Stale Warning */}
                        <div className="mt-2 flex items-center justify-between pt-1 border-t border-gray-100 text-[11px] text-gray-500">
                          <span className="flex items-center gap-1 line-clamp-1">
                            <UserOutlined className="text-gray-400" />
                            {lead.assignedUser?.full_name || (
                              <span className="italic text-gray-400">Chưa phân công</span>
                            )}
                          </span>

                          {isStale ? (
                            <Tooltip title={lead.last_contacted ? `Chưa liên hệ lại ${daysSinceContact} ngày` : 'Chưa từng liên hệ'}>
                              <span className="flex items-center gap-1 font-medium text-red-500">
                                <ClockCircleOutlined /> &gt;3 ngày
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

                        {/* Quick Pipeline Actions Toolbar */}
                        <div
                          className="mt-2.5 flex items-center justify-between pt-2 border-t border-gray-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {col.nextStage ? (
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
                              icon={<UserAddOutlined />}
                              onClick={() => onConvert(lead)}
                            >
                              Tạo học viên
                            </Button>
                          ) : (
                            <Tag color="red">Đã đóng</Tag>
                          )}

                          <Dropdown menu={{ items: menuItems }} trigger={['click']}>
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

      {/* Lost Reason Modal */}
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
