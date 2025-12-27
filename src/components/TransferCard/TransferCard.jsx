import { FaCalendarAlt, FaTruck, FaMapMarkerAlt, FaTrash, FaEye, FaArrowRight } from 'react-icons/fa';
import styles from './TransferCard.module.css';

const TransferCard = ({ transfer, onView, onDelete }) => {
  const formatDate = (dateString) => {
    if (!dateString) return 'Не указано';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadge = () => {
    switch (transfer.status) {
      case 'completed':
        return { text: '✓ Проведено', className: styles.status_completed };
      case 'cancelled':
        return { text: '✗ Отменено', className: styles.status_cancelled };
      default:
        return { text: '📝 Черновик', className: styles.status_draft };
    }
  };

  const statusBadge = getStatusBadge();
  const canDelete = transfer.status === 'draft';

  return (
    <div className={styles.card} onClick={onView}>
      <div className={styles.header}>
        <div className={styles.transferNumber}>
          {transfer.transfer_number}
          <span className={`${styles.statusBadge} ${statusBadge.className}`}>
            {statusBadge.text}
          </span>
        </div>
        <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
          <button className={styles.viewButton} onClick={onView} title="Просмотреть">
            <FaEye />
          </button>
          {canDelete && (
            <button 
              className={styles.deleteButton} 
              onClick={onDelete} 
              title="Удалить"
            >
              <FaTrash />
            </button>
          )}
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.locations}>
          <div className={styles.locationRow}>
            <FaMapMarkerAlt className={styles.icon} />
            <span className={styles.locationLabel}>Из:</span>
            <span className={styles.locationValue}>{transfer.from_location_name}</span>
          </div>
          <div className={styles.arrow}>
            <FaArrowRight />
          </div>
          <div className={styles.locationRow}>
            <FaMapMarkerAlt className={styles.icon} />
            <span className={styles.locationLabel}>В:</span>
            <span className={styles.locationValue}>{transfer.to_location_name}</span>
          </div>
        </div>

        <div className={styles.stats}>
          <div className={styles.statItem}>
            <FaTruck className={styles.statIcon} />
            <div className={styles.statContent}>
              <div className={styles.statValue}>
                {transfer.total_quantity ? parseFloat(transfer.total_quantity).toLocaleString('ru-RU') : '0'}
              </div>
              <div className={styles.statLabel}>Товаров</div>
            </div>
          </div>
        </div>

        {transfer.created_by_name && (
          <div className={styles.infoRow}>
            <span className={styles.label}>Создал:</span>
            <span className={styles.value}>{transfer.created_by_name}</span>
          </div>
        )}

        {transfer.completed_at && (
          <div className={styles.infoRow}>
            <FaCalendarAlt className={styles.icon} />
            <span className={styles.label}>Проведено:</span>
            <span className={styles.value}>{formatDate(transfer.completed_at)}</span>
          </div>
        )}
      </div>

      <div className={styles.footer}>
        <span className={styles.createdAt}>
          Создано: {formatDate(transfer.created_at)}
        </span>
      </div>
    </div>
  );
};

export default TransferCard;

