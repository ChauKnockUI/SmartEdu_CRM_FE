import React, { useState } from 'react';
import { Form, Input, Button, Card, Alert, Result } from 'antd';
import { MailOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router';

export function ForgotPasswordPage() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (values: { email: string }) => {
    setLoading(true);

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="w-full max-w-md">
          <Card className="shadow-xl">
            <Result
              status="success"
              title="Email đã được gửi!"
              subTitle="Vui lòng kiểm tra email của bạn để đặt lại mật khẩu. Link sẽ hết hạn sau 24 giờ."
              extra={[
                <Button type="primary" key="login" onClick={() => navigate('/login')}>
                  Quay lại đăng nhập
                </Button>,
              ]}
            />
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <span className="text-white text-2xl font-bold">EDU</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Quên mật khẩu?
          </h1>
          <p className="text-gray-600">
            Nhập email của bạn để nhận link đặt lại mật khẩu
          </p>
        </div>

        {/* Form Card */}
        <Card className="shadow-xl">
          <Form
            form={form}
            name="forgot-password"
            onFinish={handleSubmit}
            layout="vertical"
            size="large"
          >
            <Alert
              message="Hướng dẫn"
              description="Nhập địa chỉ email đã đăng ký. Chúng tôi sẽ gửi link để bạn đặt lại mật khẩu."
              type="info"
              showIcon
              className="mb-4"
            />

            <Form.Item
              name="email"
              label="Email đã đăng ký"
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

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                size="large"
              >
                Gửi link đặt lại mật khẩu
              </Button>
            </Form.Item>

            <div className="text-center">
              <Button
                type="link"
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate('/login')}
              >
                Quay lại đăng nhập
              </Button>
            </div>
          </Form>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-600 text-sm">
          <p>© 2026 EDU System. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
