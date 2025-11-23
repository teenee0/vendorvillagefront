import { useState, useEffect } from 'react';
import axios from '../../api/axiosDefault';
import { FaTimes, FaCalendarAlt, FaBoxes, FaMapMarkerAlt, FaUser, FaSave, FaTrash, FaPlus, FaFileAlt, FaDownload, FaEye, FaExclamationTriangle } from 'react-icons/fa';
import styles from './BatchDetailModal.module.css';
import ProductSelectorModal from '../ProductSelectorModal/ProductSelectorModal';
import { useFileUtils } from '../../hooks/useFileUtils';

const BatchDetailModal = ({ businessSlug, batch, onClose, onUpdate, onDelete }) => {
  const { getFileUrl } = useFileUtils();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(!batch.status || batch.status === 'draft');
  const [uploading, setUploading] = useState(false);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [locations, setLocations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [formData, setFormData] = useState({
    batch_number: batch.batch_number,
    received_date: batch.received_date?.slice(0, 16),
    supplier: batch.supplier || '',
    notes: batch.notes || '',
    received_by: batch.received_by ? String(batch.received_by) : '',
  });
  const [documents, setDocuments] = useState(batch.documents || []);
  const [newDocument, setNewDocument] = useState({
    document: null,
    name: '',
    description: ''
  });
  const [stocks, setStocks] = useState([]);
  const [editingReservation, setEditingReservation] = useState(null);
  const [editingDefect, setEditingDefect] = useState(null);
  const [reservationValue, setReservationValue] = useState(0);
  const [defectQuantity, setDefectQuantity] = useState(0);
  const [defectReason, setDefectReason] = useState('');

  useEffect(() => {
    fetchLocations();
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (batch.stocks) {
      setStocks(batch.stocks.map(stock => ({
        ...stock,
        variant_data: stock.variant_data || {
          product_name: stock.variant_name,
          main_image: stock.main_image || null,
          attributes: []
        }
      })));
    }
  }, [batch]);

  const fetchLocations = async () => {
    try {
      const response = await axios.get(`/api/business/${businessSlug}/locations/`);
      setLocations(response.data.results || response.data);
    } catch (err) {
      console.error('Ошибка загрузки локаций:', err);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await axios.get(`/api/business/${businessSlug}/employees/`);
      setEmployees(response.data);
    } catch (err) {
      console.error('Ошибка загрузки сотрудников:', err);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleVariantSelect = (selectedVariants) => {
    if (selectedVariants.length === 0) return;

    const newStocks = selectedVariants.map((variant) => ({
      variant_id: variant.id,
      location_id: '',
      quantity: 1,
      cost_price: '',
      reserved_quantity: 0,
      defects: [],
      is_available_for_sale: true,
      variant_name: variant.product_name,
      variant_data: variant
    }));

    setStocks([...stocks, ...newStocks]);
    setIsSelectorOpen(false);
  };

  const handleAddDefectLocal = (index) => {
    if (!defectQuantity || defectQuantity <= 0) {
      alert('Укажите количество брака');
      return;
    }
    
    if (!defectReason.trim()) {
      alert('Укажите причину брака');
      return;
    }

    const stock = stocks[index];
    const currentDefects = stock.defects || [];
    const totalDefects = currentDefects.reduce((sum, d) => sum + d.quantity, 0);
    
    if (totalDefects + defectQuantity > stock.quantity) {
      alert(`Общее количество брака (${totalDefects + defectQuantity}) не может превышать количество товара (${stock.quantity})`);
      return;
    }

    const newDefect = {
      quantity: defectQuantity,
      reason: defectReason,
      created_at: new Date().toISOString()
    };

    const newStocks = [...stocks];
    newStocks[index] = {
      ...newStocks[index],
      defects: [...currentDefects, newDefect]
    };

    setStocks(newStocks);
    setEditingDefect(null);
    setDefectQuantity(0);
    setDefectReason('');
  };

  const handleRemoveDefect = (stockIndex, defectIndex) => {
    const newStocks = [...stocks];
    newStocks[stockIndex].defects = newStocks[stockIndex].defects.filter((_, idx) => idx !== defectIndex);
    setStocks(newStocks);
  };

  const removeStock = (index) => {
    setStocks(stocks.filter((_, i) => i !== index));
  };

  const updateStock = (index, field, value) => {
    const newStocks = [...stocks];
    newStocks[index] = {
      ...newStocks[index],
      [field]: value
    };
    setStocks(newStocks);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const updateData = {
        ...formData,
        stocks: stocks.filter(s => s.variant_id && s.location_id).map(s => ({
          variant_id: s.variant_id,
          location_id: s.location_id,
          quantity: s.quantity,
          cost_price: s.cost_price || null,
          reserved_quantity: s.reserved_quantity || 0,
          defects: s.defects || [],
          is_available_for_sale: s.is_available_for_sale
        }))
      };

      if (!updateData.received_by) {
        delete updateData.received_by;
      }

      console.log('Updating batch with data:', updateData);

      await axios.patch(
        `/api/business/${businessSlug}/batches/${batch.id}/update/`,
        updateData
      );
      setEditing(false);
      onUpdate();
    } catch (err) {
      console.error('Ошибка обновления партии:', err);
      alert(err.response?.data?.detail || 'Не удалось обновить партию');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteBatch = async () => {
    if (!confirm('Вы уверены, что хотите провести партию? После этого её нельзя будет редактировать.')) {
      return;
    }

    setLoading(true);
    try {
      await axios.post(`/api/business/${businessSlug}/batches/${batch.id}/complete/`);
      onUpdate();
    } catch (err) {
      console.error('Ошибка проведения партии:', err);
      alert(err.response?.data?.detail || 'Не удалось провести партию');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBatch = async () => {
    const confirmMessage = batch.status === 'completed'
      ? 'Вы уверены, что хотите удалить проведенную партию? Это действие можно выполнить только если из партии ничего не продавали.'
      : 'Вы уверены, что хотите удалить партию? Это действие нельзя отменить.';

    if (!confirm(confirmMessage)) {
      return;
    }

    setLoading(true);
    try {
      await onDelete(batch.id);
      onClose();
    } catch (err) {
      console.error('Ошибка удаления партии:', err);
      const errorMessage = err.response?.data?.detail || 'Не удалось удалить партию';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentFileSelect = (e) => {
    setNewDocument(prev => ({ ...prev, document: e.target.files[0] }));
  };

  const handleAddDocument = () => {
    if (!newDocument.document || !newDocument.name) {
      alert('Выберите файл и укажите название документа');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('document', newDocument.document);
    formData.append('name', newDocument.name);
    if (newDocument.description) {
      formData.append('description', newDocument.description);
    }

    axios.post(`/api/business/${businessSlug}/batches/${batch.id}/documents/`, formData)
      .then(() => {
        onUpdate();
        setNewDocument({ document: null, name: '', description: '' });
      })
      .catch(err => {
        console.error('Ошибка загрузки документа:', err);
        alert('Не удалось загрузить документ');
      })
      .finally(() => setUploading(false));
  };

  const handleDeleteDocument = (docId) => {
    if (!confirm('Удалить документ?')) {
      return;
    }

    axios.delete(`/api/business/${businessSlug}/batches/${batch.id}/documents/${docId}/`)
      .then(() => onUpdate())
      .catch(err => {
        console.error('Ошибка удаления документа:', err);
        alert('Не удалось удалить документ');
      });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isCompleted = batch.status === 'completed';

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            <FaBoxes />
            Партия {batch.batch_number}
          </h2>
          <button className={styles.closeButton} onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.statusBadge}>
            <span className={`${styles.status} ${styles[`status_${batch.status}`]}`}>
              {batch.status === 'completed' ? '✓ Проведена' : '📝 Черновик'}
            </span>
            {batch.status === 'completed' && batch.completed_at && (
              <div className={styles.completedInfo}>
                Проведена {formatDate(batch.completed_at)}
                {batch.completed_by_name && ` пользователем ${batch.completed_by_name}`}
              </div>
            )}
          </div>

          <div className={styles.infoSection}>
            <div className={styles.sectionHeader}>
              <h3>Информация о партии</h3>
              {!isCompleted && (
                <button
                  className={styles.editButton}
                  onClick={() => editing ? handleSave() : setEditing(true)}
                  disabled={loading}
                >
                  {editing ? <FaSave /> : 'Редактировать'}
                </button>
              )}
            </div>

            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <label><FaCalendarAlt /> Дата поступления</label>
                {editing && !isCompleted ? (
                  <input type="datetime-local" value={formData.received_date} onChange={(e) => handleInputChange('received_date', e.target.value)} />
                ) : (
                  <span>{formatDate(batch.received_date)}</span>
                )}
              </div>

              <div className={styles.infoItem}>
                <label><FaUser /> Принял товар</label>
                {editing && !isCompleted ? (
                  <select
                    value={formData.received_by}
                    onChange={(e) => handleInputChange('received_by', e.target.value)}
                  >
                    <option value="">Выберите сотрудника</option>
                    {employees.map(employee => {
                      return (
                        <option key={employee.id} value={employee.user || ''}>
                          {employee.name || employee.full_name || `Сотрудник #${employee.id}`}
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <span>{batch.received_by_name || '-'}</span>
                )}
              </div>

              <div className={styles.infoItem}>
                <label><FaMapMarkerAlt /> Поставщик</label>
                {editing && !isCompleted ? (
                  <input type="text" value={formData.supplier} onChange={(e) => handleInputChange('supplier', e.target.value)} placeholder="Название поставщика" />
                ) : (
                  <span>{batch.supplier || '-'}</span>
                )}
              </div>

              <div className={styles.infoItemFull}>
                <label>📝 Примечания</label>
                {editing && !isCompleted ? (
                  <textarea value={formData.notes} onChange={(e) => handleInputChange('notes', e.target.value)} rows="3" placeholder="Дополнительная информация" />
                ) : (
                  <span>{batch.notes || '-'}</span>
                )}
              </div>
            </div>

            <div className={styles.summarySection}>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Общая себестоимость:</span>
                <span className={styles.summaryValue}>{batch.total_cost || 0} ₸</span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Стоимость продажи:</span>
                <span className={styles.summaryValue}>{batch.total_selling_price || 0} ₸</span>
              </div>
            </div>
          </div>

          <div className={styles.stocksSection}>
            <div className={styles.sectionHeader}>
              <h3>Товары в партии ({stocks.length})</h3>
              {!isCompleted && (
                <button className={styles.addButton} onClick={() => setIsSelectorOpen(true)}>
                  <FaPlus /> Добавить товар
                </button>
              )}
            </div>

            {stocks.length > 0 ? (
              <div className={styles.stocksList}>
                {stocks.map((stock, index) => (
                  <div key={index} className={styles.stockRow}>
                    {stock.variant_data && (
                      <div className={styles.selectedProductCard}>
                        {stock.variant_data.main_image?.image ? (
                          <img src={getFileUrl(stock.variant_data.main_image.image)} alt={stock.variant_name} className={styles.selectedProductImage} onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/70x98?text=No+Image'; }} />
                        ) : (
                          <div className={styles.selectedNoImage}><FaBoxes size={40} /></div>
                        )}
                        <div className={styles.selectedProductInfo}>
                          <div className={styles.selectedProductName}>{stock.variant_name}</div>
                          <div className={styles.selectedProductVariant}>{stock.variant_data.name || 'Без варианта'}</div>
                          {stock.variant_data.attributes && stock.variant_data.attributes.length > 0 && (
                            <div className={styles.selectedAttributes}>
                              {stock.variant_data.attributes.map((attr, idx) => (
                                <span key={idx} className={styles.attributeBadge}>
                                  {attr.attribute_name}: {attr.display_value || attr.custom_value}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {!isCompleted ? (
                      <>
                        <div className={styles.stockControls}>
                          <select value={stock.location_id} onChange={(e) => updateStock(index, 'location_id', e.target.value)} required className={styles.select} title="Выберите локацию">
                            <option value="">Выберите локацию</option>
                            {locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}
                          </select>
                          <div className={styles.inputWithLabel}>
                            <label className={styles.fieldLabel}>Кол-во</label>
                            <input type="number" min="1" value={stock.quantity} onChange={(e) => updateStock(index, 'quantity', parseInt(e.target.value))} required className={styles.quantityInput} placeholder="0" />
                          </div>
                          <div className={styles.inputWithLabel}>
                            <label className={styles.fieldLabel}>Себестоимость</label>
                            <input type="number" step="0.01" min="0" value={stock.cost_price} onChange={(e) => updateStock(index, 'cost_price', parseFloat(e.target.value) || '')} className={styles.quantityInput} placeholder="0.00" />
                          </div>
                          <div className={styles.inputWithLabel}>
                            <label className={styles.fieldLabel}>Резерв 🔒</label>
                            <input type="number" min="0" max={stock.quantity || 0} value={stock.reserved_quantity || 0} onChange={(e) => {
                              const value = parseInt(e.target.value) || 0;
                              const maxValue = stock.quantity || 0;
                              updateStock(index, 'reserved_quantity', Math.min(value, maxValue));
                            }} className={styles.quantityInput} placeholder="0" title={`Зарезервированное количество (недоступно для продажи, максимум ${stock.quantity || 0})`} />
                          </div>
                          <label className={styles.checkboxLabel}>
                            <input type="checkbox" checked={stock.is_available_for_sale} onChange={(e) => updateStock(index, 'is_available_for_sale', e.target.checked)} /> Доступен
                          </label>
                          <button type="button" className={styles.removeButton} onClick={() => removeStock(index)}><FaTrash /></button>
                        </div>

                        {editingDefect === index ? (
                          <div className={styles.defectForm}>
                            <div className={styles.defectFormRow}>
                              <div className={styles.inputWithLabel}>
                                <label className={styles.fieldLabel}>Количество брака</label>
                                <input type="number" min="1" value={defectQuantity} onChange={(e) => setDefectQuantity(parseInt(e.target.value) || 0)} className={styles.quantityInput} placeholder="0" />
                              </div>
                              <div className={styles.inputWithLabel}>
                                <label className={styles.fieldLabel}>Причина брака</label>
                                <input type="text" value={defectReason} onChange={(e) => setDefectReason(e.target.value)} className={styles.textInput} placeholder="Например: Сломана пуговица" />
                              </div>
                            </div>
                            <div className={styles.defectFormActions}>
                              <button type="button" className={styles.addDefectBtn} onClick={() => handleAddDefectLocal(index)}>Добавить</button>
                              <button type="button" className={styles.cancelDefectBtn} onClick={() => { setEditingDefect(null); setDefectQuantity(0); setDefectReason(''); }}>Отмена</button>
                            </div>
                          </div>
                        ) : (
                          <div className={styles.defectSection}>
                            <button type="button" className={styles.addDefectButton} onClick={() => { setEditingDefect(index); setDefectQuantity(0); setDefectReason(''); }}>
                              ⚠️ Добавить брак
                            </button>
                            {stock.defects && stock.defects.length > 0 && (
                              <div className={styles.defectsList}>
                                {stock.defects.map((defect, defectIdx) => (
                                  <div key={defectIdx} className={styles.defectItem}>
                                    <span className={styles.defectQuantity}>{defect.quantity} шт.</span>
                                    <span className={styles.defectReason}>— {defect.reason}</span>
                                    <button type="button" className={styles.removeDefectBtn} onClick={() => handleRemoveDefect(index, defectIdx)}>
                                      <FaTrash size={12} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className={styles.stockInfoReadonly}>
                        <div className={styles.infoRow}>
                          <span className={styles.infoLabel}>Локация:</span>
                          <span className={styles.infoValue}>{stock.location_name}</span>
                        </div>
                        <div className={styles.infoRow}>
                          <span className={styles.infoLabel}>Количество:</span>
                          <span className={styles.infoValue}>{stock.quantity}</span>
                        </div>
                        <div className={styles.infoRow}>
                          <span className={styles.infoLabel}>Резервировано:</span>
                          <span className={styles.infoValue}>{stock.reserved_quantity || 0}</span>
                        </div>
                        <div className={styles.infoRow}>
                          <span className={styles.infoLabel}>Брак:</span>
                          <span className={styles.infoValue}>{stock.defect_quantity || 0}</span>
                        </div>
                        <div className={styles.infoRow}>
                          <span className={styles.infoLabel}>Доступно:</span>
                          <span className={styles.infoValue}>{stock.available_quantity || 0}</span>
                        </div>
                        <div className={styles.infoRow}>
                          <span className={styles.infoLabel}>Статус:</span>
                          <span className={stock.is_available_for_sale ? styles.statusActive : styles.statusInactive}>
                            {stock.is_available_for_sale ? 'Доступен' : 'Недоступен'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}><FaBoxes /><p>Нет товаров в партии</p></div>
            )}
          </div>

          <div className={styles.documentsSection}>
            <div className={styles.sectionHeader}>
              <h3>Документы ({documents.length})</h3>
              {!isCompleted && (
                <button className={styles.addDocumentButton} onClick={() => document.getElementById('documentUpload').click()}>
                  <FaPlus /> Добавить документ
                </button>
              )}
            </div>

            <input type="file" id="documentUpload" style={{ display: 'none' }} onChange={handleDocumentFileSelect} />

            {newDocument.document && (
              <div className={styles.documentUploadForm}>
                <input type="text" placeholder="Название документа *" value={newDocument.name} onChange={(e) => setNewDocument(prev => ({ ...prev, name: e.target.value }))} />
                <textarea placeholder="Описание (опционально)" value={newDocument.description} onChange={(e) => setNewDocument(prev => ({ ...prev, description: e.target.value }))} rows="2" />
                <div className={styles.documentUploadActions}>
                  <button type="button" onClick={handleAddDocument} disabled={uploading || !newDocument.name}>
                    {uploading ? 'Загрузка...' : 'Загрузить'}
                  </button>
                  <button type="button" onClick={() => setNewDocument({ document: null, name: '', description: '' })}>Отмена</button>
                </div>
              </div>
            )}

            {documents && documents.length > 0 ? (
              <div className={styles.documentsList}>
                {documents.map((doc) => (
                  <div key={doc.id} className={styles.documentCard}>
                    <FaFileAlt className={styles.documentIcon} />
                    <div className={styles.documentInfo}>
                      <div className={styles.documentName}>{doc.name}</div>
                      {doc.description && <div className={styles.documentDescription}>{doc.description}</div>}
                      <div className={styles.documentMeta}>
                        {doc.uploaded_by_name && <span>Загружен: {doc.uploaded_by_name}</span>}
                        {doc.uploaded_at && <span>Дата: {formatDate(doc.uploaded_at)}</span>}
                      </div>
                    </div>
                    <div className={styles.documentActions}>
                      {doc.file_url && <><a href={doc.file_url} target="_blank" rel="noopener noreferrer" className={styles.viewButton}><FaEye /></a><a href={doc.file_url} download className={styles.downloadButton}><FaDownload /></a></>}
                      {!isCompleted && <button className={styles.deleteButton} onClick={() => handleDeleteDocument(doc.id)}><FaTrash /></button>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}><FaFileAlt /><p>Нет документов</p></div>
            )}
          </div>
        </div>

        <div className={styles.footer}>
          {!isCompleted && (
            <>
              <button className={styles.deleteBatchButton} onClick={handleDeleteBatch} disabled={loading}>
                <FaExclamationTriangle /> Удалить партию
              </button>
              <button className={styles.completeButton} onClick={handleCompleteBatch} disabled={loading}>
                ✓ Провести партию
              </button>
            </>
          )}
          <button className={styles.closeBtn} onClick={onClose}>Закрыть</button>
        </div>
      </div>

      {isSelectorOpen && (
        <ProductSelectorModal
          businessSlug={businessSlug}
          onSelect={handleVariantSelect}
          onClose={() => setIsSelectorOpen(false)}
        />
      )}
    </div>
  );
};

export default BatchDetailModal;
