import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, List, Divider, notification, Spin, Empty, Select, ConfigProvider, theme as antdTheme } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { ShopOutlined, CarOutlined, PhoneOutlined, PlusOutlined, DeleteOutlined, WalletOutlined, CreditCardOutlined } from '@ant-design/icons';
import { IMaskInput } from 'react-imask';
import axios from '../../api/axiosDefault';
import { useCart } from '../../contexts/CartContext';
import { useTheme } from '../../contexts/ThemeContext';
import styles from './CheckoutPage.module.css';

function CheckoutPage() {
  const { cart, loading, fetchCart } = useCart();
  const { theme: currentTheme } = useTheme();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [deliveryType, setDeliveryType] = useState('pickup');
  const [paymentType, setPaymentType] = useState('offline');
  const [savedPhones, setSavedPhones] = useState([]);
  const [newPhone, setNewPhone] = useState('');
  const [addingPhone, setAddingPhone] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    axios.get('/accounts/api/phones/')
      .then(r => setSavedPhones(r.data || []))
      .catch(() => {});
  }, []);

  const items = cart?.items || [];
  const total = items.reduce((sum, i) => sum + parseFloat(i.subtotal || 0), 0);

  const handleAddPhone = async () => {
    const digits = newPhone.replace(/\D/g, '');
    if (digits.length < 11) {
      notification.error({ message: 'Введите номер полностью' });
      return;
    }
    if (savedPhones.length >= 10) {
      notification.error({ message: 'Максимум 10 номеров' });
      return;
    }
    setAddingPhone(true);
    try {
      const r = await axios.post('/accounts/api/phones/', { phone: newPhone });
      const updated = [r.data, ...savedPhones];
      setSavedPhones(updated);
      form.setFieldsValue({ buyer_phone: newPhone });
      setNewPhone('');
      notification.success({ message: 'Номер сохранён', duration: 2 });
    } catch (err) {
      const msg = err.response?.data?.detail || 'Ошибка сохранения';
      notification.error({ message: msg });
    } finally {
      setAddingPhone(false);
    }
  };

  const handleDeletePhone = async (e, id) => {
    e.stopPropagation();
    try {
      await axios.delete(`/accounts/api/phones/${id}/`);
      setSavedPhones(prev => prev.filter(p => p.id !== id));
      const current = form.getFieldValue('buyer_phone');
      const deleted = savedPhones.find(p => p.id === id);
      if (deleted && current === deleted.phone) {
        form.setFieldsValue({ buyer_phone: '' });
      }
    } catch {}
  };

  const handleDeliveryTypeChange = (type) => {
    setDeliveryType(type);
    if (type === 'delivery') setPaymentType('online');
  };

  const handleSubmit = async (values) => {
    const phone = (values.buyer_phone || '').trim();
    if (!phone) {
      notification.error({ message: 'Укажите номер телефона' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await axios.post('/api/orders/', {
        delivery_type: deliveryType,
        delivery_address: deliveryType === 'delivery' ? (values.delivery_address || '') : '',
        payment_type: paymentType,
        buyer_phone: phone,
        buyer_comment: values.buyer_comment || '',
      });

      const data = res.data;
      const orders = data.orders || [];
      const errors = data.errors || [];

      if (orders.length > 0) {
        await fetchCart();
        notification.success({
          message: `Создано заказов: ${orders.length}`,
          description: errors.length > 0 ? `Часть товаров не удалось зарезервировать: ${errors.map(e => e.error).join('; ')}` : undefined,
          duration: 5,
        });
        navigate('/my-orders');
      } else {
        notification.error({
          message: 'Не удалось создать заказ',
          description: errors.map(e => e.error).join('; '),
          duration: 6,
        });
      }
    } catch (err) {
      const msg = err.response?.data?.detail
        || err.response?.data?.delivery_address?.[0]
        || err.response?.data?.buyer_phone?.[0]
        || 'Ошибка при создании заказа';
      notification.error({ message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !cart) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;

  const cpTheme = { algorithm: currentTheme === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm };

  if (items.length === 0) {
    return (
      <ConfigProvider theme={cpTheme}>
        <div className={styles.page}>
          <div className={styles.container}>
            <Empty description="Корзина пуста — нечего оформлять">
              <Link to="/marketplace"><Button type="primary">В каталог</Button></Link>
            </Empty>
          </div>
        </div>
      </ConfigProvider>
    );
  }

  return (
    <ConfigProvider theme={cpTheme}>
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Оформление заказа</h1>
        <div className={styles.layout}>
          <div className={styles.left}>
            <Card title="Способ получения" className={styles.card}>
              <div className={styles.deliveryToggle}>
                <button
                  type="button"
                  className={`${styles.deliveryOption} ${deliveryType === 'pickup' ? styles.deliveryOptionActive : ''}`}
                  onClick={() => handleDeliveryTypeChange('pickup')}
                >
                  <ShopOutlined className={styles.deliveryIcon} />
                  <span className={styles.deliveryLabel}>Самовывоз из магазина</span>
                  <span className={styles.deliveryDesc}>Заберу сам в удобное время</span>
                </button>
                <button
                  type="button"
                  className={`${styles.deliveryOption} ${styles.deliveryOptionDisabled}`}
                  disabled
                >
                  <CarOutlined className={styles.deliveryIcon} />
                  <span className={styles.deliveryLabel}>
                    Доставка по адресу
                    <span className={styles.deliveryComingSoon}>Скоро</span>
                  </span>
                  <span className={styles.deliveryDesc}>Временно недоступна</span>
                </button>
              </div>

              <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 20 }}>
                <Form.Item
                  name="buyer_phone"
                  label={<span><PhoneOutlined style={{ marginRight: 6 }} />Номер телефона</span>}
                  rules={[{ required: true, message: 'Укажите номер телефона' }]}
                >
                  <Select
                    placeholder="Выберите или добавьте номер"
                    size="large"
                    allowClear
                    notFoundContent={<span style={{ color: 'var(--text-muted, #888)', fontSize: 13 }}>Нет сохранённых номеров</span>}
                    dropdownRender={(menu) => (
                      <>
                        {menu}
                        <Divider style={{ margin: '8px 0' }} />
                        <div className={styles.phoneDropdownAdd}>
                          <IMaskInput
                            mask="+7 (000) 000 00 00"
                            value={newPhone}
                            onAccept={(val) => setNewPhone(val)}
                            placeholder="+7 (___) ___ __ __"
                            className={styles.phoneInput}
                          />
                          <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            loading={addingPhone}
                            onClick={handleAddPhone}
                          >
                            Добавить
                          </Button>
                        </div>
                      </>
                    )}
                  >
                    {savedPhones.map(p => (
                      <Select.Option key={p.id} value={p.phone}>
                        <div className={styles.phoneOption}>
                          <span>{p.phone}</span>
                          <button
                            type="button"
                            className={styles.phoneOptionDelete}
                            onClick={(e) => handleDeletePhone(e, p.id)}
                            title="Удалить"
                          >
                            <DeleteOutlined />
                          </button>
                        </div>
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>

                {deliveryType === 'delivery' && (
                  <Form.Item
                    name="delivery_address"
                    label="Адрес доставки"
                    rules={[{ required: true, message: 'Укажите адрес доставки' }]}
                  >
                    <Input.TextArea rows={3} placeholder="Город, улица, дом, квартира" />
                  </Form.Item>
                )}
                <Form.Item label="Способ оплаты">
                  <div className={styles.deliveryToggle}>
                    <button
                      type="button"
                      className={`${styles.deliveryOption} ${styles.deliveryOptionDisabled}`}
                      disabled
                    >
                      <CreditCardOutlined className={styles.deliveryIcon} />
                      <span className={styles.deliveryLabel}>
                        Онлайн
                        <span className={styles.deliveryComingSoon}>Скоро</span>
                      </span>
                      <span className={styles.deliveryDesc}>Временно недоступна</span>
                    </button>
                    <button
                      type="button"
                      disabled={deliveryType === 'delivery'}
                      className={`${styles.deliveryOption} ${paymentType === 'offline' ? styles.deliveryOptionActive : ''} ${deliveryType === 'delivery' ? styles.deliveryOptionDisabled : ''}`}
                      onClick={() => deliveryType !== 'delivery' && setPaymentType('offline')}
                    >
                      <WalletOutlined className={styles.deliveryIcon} />
                      <span className={styles.deliveryLabel}>При получении</span>
                      <span className={styles.deliveryDesc}>
                        {deliveryType === 'delivery' ? 'Только при самовывозе' : 'Наличными или картой'}
                      </span>
                    </button>
                  </div>
                </Form.Item>

                <Form.Item name="buyer_comment" label="Комментарий для продавца">
                  <Input.TextArea rows={2} placeholder="Пожелания, вопросы..." />
                </Form.Item>
                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    size="large"
                    loading={submitting}
                    block
                  >
                    Подтвердить заказ
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </div>

          <div className={styles.right}>
            <Card title="Состав заказа" className={styles.card}>
              <List
                dataSource={items}
                renderItem={(item) => (
                  <List.Item>
                    <div className={styles.orderItem}>
                      <div className={styles.itemName}>{item.variant_name}</div>
                      <div className={styles.itemMeta}>
                        {item.business_name} · {item.location_name}
                      </div>
                      <div className={styles.itemPriceRow}>
                        <span>{item.quantity} шт. × {parseFloat(item.price).toLocaleString('ru-RU')} ₸</span>
                        <strong>{parseFloat(item.subtotal).toLocaleString('ru-RU')} ₸</strong>
                      </div>
                    </div>
                  </List.Item>
                )}
              />
              <Divider />
              <div className={styles.total}>
                Итого: <strong className={styles.totalPrice}>{total.toLocaleString('ru-RU')} ₸</strong>
              </div>
              <div className={styles.note}>
                После создания заказа продавец получит уведомление и свяжется с вами в течение 2 дней.
              </div>
            </Card>
            <Link to="/cart">
              <Button block style={{ marginTop: 8 }}>← Вернуться в корзину</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
    </ConfigProvider>
  );
}

export default CheckoutPage;
