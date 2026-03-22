import React, { useState, useEffect } from 'react';
import styles from './OrderCountdownTimer.module.css';

function pad(n) { return String(n).padStart(2, '0'); }

function formatTimeLeft(ms) {
  if (ms <= 0) return null;
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}ч ${pad(m)}м`;
  return `${pad(m)}м ${pad(s)}с`;
}

function OrderCountdownTimer({ expiresAt }) {
  const [timeLeft, setTimeLeft] = useState(() => new Date(expiresAt) - Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      setTimeLeft(new Date(expiresAt) - Date.now());
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  if (timeLeft <= 0) {
    return <span className={styles.expired}>Время истекло</span>;
  }

  const isUrgent = timeLeft < 3 * 3600 * 1000; // меньше 3 часов
  return (
    <span className={`${styles.timer} ${isUrgent ? styles.urgent : ''}`}>
      ⏱ Истекает через {formatTimeLeft(timeLeft)}
    </span>
  );
}

export default OrderCountdownTimer;
