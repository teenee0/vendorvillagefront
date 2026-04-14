import React from 'react';

const STATUS_MAP = {
  planned: { label: 'Запланирован', color: 'var(--accent-gold)' },
  paid: { label: 'Оплачен', color: 'var(--accent-green)' },
  overdue: { label: 'Просрочен', color: 'var(--accent-red)' },
  cancelled: { label: 'Отменён', color: 'var(--palladium-mist)' },
};

const PaymentStatusBadge = ({ status }) => {
  const info = STATUS_MAP[status] || { label: status, color: 'var(--text-muted)' };
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 10px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 600,
        color: '#fff',
        background: info.color,
      }}
    >
      {info.label}
    </span>
  );
};

export default PaymentStatusBadge;
