import React from 'react';
import { Calendar, Badge, Card } from 'antd';
import type { BadgeProps } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { PageHeader } from '../../shared/components/PageHeader';
import { getSessionsWithClassName } from '../../services/mock/mockData';

export function SchedulePage() {
  const getListData = (value: Dayjs) => {
    const sessions = getSessionsWithClassName().filter(session => 
      dayjs(session.date).isSame(value, 'day')
    );

    return sessions.map(session => ({
      type: session.status === 'completed' ? 'success' : 
            session.status === 'cancelled' ? 'error' : 'warning',
      content: `${session.start_time} - ${session.class_name}`,
    })) as { type: BadgeProps['status']; content: string }[];
  };

  const dateCellRender = (value: Dayjs) => {
    const listData = getListData(value);
    return (
      <ul className="events" style={{ listStyle: 'none', padding: 0 }}>
        {listData.map((item, index) => (
          <li key={index}>
            <Badge status={item.type} text={item.content} />
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div>
      <PageHeader
        title="Lịch học"
        breadcrumbs={[
          { title: 'Dashboard', href: '/dashboard' },
          { title: 'LMS' },
          { title: 'Lịch học' },
        ]}
      />

      <Card>
        <Calendar cellRender={dateCellRender} />
      </Card>
    </div>
  );
}
