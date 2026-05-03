import { useState, useEffect } from 'react';
import {
    Card, Table, Button, Tag, Space,
    Input, Select, Modal, Form, InputNumber, message, Checkbox
} from 'antd';
import {
    PlusOutlined, EditOutlined, EyeOutlined,
    SearchOutlined, HomeOutlined, DeleteOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router';
import type { ColumnsType } from 'antd/es/table';
import { PageHeader } from '../../shared/components/PageHeader';
import { usePermissions } from '../../shared/hooks/usePermissions';
import { roomService } from '@/services/api/room.service';

type Room = any;

const equipmentOptions = [
    'Projector', 'Smart TV', 'Whiteboard', 'Smart Board',
    'Air Conditioner', 'WiFi', 'Sound System',
    'Computers', 'Microphone', 'Camera',
];

export function RoomsPage() {
    const navigate = useNavigate();
    const { can } = usePermissions();

    // ❗ rooms chưa có trong permission → dùng tạm classes
    const canCreate = can('rooms', 'write');
    const canEdit = can('rooms', 'write');
    const canDelete = can('rooms', 'delete');

    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(false);
    const [total, setTotal] = useState(0);

    const [searchText, setSearchText] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [minCapacity, setMinCapacity] = useState<number | undefined>();

    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRoom, setEditingRoom] = useState<Room | null>(null);
    const [form] = Form.useForm();

    // ================= API =================
    const fetchRooms = async () => {
        try {
            setLoading(true);

            const res = await roomService.getAll({
                page: currentPage,
                limit: pageSize,
                ...(searchText && { search: searchText }),
                ...(statusFilter !== 'all' && {
                    is_active: statusFilter === 'active'
                }),
                ...(minCapacity && { min_capacity: minCapacity }),
            });

            setRooms(res.data || []);
            setTotal(res.pagination?.total || 0);

        } catch (err) {
            console.error(err);
            message.error('Lỗi tải phòng học');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRooms();
    }, [currentPage, searchText, statusFilter, minCapacity]);

    // ================= ACTION =================
    const handleViewDetail = (id: number) => {
        navigate(`/lms/rooms/${id}`);
    };

    const handleEdit = (room: Room) => {
        setEditingRoom(room);

        form.setFieldsValue({
            ...room,
            equipment: room.equipment
                ? room.equipment.split(',')
                : [],
        });

        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setEditingRoom(null);
        form.resetFields();
        form.setFieldsValue({ is_active: true });
        setIsModalOpen(true);
    };

    const handleDelete = (room: Room) => {
        Modal.confirm({
            title: 'Xóa phòng học?',
            content: room.name,
            okType: 'danger',
            onOk: async () => {
                try {
                    await roomService.remove(room.id);
                    message.success('Đã xóa');
                    fetchRooms();
                } catch {
                    message.error('Xóa thất bại');
                }
            },
        });
    };

    const handleModalOk = async () => {
        try {
            const values = await form.validateFields();

            const payload = {
                ...values,
                equipment: Array.isArray(values.equipment)
                    ? values.equipment.join(',')
                    : values.equipment,
            };

            if (editingRoom) {
                await roomService.update(editingRoom.id, payload);
                message.success('Cập nhật thành công');
            } else {
                await roomService.create(payload);
                message.success('Tạo thành công');
            }

            setIsModalOpen(false);
            form.resetFields();
            fetchRooms();

        } catch (err) {
            message.error('Lưu thất bại');
        }
    };

    // ================= TABLE =================
    const columns: ColumnsType<Room> = [
        {
            title: 'Tên phòng',
            dataIndex: 'name',
            render: (name: string, record) => (
                <div className="flex gap-2">
                    <HomeOutlined />
                    <span className="font-semibold">{name}</span>
                    {!record.is_active && <Tag color="red">Tạm dừng</Tag>}
                </div>
            ),
        },
        {
            title: 'Sức chứa',
            dataIndex: 'capacity',
            render: (c: number) => c ? `${c} người` : 'N/A',
        },
        {
            title: 'Thiết bị',
            dataIndex: 'equipment',
            render: (eq: string) => {
                if (!eq) return 'Không có';
                const list = eq.split(',');
                return (
                    <>
                        {list.slice(0, 3).map((i, idx) => (
                            <Tag key={idx}>{i}</Tag>
                        ))}
                        {list.length > 3 && <Tag>+{list.length - 3}</Tag>}
                    </>
                );
            }
        },
        {
            title: 'Trạng thái',
            dataIndex: 'is_active',
            render: (a: boolean) => (
                <Tag color={a ? 'green' : 'red'}>
                    {a ? 'Hoạt động' : 'Tạm dừng'}
                </Tag>
            ),
        },
        {
            title: 'Thao tác',
            render: (_, r) => (
                <Space>
                    <Button icon={<EyeOutlined />} onClick={() => handleViewDetail(r.id)} />
                    {canEdit && (
                        <Button icon={<EditOutlined />} onClick={() => handleEdit(r)} />
                    )}
                    {canDelete && (
                        <Button danger icon={<DeleteOutlined />} onClick={() => handleDelete(r)} />
                    )}
                </Space>
            ),
        },
    ];

    // ================= UI =================
    return (
        <div>
            <PageHeader
                title="Quản lý Phòng học"
                actions={
                    canCreate && (
                        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                            Tạo phòng
                        </Button>
                    )
                }
            />

            <Card>
                <div className="mb-4 flex gap-4">
                    <Input
                        placeholder="Tìm kiếm..."
                        value={searchText}
                        onChange={e => setSearchText(e.target.value)}
                        prefix={<SearchOutlined />}
                    />

                    <Select value={statusFilter} onChange={setStatusFilter}>
                        <Select.Option value="all">Tất cả</Select.Option>
                        <Select.Option value="active">Hoạt động</Select.Option>
                        <Select.Option value="inactive">Tạm dừng</Select.Option>
                    </Select>

                    <InputNumber
                        placeholder="Sức chứa"
                        value={minCapacity}
                        onChange={(v) => setMinCapacity(v || undefined)}
                    />
                </div>

                <Table
                    columns={columns}
                    dataSource={rooms}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                        current: currentPage,
                        pageSize,
                        total,
                        onChange: setCurrentPage,
                    }}
                />
            </Card>

            <Modal
                open={isModalOpen}
                onOk={handleModalOk}
                onCancel={() => setIsModalOpen(false)}
            >
                <Form form={form} layout="vertical">
                    <Form.Item name="name" label="Tên phòng" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>

                    <Form.Item name="capacity" label="Sức chứa">
                        <InputNumber className="w-full" />
                    </Form.Item>

                    <Form.Item name="equipment" label="Thiết bị">
                        <Checkbox.Group options={equipmentOptions} />
                    </Form.Item>

                    <Form.Item name="is_active" valuePropName="checked">
                        <Checkbox>Hoạt động</Checkbox>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}