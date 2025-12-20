import React from 'react';
import styles from './Loader.module.css';
import logoIcon from '../../assets/logo.svg';

const Loader = ({ size = 'medium', className = '' }) => {
  const sizeClass = styles[`loader-${size}`];
  
  return (
    <div className={`${styles.loaderContainer} ${className}`}>
      <div className={`${styles.loaderWrapper} ${sizeClass}`}>
        {/* Вращающееся кольцо с градиентом */}
        <div className={styles.rotatingRing}>
          <div className={styles.ringSegment}></div>
          <div className={styles.ringSegment}></div>
          <div className={styles.ringSegment}></div>
        </div>
        
        {/* Логотип в центре с пульсацией */}
        <div className={styles.logoContainer}>
          <img 
            src={logoIcon} 
            alt="Loading" 
            className={styles.logo}
          />
          <div className={styles.logoGlow}></div>
        </div>
      </div>
    </div>
  );
};

export default Loader;
