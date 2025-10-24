import React from 'react';
import { motion } from 'framer-motion';
import styles from './StatCard.module.css';

const StatCard = ({ 
  title, 
  value, 
  icon, 
  color = 'primary', 
  trend, 
  delay = 0,
  onClick 
}) => {
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
          {trend && (
            <div className={`${styles.trend} ${trend > 0 ? styles.positive : styles.negative}`}>
              {trend > 0 ? '↗' : '↘'} {Math.abs(trend)}%
            </div>
          )}
        </div>
      </div>
      <div className={styles.cardBackground}></div>
    </motion.div>
  );
};

export default StatCard;
