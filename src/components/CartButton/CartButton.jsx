import React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from 'antd';
import { ShoppingCartOutlined } from '@ant-design/icons';
import { useCart } from '../../contexts/CartContext';
import styles from './CartButton.module.css';

function CartButton({ className }) {
  const { itemsCount } = useCart();

  return (
    <Link to="/cart" className={`${styles.cartBtn} ${className || ''}`} aria-label="Корзина">
      <Badge count={itemsCount} size="small" color="#1a73e8" overflowCount={99}>
        <ShoppingCartOutlined className={styles.icon} />
      </Badge>
      <span className={styles.label}>Корзина</span>
    </Link>
  );
}

export default CartButton;
