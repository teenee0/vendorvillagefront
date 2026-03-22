import React, { useState } from 'react';
import { Button, InputNumber, notification } from 'antd';
import { ShoppingCartOutlined, CheckOutlined } from '@ant-design/icons';
import { useCart } from '../../contexts/CartContext';
import { useNavigate } from 'react-router-dom';
import styles from './AddToCartButton.module.css';

function AddToCartButton({ variantId, locationPriceId, availableQuantity = 999, disabled = false }) {
  const { addToCart, loading } = useCart();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const handleAdd = async () => {
    if (!variantId || !locationPriceId) {
      notification.warning({ message: 'Выберите вариант и локацию товара' });
      return;
    }
    const result = await addToCart(variantId, locationPriceId, qty);
    if (result.success) {
      setAdded(true);
      notification.success({ message: 'Товар добавлен в корзину', duration: 2 });
      setTimeout(() => setAdded(false), 2500);
    } else {
      if (result.error?.includes('401') || result.error?.includes('авториз')) {
        navigate('/registration-login');
      } else {
        notification.error({ message: result.error || 'Ошибка добавления в корзину' });
      }
    }
  };

  return (
    <div className={styles.wrapper}>
      <InputNumber
        min={1}
        max={availableQuantity}
        value={qty}
        onChange={(v) => setQty(v || 1)}
        className={styles.qty}
        size="large"
      />
      <Button
        type="primary"
        size="large"
        icon={added ? <CheckOutlined /> : <ShoppingCartOutlined />}
        onClick={handleAdd}
        loading={loading}
        disabled={disabled || availableQuantity === 0}
        className={`${styles.btn} ${added ? styles.added : ''}`}
      >
        {availableQuantity === 0 ? 'Нет в наличии' : added ? 'В корзине!' : 'В корзину'}
      </Button>
    </div>
  );
}

export default AddToCartButton;
