// src/components/BusinessHeader.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './BusinessHeader.module.css';
import logoIcon from '../../assets/logo.svg';

export const BusinessHeader = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ''}`}>
      <div className={styles.container}>
        <div className={styles.headerContent}>
          <div className={styles.logo}>
            <Link to="/" className={styles.logoLink}>
              <img src={logoIcon} alt="A" className={styles.logoIcon} />
              <span className={styles.logoText}>xione & Business</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default BusinessHeader;