import React from 'react';
import {
  FaWhatsapp,
  FaTelegram,
  FaPhone,
  FaCloud,
  FaChartLine,
  FaBoxOpen,
  FaGlobeAmericas,
  FaGlobe,
  FaStore,
  FaMapMarkerAlt,
  FaUsers,
} from 'react-icons/fa';
import { BUSINESS_PARTNERSHIP_CONTACT, FOOTER_CONTACT } from '../../config/contact';
import styles from './BusinessContactPage.module.css';

const FEATURES = [
  {
    icon: FaCloud,
    title: 'Облачная система',
    text: 'Ваш бизнес доступен из браузера — без установки тяжёлого ПО. Данные хранятся надёжно, обновления вы получаете автоматически.',
  },
  {
    icon: FaChartLine,
    title: 'Показатели и продажи',
    text: 'Смотрите динамику заказов, выручку и ключевые метрики в удобном виде. Принимайте решения на основе актуальных цифр.',
  },
  {
    icon: FaBoxOpen,
    title: 'Товары и остатки',
    text: 'Управляйте каталогом, вариантами, ценами и складом в одном месте. Меньше ручной работы — больше времени на развитие.',
  },
  {
    icon: FaGlobeAmericas,
    title: 'С любой точки мира',
    text: 'Проверяйте заказы, остатки и статистику с телефона или ноутбука — дома, в офисе или в командировке.',
  },
  {
    icon: FaStore,
    title: 'Маркетплейс Axione',
    text: 'Подключайте магазин к площадке, расширяйте охват покупателей и продавайте там, где вас уже ищут.',
  },
  {
    icon: FaGlobe,
    title: 'Личные сайты бизнеса',
    text: 'Разрабатываем персональные страницы под ваш бренд: витрина, контакты, акции и связь с каталогом — единый образ в сети.',
  },
  {
    icon: FaUsers,
    title: 'Команда и роли',
    text: 'Приглашайте сотрудников, разграничивайте доступ — владелец и команда работают согласованно и безопасно.',
  },
];

function BusinessContactPage() {
  const { whatsappUrl, whatsappDisplay, telegramUrl, telegramHandle } = BUSINESS_PARTNERSHIP_CONTACT;
  const { phoneDisplay, phoneTel, location } = FOOTER_CONTACT;

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <header className={styles.hero}>
          <p className={styles.eyebrow}>Партнёрам и магазинам</p>
          <h1 className={styles.title}>Связь для бизнеса</h1>
          <p className={styles.lead}>
            Подключите магазин к маркетплейсу Axione, ведите продажи в облачной системе и при необходимости
            закажите личный сайт бизнеса — мы ответим на вопросы и поможем с запуском.
          </p>
        </header>

        <section className={styles.contactSection} aria-label="Контакты">
          <h2 className={styles.srOnly}>Контакты</h2>
          <div className={styles.contactCard}>
            <div className={styles.contactCardGlow} aria-hidden />
            <p className={styles.contactIntro}>Напишите или позвоните — обсудим условия и демонстрацию</p>
            <div className={styles.contactActions}>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles.actionLink} ${styles.whatsapp}`}
              >
                <FaWhatsapp size={22} aria-hidden />
                WhatsApp · {whatsappDisplay}
              </a>
              <a
                href={telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles.actionLink} ${styles.telegram}`}
              >
                <FaTelegram size={22} aria-hidden />
                Telegram {telegramHandle}
              </a>
              <a href={`tel:${phoneTel}`} className={`${styles.actionLink} ${styles.phone}`}>
                <FaPhone size={18} aria-hidden />
                {phoneDisplay}
              </a>
            </div>
            <p className={styles.location}>
              <FaMapMarkerAlt size={14} className={styles.locationIcon} aria-hidden />
              {location}
            </p>
          </div>
        </section>

        <section className={styles.aboutSection} aria-labelledby="about-heading">
          <div className={styles.sectionHead}>
            <h2 id="about-heading" className={styles.sectionTitle}>
              Что даёт платформа
            </h2>
            <p className={styles.sectionSubtitle}>
              Единая экосистема для онлайн-продаж и управления магазином — маркетплейс, личный сайт, аналитика и склад.
            </p>
          </div>
          <ul className={styles.featureGrid}>
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title} className={styles.featureCard}>
                <span className={styles.featureIconWrap} aria-hidden>
                  <Icon className={styles.featureIcon} />
                </span>
                <h3 className={styles.featureTitle}>{title}</h3>
                <p className={styles.featureText}>{text}</p>
              </li>
            ))}
          </ul>
        </section>

        <footer className={styles.bottomCta}>
          <p className={styles.bottomCtaText}>Готовы подключиться или остались вопросы?</p>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.bottomCtaButton}
          >
            Написать в WhatsApp
          </a>
        </footer>
      </div>
    </div>
  );
}

export default BusinessContactPage;
