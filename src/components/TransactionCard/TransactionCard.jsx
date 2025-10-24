import React from 'react';
import { motion } from 'framer-motion';
import { FaReceipt, FaArrowUp, FaArrowDown } from 'react-icons/fa';
import styles from './TransactionCard.module.css';

const TransactionCard = ({ 
  transaction, 
  onClick, 
  delay = 0 
}) => {
  const isRefund = transaction.is_refund;
  const amount = parseFloat(transaction.amount);
  const formattedAmount = amount.toLocaleString('ru-RU');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`${styles.transactionCard} ${isRefund ? styles.refund : styles.sale}`}
      onClick={onClick}
    >
      <div className={styles.cardHeader}>
        <div className={styles.transactionInfo}>
          <div className={styles.transactionNumber}>
            <FaReceipt className={styles.receiptIcon} />
            #{transaction.number}
          </div>
          <div className={styles.transactionDate}>
            {new Date(transaction.created_at).toLocaleString('ru-RU')}
          </div>
        </div>
        
        <div className={`${styles.amountContainer} ${isRefund ? styles.refundAmount : styles.saleAmount}`}>
          <div className={styles.amountIcon}>
            {isRefund ? <FaArrowDown /> : <FaArrowUp />}
          </div>
          <div className={styles.amount}>
            {isRefund ? '-' : '+'}₸{formattedAmount}
          </div>
        </div>
      </div>
      
      <div className={styles.cardFooter}>
        <div className={styles.paymentMethod}>
          {transaction.payment_method}
        </div>
        <div className={styles.statusIndicator}>
          <div className={`${styles.statusDot} ${isRefund ? styles.refundDot : styles.saleDot}`}></div>
          {isRefund ? 'Возврат' : 'Продажа'}
        </div>
      </div>
      
      <div className={styles.cardBackground}></div>
    </motion.div>
  );
};

export default TransactionCard;
