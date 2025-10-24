import React from 'react';
import { motion } from 'framer-motion';
import styles from './EmptyState.module.css';

const EmptyState = ({ 
  icon, 
  title, 
  description, 
  action, 
  delay = 0 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className={styles.emptyState}
    >
      <div className={styles.emptyIcon}>
        {icon}
      </div>
      <h3 className={styles.emptyTitle}>{title}</h3>
      <p className={styles.emptyDescription}>{description}</p>
      {action && (
        <div className={styles.emptyAction}>
          {action}
        </div>
      )}
    </motion.div>
  );
};

export default EmptyState;
