import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, Tabs, List, Button, Spin, Empty, Badge, ConfigProvider, theme as antdTheme } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import axios from '../../api/axiosDefault';
import { useTheme } from '../../contexts/ThemeContext';
import OrderStatusBadge from '../../components/OrderStatusBadge/OrderStatusBadge';
import OrderCountdownTimer from '../../components/OrderCountdownTimer/OrderCountdownTimer';
import styles from './BusinessOnlineOrdersPage.module.css';

const STATUS_TABS = [
  { key: '', label: 'Все' },
  { key: 'new', label: 'Новые' },
  { key: 'seen', label: 'Просмотрены' },
  { key: 'confirmed', label: 'Подтверждены' },
  { key: 'paid', label: 'Оплачены' },
  { key: 'completed', label: 'Завершены' },
  { key: 'cancelled', label: 'Отменены' },
  { key: 'expired', label: 'Истекли' },
];

function BusinessOnlineOrdersPage() {
  const { business_slug } = useParams();
  const { theme: currentTheme } = useTheme();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('');

  const fetchOrders = async (statusFilter = '') => {
    setLoading(true);
    try {
      const params = statusFilter ? { status: statusFilter } : {};
      const res = await axios.get(`/api/business/${business_slug}/online-orders/`, { params });
      setOrders(res.data);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(activeTab); }, [activeTab, business_slug]);

  const newCount = orders.filter(o => o.status === 'new').length;

  return (
    <ConfigProvider theme={{ algorithm: currentTheme === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm }}>
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          Онлайн-заказы
          {newCount > 0 && <Badge count={newCount} style={{ marginLeft: 8 }} />}
        </h1>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={(k) => setActiveTab(k)}
        items={STATUS_TABS.map(t => ({ key: t.key, label: t.label }))}
        className={styles.tabs}
      />

      {loading ? (
        <div className={styles.loading}><Spin size="large" /></div>
      ) : orders.length === 0 ? (
        <Empty description="Заказов нет" />
      ) : (
        <List
          dataSource={orders}
          renderItem={(order) => (
            <List.Item key={order.id} className={styles.listItem}>
              <Card className={styles.orderCard} hoverable>
                <div className={styles.cardTop}>
                  <div className={styles.avatarCircle}><UserOutlined /></div>
                  <div className={styles.orderMeta}>
                    <span className={styles.orderNum}>{order.number}</span>
                    <span className={styles.buyerName}>{order.buyer_name || 'Покупатель'}</span>
                  </div>
                  <OrderStatusBadge status={order.status} />
                </div>

                <div className={styles.cardBody}>
                  <span>Товаров: {order.items_count}</span>
                  {order.invoice_amount
                    ? <span>Счёт: <strong>{parseFloat(order.invoice_amount).toLocaleString('ru-RU')} ₸</strong></span>
                    : <span>~{parseFloat(order.total_amount).toLocaleString('ru-RU')} ₸</span>
                  }
                  <span className={styles.date}>{new Date(order.created_at).toLocaleDateString('ru-RU')}</span>
                  {['new', 'seen'].includes(order.status) && (
                    <OrderCountdownTimer expiresAt={order.expires_at} />
                  )}
                </div>

                <div className={styles.cardActions}>
                  <Link to={`/business/${business_slug}/online-orders/${order.id}`}>
                    <Button type={order.status === 'new' ? 'primary' : 'default'} size="small">
                      {order.status === 'new' ? 'Рассмотреть' : 'Открыть'}
                    </Button>
                  </Link>
                </div>
              </Card>
            </List.Item>
          )}
        />
      )}
    </div>
    </ConfigProvider>
  );
}

export default BusinessOnlineOrdersPage;
