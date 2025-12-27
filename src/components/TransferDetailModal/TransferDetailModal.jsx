import { useState, useEffect } from 'react';
import axios from '../../api/axiosDefault';
import { FaTimes, FaCalendarAlt, FaTruck, FaMapMarkerAlt, FaUser, FaSave, FaTrash, FaPlus, FaFileAlt, FaCheck, FaBan, FaArrowRight } from 'react-icons/fa';
import styles from './TransferDetailModal.module.css';
import { useFileUtils } from '../../hooks/useFileUtils';
import Loader from '../Loader';

const TransferDetailModal = ({ businessSlug, transfer, onClose, onUpdate, onDelete }) => {
  const { getFileUrl } = useFileUtils();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(transfer.status === 'draft');
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    notes: transfer.notes || '',
  });
  const [documents, setDocuments] = useState(transfer.documents || []);
  const [newDocument, setNewDocument] = useState({
    document: null,
    name: '',
    description: ''
  });
  const [items, setItems] = useState(transfer.items || []);

  useEffect(() => {
    // Обновляем данные при изменении transfer
    setFormData({
      notes: transfer.notes || '',
    });
    setDocuments(transfer.documents || []);
    setItems(transfer.items || []);
    setEditing(transfer.status === 'draft');
  }, [transfer]);

  const formatDate = (dateString) => {
    if (!dateString) return 'Не указано';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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
  const canEdit = transfer.status === 'draft';
  const canComplete = transfer.status === 'draft' && items.length > 0;
  const canCancel = transfer.status === 'completed';

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await axios.patch(
        `/api/business/${businessSlug}/transfers/${transfer.id}/update/`,
        formData
      );
      setEditing(false);
      onUpdate();
    } catch (err) {
      console.error('Ошибка обновления перемещения:', err);
      alert(err.response?.data?.detail || 'Не удалось обновить перемещение');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteTransfer = async () => {
    if (!confirm('Вы уверены, что хотите провести перемещение? После этого его нельзя будет редактировать.')) {
      return;
    }

    setLoading(true);
    try {
      await axios.post(`/api/business/${businessSlug}/transfers/${transfer.id}/complete/`);
      onUpdate();
    } catch (err) {
      console.error('Ошибка проведения перемещения:', err);
      alert(err.response?.data?.detail || 'Не удалось провести перемещение');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelTransfer = async () => {
    if (!confirm('Вы уверены, что хотите отменить перемещение? Товары будут возвращены на исходный склад.')) {
      return;
    }

    setLoading(true);
    try {
      await axios.post(`/api/business/${businessSlug}/transfers/${transfer.id}/cancel/`);
      onUpdate();
    } catch (err) {
      console.error('Ошибка отмены перемещения:', err);
      alert(err.response?.data?.detail || 'Не удалось отменить перемещение');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTransfer = async () => {
    const confirmMessage = transfer.status === 'completed'
      ? 'Вы уверены, что хотите удалить проведенное перемещение? Используйте отмену для возврата товаров.'
      : 'Вы уверены, что хотите удалить перемещение? Это действие нельзя отменить.';

    if (!confirm(confirmMessage)) {
      return;
    }

    setLoading(true);
    try {
      await onDelete(transfer.id);
      onClose();
    } catch (err) {
      console.error('Ошибка удаления перемещения:', err);
      const errorMessage = err.response?.data?.detail || 'Не удалось удалить перемещение';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentFileSelect = (e) => {
    setNewDocument(prev => ({ ...prev, document: e.target.files[0] }));
  };

  const handleAddDocument = async () => {
    if (!newDocument.document || !newDocument.name) {
      alert('Выберите файл и укажите название документа');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('document', newDocument.document);
      formData.append('name', newDocument.name);
      if (newDocument.description) {
        formData.append('description', newDocument.description);
      }

      const response = await axios.post(
        `/api/business/${businessSlug}/transfers/${transfer.id}/add-document/`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      setDocuments([...documents, response.data]);
      setNewDocument({ document: null, name: '', description: '' });
      onUpdate();
    } catch (err) {
      console.error('Ошибка загрузки документа:', err);
      alert(err.response?.data?.detail || 'Не удалось загрузить документ');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (documentId) => {
    if (!confirm('Вы уверены, что хотите удалить этот документ?')) {
      return;
    }

    try {
      await axios.delete(
        `/api/business/${businessSlug}/transfers/${transfer.id}/delete-document/${documentId}/`
      );
      setDocuments(documents.filter(doc => doc.id !== documentId));
      onUpdate();
    } catch (err) {
      console.error('Ошибка удаления документа:', err);
      alert(err.response?.data?.detail || 'Не удалось удалить документ');
    }
  };

  const handleRemoveItem = async (itemId) => {
    if (!confirm('Вы уверены, что хотите удалить эту позицию из перемещения?')) {
      return;
    }

    try {
      await axios.delete(
        `/api/business/${businessSlug}/transfers/${transfer.id}/remove-item/${itemId}/`
      );
      setItems(items.filter(item => item.id !== itemId));
      onUpdate();
    } catch (err) {
      console.error('Ошибка удаления позиции:', err);
      alert(err.response?.data?.detail || 'Не удалось удалить позицию');
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.title}>
            <FaTruck />
            <span>Перемещение {transfer.transfer_number}</span>
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.statusBadge}>
            <span className={`${styles.status} ${statusBadge.className}`}>
              {statusBadge.text}
            </span>
            {transfer.completed_at && (
              <div className={styles.completedInfo}>
                Проведено: {formatDate(transfer.completed_at)}
                {transfer.completed_by_name && ` пользователем ${transfer.completed_by_name}`}
              </div>
            )}
          </div>

          <div className={styles.infoSection}>
            <h3>Информация о перемещении</h3>
            <div className={styles.locationsInfo}>
              <div className={styles.locationCard}>
                <FaMapMarkerAlt className={styles.locationIcon} />
                <div>
                  <div className={styles.locationLabel}>Из склада</div>
                  <div className={styles.locationName}>{transfer.from_location_name}</div>
                </div>
              </div>
              <div className={styles.arrow}>
                <FaArrowRight />
              </div>
              <div className={styles.locationCard}>
                <FaMapMarkerAlt className={styles.locationIcon} />
                <div>
                  <div className={styles.locationLabel}>В склад</div>
                  <div className={styles.locationName}>{transfer.to_location_name}</div>
                </div>
              </div>
            </div>

            <div className={styles.infoRow}>
              <FaCalendarAlt className={styles.icon} />
              <span className={styles.label}>Создано:</span>
              <span className={styles.value}>{formatDate(transfer.created_at)}</span>
            </div>

            {transfer.created_by_name && (
              <div className={styles.infoRow}>
                <FaUser className={styles.icon} />
                <span className={styles.label}>Создал:</span>
                <span className={styles.value}>{transfer.created_by_name}</span>
              </div>
            )}

            {editing ? (
              <div className={styles.formGroup}>
                <label>Примечания</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={3}
                  disabled={loading}
                />
              </div>
            ) : (
              transfer.notes && (
                <div className={styles.infoRow}>
                  <span className={styles.label}>Примечания:</span>
                  <span className={styles.value}>{transfer.notes}</span>
                </div>
              )
            )}
          </div>

          <div className={styles.itemsSection}>
            <div className={styles.sectionHeader}>
              <h3>Товары в перемещении ({items.length})</h3>
            </div>
            {items.length === 0 ? (
              <div className={styles.emptyState}>
                <FaTruck />
                <p>Нет товаров в перемещении</p>
              </div>
            ) : (
              <div className={styles.itemsList}>
                {items.map(item => (
                  <div key={item.id} className={styles.itemCard}>
                    <div className={styles.itemHeader}>
                      <div className={styles.itemInfo}>
                        {item.variant_data?.main_image?.image ? (
                          <img
                            src={getFileUrl(item.variant_data.main_image.image)}
                            alt={item.variant_name}
                            className={styles.itemImage}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'https://via.placeholder.com/70x98?text=No+Image';
                            }}
                          />
                        ) : (
                          <div className={styles.noImage}>Нет фото</div>
                        )}
                        <div>
                          <h4>{item.variant_name}</h4>
                          <p className={styles.itemMeta}>
                            Партия: {item.batch_number || 'Без партии'}
                          </p>
                          <p className={styles.itemMeta}>
                            Локация: {item.location_name}
                          </p>
                        </div>
                      </div>
                      {canEdit && (
                        <button
                          className={styles.removeButton}
                          onClick={() => handleRemoveItem(item.id)}
                          title="Удалить позицию"
                        >
                          <FaTrash />
                        </button>
                      )}
                    </div>
                    <div className={styles.itemDetails}>
                      <div className={styles.quantityInfo}>
                        <span className={styles.quantityLabel}>Количество:</span>
                        <span className={styles.quantityValue}>
                          {parseFloat(item.quantity).toLocaleString('ru-RU')} {item.variant_data?.unit_display || 'шт.'}
                        </span>
                      </div>
                      {item.notes && (
                        <div className={styles.itemNotes}>
                          <span className={styles.notesLabel}>Примечание:</span>
                          <span className={styles.notesValue}>{item.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={styles.documentsSection}>
            <div className={styles.sectionHeader}>
              <h3>Документы ({documents.length})</h3>
            </div>
            {documents.length === 0 ? (
              <div className={styles.emptyState}>
                <FaFileAlt />
                <p>Нет документов</p>
              </div>
            ) : (
              <div className={styles.documentsList}>
                {documents.map(doc => (
                  <div key={doc.id} className={styles.documentCard}>
                    <FaFileAlt className={styles.documentIcon} />
                    <div className={styles.documentInfo}>
                      <div className={styles.documentName}>{doc.name}</div>
                      {doc.description && (
                        <div className={styles.documentDescription}>{doc.description}</div>
                      )}
                      {doc.uploaded_by_name && (
                        <div className={styles.documentMeta}>
                          Загрузил: {doc.uploaded_by_name} • {formatDate(doc.uploaded_at)}
                        </div>
                      )}
                    </div>
                    <div className={styles.documentActions}>
                      {doc.file_url && (
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.downloadButton}
                          title="Скачать"
                        >
                          <FaFileAlt />
                        </a>
                      )}
                      {canEdit && (
                        <button
                          className={styles.deleteButton}
                          onClick={() => handleDeleteDocument(doc.id)}
                          title="Удалить"
                        >
                          <FaTrash />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {canEdit && (
              <div className={styles.addDocumentSection}>
                <div className={styles.formGroup}>
                  <label>Название документа</label>
                  <input
                    type="text"
                    value={newDocument.name}
                    onChange={(e) => setNewDocument(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Например: Накладная, Акт перемещения"
                    disabled={uploading}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Описание (опционально)</label>
                  <input
                    type="text"
                    value={newDocument.description}
                    onChange={(e) => setNewDocument(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Дополнительная информация"
                    disabled={uploading}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Файл</label>
                  <input
                    type="file"
                    onChange={handleDocumentFileSelect}
                    disabled={uploading}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  />
                </div>
                <button
                  className={styles.addDocumentButton}
                  onClick={handleAddDocument}
                  disabled={uploading || !newDocument.document || !newDocument.name}
                >
                  {uploading ? <Loader /> : <><FaPlus /> Добавить документ</>}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className={styles.footer}>
          {editing ? (
            <>
              <button
                className={styles.saveButton}
                onClick={handleSave}
                disabled={loading}
              >
                {loading ? <Loader /> : <><FaSave /> Сохранить</>}
              </button>
              <button
                className={styles.cancelEditButton}
                onClick={() => {
                  setEditing(false);
                  setFormData({ notes: transfer.notes || '' });
                }}
                disabled={loading}
              >
                Отмена
              </button>
            </>
          ) : (
            <>
              {canEdit && (
                <button
                  className={styles.editButton}
                  onClick={() => setEditing(true)}
                  disabled={loading}
                >
                  Редактировать
                </button>
              )}
              {canComplete && (
                <button
                  className={styles.completeButton}
                  onClick={handleCompleteTransfer}
                  disabled={loading}
                >
                  {loading ? <Loader /> : <><FaCheck /> Провести перемещение</>}
                </button>
              )}
              {canCancel && (
                <button
                  className={styles.cancelButton}
                  onClick={handleCancelTransfer}
                  disabled={loading}
                >
                  {loading ? <Loader /> : <><FaBan /> Отменить перемещение</>}
                </button>
              )}
              {canEdit && (
                <button
                  className={styles.deleteBatchButton}
                  onClick={handleDeleteTransfer}
                  disabled={loading}
                >
                  {loading ? <Loader /> : <><FaTrash /> Удалить</>}
                </button>
              )}
            </>
          )}
          <button
            className={styles.closeBtn}
            onClick={onClose}
            disabled={loading}
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransferDetailModal;
