import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import styles from './Footer.module.css';
import { 
  FaInstagram, 
  FaTelegram,
  FaEnvelope,
  FaMapMarkerAlt,
  FaPhone,
  FaShieldAlt,
  FaFileContract
} from 'react-icons/fa';
import logoIcon from '../../assets/logo.svg';

function Footer() {
  const { isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subscribeMessage, setSubscribeMessage] = useState('');

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setSubscribeMessage('Пожалуйста, введите корректный email');
      return;
    }

    setIsSubmitting(true);
    setSubscribeMessage('');
    
    // Здесь можно добавить API вызов для подписки
    try {
      // await axios.post('/api/newsletter/subscribe/', { email });
      setTimeout(() => {
        setSubscribeMessage('Спасибо за подписку!');
        setEmail('');
        setIsSubmitting(false);
      }, 500);
    } catch (error) {
      setSubscribeMessage('Ошибка подписки. Попробуйте позже.');
      setIsSubmitting(false);
    }
  };

  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.footerContainer}>
        {/* Основной контент футера */}
        <div className={styles.footerContent}>
          {/* О компании */}
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
                href="https://instagram.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                aria-label="Instagram"
                className={styles.socialLink}
              >
                <FaInstagram />
              </a>
              <a 
                href="https://t.me" 
                target="_blank" 
                rel="noopener noreferrer" 
                aria-label="Telegram"
                className={styles.socialLink}
              >
                <FaTelegram />
              </a>
            </div>
          </div>

          {/* Быстрые ссылки */}
          <div className={styles.footerSection}>
            <h4 className={styles.sectionTitle}>Навигация</h4>
            <ul className={styles.footerLinks}>
              <li>
                <Link to="/" className={styles.footerLink}>Главная</Link>
              </li>
              <li>
                <Link to="/marketplace" className={styles.footerLink}>Маркетплейс</Link>
              </li>
              <li>
                <Link to="/marketplace/categories" className={styles.footerLink}>Категории</Link>
              </li>
              <li>
                <Link to="/business-categories" className={styles.footerLink}>Для бизнеса</Link>
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

          {/* Помощь и поддержка */}
          <div className={styles.footerSection}>
            <h4 className={styles.sectionTitle}>Помощь</h4>
            <ul className={styles.footerLinks}>
              <li>
                <Link to="/privacy" className={styles.footerLink}>
                  <FaShieldAlt className={styles.linkIcon} />
                  Политика конфиденциальности
                </Link>
              </li>
              <li>
                <a href="mailto:support@axione.ru" className={styles.footerLink}>
                  <FaEnvelope className={styles.linkIcon} />
                  Связаться с нами
                </a>
              </li>
              <li>
                <a href="tel:+79991234567" className={styles.footerLink}>
                  <FaPhone className={styles.linkIcon} />
                  +7 (999) 123-45-67
                </a>
              </li>
              <li>
                <span className={styles.footerLink}>
                  <FaMapMarkerAlt className={styles.linkIcon} />
                  Москва, Россия
                </span>
              </li>
            </ul>
          </div>

          {/* Подписка на рассылку */}
          <div className={styles.footerSection}>
            <h4 className={styles.sectionTitle}>Подписка</h4>
            <p className={styles.newsletterDescription}>
              Подпишитесь на рассылку, чтобы получать новости о новых товарах и специальных предложениях
            </p>
            <form className={styles.newsletterForm} onSubmit={handleNewsletterSubmit}>
              <div className={styles.inputWrapper}>
                <input
                  type="email"
                  placeholder="Ваш email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={styles.newsletterInput}
                  required
                  disabled={isSubmitting}
                />
                <button 
                  type="submit" 
                  className={styles.newsletterButton}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? '...' : 'Подписаться'}
                </button>
              </div>
              {subscribeMessage && (
                <p className={styles.subscribeMessage}>{subscribeMessage}</p>
              )}
            </form>
          </div>
        </div>

        {/* Нижняя часть футера */}
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
