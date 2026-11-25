import { paginationProps } from '../../shared/utils/pagination';
import { useEffect, useRef, useState } from 'react';
import {
    Alert, Card, Table, Button, Tag, Space,
    Input, Select, Modal, Form, InputNumber, message, Popconfirm,
} from 'antd';
import { EditOutlined, EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import { useDetailNavigation } from '../../shared/hooks/useDetailNavigation';
import { useListLocation } from '../../shared/hooks/useListLocation';
import type { ColumnsType } from 'antd/es/table';
import { PageHeader } from '../../shared/components/PageHeader';
import { courseService, type Course, type CourseInput } from '@/services/api/course.service';
import { usePermissions } from '../../shared/hooks/usePermissions';
import { useAuth } from '../../shared/contexts/AuthContext';
import { useSearchInput } from '../../shared/hooks/useSearchInput';
import { clearListCache } from '../../services/api/listCache';
import { confirmDiscardChanges, formSnapshot } from '../../shared/utils/formChanges';

type CourseFormValues = Omit<CourseInput, 'is_active'> & { is_active: 'active' | 'inactive' };

// Reuse the existing course modal from both the list and the detail page.
export function CourseFormModal({ course, onCancel, onSaved }: {
    course: Course | null;
    onCancel: () => void;
    onSaved: (course: Course) => void;
}) {
    const [form] = Form.useForm<CourseFormValues>();
    const [saving, setSaving] = useState(false);
    const submitLock = useRef(false);
    const mounted = useRef(false);
    const initialValues: Partial<CourseFormValues> = course ? {
        name: course.name, description: course.description ?? undefined,
        total_sessions: course.total_sessions, duration_weeks: course.duration_weeks,
        fee: Number(course.fee), is_active: course.is_active ? 'active' : 'inactive',
    } : { is_active: 'active' };
    const original = useRef(formSnapshot(initialValues));

    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    const handleSave = async () => {
        if (submitLock.current) return;
        submitLock.current = true;
        setSaving(true);
        try {
            let values: CourseFormValues;
            try {
                values = await form.validateFields();
            } catch {
                return; // Field validation already displays its errors inline.
            }
            if (!mounted.current) return;
            const payload: CourseInput = {
                ...values,
                name: values.name.trim(),
                is_active: values.is_active === 'active',
            };
            const res = course
                ? await courseService.update(course.id, payload)
                : await courseService.create(payload);
            if (!mounted.current) return;
            message.success(course ? 'Cập nhật khóa học thành công' : 'Tạo khóa học thành công');
            onSaved(res.data);
        } catch (err) {
            if (mounted.current) message.error(err instanceof Error ? err.message : 'Lưu khóa học thất bại');
        } finally {
            submitLock.current = false;
            if (mounted.current) setSaving(false);
        }
    };

    return (
        <Modal
            title={course ? 'Chỉnh sửa khóa học' : 'Tạo khóa học'}
            open
            onOk={handleSave}
            onCancel={() => { if (!submitLock.current) confirmDiscardChanges(
                formSnapshot(form.getFieldsValue(true)) !== original.current,
                () => { if (mounted.current && !submitLock.current) onCancel(); }
            ); }}
            okText="Lưu" cancelText="Hủy"
            confirmLoading={saving}
            cancelButtonProps={{ disabled: saving }}
            closable={!saving}
            maskClosable={!saving}
            keyboard={!saving}
        >
            <Form
                form={form}
                layout="vertical"
                disabled={saving}
                onFinish={handleSave}
                initialValues={initialValues}
            >
                <Form.Item name="name" label="Tên khóa học" rules={[{ required: true, whitespace: true, message: 'Nhập tên khóa học' }]}>
                    <Input maxLength={255} />
                </Form.Item>
                <Form.Item name="description" label="Mô tả">
                    <Input.TextArea />
                </Form.Item>
                <Form.Item name="total_sessions" label="Số buổi" rules={[
                    { required: true, message: 'Nhập số buổi' },
                    { type: 'integer', min: 1, max: 10000, message: 'Số buổi phải là số nguyên từ 1 đến 10.000' },
                ]}>
                    <InputNumber className="w-full" min={1} max={10000} />
                </Form.Item>
                <Form.Item name="duration_weeks" label="Thời lượng (tuần)" rules={[
                    { required: true, message: 'Nhập thời lượng' },
                    { type: 'integer', min: 1, message: 'Thời lượng phải là số nguyên dương' },
                ]}>
                    <InputNumber className="w-full" min={1} />
                </Form.Item>
                <Form.Item name="fee" label="Học phí" rules={[
                    { required: true, message: 'Nhập học phí' },
                    { type: 'number', min: 0, max: 9999999999999.99, message: 'Học phí phải từ 0 đến 9.999.999.999.999,99 đ' },
                ]}>
                    <InputNumber className="w-full" min={0} max={9999999999999.99} precision={2} />
                </Form.Item>
                <Form.Item name="is_active" label="Trạng thái" rules={[{ required: true }]}>
                    <Select options={[
                        { value: 'active', label: 'Đang mở' },
                        { value: 'inactive', label: 'Tạm dừng' },
                    ]} />
                </Form.Item>
            </Form>
        </Modal>
    );
}

export function CoursesPage() {
    const { user } = useAuth();
    const { openDetail } = useDetailNavigation();
    const { params, page, pageSize, setPage, choice, update } = useListLocation({ status: 'all' });
    const { can } = usePermissions();
    const canCreate = can('courses', 'write');
    const canEdit = can('courses', 'write');

    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [total, setTotal] = useState(0);
    const [reload, setReload] = useState(0);
    const listRequest = useRef(0);
    const deleteLock = useRef(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const mounted = useRef(false);

    const searchText = (params.get('search') || '').slice(0, 200);
    const statusFilter = choice('status', ['all', 'active', 'inactive']);
    const pagination = { page, limit: pageSize };
    const { searchDraft, setSearchDraft, submitSearch } = useSearchInput(searchText, search => {
        update({ search }, true, true);
    });
    const identity = `${user?.id}:${user?.role}`;
    const [dataOwner, setDataOwner] = useState('');
    const refresh = () => { clearListCache(); setReload(value => value + 1); };
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCourse, setEditingCourse] = useState<Course | null>(null);

    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    useEffect(() => {
        const request = ++listRequest.current;
        const controller = new AbortController();
        const fetchCourses = async () => {
            setLoading(true);
            setLoadError('');
            try {
                const res = await courseService.getAll(
                    pagination.page, pagination.limit, searchText.trim(),
                    statusFilter === 'all' ? 'all' : statusFilter === 'active', controller.signal
                );
                if (request !== listRequest.current) return;
                const lastPage = Math.max(1, Math.ceil(res.pagination.total / pagination.limit));
                if (pagination.page > lastPage) {
                    setPage(lastPage);
                    return;
                }
                setCourses(res.data);
                setTotal(res.pagination.total);
                setDataOwner(identity);
            } catch (err) {
                if (request !== listRequest.current) return;
                setTotal(0);
                setCourses([]);
                setDataOwner(identity);
                setLoadError(err instanceof Error ? err.message : 'Lỗi tải danh sách khóa học');
            } finally {
                if (request === listRequest.current) setLoading(false);
            }
        };
        fetchCourses();
        return () => {
            listRequest.current++;
            controller.abort();
        };
    }, [searchText, statusFilter, pagination.page, pagination.limit, reload, user?.id, user?.role]);

    const handleEdit = (course: Course) => {
        setEditingCourse(course);
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setEditingCourse(null);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (deleteLock.current) return;
        deleteLock.current = true;
        setDeletingId(id);
        try {
            await courseService.remove(id);
            if (!mounted.current) return;
            message.success('Đã tạm dừng khóa học');
            setReload(value => value + 1);
        } catch (err) {
            if (mounted.current) message.error(err instanceof Error ? err.message : 'Tạm dừng thất bại');
        } finally {
            deleteLock.current = false;
            if (mounted.current) setDeletingId(null);
        }
    };

    const columns: ColumnsType<Course> = [
        { title: 'Tên khóa học', dataIndex: 'name' },
        { title: 'Mô tả', dataIndex: 'description' },
        { title: 'Số buổi', dataIndex: 'total_sessions' },
        {
            title: 'Thời lượng',
            dataIndex: 'duration_weeks',
            render: (v: number) => v ? `${v} tuần` : 'Chưa có',
        },
        {
            title: 'Học phí',
            dataIndex: 'fee',
            render: (fee: Course['fee']) => <span>{Number(fee || 0).toLocaleString('vi-VN')} đ</span>,
        },
        {
            title: 'Trạng thái',
            dataIndex: 'is_active',
            render: (active: boolean) => (
                <Tag color={active ? 'green' : 'default'}>{active ? 'Đang mở' : 'Tạm dừng'}</Tag>
            ),
        },
        {
            title: 'Thao tác',
            render: (_, record) => (
                <Space>
                    <Button onClick={() => openDetail(`/lms/courses/${record.id}`)}>
                        <EyeOutlined />
                    </Button>
                    {canEdit && (
                        <Button onClick={() => handleEdit(record)}>
                            <EditOutlined />
                        </Button>
                    )}
                    {canEdit && record.is_active && (
                        <Popconfirm
                            title="Tạm dừng khóa học?"
                            description="Khóa học sẽ chuyển sang trạng thái tạm dừng"
                            onConfirm={() => handleDelete(record.id)}
                            okText="Tạm dừng"
                            cancelText="Hủy"
                        >
                            <Button danger loading={deletingId === record.id} disabled={deletingId !== null && deletingId !== record.id}>
                                Tạm dừng
                            </Button>
                        </Popconfirm>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <div className="crm-page">
      <PageHeader
                title="Quản lý Khóa học"
                description="Danh sách các khóa học"
                actions={<><Button icon={<ReloadOutlined />} loading={loading} onClick={refresh}>Tải lại</Button>
                    {canCreate && <Button type="primary" onClick={handleCreate}>Tạo khóa học</Button>}</>}
            />
            <Card>
                <div className="crm-filter-controls mb-4">
                    <Input.Search
                        aria-label="Tìm khóa học" placeholder="Tìm tên khóa học" allowClear
                        value={searchDraft} onChange={e => setSearchDraft(e.target.value)} onSearch={submitSearch}
                        className="crm-filter-search"
                    />
                    <Select className="crm-filter-status" aria-label="Trạng thái khóa học" value={statusFilter} onChange={(value) => {
                        update({ status: value });
                    }}>
                        <Select.Option value="all">Tất cả</Select.Option>
                        <Select.Option value="active">Đang mở</Select.Option>
                        <Select.Option value="inactive">Tạm dừng</Select.Option>
                    </Select>
                </div>
                {loadError && (
                    <Alert
                        type="error"
                        showIcon
                        title={loadError}
                        className="mb-4"
                        action={<Button onClick={refresh}>Thử lại</Button>}
                    />
                )}
                <Table
                    columns={columns}
                    dataSource={dataOwner === identity ? courses : []}
                    rowKey="id"
                    loading={loading}
                    scroll={{ x: 900 }}
                    pagination={paginationProps('khóa học', {
                        current: pagination.page,
                        pageSize: pagination.limit,
                        total: dataOwner === identity ? total : 0,
                        onChange: (page, limit) => setPage(limit === pagination.limit ? page : 1, limit),
                    })}
                />
            </Card>
            {isModalOpen && canEdit && (
                <CourseFormModal
                    course={editingCourse}
                    onCancel={() => setIsModalOpen(false)}
                    onSaved={() => {
                        setIsModalOpen(false);
                        setReload(value => value + 1);
                    }}
                />
            )}
        </div>
    );
}
