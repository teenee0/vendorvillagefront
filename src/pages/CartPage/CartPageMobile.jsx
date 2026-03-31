import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, InputNumber, Empty, Spin, Popconfirm, ConfigProvider, theme as antdTheme } from 'antd';
import { DeleteOutlined, ShoppingOutlined } from '@ant-design/icons';
import { useCart } from '../../contexts/CartContext';
import { useTheme } from '../../contexts/ThemeContext';
import styles from './CartPageMobile.module.css';

function CartPageMobile() {
  const { cart, loading, updateItem, removeItem, clearCart } = useCart();
  const { theme: currentTheme } = useTheme();
  const navigate = useNavigate();

  if (loading && !cart) return <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>;

  const items = cart?.items || [];
  const total = items.reduce((sum, i) => sum + parseFloat(i.subtotal || 0), 0);

  return (
    <ConfigProvider theme={{ algorithm: currentTheme === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm }}>
    <div className={styles.page}>
      <h2 className={styles.title}>Корзина</h2>

      {items.length === 0 ? (
        <Empty description="Корзина пуста">
          <Link to="/marketplace/categories"><Button type="primary">В каталог</Button></Link>
        </Empty>
      ) : (
        <>
          <div className={styles.list}>
            {items.map((item) => (
              <div key={item.id} className={styles.card}>
                <div className={styles.top}>
                  {item.main_image
                    ? <img src={item.main_image} alt="" className={styles.img} />
                    : <div className={styles.noImg}><ShoppingOutlined /></div>
                  }
                  <div className={styles.info}>
                    <div className={styles.name}>{item.variant_name}</div>
                    <div className={styles.shop}>{item.business_name}</div>
                    <div className={styles.price}>{parseFloat(item.subtotal).toLocaleString('ru-RU')} ₸</div>
                  </div>
                  <Popconfirm title="Удалить?" onConfirm={() => removeItem(item.id)} okText="Да" cancelText="Нет">
                    <Button icon={<DeleteOutlined />} type="text" danger size="small" />
                  </Popconfirm>
                </div>
                <div className={styles.bottom}>
                  <InputNumber
                    min={1}
                    max={item.available_quantity}
                    value={item.quantity}
                    onChange={(v) => v && updateItem(item.id, v)}
                    size="small"
                  />
                  <span className={styles.unitPrice}>{parseFloat(item.price).toLocaleString('ru-RU')} ₸/шт.</span>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.footer}>
            <div className={styles.total}>Итого: <strong>{total.toLocaleString('ru-RU')} ₸</strong></div>
            <Button type="primary" size="large" block onClick={() => navigate('/checkout')}>
              Оформить заказ
            </Button>
            <Popconfirm title="Очистить корзину?" onConfirm={clearCart} okText="Да" cancelText="Нет">
              <Button danger block style={{ marginTop: 8 }}>Очистить корзину</Button>
            </Popconfirm>
          </div>
        </>
      )}
    </div>
    </ConfigProvider>
  );
}

export default CartPageMobile;
