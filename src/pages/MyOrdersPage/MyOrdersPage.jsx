import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, Tabs, List, Button, Spin, Empty, Avatar, ConfigProvider, theme as antdTheme } from 'antd';
import { ShopOutlined } from '@ant-design/icons';
import axios from '../../api/axiosDefault';
import { useTheme } from '../../contexts/ThemeContext';
import OrderStatusBadge from '../../components/OrderStatusBadge/OrderStatusBadge';
import OrderCountdownTimer from '../../components/OrderCountdownTimer/OrderCountdownTimer';
import styles from './MyOrdersPage.module.css';

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

function MyOrdersPage() {
  const { theme: currentTheme } = useTheme();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('');

  const fetchOrders = async (statusFilter = '') => {
    setLoading(true);
    try {
      const params = statusFilter ? { status: statusFilter } : {};
      const res = await axios.get('/api/orders/list/', { params });
      setOrders(res.data);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(activeTab); }, [activeTab]);

  return (
    <ConfigProvider theme={{ algorithm: currentTheme === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm }}>
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Мои заказы</h1>
        <Tabs
          activeKey={activeTab}
          onChange={(k) => setActiveTab(k)}
          items={STATUS_TABS.map(t => ({ key: t.key, label: t.label }))}
          className={styles.tabs}
        />

        {loading ? (
          <div className={styles.loading}><Spin size="large" /></div>
        ) : orders.length === 0 ? (
          <Empty description="Заказов нет">
            <Link to="/marketplace"><Button type="primary">В каталог</Button></Link>
          </Empty>
        ) : (
          <List
            dataSource={orders}
            renderItem={(order) => (
              <List.Item key={order.id} className={styles.listItem}>
                <Card className={styles.orderCard} hoverable>
                  <div className={styles.cardTop}>
                    <Avatar icon={<ShopOutlined />} src={order.business_logo} size={40} />
                    <div className={styles.orderMeta}>
                      <span className={styles.orderNum}>{order.number}</span>
                      <span className={styles.businessName}>{order.business_name}</span>
                    </div>
                    <OrderStatusBadge status={order.status} />
                  </div>

                  <div className={styles.cardBody}>
                    <div>Товаров: {order.items_count}</div>
                    {order.invoice_amount
                      ? <div>Счёт: <strong>{parseFloat(order.invoice_amount).toLocaleString('ru-RU')} ₸</strong></div>
                      : <div>Сумма: <strong>{parseFloat(order.total_amount).toLocaleString('ru-RU')} ₸</strong></div>
                    }
                    <div className={styles.date}>
                      {new Date(order.created_at).toLocaleDateString('ru-RU')}
                    </div>
                    {['new', 'seen'].includes(order.status) && (
                      <OrderCountdownTimer expiresAt={order.expires_at} />
                    )}
                  </div>

                  <div className={styles.cardActions}>
                    <Link to={`/my-orders/${order.id}`}>
                      <Button type="primary" size="small">Открыть</Button>
                    </Link>
                  </div>
                </Card>
              </List.Item>
            )}
          />
        )}
      </div>
    </div>
    </ConfigProvider>
  );
}

export default MyOrdersPage;
