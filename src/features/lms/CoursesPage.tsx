import { useEffect, useState } from 'react';
import {
    Card, Table, Button, Tag, Space,
    Input, Select, Modal, Form, InputNumber, message, Popconfirm
} from 'antd';
import { EditOutlined, EyeOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router';
import type { ColumnsType } from 'antd/es/table';
import { PageHeader } from '../../shared/components/PageHeader';
import { courseService } from '@/services/api/course.service';
import { usePermissions } from '../../shared/hooks/usePermissions';

type Course = any;

export function CoursesPage() {
    const navigate = useNavigate();
    const { can } = usePermissions();

    const canCreate = can('courses', 'write');
    const canEdit = can('courses', 'write');

    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(false);

    const [searchText, setSearchText] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCourse, setEditingCourse] = useState<Course | null>(null);
    const [form] = Form.useForm();

    useEffect(() => {
        fetchCourses();
    }, [searchText]);

    const fetchCourses = async () => {
        try {
            setLoading(true);
            const res = await courseService.getAll();
            setCourses(res.data || []);
            console.log('COURSE DATA:', res);

        } catch (err) {
            console.error(err);
            message.error('Lỗi tải danh sách khóa học');
        } finally {
            setLoading(false);
        }
    };

    // ================= FILTER =================
    const filteredCourses = courses.filter((course) => {
        return course.name?.toLowerCase().includes(searchText.toLowerCase());
    });

    // ================= ACTION =================
    const handleViewDetail = (id: string) => {
        navigate(`/lms/courses/${id}`);
    };

    const handleEdit = (course: Course) => {
        setEditingCourse(course);

        form.setFieldsValue({
            name: course.name,
            description: course.description,
            total_sessions: course.total_sessions,
            duration_weeks: course.duration_weeks,
            fee: course.fee,
            is_active: course.is_active,
        });

        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setEditingCourse(null);
        form.resetFields();
        setIsModalOpen(true);
    };

    const handleModalOk = async () => {
        try {
            const values = await form.validateFields();

            if (editingCourse) {
                await courseService.update(editingCourse.id, values);
                message.success('Cập nhật khóa học thành công');
            } else {
                await courseService.create(values);
                message.success('Tạo khóa học thành công');
            }

            setIsModalOpen(false);
            form.resetFields();
            fetchCourses();
        } catch (err) {
            console.error(err);
            message.error('Lưu thất bại');
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await courseService.remove(id);

            message.success('Xóa khóa học thành công');

            fetchCourses(); // reload list
        } catch (err: any) {
            console.error(err);
            message.error(err.message || 'Xóa thất bại');
        }
    };

    const handleModalCancel = () => {
        setIsModalOpen(false);
        form.resetFields();
    };

    // ================= TABLE =================
    const columns: ColumnsType<Course> = [
        {
            title: 'Tên khóa học',
            dataIndex: 'name',
        },
        {
            title: 'Mô tả',
            dataIndex: 'description',
        },
        {
            title: 'Số buổi',
            dataIndex: 'total_sessions',
        },
        {
            title: 'Thời lượng',
            dataIndex: 'duration_weeks',
            render: (v: number) => `${v} tuần`,
        },
        {
            title: 'Học phí',
            dataIndex: 'fee',
            render: (fee: any) => (
                <span>
                    {Number(fee || 0).toLocaleString('vi-VN')} đ
                </span>
            )
        },
        {
            title: 'Trạng thái',
            dataIndex: 'is_active',
            render: (active: boolean) => (
                <Tag color={active ? 'green' : 'default'}>
                    {active ? 'Đang mở' : 'Tạm dừng'}
                </Tag>
            ),
        },
        {
            title: 'Thao tác',
            render: (_, record) => (
                <Space>
                    <Button onClick={() => handleViewDetail(record.id)}>
                        <EyeOutlined />
                    </Button>

                    {canEdit && (
                        <Button onClick={() => handleEdit(record)}>
                            <EditOutlined />
                        </Button>
                    )}

                    {canEdit && (
                        <Popconfirm
                            title="Xóa khóa học?"
                            description="Hành động này sẽ ẩn khóa học khỏi hệ thống"
                            onConfirm={() => handleDelete(record.id)}
                            okText="Xóa"
                            cancelText="Hủy"
                        >
                            <Button danger>
                                Xóa
                            </Button>
                        </Popconfirm>
                    )}
                </Space>
            ),
        },
    ];

    // ================= UI =================
    return (
        <div>
            <PageHeader
                title="Quản lý Khóa học"
                description="Danh sách các khóa học"
                actions={
                    canCreate && (
                        <Button type="primary" onClick={handleCreate}>
                            Tạo khóa học
                        </Button>
                    )
                }
            />

            <Card>
                <div className="mb-4 flex gap-4">
                    <Input
                        placeholder="Tìm kiếm..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        prefix={<SearchOutlined />}
                        style={{ width: 300 }}
                    />

                    <Select value={statusFilter} onChange={setStatusFilter}>
                        <Select.Option value="all">Tất cả</Select.Option>
                        <Select.Option value="active">Đang mở</Select.Option>
                        <Select.Option value="inactive">Tạm dừng</Select.Option>
                    </Select>
                </div>

                <Table
                    columns={columns}
                    dataSource={filteredCourses}
                    rowKey="id"
                    loading={loading}
                />
            </Card>

            <Modal
                title={editingCourse ? 'Chỉnh sửa khóa học' : 'Tạo khóa học'}
                open={isModalOpen}
                onOk={handleModalOk}
                onCancel={handleModalCancel}
            >
                <Form form={form} layout="vertical">
                    <Form.Item name="name" label="Tên khóa học" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>

                    <Form.Item name="description" label="Mô tả">
                        <Input.TextArea />
                    </Form.Item>

                    <Form.Item name="total_sessions" label="Số buổi" rules={[{ required: true }]}>
                        <InputNumber className="w-full" />
                    </Form.Item>

                    <Form.Item name="duration_weeks" label="Thời lượng (tuần)" rules={[{ required: true }]}>
                        <InputNumber className="w-full" />
                    </Form.Item>

                    <Form.Item name="fee" label="Học phí" rules={[{ required: true }]}>
                        <InputNumber className="w-full" />
                    </Form.Item>

                    <Form.Item name="is_active" label="Trạng thái" rules={[{ required: true }]}>
                        <Select>
                            <Select.Option value={true}>Đang mở</Select.Option>
                            <Select.Option value={false}>Tạm dừng</Select.Option>
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}