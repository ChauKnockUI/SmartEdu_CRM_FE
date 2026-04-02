import { RouterProvider } from 'react-router';
import { ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';
import { router } from './routes';
import { AuthProvider } from '../shared/contexts/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <ConfigProvider
        locale={viVN}
        theme={{
          token: {
            colorPrimary: '#1890ff',
            borderRadius: 6,
          },
        }}
      >
        <RouterProvider router={router} />
      </ConfigProvider>
    </AuthProvider>
  );
}