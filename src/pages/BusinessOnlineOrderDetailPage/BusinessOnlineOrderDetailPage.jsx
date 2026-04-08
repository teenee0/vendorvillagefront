import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Card, Button, Descriptions, Divider, List, Spin, Popconfirm,
  notification, InputNumber, Input, Image, Form, Select, ConfigProvider, theme as antdTheme
} from 'antd';
import { ArrowLeftOutlined, ShoppingOutlined, EditOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import axios from '../../api/axiosDefault';
import { useTheme } from '../../contexts/ThemeContext';
import OrderStatusBadge from '../../components/OrderStatusBadge/OrderStatusBadge';
import OrderCountdownTimer from '../../components/OrderCountdownTimer/OrderCountdownTimer';
import OrderChat from '../../components/OrderChat/OrderChat';
import BonusPanel from '../../components/BonusPanel/BonusPanel';
import OnlineOrderReceiptBlock from '../../components/OnlineOrderReceiptBlock/OnlineOrderReceiptBlock';
import styles from './BusinessOnlineOrderDetailPage.module.css';

function BusinessOnlineOrderDetailPage() {
  const { business_slug, order_id } = useParams();
  const navigate = useNavigate();
  const { theme: currentTheme } = useTheme();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [confirmForm] = Form.useForm();
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [invoiceAmount, setInvoiceAmount] = useState(null);
  const [invoiceComment, setInvoiceComment] = useState('');
  const [deliveryCost, setDeliveryCost] = useState(null);
  const [discountType, setDiscountType] = useState('percent');
  const [discountValue, setDiscountValue] = useState(0);
  const [customerBonus, setCustomerBonus] = useState(null);
  const [bonusSettings, setBonusSettings] = useState(null);
  const [bonusParams, setBonusParams] = useState({});
  const [posPaymentMethods, setPosPaymentMethods] = useState([]);
  const [posPaymentMethodId, setPosPaymentMethodId] = useState(null);

  // SELLER_STATUSES is defined after order loads (see below)

  const fetchOrder = useCallback(async () => {
    try {
      const res = await axios.get(`/api/business/${business_slug}/online-orders/${order_id}/`);
      setOrder(res.data);
    } catch {
      navigate(`/business/${business_slug}/online-orders`);
    }
  }, [business_slug, order_id, navigate]);

  useEffect(() => {
    setLoading(true);
    fetchOrder().finally(() => setLoading(false));
    axios.get('/accounts/api/auth/me/').then(r => setCurrentUserId(r.data?.user?.id)).catch(() => {});
    // Load bonus settings
    axios.get(`/api/business/${business_slug}/bonus-settings/`)
      .then(r => setBonusSettings(r.data))
      .catch(() => {});
    axios.get('/api/business/payment-methods/')
      .then((r) => setPosPaymentMethods(Array.isArray(r.data) ? r.data : []))
      .catch(() => setPosPaymentMethods([]));
  }, [fetchOrder, business_slug]);

  useEffect(() => {
    if (!order) return;
    axios.get(`/api/business/${business_slug}/online-orders/${order_id}/customer-bonus/`)
      .then(r => setCustomerBonus(r.data))
      .catch(() => {});
  }, [order, business_slug, order_id]);

  useEffect(() => {
    if (order) {
      setSelectedStatus(order.status);
      // Предзаполняем форму confirm суммой из примерной суммы
      if (order.status === 'new' && order.total_amount) {
        confirmForm.setFieldsValue({ invoice_amount: parseFloat(order.total_amount) });
      }
    }
  }, [order, confirmForm]);

  const calcBonusDeductionFor = (params, baseAmount) => {
    if (!customerBonus || !bonusSettings?.is_enabled || !baseAmount) return 0;
    const balance = parseFloat(customerBonus.balance || 0);
    if (params.bonus_redemption_amount > 0) {
      return Math.min(params.bonus_redemption_amount, balance, baseAmount);
    }
    if (params.bonus_redemption_percent > 0) {
      return Math.min(Math.round(balance * params.bonus_redemption_percent / 100), baseAmount);
    }
    return 0;
  };

  // Shorthand for the confirm-form BonusPanel
  const calcBonusDeduction = (baseAmount) => calcBonusDeductionFor(bonusParams, baseAmount);

  const calcInvoiceTotal = (invoiceAmt, delCost, discType, discVal, bonusDeduction) => {
    const base = parseFloat(invoiceAmt || 0);
    const delivery = parseFloat(delCost || 0);
    const preDiscount = base + delivery;
    let discountAmt = 0;
    if (discType === 'percent' && discVal > 0) {
      discountAmt = Math.round(preDiscount * discVal / 100 * 100) / 100;
    } else if (discType === 'amount' && discVal > 0) {
      discountAmt = Math.min(discVal, preDiscount);
    }
    const afterDiscount = Math.max(0, preDiscount - discountAmt);
    const bonusDed = parseFloat(bonusDeduction || 0);
    return { base, delivery, discountAmt, afterDiscount, total: Math.max(0, afterDiscount - bonusDed) };
  };

  const handleSetStatus = async () => {
    if (!selectedStatus || selectedStatus === order.status) return;
    if (selectedStatus === 'invoiced' && !invoiceAmount) {
      notification.error({ message: 'Укажите сумму счёта' });
      return;
    }
    if (
      selectedStatus === 'paid'
      && order.payment_type === 'offline'
      && (posPaymentMethodId === null || posPaymentMethodId === undefined)
    ) {
      notification.error({ message: 'Выберите способ оплаты в магазине (как в кассе)' });
      return;
    }
    setStatusLoading(true);
    try {
      const payload = { status: selectedStatus };
      if (selectedStatus === 'invoiced') {
        payload.invoice_amount = invoiceAmount;
        payload.invoice_comment = invoiceComment;
        payload.delivery_cost = deliveryCost;
        payload.discount_type = discountType;
        payload.discount_value = discountValue;
        // Сохраняем preview-значения бонусов чтобы они отображались в счёте
        const bonusDedPreview = calcBonusDeduction(invoiceAmount);
        payload.bonus_redeemed = bonusDedPreview > 0 ? bonusDedPreview : null;
        payload.bonus_accrued = bonusParams.bonus_accrued_prediction > 0 ? bonusParams.bonus_accrued_prediction : null;
        // Сохраняем параметры начисления для использования при завершении
        Object.assign(payload, bonusParams);
      }
      if (selectedStatus === 'paid') {
        if (order.payment_type === 'offline') {
          payload.pos_payment_method_id = posPaymentMethodId;
        }
        if (order?.delivery_type === 'pickup') {
          const base = parseFloat(invoiceAmount ?? order.invoice_amount ?? order.total_amount ?? 0);
          const delivery = parseFloat(order.delivery_cost || 0);
          const preDiscount = base + delivery;
          const discAmt = discountType === 'percent'
            ? Math.round(preDiscount * (discountValue || 0) / 100 * 100) / 100
            : Math.min(discountValue || 0, preDiscount);
          const afterDiscount = Math.max(0, preDiscount - discAmt);
          const bonusDedPreview = calcBonusDeductionFor(bonusParams, afterDiscount);
          payload.invoice_amount = base;
          payload.discount_type = discountType;
          payload.discount_value = discountValue || 0;
          payload.bonus_redeemed = bonusDedPreview > 0 ? bonusDedPreview : null;
          payload.bonus_accrued = bonusParams.bonus_accrued_prediction > 0
            ? bonusParams.bonus_accrued_prediction : null;
          Object.assign(payload, bonusParams);
        }
      }

      if (selectedStatus === 'completed' && bonusParams) {
        Object.assign(payload, bonusParams);
      }
      await axios.post(`/api/business/${business_slug}/online-orders/${order_id}/set-status/`, payload);
      notification.success({ message: 'Статус обновлён' });
      fetchOrder();
    } catch (err) {
      notification.error({ message: err.response?.data?.detail || 'Ошибка смены статуса' });
    } finally {
      setStatusLoading(false);
    }
  };

  const handleConfirm = async (values) => {
    setActionLoading(true);
    try {
      const invoiceAmt = values.invoice_amount;
      const bonusDedPreview = calcBonusDeduction(invoiceAmt);
      await axios.post(`/api/business/${business_slug}/online-orders/${order_id}/confirm/`, {
        invoice_amount: invoiceAmt,
        invoice_comment: values.invoice_comment || '',
        delivery_cost: values.delivery_cost,
        discount_type: values.discount_type || 'percent',
        discount_value: values.discount_value || 0,
        bonus_redeemed: bonusDedPreview > 0 ? bonusDedPreview : null,
        bonus_accrued: bonusParams.bonus_accrued_prediction > 0 ? bonusParams.bonus_accrued_prediction : null,
        ...bonusParams,
      });
      notification.success({
        message: order?.delivery_type === 'pickup'
          ? 'Заказ подтверждён'
          : 'Заказ подтверждён, счёт выставлен',
      });
      fetchOrder();
    } catch (err) {
      notification.error({ message: err.response?.data?.detail || 'Ошибка подтверждения' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    setActionLoading(true);
    try {
      await axios.post(`/api/business/${business_slug}/online-orders/${order_id}/cancel/`);
      notification.success({ message: 'Заказ отменён' });
      fetchOrder();
    } catch (err) {
      notification.error({ message: err.response?.data?.detail || 'Ошибка отмены' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async (bonusOverrides = {}) => {
    setActionLoading(true);
    try {
      await axios.post(
        `/api/business/${business_slug}/online-orders/${order_id}/complete/`,
        bonusOverrides,
      );
      notification.success({ message: 'Заказ завершён!' });
      fetchOrder();
    } catch (err) {
      notification.error({ message: err.response?.data?.detail || 'Ошибка завершения' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className={styles.loading}><Spin size="large" /></div>;
  if (!order) return null;

  const isPickup = order.delivery_type === 'pickup';

  // For pickup: READY must come before PAID (customer pays in-store after goods are prepared).
  // For delivery: PAID comes before READY (customer pays online, then goods are shipped).
  const SELLER_STATUSES = isPickup
    ? [
        { value: 'seen',      label: 'Просмотрена' },
        { value: 'confirmed', label: 'Подтверждена' },
        { value: 'ready',     label: 'Товар готов к выдаче' },
        { value: 'paid',      label: 'Оплата' },
        { value: 'completed', label: 'Завершена' },
        { value: 'cancelled', label: 'Отменена' },
      ]
    : [
        { value: 'seen',      label: 'Просмотрена' },
        { value: 'confirmed', label: 'Подтверждена' },
        { value: 'invoiced',  label: 'Счёт выставлен' },
        { value: 'paid',      label: 'Оплачена' },
        { value: 'ready',     label: 'Товар готов к выдаче' },
        { value: 'completed', label: 'Завершена' },
        { value: 'cancelled', label: 'Отменена' },
      ];

  // Доставка: «Счёт выставлен» только после «Подтверждена» — иначе в списке
  // при «Просмотрена» выглядит как пропуск шага (бэкенд переход seen→invoiced не запрещает).
  const statusSelectOptions = !isPickup
    ? SELLER_STATUSES.filter(
        (opt) =>
          !(
            opt.value === 'invoiced' &&
            ['new', 'seen'].includes(order.status)
          ),
      )
    : SELLER_STATUSES;

  // «Просмотрена» — только смена статуса; суммы/бонусы — на следующих шагах (счёт, оплата).
  const canConfirm = order.status === 'new';
  const canCancel = order.is_cancellable;
  // Pickup: complete only after payment (READY → PAID → COMPLETED).
  // Delivery: complete from PAID or READY (e.g. cash on delivery).
  const canComplete = isPickup
    ? order.status === 'paid'
    : ['paid', 'ready'].includes(order.status);
  const showExpiry = ['new', 'seen'].includes(order.status);

  return (
    <ConfigProvider theme={{ algorithm: currentTheme === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm }}>
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <Link to={`/business/${business_slug}/online-orders`} className={styles.back}>
            <ArrowLeftOutlined /> Онлайн-заказы
          </Link>
          <div className={styles.headerRight}>
            <h1 className={styles.title}>Заказ {order.number}</h1>
            <OrderStatusBadge status={order.status} />
          </div>
        </div>

        {showExpiry && (
          <div className={styles.timer}>
            <OrderCountdownTimer expiresAt={order.expires_at} />
          </div>
        )}

        <div className={styles.grid}>
          <div className={styles.left}>
            <Card title="Данные покупателя" className={styles.card}>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Имя">{order.buyer_name}</Descriptions.Item>
                <Descriptions.Item label="Email">{order.buyer_email}</Descriptions.Item>
                <Descriptions.Item label={isPickup ? 'Телефон' : 'Телефон для счёта'}>
                  {order.buyer_phone || '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Способ получения">
                  {order.delivery_type_display || (order.delivery_type === 'pickup' ? 'Самовывоз' : 'Доставка')}
                </Descriptions.Item>
                {order.delivery_type === 'delivery' && order.delivery_address && (
                  <Descriptions.Item label="Адрес доставки">{order.delivery_address}</Descriptions.Item>
                )}
                <Descriptions.Item label="Способ оплаты">
                  {order.payment_type_display || (order.payment_type === 'offline' ? 'При получении' : 'Онлайн')}
                </Descriptions.Item>
                {order.pos_payment_method?.name && (
                  <Descriptions.Item label="Оплата в магазине">
                    {order.pos_payment_method.name}
                  </Descriptions.Item>
                )}
                {order.buyer_comment && (
                  <Descriptions.Item label="Комментарий">{order.buyer_comment}</Descriptions.Item>
                )}
              </Descriptions>
            </Card>

            {order.status === 'completed' ? (
              <Card
                className={styles.card}
                style={{ marginTop: 16 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)' }}>
                  <CheckCircleOutlined style={{ fontSize: 20, color: '#52c41a' }} />
                  <span>Заказ завершён — изменение статуса недоступно. Чек и продажи созданы автоматически.</span>
                </div>
              </Card>
            ) : order.status === 'expired' ? (
              <Card className={styles.card} style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)' }}>
                  <ClockCircleOutlined style={{ fontSize: 20, color: '#faad14' }} />
                  <span>
                    Заказ истёк — срок резерва прошёл, резерв снят. Смена статуса недоступна.
                  </span>
                </div>
              </Card>
            ) : (
              <Card
                title={<span><EditOutlined style={{ marginRight: 8 }} />Статус заказа</span>}
                className={styles.card}
                style={{ marginTop: 16 }}
              >
                <div style={{ marginBottom: 12, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  {isPickup
                    ? 'Самовывоз: Подтверждена → Товар готов → Оплата → Завершена'
                    : 'Доставка: Подтверждена → Счёт выставлен → Оплачена → Товар готов → Завершена'}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Select
                    value={selectedStatus}
                    onChange={(val) => {
                      setSelectedStatus(val);
                      setBonusParams({});
                      if (val === 'invoiced') {
                        setInvoiceAmount(order?.total_amount ? parseFloat(order.total_amount) : null);
                        setInvoiceComment('');
                        setDeliveryCost(null);
                        setDiscountType('percent');
                        setDiscountValue(0);
                      } else if (val === 'paid') {
                        setPosPaymentMethodId(order.pos_payment_method?.id ?? null);
                        if (order?.delivery_type === 'pickup') {
                          setInvoiceAmount(parseFloat(order.invoice_amount || order.total_amount || 0));
                          setDiscountType(order.discount_type || 'percent');
                          setDiscountValue(parseFloat(order.discount_value || 0));
                        }
                      } else {
                        setInvoiceAmount(null);
                        setInvoiceComment('');
                        setDeliveryCost(null);
                        setDiscountType('percent');
                        setDiscountValue(0);
                      }
                    }}
                    style={{ flex: 1 }}
                    size="large"
                    options={statusSelectOptions}
                  />
                  <Button
                    type="primary"
                    size="large"
                    loading={statusLoading}
                    disabled={!selectedStatus || selectedStatus === order.status}
                    onClick={handleSetStatus}
                  >
                    Сохранить
                  </Button>
                </div>

                {/* Только для «при получении»: как прошла оплата в магазине (справочник кассы) */}
                {selectedStatus === 'paid'
                  && selectedStatus !== order.status
                  && order.payment_type === 'offline' && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ marginBottom: 6, fontSize: 13, color: 'var(--text-muted)' }}>
                      Как прошла оплата в магазине (справочник кассы)
                    </div>
                    <Select
                      placeholder="Выберите способ"
                      value={posPaymentMethodId}
                      onChange={setPosPaymentMethodId}
                      style={{ width: '100%' }}
                      size="large"
                      options={posPaymentMethods.map((m) => ({
                        value: m.id,
                        label: m.name,
                      }))}
                      allowClear={false}
                    />
                    {posPaymentMethods.length === 0 && (
                      <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                        Список способов оплаты пуст. Добавьте их в админке (способы оплаты для кассы).
                      </div>
                    )}
                  </div>
                )}

                {/* Pickup payment panel: shows when seller selects "Оплата" */}
                {selectedStatus === 'paid' && isPickup && selectedStatus !== order.status && (() => {
                  const base = parseFloat(invoiceAmount ?? order.invoice_amount ?? order.total_amount ?? 0);
                  const delivery = parseFloat(order.delivery_cost || 0);
                  const preDiscount = base + delivery;
                  const discAmt = discountType === 'percent'
                    ? Math.round(preDiscount * (discountValue || 0) / 100 * 100) / 100
                    : Math.min(discountValue || 0, preDiscount);
                  const afterDiscount = Math.max(0, preDiscount - discAmt);
                  const bonusDed = calcBonusDeductionFor(bonusParams, afterDiscount);
                  const accruedPrediction = bonusParams.bonus_accrued_prediction || 0;
                  const finalTotal = Math.max(0, afterDiscount - bonusDed);

                  return (
                    <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>

                      {/* Editable: сумма товаров */}
                      <div>
                        <div style={{ marginBottom: 4, fontSize: 13, color: 'var(--text-muted)' }}>Сумма товаров (₸)</div>
                        <InputNumber
                          min={0}
                          precision={2}
                          style={{ width: '100%' }}
                          size="large"
                          value={invoiceAmount}
                          onChange={(v) => setInvoiceAmount(v ?? 0)}
                        />
                      </div>

                      {/* Editable: скидка */}
                      <div>
                        <div style={{ marginBottom: 6, fontSize: 13, color: 'var(--text-muted)' }}>Скидка</div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <Select
                            value={discountType}
                            onChange={setDiscountType}
                            style={{ width: 175 }}
                            size="large"
                            options={[
                              { value: 'percent', label: 'Процент (%)' },
                              { value: 'amount', label: 'Фиксированная (₸)' },
                            ]}
                          />
                          <InputNumber
                            min={0}
                            precision={discountType === 'percent' ? 1 : 2}
                            max={discountType === 'percent' ? 100 : undefined}
                            style={{ flex: 1 }}
                            size="large"
                            placeholder={discountType === 'percent' ? '0 %' : '0 ₸'}
                            value={discountValue}
                            onChange={(v) => setDiscountValue(v ?? 0)}
                          />
                        </div>
                      </div>

                      {/* Interactive bonus panel */}
                      {bonusSettings?.is_enabled && customerBonus?.bonus_enabled && (
                        <div className={styles.invoiceBonusBlock}>
                          <div className={styles.invoiceBonusTitle}>Бонусы покупателя</div>
                          <BonusPanel
                            customer={customerBonus}
                            bonusSettings={bonusSettings}
                            totalAmount={afterDiscount}
                            onChange={setBonusParams}
                          />
                        </div>
                      )}

                      {/* Full summary: breakdown + bonuses + total */}
                      <div className={styles.invoiceBreakdown}>
                        <div className={styles.invoiceBreakdownRow}>
                          <span>Товары</span><span>{base.toLocaleString('ru-RU')} ₸</span>
                        </div>
                        {delivery > 0 && (
                          <div className={styles.invoiceBreakdownRow}>
                            <span>Доставка</span><span>+{delivery.toLocaleString('ru-RU')} ₸</span>
                          </div>
                        )}
                        {discAmt > 0 && (
                          <div className={`${styles.invoiceBreakdownRow} ${styles.invoiceBreakdownDiscount}`}>
                            <span>
                              Скидка{discountType === 'percent' ? ` (${discountValue}%)` : ''}
                            </span>
                            <span>−{discAmt.toLocaleString('ru-RU')} ₸</span>
                          </div>
                        )}
                        {bonusDed > 0 && (
                          <div className={`${styles.invoiceBreakdownRow} ${styles.invoiceBreakdownBonus}`}>
                            <span>Бонусов списано</span>
                            <span>−{bonusDed.toLocaleString('ru-RU')} баллов</span>
                          </div>
                        )}
                        {accruedPrediction > 0 && (
                          <div className={`${styles.invoiceBreakdownRow} ${styles.invoiceBreakdownAccrued}`}>
                            <span>Будет начислено</span>
                            <span>+{accruedPrediction.toLocaleString('ru-RU')} баллов</span>
                          </div>
                        )}
                        <div className={styles.invoiceBreakdownDivider} />
                        <div className={styles.invoiceBreakdownTotal}>
                          <span>Итого к оплате</span>
                          <strong>{finalTotal.toLocaleString('ru-RU')} ₸</strong>
                        </div>
                      </div>

                      {order.invoice_comment && (
                        <div className={styles.invoiceComment}>{order.invoice_comment}</div>
                      )}
                    </div>
                  );
                })()}

                {selectedStatus === 'invoiced' && selectedStatus !== order.status && (
                  <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <div style={{ marginBottom: 4, fontSize: 13, color: 'var(--text-muted)' }}>Сумма счёта (₸) *</div>
                      <InputNumber
                        min={0}
                        precision={2}
                        style={{ width: '100%' }}
                        size="large"
                        placeholder="Введите сумму"
                        value={invoiceAmount}
                        onChange={setInvoiceAmount}
                      />
                    </div>
                    <div>
                      <div style={{ marginBottom: 4, fontSize: 13, color: 'var(--text-muted)' }}>Стоимость доставки (₸)</div>
                      <InputNumber
                        min={0}
                        precision={2}
                        style={{ width: '100%' }}
                        size="large"
                        placeholder="Необязательно"
                        value={deliveryCost}
                        onChange={setDeliveryCost}
                      />
                    </div>
                    <div>
                      <div style={{ marginBottom: 6, fontSize: 13, color: 'var(--text-muted)' }}>Скидка</div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <Select
                          value={discountType}
                          onChange={setDiscountType}
                          style={{ width: 160 }}
                          options={[
                            { value: 'percent', label: 'Процент (%)' },
                            { value: 'amount', label: 'Фиксированная (₸)' },
                          ]}
                        />
                        <InputNumber
                          min={0}
                          precision={discountType === 'percent' ? 1 : 2}
                          max={discountType === 'percent' ? 100 : undefined}
                          style={{ flex: 1 }}
                          placeholder={discountType === 'percent' ? '0 %' : '0 ₸'}
                          value={discountValue}
                          onChange={(v) => setDiscountValue(v || 0)}
                        />
                      </div>
                    </div>
                    <div>
                      <div style={{ marginBottom: 4, fontSize: 13, color: 'var(--text-muted)' }}>Комментарий к счёту</div>
                      <Input.TextArea
                        rows={2}
                        placeholder="Условия оплаты, реквизиты..."
                        value={invoiceComment}
                        onChange={(e) => setInvoiceComment(e.target.value)}
                      />
                    </div>

                    {bonusSettings?.is_enabled && customerBonus?.bonus_enabled && (
                      <div className={styles.invoiceBonusBlock}>
                        <div className={styles.invoiceBonusTitle}>Бонусы покупателя</div>
                        <BonusPanel
                          customer={customerBonus}
                          bonusSettings={bonusSettings}
                          totalAmount={invoiceAmount || 0}
                          onChange={setBonusParams}
                        />
                      </div>
                    )}

                    {invoiceAmount > 0 && (() => {
                      const bonusDed = calcBonusDeduction(invoiceAmount);
                      const { base, delivery, discountAmt, total } = calcInvoiceTotal(invoiceAmount, deliveryCost, discountType, discountValue, bonusDed);
                      return (
                        <div className={styles.invoiceBreakdown}>
                          <div className={styles.invoiceBreakdownRow}><span>Товары</span><span>{base.toLocaleString('ru-RU')} ₸</span></div>
                          {delivery > 0 && <div className={styles.invoiceBreakdownRow}><span>Доставка</span><span>+{delivery.toLocaleString('ru-RU')} ₸</span></div>}
                          {discountAmt > 0 && (
                            <div className={styles.invoiceBreakdownRow + ' ' + styles.invoiceBreakdownDiscount}>
                              <span>Скидка{discountType === 'percent' ? ` (${discountValue}%)` : ''}</span>
                              <span>−{discountAmt.toLocaleString('ru-RU')} ₸</span>
                            </div>
                          )}
                          {bonusDed > 0 && (
                            <div className={styles.invoiceBreakdownRow + ' ' + styles.invoiceBreakdownBonus}>
                              <span>Бонусов списано</span>
                              <span>−{bonusDed.toLocaleString('ru-RU')} баллов</span>
                            </div>
                          )}
                          {bonusParams.bonus_accrued_prediction > 0 && (
                            <div className={styles.invoiceBreakdownRow + ' ' + styles.invoiceBreakdownAccrued}>
                              <span>Будет начислено</span>
                              <span>+{bonusParams.bonus_accrued_prediction.toLocaleString('ru-RU')} баллов</span>
                            </div>
                          )}
                          <div className={styles.invoiceBreakdownDivider} />
                          <div className={styles.invoiceBreakdownTotal}><span>Итого к оплате</span><strong>{total.toLocaleString('ru-RU')} ₸</strong></div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </Card>
            )}

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
                        <div className={styles.itemMeta}>{item.location_name} · {item.quantity} шт. · {parseFloat(item.price_at_order).toLocaleString('ru-RU')} ₸/шт.</div>
                      </div>
                      <div className={styles.itemPrice}>{parseFloat(item.subtotal).toLocaleString('ru-RU')} ₸</div>
                    </div>
                  </List.Item>
                )}
              />
              <Divider />
              <div className={styles.total}>Примерная сумма: <strong>{parseFloat(order.total_amount).toLocaleString('ru-RU')} ₸</strong></div>
            </Card>

            {canConfirm && (
              <Card
                title={isPickup ? 'Подтвердить заказ' : 'Выставить счёт и подтвердить'}
                className={styles.card}
                style={{ marginTop: 16 }}
              >
                <Form form={confirmForm} layout="vertical" onFinish={handleConfirm}>
                  <Form.Item
                    name="invoice_amount"
                    label={isPickup ? 'Итоговая сумма (₸)' : 'Сумма счёта (₸)'}
                    rules={[{ required: true, message: 'Укажите сумму' }]}
                  >
                    <InputNumber
                      min={0}
                      precision={2}
                      style={{ width: '100%' }}
                      placeholder={isPickup ? 'Сумма к оплате при получении' : 'Введите итоговую сумму'}
                      size="large"
                    />
                  </Form.Item>
                  {!isPickup && (
                  <Form.Item name="delivery_cost" label="Стоимость доставки (₸)">
                    <InputNumber
                      min={0}
                      precision={2}
                      style={{ width: '100%' }}
                      placeholder="Необязательно"
                    />
                  </Form.Item>
                  )}
                  <Form.Item label="Скидка">
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <Form.Item name="discount_type" noStyle initialValue="percent">
                        <Select
                          style={{ width: 160 }}
                          options={[
                            { value: 'percent', label: 'Процент (%)' },
                            { value: 'amount', label: 'Фиксированная (₸)' },
                          ]}
                        />
                      </Form.Item>
                      <Form.Item name="discount_value" noStyle initialValue={0}>
                        <InputNumber
                          min={0}
                          style={{ flex: 1 }}
                          placeholder="0"
                        />
                      </Form.Item>
                    </div>
                  </Form.Item>
                  <Form.Item
                    name="invoice_comment"
                    label={isPickup ? 'Комментарий для покупателя' : 'Комментарий к счёту'}
                  >
                    <Input.TextArea
                      rows={2}
                      placeholder={isPickup ? 'Условия выдачи, время работы…' : 'Условия, детали доставки...'}
                    />
                  </Form.Item>

                  <Form.Item noStyle shouldUpdate>
                    {({ getFieldValue }) => {
                      const amt = getFieldValue('invoice_amount') || 0;
                      const delCost = getFieldValue('delivery_cost') || 0;
                      const discType = getFieldValue('discount_type') || 'percent';
                      const discVal = getFieldValue('discount_value') || 0;
                      const bonusDed = calcBonusDeduction(amt);
                      const { base, delivery, discountAmt, total } = calcInvoiceTotal(amt, delCost, discType, discVal, bonusDed);

                      return (
                        <>
                          {bonusSettings?.is_enabled && customerBonus?.bonus_enabled && (
                            <div className={styles.invoiceBonusBlock}>
                              <div className={styles.invoiceBonusTitle}>Бонусы покупателя</div>
                              <BonusPanel
                                customer={customerBonus}
                                bonusSettings={bonusSettings}
                                totalAmount={amt}
                                onChange={setBonusParams}
                              />
                            </div>
                          )}
                          {amt > 0 && (
                            <div className={styles.invoiceBreakdown}>
                              <div className={styles.invoiceBreakdownRow}><span>Товары</span><span>{base.toLocaleString('ru-RU')} ₸</span></div>
                              {delivery > 0 && <div className={styles.invoiceBreakdownRow}><span>Доставка</span><span>+{delivery.toLocaleString('ru-RU')} ₸</span></div>}
                              {discountAmt > 0 && (
                                <div className={styles.invoiceBreakdownRow + ' ' + styles.invoiceBreakdownDiscount}>
                                  <span>Скидка{discType === 'percent' ? ` (${discVal}%)` : ''}</span>
                                  <span>−{discountAmt.toLocaleString('ru-RU')} ₸</span>
                                </div>
                              )}
                              {bonusDed > 0 && (
                                <div className={styles.invoiceBreakdownRow + ' ' + styles.invoiceBreakdownBonus}>
                                  <span>Бонусов списано</span>
                                  <span>−{bonusDed.toLocaleString('ru-RU')} баллов</span>
                                </div>
                              )}
                              {bonusParams.bonus_accrued_prediction > 0 && (
                                <div className={styles.invoiceBreakdownRow + ' ' + styles.invoiceBreakdownAccrued}>
                                  <span>Будет начислено</span>
                                  <span>+{bonusParams.bonus_accrued_prediction.toLocaleString('ru-RU')} баллов</span>
                                </div>
                              )}
                              <div className={styles.invoiceBreakdownDivider} />
                              <div className={styles.invoiceBreakdownTotal}><span>Итого к оплате</span><strong>{total.toLocaleString('ru-RU')} ₸</strong></div>
                            </div>
                          )}
                        </>
                      );
                    }}
                  </Form.Item>

                  <div className={styles.actions}>
                    <Button type="primary" size="large" htmlType="submit" loading={actionLoading}>
                      {isPickup ? 'Подтвердить заказ' : 'Подтвердить и выставить счёт'}
                    </Button>
                    {canCancel && (
                      <Popconfirm title="Отменить заказ?" onConfirm={handleCancel} okText="Да" cancelText="Нет">
                        <Button danger loading={actionLoading}>Отменить</Button>
                      </Popconfirm>
                    )}
                  </div>
                </Form>
              </Card>
            )}

            {!canConfirm && (canCancel || canComplete) && (
              <div className={styles.actions} style={{ marginTop: 16 }}>
                {canComplete && (
                  <Popconfirm
                    title="Завершить заказ и создать чек?"
                    onConfirm={() => handleComplete({})}
                    okText="Да"
                    cancelText="Нет"
                  >
                    <Button type="primary" size="large" loading={actionLoading}>
                      Завершить заказ
                    </Button>
                  </Popconfirm>
                )}
                {canCancel && (
                  <Popconfirm title="Отменить заказ?" onConfirm={handleCancel} okText="Да" cancelText="Нет">
                    <Button danger loading={actionLoading}>Отменить</Button>
                  </Popconfirm>
                )}
              </div>
            )}

          </div>

          <div className={styles.right}>
            <Card title="Чат с покупателем" className={styles.card}>
              <OrderChat orderId={order.id} currentUserId={currentUserId} orderStatus={order.status} />
            </Card>

            {order.invoice_amount && ['invoiced', 'confirmed', 'ready', 'paid', 'completed'].includes(order.status) && (() => {
              const base = parseFloat(order.total_amount || order.invoice_amount);
              const delivery = parseFloat(order.delivery_cost || 0);
              const discountVal = parseFloat(order.discount_value || 0);
              const preDiscount = base + delivery;
              const discAmt = order.discount_type === 'percent'
                ? Math.round(preDiscount * discountVal / 100 * 100) / 100
                : Math.min(discountVal, preDiscount);
              const bonusRed = parseFloat(order.bonus_redeemed || 0);
              const bonusAcc = parseFloat(order.bonus_accrued || 0);
              const finalTotal = Math.max(0, preDiscount - discAmt - bonusRed);
              const discountLabel = order.discount_type === 'percent'
                ? `Скидка (${parseFloat(order.discount_value)}%)`
                : 'Скидка';

              return (
                <Card
                  title={isPickup ? 'Сумма и условия' : 'Выставленный счёт'}
                  className={styles.card}
                  style={{ marginTop: 16 }}
                >
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
                        <span>{discountLabel}</span>
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
                      <strong>{finalTotal.toLocaleString('ru-RU')} ₸</strong>
                    </div>
                  </div>
                  {order.invoice_comment && (
                    <div className={styles.invoiceComment} style={{ marginTop: 10 }}>{order.invoice_comment}</div>
                  )}
                </Card>
              );
            })()}

            <OnlineOrderReceiptBlock
              receipt={order.receipt}
              className={styles.card}
              style={{ marginTop: 16 }}
            />
          </div>
        </div>
      </div>
    </div>
    </ConfigProvider>
  );
}

export default BusinessOnlineOrderDetailPage;
