import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, InputNumber, Empty, Spin, Popconfirm, Divider, Image, ConfigProvider, theme as antdTheme } from 'antd';
import { DeleteOutlined, ShoppingOutlined } from '@ant-design/icons';
import { useCart } from '../../contexts/CartContext';
import { useTheme } from '../../contexts/ThemeContext';
import styles from './CartPage.module.css';

function CartPageDesktop() {
  const { cart, loading, updateItem, removeItem, clearCart } = useCart();
  const { theme: currentTheme } = useTheme();
  const navigate = useNavigate();

  if (loading && !cart) return <div className={styles.loading}><Spin size="large" /></div>;

  const items = cart?.items || [];
  const total = items.reduce((sum, i) => sum + parseFloat(i.subtotal || 0), 0);

  const handleCheckout = () => navigate('/checkout');

  return (
    <ConfigProvider theme={{ algorithm: currentTheme === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm }}>
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Корзина</h1>

        {items.length === 0 ? (
          <Empty
            image={<ShoppingOutlined style={{ fontSize: 64, color: '#ccc' }} />}
            description={<span>Корзина пуста</span>}
          >
            <Link to="/marketplace/categories"><Button type="primary">Перейти в каталог</Button></Link>
          </Empty>
        ) : (
          <div className={styles.layout}>
            <div className={styles.itemsList}>
              {items.map((item) => (
                <div key={item.id} className={styles.item}>
                  <div className={styles.itemImg}>
                    {item.main_image
                      ? <Image src={item.main_image} width={80} height={80} style={{ objectFit: 'cover', borderRadius: 8 }} preview={false} />
                      : <div className={styles.noImg}><ShoppingOutlined /></div>
                    }
                  </div>
                  <div className={styles.itemInfo}>
                    <Link to={`/marketplace/products/${item.variant}`} className={styles.itemName}>
                      {item.variant_name}
                    </Link>
                    <div className={styles.itemMeta}>
                      <span className={styles.itemSku}>{item.variant_sku}</span>
                      <span className={styles.itemShop}>
                        Магазин: <Link to={`/business/${item.business_slug}/main`}>{item.business_name}</Link>
                      </span>
                      <span className={styles.itemLocation}>{item.location_name}</span>
                    </div>
                    <div className={styles.itemAvail}>
                      Доступно: <strong>{item.available_quantity}</strong>
                    </div>
                  </div>
                  <div className={styles.itemQty}>
                    <InputNumber
                      min={1}
                      max={item.available_quantity}
                      value={item.quantity}
                      onChange={(v) => v && updateItem(item.id, v)}
                      size="small"
                    />
                  </div>
                  <div className={styles.itemPrice}>
                    <div className={styles.priceUnit}>{parseFloat(item.price).toLocaleString('ru-RU')} ₸</div>
                    <div className={styles.priceTotal}>{parseFloat(item.subtotal).toLocaleString('ru-RU')} ₸</div>
                  </div>
                  <Popconfirm
                    title="Удалить из корзины?"
                    onConfirm={() => removeItem(item.id)}
                    okText="Да" cancelText="Нет"
                  >
                    <Button icon={<DeleteOutlined />} type="text" danger />
                  </Popconfirm>
                </div>
              ))}

              <div className={styles.clearRow}>
                <Popconfirm title="Очистить корзину?" onConfirm={clearCart} okText="Да" cancelText="Нет">
                  <Button danger>Очистить корзину</Button>
                </Popconfirm>
              </div>
            </div>

            <div className={styles.summary}>
              <h3>Итого</h3>
              <Divider />
              <div className={styles.summaryRow}>
                <span>Товаров:</span>
                <strong>{items.length}</strong>
              </div>
              <div className={styles.summaryRow}>
                <span>Сумма:</span>
                <strong className={styles.totalPrice}>{total.toLocaleString('ru-RU')} ₸</strong>
              </div>
              <Divider />
              <Button type="primary" size="large" block onClick={handleCheckout}>
                Оформить заказ
              </Button>
              <Link to="/marketplace/categories">
                <Button style={{ marginTop: 8 }} block>Продолжить покупки</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
    </ConfigProvider>
  );
}

export default CartPageDesktop;
