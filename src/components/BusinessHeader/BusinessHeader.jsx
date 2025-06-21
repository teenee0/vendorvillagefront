// src/components/BusinessHeader.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ShinyText from '../ShinyText/ShinyText';
import styles from './BusinessHeader.module.css';

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
            <Link to="/">
              <span className={styles.vendor}><ShinyText text="Vendor" disabled={false} speed={3} className='custom-class' /></span>
              <span className={styles.villageBusiness}><ShinyText text="Village & Business" disabled={false} speed={3} className='custom-class' /></span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default BusinessHeader;