import { detailDescriptions } from '../../shared/utils/detailLayout';
import { useEffect, useState } from 'react';
import {
  Card, Descriptions, Tag, Alert
} from 'antd';
import {
  HomeOutlined, CheckCircleOutlined, CloseCircleOutlined
} from '@ant-design/icons';
import { useParams } from 'react-router';
import { useDetailNavigation } from '../../shared/hooks/useDetailNavigation';
import { PageHeader } from '../../shared/components/PageHeader';
import { roomService } from '@/services/api/room.service';
import { PageState } from '../../shared/components/PageState';
import { useAuth } from '../../shared/contexts/AuthContext';

export function RoomDetailPage() {
  const { id } = useParams();
  const { goBack } = useDetailNavigation();
  const { user, token } = useAuth();
  const scope = `${id}:${user?.id}:${user?.role}:${token}`;

  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [owner, setOwner] = useState(''), [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setRoom(null); setOwner(scope);
    roomService.getById(Number(id), controller.signal)
      .then(res => { if (!controller.signal.aborted) setRoom(res.data); })
      .catch(err => { if (!controller.signal.aborted) setError(err.message || 'Không tải được phòng học.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [scope, revision]);

  if (loading || owner !== scope || !room) return <PageState loading={loading || owner !== scope}
    title={loading || owner !== scope ? 'Đang tải phòng học...' : 'Không tải được phòng học'}
    description={error || 'Phòng học không tồn tại hoặc không thuộc phạm vi được xem.'}
    onRetry={() => setRevision(value => value + 1)} onBack={goBack} />;

  const equipmentList = room.equipment
    ? room.equipment.split(',')
    : [];

  return (
    <div className="crm-page">
      <PageHeader
        title={room.name}

      />

      <div className="space-y-4">

        {!room.is_active && (
          <Alert
            message="Phòng học tạm dừng hoạt động"
            description="Phòng này hiện không được sử dụng"
            type="warning"
            showIcon
            icon={<CloseCircleOutlined />}
          />
        )}

        <Card title="Thông tin phòng học" loading={loading}>
          <Descriptions {...detailDescriptions}>

            <Descriptions.Item label="Tên phòng">
              <div className="flex items-center gap-2">
                <HomeOutlined className="text-blue-500" />
                <span className="font-semibold">{room.name}</span>
              </div>
            </Descriptions.Item>

            <Descriptions.Item label="Trạng thái">
              <Tag
                color={room.is_active ? 'green' : 'red'}
                icon={room.is_active
                  ? <CheckCircleOutlined />
                  : <CloseCircleOutlined />}
              >
                {room.is_active ? 'Hoạt động' : 'Tạm dừng'}
              </Tag>
            </Descriptions.Item>

            <Descriptions.Item label="Sức chứa">
              {room.capacity
                ? `${room.capacity} người`
                : 'Không xác định'}
            </Descriptions.Item>

            <Descriptions.Item label="Ngày tạo">
              {room.createdAt
                ? new Date(room.createdAt).toLocaleDateString('vi-VN')
                : '-'}
            </Descriptions.Item>

            <Descriptions.Item label="Cập nhật">
              {room.updatedAt
                ? new Date(room.updatedAt).toLocaleDateString('vi-VN')
                : '-'}
            </Descriptions.Item>

            <Descriptions.Item label="Thiết bị" span="filled">
              {equipmentList.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {equipmentList.map((item: string, idx: number) => (
                    <Tag key={idx} color="blue">
                      {item}
                    </Tag>
                  ))}
                </div>
              ) : (
                <span className="text-gray-400">Không có</span>
              )}
            </Descriptions.Item>

          </Descriptions>
        </Card>

      </div>
    </div>
  );
}
