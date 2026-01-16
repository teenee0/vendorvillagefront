import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import styles from './BottomNavigation.module.css';

const BottomNavigation = () => {
  const location = useLocation();

  const navItems = [
    {
      path: '/',
      icon: 'fas fa-home',
      label: 'Главная'
    },
    {
      path: '/business-categories',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M21.576 10.877h-6.118a2.34 2.34 0 0 1-2.335-2.336V2.423A2.34 2.34 0 0 1 15.458.088h6.118a2.34 2.34 0 0 1 2.335 2.335v6.118a2.34 2.34 0 0 1-2.335 2.336m-6.118-8.454v6.118h6.118V2.423zM5.65 24a5.61 5.61 0 0 1-5.604-5.604A5.61 5.61 0 0 1 5.65 12.79a5.61 5.61 0 0 1 5.605 5.605A5.61 5.61 0 0 1 5.65 24m0-8.873a3.273 3.273 0 0 0-3.269 3.269 3.273 3.273 0 0 0 3.27 3.269 3.273 3.273 0 0 0 3.268-3.27 3.273 3.273 0 0 0-3.269-3.268m2.453-4.268A1.067 1.067 0 0 0 9.65 9.735l-.455-2.65 1.926-1.875a1.066 1.066 0 0 0-.591-1.82L7.87 3.005 6.68.594a1.067 1.067 0 0 0-1.914 0l-1.19 2.41-2.661.387A1.066 1.066 0 0 0 .323 5.21L2.25 7.086l-.454 2.649a1.067 1.067 0 0 0 1.548 1.124l2.38-1.25zm14.958 4.546a2.904 2.904 0 0 0-4.107 0l-.768.768-.768-.768a2.904 2.904 0 0 0-4.107 4.107l.768.768 3.393 3.393a1.01 1.01 0 0 0 1.428 0l3.393-3.393.768-.768a2.904 2.904 0 0 0 0-4.107" fill="currentColor" />
        </svg>
      ),
      label: 'Категории'
    },
    {
      path: '/sites',
      icon: 'fas fa-store',
      label: 'Магазины'
    },
    {
      path: '/cart',
      icon: 'fas fa-shopping-cart',
      label: 'Корзина'
    },
    {
      path: '/account',
      icon: 'fas fa-user',
      label: 'Аккаунт'
    }
  ];

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className={styles.bottomNav}>
      {navItems.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          className={`${styles.navItem} ${isActive(item.path) ? styles.active : ''}`}
        >
          {typeof item.icon === 'string' ? (
            <i className={item.icon}></i>
          ) : (
            <span className={styles.navIcon}>{item.icon}</span>
          )}
          <span className={styles.navLabel}>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
};

export default BottomNavigation;

