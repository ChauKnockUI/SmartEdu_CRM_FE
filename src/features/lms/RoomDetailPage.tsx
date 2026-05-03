import { useEffect, useState } from 'react';
import {
  Card, Descriptions, Tag, Button, Alert
} from 'antd';
import {
  ArrowLeftOutlined, EditOutlined,
  HomeOutlined, CheckCircleOutlined, CloseCircleOutlined
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router';
import { PageHeader } from '../../shared/components/PageHeader';
import { usePermissions } from '../../shared/hooks/usePermissions';
import { roomService } from '@/services/api/room.service';

export function RoomDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = usePermissions();

  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // ================= FETCH =================
  const fetchRoom = async () => {
    try {
      setLoading(true);

      const res = await roomService.getById(Number(id));
      setRoom(res.data);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchRoom();
  }, [id]);

  // ================= EMPTY =================
  if (!room) {
    return (
      <div className="text-center p-8">
        <h2 className="text-xl font-semibold">Không tìm thấy phòng học</h2>
        <Button type="primary" onClick={() => navigate('/lms/rooms')} className="mt-4">
          Quay lại danh sách
        </Button>
      </div>
    );
  }

  // ================= PARSE EQUIPMENT =================
  const equipmentList = room.equipment
    ? room.equipment.split(',')
    : [];

  return (
    <div>
      <PageHeader
        title={room.name}
        actions={
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/lms/rooms')}
          >
            Quay lại
          </Button>
        }
      />

      <div className="space-y-4">

        {/* STATUS */}
        {!room.is_active && (
          <Alert
            message="Phòng học tạm dừng hoạt động"
            description="Phòng này hiện không được sử dụng"
            type="warning"
            showIcon
            icon={<CloseCircleOutlined />}
          />
        )}

        {/* INFO */}
        <Card title="Thông tin phòng học" loading={loading}>
          <Descriptions column={2} bordered>

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

            {/* EQUIPMENT */}
            <Descriptions.Item label="Thiết bị" span={2}>
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