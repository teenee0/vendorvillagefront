import React from 'react';
import styles from './Loader.module.css';

const Loader = ({ size = 'medium', className = '' }) => {
  const sizeClass = styles[`loader-${size}`];
  
  return (
    <div className={`${styles.loaderContainer} ${className}`}>
      <div className={`${styles.loader} ${sizeClass}`}>
        <div className={`${styles.segment} ${styles.yellow}`}></div>
        <div className={`${styles.segment} ${styles.orange}`}></div>
        <div className={`${styles.segment} ${styles.red}`}></div>
        <div className={`${styles.segment} ${styles.purple}`}></div>
        <div className={`${styles.segment} ${styles.blue}`}></div>
        <div className={styles.centerGlow}></div>
      </div>
    </div>
  );
};

export default Loader;
