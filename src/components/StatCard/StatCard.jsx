import React from 'react';
import { motion } from 'framer-motion';
import styles from './StatCard.module.css';

const StatCard = ({
  title,
  value,
  icon,
  color = 'primary',
  trend,
  subtitle,
  trendHint = 'нет данных за прошлый период',
  inverseTrend = false,
  suppressTrendHint = false,
  delay = 0,
  onClick,
}) => {
  const trendArrow = trend == null ? null : trend > 0 ? '↗' : trend < 0 ? '↘' : '→';

  const trendPositive =
    trend != null &&
    (inverseTrend ? trend < 0 : trend > 0);
  const trendNegative =
    trend != null &&
    (inverseTrend ? trend > 0 : trend < 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`${styles.statCard} ${styles[color]}`}
      onClick={onClick}
    >
      <div className={styles.cardContent}>
        <div className={styles.iconContainer}>
          {icon}
        </div>
        <div className={styles.textContent}>
          <h6 className={styles.title}>{title}</h6>
          <h3 className={styles.value}>{value}</h3>
          {subtitle && (
            <p className={styles.subtitle}>{subtitle}</p>
          )}
          {trend != null && trendArrow && (
            <div
              className={`${styles.trend} ${
                trendPositive
                  ? styles.positive
                  : trendNegative
                    ? styles.negative
                    : styles.neutral
              }`}
            >
              {trendArrow} {Math.abs(trend)}%
            </div>
          )}
          {trend == null && !suppressTrendHint && (
            <div className={styles.trendMuted}>{trendHint}</div>
          )}
        </div>
      </div>
      <div className={styles.cardBackground}></div>
    </motion.div>
  );
};

export default StatCard;
