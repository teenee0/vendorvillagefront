import React from 'react';
import { Card, Button, Descriptions } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import PreviewableImage from '../PreviewableImage/PreviewableImage.jsx';
import styles from './OnlineOrderReceiptBlock.module.css';

/**
 * Чек по онлайн-заказу (после завершения и формирования Receipt на бэкенде).
 * receipt: { number, total_amount, created_at, pdf_url, preview_url } | null
 * Превью — через PreviewableImage (antd Image + «Просмотр», как в других местах приложения).
 */
function OnlineOrderReceiptBlock({ receipt, className, style }) {
  if (!receipt) return null;

  const created = receipt.created_at
    ? new Date(receipt.created_at).toLocaleString('ru-RU')
    : '—';

  return (
    <Card
      title={(
        <span>
          <FileTextOutlined className={styles.titleIcon} />
          Чек по заказу
        </span>
      )}
      className={className}
      style={style}
    >
      <Descriptions column={1} size="small">
        <Descriptions.Item label="Номер чека">{receipt.number}</Descriptions.Item>
        <Descriptions.Item label="Сумма">
          {parseFloat(receipt.total_amount || 0).toLocaleString('ru-RU')} ₸
        </Descriptions.Item>
        <Descriptions.Item label="Дата">{created}</Descriptions.Item>
      </Descriptions>
      <div className={styles.actions}>
        {receipt.pdf_url ? (
          <Button
            type="primary"
            href={receipt.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Скачать PDF
          </Button>
        ) : (
          <span className={styles.noPdf}>PDF пока недоступен</span>
        )}
      </div>
      {receipt.preview_url ? (
        <div className={styles.preview}>
          <PreviewableImage
            src={receipt.preview_url}
            alt="Превью чека"
            className={styles.previewImg}
          />
        </div>
      ) : null}
    </Card>
  );
}

export default OnlineOrderReceiptBlock;
