import { useEffect, useState } from 'react';
import { Calendar, Badge, Card, message } from 'antd';
import type { BadgeProps } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { PageHeader } from '../../shared/components/PageHeader';
import { classService } from '@/services/api/class.service';

export function SchedulePage() {
  const [classes, setClasses] = useState<any[]>([]);

  const fetchClasses = async () => {
    try {
      const res = await classService.getAll();
      setClasses(res.data || []);
    } catch {
      message.error('Lỗi tải lịch');
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  // map Mon → number
  const dayMap: any = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 0,
  };

  const getListData = (value: Dayjs) => {
    const list: any[] = [];

    classes.forEach((cls) => {
      if (!cls.schedule_days || !cls.schedule_time) return;

      const days = cls.schedule_days.split(',').map((d: string) => dayMap[d]);

      if (!days.includes(value.day())) return;

      const startDate = dayjs(cls.start_date);
      const endDate = dayjs(cls.end_date);

      if (value.isBefore(startDate) || value.isAfter(endDate)) return;

      list.push({
        type:
          cls.status === 'completed'
            ? 'success'
            : cls.status === 'cancelled'
            ? 'error'
            : 'processing',
        content: `${cls.schedule_time} - ${cls.name}`,
      });
    });

    return list as { type: BadgeProps['status']; content: string }[];
  };

  const dateCellRender = (value: Dayjs) => {
    const listData = getListData(value);

    return (
      <ul style={{ listStyle: 'none', padding: 0 }}>
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
      <PageHeader title="Lịch học (Admin)" />

      <Card>
        <Calendar cellRender={dateCellRender} />
      </Card>
    </div>
  );
}