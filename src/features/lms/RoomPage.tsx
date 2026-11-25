import { useState, useEffect, useRef } from 'react';
import {
    Card, Table, Button, Tag, Space,
    Input, Select, Modal, Form, InputNumber, message, Checkbox, Alert
} from 'antd';
import {
    PlusOutlined, EditOutlined, EyeOutlined,
    ReloadOutlined, HomeOutlined, DeleteOutlined
} from '@ant-design/icons';
import { useDetailNavigation } from '../../shared/hooks/useDetailNavigation';
import { positiveListNumber, useListLocation } from '../../shared/hooks/useListLocation';
import type { ColumnsType } from 'antd/es/table';
import { PageHeader } from '../../shared/components/PageHeader';
import { paginationProps } from '../../shared/utils/pagination';
import { usePermissions } from '../../shared/hooks/usePermissions';
import { roomService } from '@/services/api/room.service';
import { useAuth } from '../../shared/contexts/AuthContext';
import { useSearchInput } from '../../shared/hooks/useSearchInput';
import { clearListCache } from '../../services/api/listCache';
import { confirmDiscardChanges, formSnapshot } from '../../shared/utils/formChanges';

type Room = any;

const equipmentOptions = [
    'Projector', 'Smart TV', 'Whiteboard', 'Smart Board',
    'Air Conditioner', 'WiFi', 'Sound System',
    'Computers', 'Microphone', 'Camera',
];

export function RoomsPage() {
    const { openDetail } = useDetailNavigation();
    const { params, page: currentPage, pageSize, setPage, choice, update } = useListLocation({ status: 'all' });
    const { can } = usePermissions();
    const { user } = useAuth();
    const identity = `${user?.id}:${user?.role}`;
    const latestIdentity = useRef(identity); latestIdentity.current = identity;
    const listRequest = useRef(0);
    const [dataOwner, setDataOwner] = useState('');
    const [loadError, setLoadError] = useState('');

    const canCreate = can('rooms', 'write');
    const canEdit = can('rooms', 'write');
    const canDelete = can('rooms', 'delete');

    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(false);
    const [total, setTotal] = useState(0);

    const searchText = (params.get('search') || '').slice(0, 200);
    const statusFilter = choice('status', ['all', 'active', 'inactive']);
    const minCapacity = positiveListNumber(params.get('min_capacity'));
    const { searchDraft, setSearchDraft, submitSearch } = useSearchInput(searchText, search => {
        update({ search }, true, true);
    });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRoom, setEditingRoom] = useState<Room | null>(null);
    const [form] = Form.useForm();
    const original = useRef('');
    const saveBusy = useRef(false), alive = useRef(false);
    const [saving, setSaving] = useState(false);
    useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
    const snapshot = () => formSnapshot(form.getFieldsValue(true), ['equipment']);
    const closeModal = () => {
        if (!saveBusy.current) confirmDiscardChanges(snapshot() !== original.current, () => {
            if (alive.current && identity === latestIdentity.current && !saveBusy.current) setIsModalOpen(false);
        });
    };

    // ================= API =================
    const fetchRooms = async () => {
        const request = ++listRequest.current;
        try {
            setLoading(true);
            setLoadError('');

            const res = await roomService.getAll({
                page: currentPage,
                limit: pageSize,
                ...(searchText && { search: searchText }),
                ...(statusFilter !== 'all' && {
                    is_active: statusFilter === 'active'
                }),
                ...(minCapacity && { min_capacity: minCapacity }),
            });

            if (request !== listRequest.current || identity !== latestIdentity.current) return;
            const lastPage = Math.max(1, Math.ceil((res.pagination?.total || 0) / pageSize));
            if (currentPage > lastPage) { setPage(lastPage); return; }
            setRooms(res.data || []);
            setTotal(res.pagination?.total || 0);
            setDataOwner(identity);

        } catch (err) {
            if (request !== listRequest.current || identity !== latestIdentity.current) return;
            setRooms([]); setTotal(0); setDataOwner(identity);
            setLoadError(err instanceof Error ? err.message : 'Lỗi tải phòng học');
        } finally {
            if (request === listRequest.current && identity === latestIdentity.current) setLoading(false);
        }
    };

    useEffect(() => {
        fetchRooms();
        return () => { listRequest.current++; };
    }, [currentPage, pageSize, searchText, statusFilter, minCapacity, identity]);
    const refresh = () => { clearListCache(); fetchRooms(); };

    // ================= ACTION =================
    const handleViewDetail = (id: number) => {
        openDetail(`/lms/rooms/${id}`);
    };

    const handleEdit = (room: Room) => {
        if (saveBusy.current) return;
        setEditingRoom(room);
        form.resetFields();
        form.setFieldsValue({
            name: room.name, capacity: room.capacity, is_active: room.is_active,
            equipment: room.equipment
                ? room.equipment.split(',')
                : [],
        });
        original.current = snapshot();
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        if (saveBusy.current) return;
        setEditingRoom(null);
        form.resetFields();
        form.setFieldsValue({ is_active: true });
        original.current = snapshot();
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
        if (saveBusy.current || !(editingRoom ? canEdit : canCreate)) return;
        saveBusy.current = true; setSaving(true);
        try {
            let values;
            try { values = await form.validateFields(); } catch { return; }
            if (!alive.current || identity !== latestIdentity.current) return;

            const payload = {
                ...values,
                equipment: Array.isArray(values.equipment)
                    ? values.equipment.join(',')
                    : values.equipment,
            };

            if (editingRoom) {
                await roomService.update(editingRoom.id, payload);
            } else {
                await roomService.create(payload);
            }
            if (!alive.current || identity !== latestIdentity.current) return;
            message.success(editingRoom ? 'Cập nhật thành công' : 'Tạo thành công');
            setIsModalOpen(false);
            form.resetFields();
            fetchRooms();

        } catch (err) {
            if (alive.current && identity === latestIdentity.current)
                message.error(err instanceof Error ? err.message : 'Lưu thất bại');
        } finally {
            saveBusy.current = false;
            if (alive.current) setSaving(false);
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
        <div className="crm-page">
      <PageHeader
                title="Quản lý Phòng học"
                actions={
                    <><Button icon={<ReloadOutlined />} loading={loading} onClick={refresh}>Tải lại</Button>{canCreate && (
                        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                            Tạo phòng
                        </Button>
                    )}</>
                }
            />

            <Card>
                <div className="crm-filter-controls mb-4">
                    <Input.Search
                        className="crm-filter-search"
                        aria-label="Tìm phòng học"
                        placeholder="Tìm tên phòng học"
                        allowClear
                        value={searchDraft}
                        onChange={e => setSearchDraft(e.target.value)} onSearch={submitSearch}
                    />

                    <Select className="crm-filter-status" aria-label="Lọc trạng thái phòng"
                        value={statusFilter} onChange={status => update({ status })}>
                        <Select.Option value="all">Tất cả</Select.Option>
                        <Select.Option value="active">Hoạt động</Select.Option>
                        <Select.Option value="inactive">Tạm dừng</Select.Option>
                    </Select>

                    <InputNumber
                        className="crm-filter-status"
                        aria-label="Sức chứa tối thiểu"
                        placeholder="Sức chứa tối thiểu"
                        min={1} precision={0}
                        value={minCapacity}
                        onChange={value => update({ min_capacity: value || undefined })}
                    />
                </div>

                {loadError && <Alert className="mb-4" type="error" showIcon message={loadError}
                    action={<Button onClick={refresh}>Thử lại</Button>} />}
                <Table
                    columns={columns}
                    dataSource={dataOwner === identity ? rooms : []}
                    rowKey="id"
                    loading={loading}
                    scroll={{ x: 800 }}
                    pagination={paginationProps('phòng', {
                        current: currentPage,
                        pageSize,
                        total: dataOwner === identity ? total : 0,
                        onChange: (page, size) => {
                            setPage(size === pageSize ? page : 1, size);
                        },
                    })}
                />
            </Card>

            <Modal
                title={editingRoom ? 'Chỉnh sửa phòng học' : 'Tạo phòng học'}
                open={isModalOpen && (editingRoom ? canEdit : canCreate)} forceRender
                onOk={handleModalOk}
                onCancel={closeModal} okText="Lưu" cancelText="Hủy" confirmLoading={saving}
                closable={!saving} maskClosable={!saving} keyboard={!saving} cancelButtonProps={{ disabled: saving }}
            >
                <Form form={form} layout="vertical" disabled={saving}>
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
