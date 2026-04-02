import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button, Input, Spin } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import axios from '../../api/axiosDefault';
import styles from './OrderChat.module.css';

const POLL_INTERVAL = 15000;

/** Статусы, в которых чат только для чтения (совпадает с ChatClosed на бэкенде). */
const CHAT_CLOSED_STATUSES = ['completed', 'cancelled', 'expired'];

function OrderChat({ orderId, currentUserId, orderStatus }) {
  const canSend = orderStatus ? !CHAT_CLOSED_STATUSES.includes(orderStatus) : true;
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesRef = useRef(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await axios.get(`/api/orders/${orderId}/messages/`);
      setMessages(res.data);
    } catch {
      // ignore
    }
  }, [orderId]);

  useEffect(() => {
    setLoading(true);
    fetchMessages().finally(() => setLoading(false));
    const id = setInterval(fetchMessages, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchMessages]);

  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    if (!canSend) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    setSending(true);
    try {
      await axios.post(`/api/orders/${orderId}/messages/send/`, { text: trimmed });
      setText('');
      await fetchMessages();
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) return <div className={styles.loading}><Spin /></div>;

  return (
    <div className={styles.chat}>
      <div className={styles.messages} ref={messagesRef}>
        {messages.length === 0 && (
          <p className={styles.empty}>
            {canSend ? 'Сообщений пока нет. Напишите первым!' : 'Сообщений пока нет.'}
          </p>
        )}
        {messages.map((msg) => {
          const isOwn = msg.author_id === currentUserId;
          const isSystem = msg.is_system;
          return (
            <div
              key={msg.id}
              className={`${styles.message} ${isSystem ? styles.system : isOwn ? styles.own : styles.other}`}
            >
              {!isSystem && (
                <span className={styles.author}>{msg.author_name}</span>
              )}
              <p className={styles.text}>{msg.text}</p>
              <span className={styles.time}>
                {new Date(msg.created_at).toLocaleString('ru-RU', {
                  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                })}
              </span>
            </div>
          );
        })}
      </div>

      <div className={styles.inputWrap}>
        {!canSend && (
          <p className={styles.closedHint}>
            Чат закрыт: заказ завершён, отменён или истёк. Новые сообщения отправить нельзя.
          </p>
        )}
        <div className={styles.input}>
          <Input.TextArea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              canSend
                ? 'Введите сообщение... (Enter — отправить)'
                : 'Отправка сообщений недоступна'
            }
            autoSize={{ minRows: 1, maxRows: 4 }}
            disabled={sending || !canSend}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSend}
            loading={sending}
            disabled={!canSend || !text.trim()}
          />
        </div>
      </div>
    </div>
  );
}

export default OrderChat;
