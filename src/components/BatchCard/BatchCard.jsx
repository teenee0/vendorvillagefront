import { FaCalendarAlt, FaBoxes, FaMapMarkerAlt, FaTrash, FaEye } from 'react-icons/fa';
import styles from './BatchCard.module.css';

const BatchCard = ({ batch, onView, onDelete }) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const isCompleted = batch.status === 'completed';

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.batchNumber}>
          {batch.batch_number}
          <span className={`${styles.statusBadge} ${styles[`status_${batch.status}`]}`}>
            {batch.status === 'completed' ? '✓ Проведена' : '📝 Черновик'}
          </span>
        </div>
        <div className={styles.actions}>
          <button className={styles.viewButton} onClick={onView} title="Просмотреть">
            <FaEye />
          </button>
          <button 
            className={styles.deleteButton} 
            onClick={onDelete} 
            title={isCompleted ? "Удалить (только если нет продаж)" : "Удалить"}
          >
              <FaTrash />
            </button>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.infoRow}>
          <FaCalendarAlt className={styles.icon} />
          <span className={styles.label}>Дата поступления:</span>
          <span className={styles.value}>{formatDate(batch.received_date)}</span>
        </div>

        {batch.received_by_name && (
          <div className={styles.infoRow}>
            <span className={styles.label}>Принял:</span>
            <span className={styles.value}>{batch.received_by_name}</span>
          </div>
        )}

        {batch.supplier && (
          <div className={styles.infoRow}>
            <span className={styles.label}>Поставщик:</span>
            <span className={styles.value}>{batch.supplier}</span>
          </div>
        )}

        <div className={styles.stats}>
          <div className={styles.statItem}>
            <FaBoxes className={styles.statIcon} />
            <div className={styles.statContent}>
              <div className={styles.statValue}>{batch.total_items || 0}</div>
              <div className={styles.statLabel}>Товаров</div>
            </div>
          </div>

          <div className={styles.statItem}>
            <FaMapMarkerAlt className={styles.statIcon} />
            <div className={styles.statContent}>
              <div className={styles.statValue}>{batch.total_locations || 0}</div>
              <div className={styles.statLabel}>Локаций</div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <span className={styles.createdAt}>
          Создана: {formatDate(batch.created_at)}
        </span>
      </div>
    </div>
  );
};

export default BatchCard;

