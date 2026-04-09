import { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Checkbox, Alert } from 'antd';
import { UserOutlined, LockOutlined, LoginOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router';
import { useAuth } from '../../shared/contexts/AuthContext';

export function LoginPage() {
    const [form] = Form.useForm();
    const navigate = useNavigate();
    const { login, isAuthenticated } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/dashboard', { replace: true });
        }
    }, [isAuthenticated, navigate]);

    const handleLogin = async (values: any) => {
        const { email, password } = values;

        try {
            const res = await fetch('http://localhost:3000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (data.status === 'success') {
                const u = data.data.user;

                login(
                    {
                        id: String(u.id),
                        name: u.full_name,
                        email: u.email,
                        role: u.role,
                        avatar: u.avatar_url,
                    },
                    data.data.token
                );

                navigate('/dashboard'); 
            } else {
                setError(data.message || 'Sai tài khoản hoặc mật khẩu');
            }
        } catch (err) {
            console.error(err);
            setError('Không kết nối được server');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
            <div className="w-full max-w-md">

                {/* Title */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Hệ thống quản lý giáo dục
                    </h1>
                    <p className="text-gray-600">Đăng nhập để tiếp tục</p>
                </div>

                <Card className="shadow-xl">
                    <Form
                        form={form}
                        name="login"
                        onFinish={handleLogin}
                        layout="vertical"
                        size="large"
                    >
                        {error && (
                            <Alert
                                message={error}
                                type="error"
                                showIcon
                                closable
                                className="mb-4"
                                onClose={() => setError('')}
                            />
                        )}

                        <Form.Item
                            name="email"
                            label="Email"
                            rules={[
                                { required: true, message: 'Vui lòng nhập email' },
                                { type: 'email', message: 'Email không hợp lệ' },
                            ]}
                        >
                            <Input
                                prefix={<UserOutlined />}
                                placeholder="admin@edu.vn"
                            />
                        </Form.Item>

                        <Form.Item
                            name="password"
                            label="Mật khẩu"
                            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
                        >
                            <Input.Password
                                prefix={<LockOutlined />}
                                placeholder="••••••••"
                            />
                        </Form.Item>

                        <Form.Item>
                            <div className="flex items-center justify-between">
                                <Form.Item name="remember" valuePropName="checked" noStyle>
                                    <Checkbox>Ghi nhớ đăng nhập</Checkbox>
                                </Form.Item>

                                <a
                                    onClick={(e) => {
                                        e.preventDefault();
                                        navigate('/forgot-password');
                                    }}
                                >
                                    Quên mật khẩu?
                                </a>
                            </div>
                        </Form.Item>

                        <Form.Item>
                            <Button
                                type="primary"
                                htmlType="submit"
                                icon={<LoginOutlined />}
                                loading={loading}
                                block
                                size="large"
                            >
                                Đăng nhập
                            </Button>
                        </Form.Item>
                        <div className="text-center mt-4">
                            <span className="text-gray-600">Chưa có tài khoản? </span>
                            <a
                                href="/register"
                                className="text-blue-600 hover:text-blue-700 font-medium"
                                onClick={(e) => {
                                    e.preventDefault();
                                    navigate('/register');
                                }}
                            >
                                Đăng ký ngay
                            </a>
                        </div>
                    </Form>
                </Card>
            </div>
        </div>
    );
}