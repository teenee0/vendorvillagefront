import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { SOCIAL_LINKS } from '../../config/socialLinks';
import { FOOTER_CONTACT } from '../../config/contact';
import styles from './Footer.module.css';
import {
  FaInstagram,
  FaTelegram,
  FaMapMarkerAlt,
  FaPhone,
  FaShieldAlt,
  FaFileContract,
} from 'react-icons/fa';
import logoIcon from '../../assets/logo.svg';

function Footer() {
  const { isAuthenticated } = useAuth();
  const currentYear = new Date().getFullYear();
  const { phoneDisplay, phoneTel, location } = FOOTER_CONTACT;

  return (
    <footer className={styles.footer}>
      <div className={styles.footerContainer}>
        <div className={styles.footerContent}>
          <div className={styles.footerSection}>
            <div className={styles.logoSection}>
              <img src={logoIcon} alt="Axione Logo" className={styles.logoIcon} />
              <h3 className={styles.logoText}>Axione</h3>
            </div>
            <p className={styles.description}>
              Ваш маркетплейс для уникальных товаров и местных продавцов.
              Создавайте бизнес, продавайте товары и находите покупателей в вашем городе.
            </p>
            <div className={styles.socialIcons}>
              <a
                href={SOCIAL_LINKS.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Axione в Instagram"
                className={styles.socialLink}
              >
                <FaInstagram />
              </a>
              <a
                href={SOCIAL_LINKS.telegram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Axione в Telegram"
                className={styles.socialLink}
              >
                <FaTelegram />
              </a>
            </div>
          </div>

          <div className={styles.footerSection}>
            <h4 className={styles.sectionTitle}>Навигация</h4>
            <ul className={styles.footerLinks}>
              <li>
                <Link to="/" className={styles.footerLink}>Главная</Link>
              </li>
              <li>
                <Link to="/marketplace/categories" className={styles.footerLink}>Категории</Link>
              </li>
              <li>
                <Link to="/business-categories" className={styles.footerLink}>Для бизнеса</Link>
              </li>
              <li>
                <Link to="/business-contact" className={styles.footerLink}>Связь для бизнеса</Link>
              </li>
              {isAuthenticated ? (
                <li>
                  <Link to="/account" className={styles.footerLink}>Личный кабинет</Link>
                </li>
              ) : (
                <li>
                  <Link to="/registration-login" className={styles.footerLink}>Вход / Регистрация</Link>
                </li>
              )}
            </ul>
          </div>

          <div className={styles.footerSection}>
            <h4 className={styles.sectionTitle}>Контакты</h4>
            <ul className={styles.footerLinks}>
              <li>
                <Link to="/privacy" className={styles.footerLink}>
                  <FaShieldAlt className={styles.linkIcon} />
                  Политика конфиденциальности
                </Link>
              </li>
              <li>
                <a href={`tel:${phoneTel}`} className={styles.footerLink}>
                  <FaPhone className={styles.linkIcon} />
                  {phoneDisplay}
                </a>
              </li>
              <li>
                <span className={styles.footerLink}>
                  <FaMapMarkerAlt className={styles.linkIcon} />
                  {location}
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <div className={styles.footerBottomContent}>
            <p className={styles.copyright}>
              &copy; {currentYear} Axione. Все права защищены.
            </p>
            <div className={styles.legalLinks}>
              <Link to="/privacy" className={styles.legalLink}>
                <FaShieldAlt className={styles.legalIcon} />
                Политика конфиденциальности
              </Link>
              <span className={styles.separator}>|</span>
              <a href="#" className={styles.legalLink}>
                <FaFileContract className={styles.legalIcon} />
                Условия использования
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
