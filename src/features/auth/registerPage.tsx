import { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Alert, Select, Row, Col } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, PhoneOutlined, UserAddOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router';
import { useAuth } from '../../shared/contexts/AuthContext';
import { authService } from '@/services/api/auth.service';
import { getRedirectPath } from '@/shared/utils/roleRedirect';
import { message } from 'antd';

const { Option } = Select;

export function RegisterPage() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [roleRegistered, setRoleRegistered] = useState('');
  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleRegister = async (values: any) => {
  try {
    setLoading(true);

    const res = await authService.register(values);

    const { user, token } = res.data;

    if (token) {
      login(user, token);
      navigate(getRedirectPath(user.role));
    } else {
      message.success('Đăng ký thành công! Chờ admin duyệt tài khoản');
      navigate('/login');
    }

  } catch (err: any) {
    message.error(err.message || 'Đăng ký thất bại');
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-2xl">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <span className="text-white text-2xl font-bold">EDU</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Tạo tài khoản mới
          </h1>
          <p className="text-gray-600">
            Đăng ký để sử dụng hệ thống quản lý giáo dục
          </p>
        </div>

        {/* Register Card */}
        <Card className="shadow-xl">
          {success ? (
            <Alert
              message="Đăng ký thành công!"
              description={
                roleRegistered === 'student'
                  ? 'Đang đăng nhập...'
                  : 'Tài khoản của bạn đang chờ admin duyệt.'
              }
              type="success"
              showIcon
            />
          ) : null}

          <Form
            form={form}
            name="register"
            onFinish={handleRegister}
            layout="vertical"
            size="large"
            disabled={success}
          >
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="full_name"
                  label="Họ và tên"
                  rules={[
                    { required: true, message: 'Vui lòng nhập họ tên' },
                    { min: 2, message: 'Họ tên phải có ít nhất 2 ký tự' },
                  ]}
                >
                  <Input
                    prefix={<UserOutlined className="text-gray-400" />}
                    placeholder="Nguyễn Văn A"
                  />
                </Form.Item>
              </Col>

              <Col xs={24} sm={12}>
                <Form.Item
                  name="role"
                  label="Loại tài khoản"
                  rules={[{ required: true, message: 'Vui lòng chọn loại tài khoản' }]}
                  initialValue="student"
                >
                  <Select placeholder="Chọn loại tài khoản">
                    <Option value="student">Học viên</Option>
                    <Option value="teacher">Giảng viên</Option>
                    <Option value="sale">Tư vấn</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: 'Vui lòng nhập email' },
                { type: 'email', message: 'Email không hợp lệ' },
              ]}
            >
              <Input
                prefix={<MailOutlined className="text-gray-400" />}
                placeholder="example@email.com"
              />
            </Form.Item>

            <Form.Item
              name="phone"
              label="Số điện thoại"
              rules={[
                { pattern: /^[0-9]{10,11}$/, message: 'Số điện thoại không hợp lệ (10-11 số)' },
              ]}
            >
              <Input
                prefix={<PhoneOutlined className="text-gray-400" />}
                placeholder="0987654321"
              />
            </Form.Item>

            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="password"
                  label="Mật khẩu"
                  rules={[
                    { required: true, message: 'Vui lòng nhập mật khẩu' },
                    { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự' },
                  ]}
                  hasFeedback
                >
                  <Input.Password
                    prefix={<LockOutlined className="text-gray-400" />}
                    placeholder="••••••••"
                  />
                </Form.Item>
              </Col>

              <Col xs={24} sm={12}>
                <Form.Item
                  name="confirmPassword"
                  label="Xác nhận mật khẩu"
                  dependencies={['password']}
                  hasFeedback
                  rules={[
                    { required: true, message: 'Vui lòng xác nhận mật khẩu' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('password') === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error('Mật khẩu xác nhận không khớp'));
                      },
                    }),
                  ]}
                >
                  <Input.Password
                    prefix={<LockOutlined className="text-gray-400" />}
                    placeholder="••••••••"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                icon={<UserAddOutlined />}
                loading={loading}
                block
                size="large"
              >
                Đăng ký
              </Button>
            </Form.Item>

            <div className="text-center">
              <span className="text-gray-600">Đã có tài khoản? </span>
              <a
                href="/login"
                className="text-blue-600 hover:text-blue-700 font-medium"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/login');
                }}
              >
                Đăng nhập ngay
              </a>
            </div>
          </Form>
        </Card>

        {/* Info Card */}
        <Card className="mt-6 bg-blue-50 border-blue-200">
          <div className="text-sm">
            <div className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <span>ℹ️</span>
              <span>Lưu ý khi đăng ký:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li><strong>Học viên</strong>: Có thể xem lịch học, điểm danh, học phí của mình</li>
              <li><strong>Giảng viên</strong>: Có thể xem lịch dạy, quản lý lớp học, điểm danh học viên</li>
              <li>Tài khoản <strong>Admin</strong> và <strong>Sale</strong> được cấp bởi quản trị viên</li>
              <li>Mật khẩu phải có ít nhất 6 ký tự</li>
            </ul>
          </div>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-600 text-sm">
          <p>© 2026 EDU System. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
