import React from 'react';
import { Tag } from 'antd';

const STATUS_MAP = {
  new:       { color: 'blue',    label: 'Новая' },
  seen:      { color: 'cyan',    label: 'Просмотрена' },
  confirmed: { color: 'green',   label: 'Подтверждена' },
  invoiced:  { color: 'gold',    label: 'Счёт выставлен' },
  paid:      { color: 'success', label: 'Оплачена' },
  ready:     { color: 'purple',  label: 'Товар готов к выдаче' },
  completed: { color: 'default', label: 'Завершена' },
  cancelled: { color: 'red',     label: 'Отменена' },
  expired:   { color: 'orange',  label: 'Истекла' },
};

function OrderStatusBadge({ status }) {
  const cfg = STATUS_MAP[status] || { color: 'default', label: status };
  return <Tag color={cfg.color}>{cfg.label}</Tag>;
}

export default OrderStatusBadge;
