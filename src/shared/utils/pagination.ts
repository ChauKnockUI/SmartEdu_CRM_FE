import type { PaginationProps } from 'antd';

export function paginationProps(unit: string, props: PaginationProps = {}): PaginationProps {
  return {
    size: 'middle',
    responsive: true,
    showLessItems: true,
    showSizeChanger: { showSearch: false },
    pageSizeOptions: [10, 20, 50, 100],
    showTotal: total => `Tổng ${total} ${unit}`,
    ...props,
    className: ['crm-pagination', props.className].filter(Boolean).join(' '),
  };
}
