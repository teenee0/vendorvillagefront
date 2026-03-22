import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Card, Button, Descriptions, Divider, List, Spin, Popconfirm, notification, Image,
  ConfigProvider, theme as antdTheme
} from 'antd';
import { ArrowLeftOutlined, ShoppingOutlined, GiftOutlined } from '@ant-design/icons';
import axios from '../../api/axiosDefault';
import { useTheme } from '../../contexts/ThemeContext';
import OrderStatusBadge from '../../components/OrderStatusBadge/OrderStatusBadge';
import OrderCountdownTimer from '../../components/OrderCountdownTimer/OrderCountdownTimer';
import OrderChat from '../../components/OrderChat/OrderChat';
import styles from './MyOrderDetailPage.module.css';

function MyOrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { theme: currentTheme } = useTheme();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [myBonus, setMyBonus] = useState(null);

  const fetchOrder = useCallback(async () => {
    try {
      const res = await axios.get(`/api/orders/${id}/`);
      setOrder(res.data);
    } catch {
      navigate('/my-orders');
    }
  }, [id, navigate]);

  useEffect(() => {
    setLoading(true);
    fetchOrder().finally(() => setLoading(false));
    axios.get('/accounts/api/auth/me/').then(r => setCurrentUserId(r.data?.user?.id)).catch(() => {});
  }, [fetchOrder]);

  useEffect(() => {
    if (!order?.business_slug) return;
    axios.get('/api/user/bonus-balances/')
      .then(res => {
        const found = (res.data || []).find(b => b.slug === order.business_slug);
        if (found) setMyBonus(found);
      })
      .catch(() => {});
  }, [order?.business_slug]);

  const handleCancel = async () => {
    setActionLoading(true);
    try {
      await axios.post(`/api/orders/${id}/cancel/`);
      notification.success({ message: 'Заказ отменён' });
      fetchOrder();
    } catch (err) {
      notification.error({ message: err.response?.data?.detail || 'Ошибка отмены' });
    } finally {
      setActionLoading(false);
    }
  };

  const handlePay = async () => {
    setActionLoading(true);
    try {
      await axios.post(`/api/orders/${id}/pay/`);
      notification.success({ message: 'Оплата принята!' });
      fetchOrder();
    } catch (err) {
      notification.error({ message: err.response?.data?.detail || 'Ошибка оплаты' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className={styles.loading}><Spin size="large" /></div>;
  if (!order) return null;

  const showExpiry = ['new', 'seen'].includes(order.status);

  // Финальная сумма к оплате с учётом доставки, скидки и бонусов
  const invoiceFinalTotal = (() => {
    if (!order.invoice_amount) return 0;
    const base = parseFloat(order.total_amount || order.invoice_amount);
    const delivery = parseFloat(order.delivery_cost || 0);
    const discountVal = parseFloat(order.discount_value || 0);
    const preDiscount = base + delivery;
    const discAmt = order.discount_type === 'percent'
      ? Math.round(preDiscount * discountVal / 100 * 100) / 100
      : Math.min(discountVal, preDiscount);
    const bonusRed = parseFloat(order.bonus_redeemed || 0);
    return Math.max(0, preDiscount - discAmt - bonusRed);
  })();

  // Разбивка счёта (доставка + скидка + бонусы) — показывается если есть счёт
  const renderInvoiceBreakdown = () => {
    if (!order.invoice_amount) return null;
    const base = parseFloat(order.total_amount || order.invoice_amount);
    const delivery = parseFloat(order.delivery_cost || 0);
    const discountVal = parseFloat(order.discount_value || 0);
    const preDiscount = base + delivery;
    const discAmt = order.discount_type === 'percent'
      ? Math.round(preDiscount * discountVal / 100 * 100) / 100
      : Math.min(discountVal, preDiscount);
    const bonusRed = parseFloat(order.bonus_redeemed || 0);
    const bonusAcc = parseFloat(order.bonus_accrued || 0);

    return (
      <div className={styles.invoiceBreakdown}>
        <div className={styles.invoiceBreakdownRow}>
          <span>Товары</span>
          <span>{base.toLocaleString('ru-RU')} ₸</span>
        </div>
        {delivery > 0 && (
          <div className={styles.invoiceBreakdownRow}>
            <span>Доставка</span>
            <span>+{delivery.toLocaleString('ru-RU')} ₸</span>
          </div>
        )}
        {discAmt > 0 && (
          <div className={`${styles.invoiceBreakdownRow} ${styles.invoiceBreakdownDiscount}`}>
            <span>Скидка{order.discount_type === 'percent' ? ` (${parseFloat(order.discount_value)}%)` : ''}</span>
            <span>−{discAmt.toLocaleString('ru-RU')} ₸</span>
          </div>
        )}
        {bonusRed > 0 && (
          <div className={`${styles.invoiceBreakdownRow} ${styles.invoiceBreakdownBonus}`}>
            <span>Бонусов списано</span>
            <span>−{bonusRed.toLocaleString('ru-RU')} баллов</span>
          </div>
        )}
        {bonusAcc > 0 && (
          <div className={`${styles.invoiceBreakdownRow} ${styles.invoiceBreakdownAccrued}`}>
            <span>Бонусов начислено</span>
            <span>+{bonusAcc.toLocaleString('ru-RU')} баллов</span>
          </div>
        )}
        <div className={styles.invoiceBreakdownDivider} />
        <div className={styles.invoiceBreakdownTotal}>
          <span>Итого к оплате</span>
          <strong>{invoiceFinalTotal.toLocaleString('ru-RU')} ₸</strong>
        </div>
        {order.invoice_comment && (
          <div className={styles.invoiceComment}>{order.invoice_comment}</div>
        )}
      </div>
    );
  };

  return (
    <ConfigProvider theme={{ algorithm: currentTheme === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm }}>
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <Link to="/my-orders" className={styles.back}>
            <ArrowLeftOutlined /> Мои заказы
          </Link>
          <div className={styles.headerRight}>
            <h1 className={styles.title}>Заказ {order.number}</h1>
            <OrderStatusBadge status={order.status} />
          </div>
        </div>

        {showExpiry && <div className={styles.timer}><OrderCountdownTimer expiresAt={order.expires_at} /></div>}

        {order.status === 'ready' && order.delivery_type === 'pickup' && (
          <div className={styles.readyBanner}>
            <span className={styles.readyIcon}>🏪</span>
            <div>
              <div className={styles.readyTitle}>Товар готов к выдаче!</div>
              <div className={styles.readySubtitle}>Вы можете забрать заказ в магазине</div>
            </div>
          </div>
        )}

        <div className={styles.grid}>
          <div className={styles.left}>
            <Card title="Информация о заказе" className={styles.card}>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Магазин">{order.business_name}</Descriptions.Item>
                <Descriptions.Item label="Дата">{new Date(order.created_at).toLocaleString('ru-RU')}</Descriptions.Item>
                {order.buyer_phone && (
                  <Descriptions.Item label="Телефон">{order.buyer_phone}</Descriptions.Item>
                )}
                <Descriptions.Item label="Способ получения">
                  {order.delivery_type_display || (order.delivery_type === 'pickup' ? 'Самовывоз' : 'Доставка')}
                </Descriptions.Item>
                {order.delivery_type === 'delivery' && order.delivery_address && (
                  <Descriptions.Item label="Адрес доставки">{order.delivery_address}</Descriptions.Item>
                )}
                <Descriptions.Item label="Способ оплаты">
                  {order.payment_type_display || (order.payment_type === 'offline' ? 'При получении' : 'Онлайн')}
                </Descriptions.Item>
                {order.buyer_comment && (
                  <Descriptions.Item label="Комментарий">{order.buyer_comment}</Descriptions.Item>
                )}
              </Descriptions>

              {myBonus && (
                <>
                  <Divider />
                  <div className={styles.bonusRow}>
                    <GiftOutlined className={styles.bonusIcon} />
                    <div className={styles.bonusText}>
                      <span className={styles.bonusLabel}>Ваши бонусы в этом магазине</span>
                      <span className={styles.bonusBalance}>{parseFloat(myBonus.balance).toLocaleString('ru-RU')} баллов</span>
                    </div>
                    {myBonus.tier && (
                      <span className={styles.bonusTier}>{myBonus.tier.name}</span>
                    )}
                  </div>
                </>
              )}
            </Card>

            <Card title="Товары" className={styles.card} style={{ marginTop: 16 }}>
              <List
                size="small"
                dataSource={order.items || []}
                renderItem={(item) => (
                  <List.Item>
                    <div className={styles.item}>
                      {item.main_image
                        ? <Image src={item.main_image} width={48} height={48} style={{ objectFit: 'cover', borderRadius: 6 }} preview={false} />
                        : <div className={styles.noImg}><ShoppingOutlined /></div>
                      }
                      <div className={styles.itemInfo}>
                        <div className={styles.itemName}>{item.variant_name}</div>
                        <div className={styles.itemMeta}>{item.location_name} · {item.quantity} шт.</div>
                      </div>
                      <div className={styles.itemPrice}>{parseFloat(item.subtotal).toLocaleString('ru-RU')} ₸</div>
                    </div>
                  </List.Item>
                )}
              />
              {order.invoice_amount && (
                <>
                  <Divider />
                  <div className={styles.invoiceTitle}>Счёт от продавца</div>
                  {renderInvoiceBreakdown()}
                </>
              )}

              <div className={styles.actions}>
                {order.is_payable && (
                  <Popconfirm title="Подтвердить, что вы оплатили?" onConfirm={handlePay} okText="Да, оплатил" cancelText="Отмена">
                    <Button type="primary" size="large" loading={actionLoading}>
                      Оплатил ({invoiceFinalTotal.toLocaleString('ru-RU')} ₸)
                    </Button>
                  </Popconfirm>
                )}
                {order.is_cancellable && (
                  <Popconfirm title="Отменить заказ?" onConfirm={handleCancel} okText="Да, отменить" cancelText="Нет">
                    <Button danger loading={actionLoading}>Отменить</Button>
                  </Popconfirm>
                )}
              </div>
            </Card>
          </div>

          <div className={styles.right}>
            <Card title="Чат с продавцом" className={styles.card}>
              <OrderChat orderId={order.id} currentUserId={currentUserId} />
            </Card>
          </div>
        </div>
      </div>
    </div>
    </ConfigProvider>
  );
}

export default MyOrderDetailPage;
