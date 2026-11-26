import { RouterProvider } from 'react-router';
import { ConfigProvider } from 'antd';
import { StyleProvider } from '@ant-design/cssinjs';
import viVN from 'antd/locale/vi_VN';
import { router } from './routes';
import { AuthProvider } from '../shared/contexts/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <StyleProvider layer>
        <ConfigProvider
          locale={viVN}
          theme={{
            token: {
              colorPrimary: '#1677ff',
              colorLink: '#1677ff',
              colorBgLayout: '#f0f2f5',
              colorText: '#262626',
              colorTextSecondary: '#737373',
              colorBorder: '#d9d9d9',
              colorBorderSecondary: '#f0f0f0',
              borderRadius: 4,
              controlHeight: 32,
              fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif",
              fontSize: 14,
              lineHeight: 1.6,
            },
            components: {
              Card: { headerHeight: 48, headerFontSize: 14, bodyPadding: 20, bodyPaddingSM: 16 },
              Table: { headerBg: '#fafafa', headerColor: '#434343', cellPaddingBlock: 11, cellPaddingInline: 16, rowHoverBg: '#f5f9ff' },
              Button: { fontWeight: 400, primaryShadow: 'none', defaultShadow: 'none' },
              Statistic: { titleFontSize: 13, contentFontSize: 26 },
            },
          }}
        >
          <RouterProvider router={router} />
        </ConfigProvider>
      </StyleProvider>
    </AuthProvider>
  );
}
