import { useState, useEffect } from 'react';
import axios from '../../api/axiosDefault';
import { FaTimes, FaPlus, FaTrash, FaBoxes, FaFileAlt, FaDownload, FaEye } from 'react-icons/fa';
import styles from './CreateBatchModal.module.css';
import Loader from '../../components/Loader';
import ProductSelectorModal from '../ProductSelectorModal/ProductSelectorModal';
import { useFileUtils } from '../../hooks/useFileUtils';

const CreateBatchModal = ({ businessSlug, onClose, onSuccess }) => {
  const { getFileUrl } = useFileUtils();
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [formData, setFormData] = useState({
    batch_number: '',
    received_date: new Date().toISOString().slice(0, 16),
    supplier: '',
    notes: '',
    received_by: '',
  });
  const [stocks, setStocks] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [newDocument, setNewDocument] = useState({
    document: null,
    name: '',
    description: ''
  });
  const [editingDefect, setEditingDefect] = useState(null);
  const [defectQuantity, setDefectQuantity] = useState(0);
  const [defectReason, setDefectReason] = useState('');

  useEffect(() => {
    fetchLocations();
    fetchEmployees();
  }, []);

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

  const addStock = () => {
    setIsSelectorOpen(true);
  };

  const handleVariantSelect = (selectedBindings) => {
    if (selectedBindings.length === 0) return;
    
    // Теперь selectedBindings - это привязки (вариант + локация + цена)
    const newStocks = selectedBindings.map((binding) => ({
      variant_on_location_id: binding.variant_on_location_id, // ID ProductVariantLocationPrice
      variant_id: binding.variant_id,
      location_id: binding.location_id,
      location_name: binding.location_name,
      quantity: 1,
      cost_price: '',
      reserved_quantity: 0,
      defects: [],
      is_available_for_sale: true,
      is_active_on_marketplace: false,
      is_active_for_offline_sale: false,
      is_active_on_own_site: false,
      variant_name: `${binding.product_name} ${binding.variant_name || ''}`.trim(),
      variant_data: {
        name: binding.variant_name,
        main_image: binding.main_image,
        attributes: binding.attributes
      },
      price: binding.price
    }));
    
    setStocks([...stocks, ...newStocks]);
    setIsSelectorOpen(false);
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

  const handleAddDefect = (index) => {
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

  const handleDocumentFileSelect = (e) => {
    setNewDocument(prev => ({ ...prev, document: e.target.files[0] }));
  };

  const handleAddDocument = () => {
    if (!newDocument.document || !newDocument.name) {
      alert('Выберите файл и укажите название документа');
      return;
    }

    const newDoc = {
      document: newDocument.document,
      name: newDocument.name,
      description: newDocument.description,
      file_url: URL.createObjectURL(newDocument.document)
    };

    setDocuments([...documents, newDoc]);
    setNewDocument({ document: null, name: '', description: '' });
  };

  const handleRemoveDocument = (index) => {
    setDocuments(documents.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (stocks.length === 0) {
      alert('Добавьте хотя бы один товар в партию');
      return;
    }

    setLoading(true);
    
    try {
      const batchData = {
        ...formData,
        stocks: stocks.filter(s => s.variant_on_location_id).map(s => ({
          variant_on_location_id: s.variant_on_location_id,
          quantity: s.quantity,
          cost_price: s.cost_price || null,
          reserved_quantity: s.reserved_quantity || 0,
          defects: s.defects || [],
          is_available_for_sale: s.is_available_for_sale,
          is_active_on_marketplace: s.is_active_on_marketplace || false,
          is_active_for_offline_sale: s.is_active_for_offline_sale || false,
          is_active_on_own_site: s.is_active_on_own_site || false
        }))
      };
      
      if (!batchData.received_by) {
        delete batchData.received_by;
      }
      
      await onSuccess(batchData, documents);
    } catch (err) {
      console.error('Ошибка создания партии:', err);
      alert(err.response?.data?.detail || 'Не удалось создать партию');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.overlay}>
        <div className={styles.modal}>
          <Loader />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.header}>
            <h2 className={styles.title}>
              <FaBoxes />
              Создать новую партию
            </h2>
            <button className={styles.closeButton} onClick={onClose}>
              <FaTimes />
            </button>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label>Номер партии (опционально)</label>
              <input
                type="text"
                value={formData.batch_number}
                onChange={(e) => handleInputChange('batch_number', e.target.value)}
                placeholder="Будет сгенерирован автоматически, если не указан"
              />
              <small className={styles.helpText}>Оставьте пустым для автоматической генерации</small>
            </div>

            <div className={styles.formGroup}>
              <label>Дата поступления *</label>
              <input
                type="datetime-local"
                required
                value={formData.received_date}
                onChange={(e) => handleInputChange('received_date', e.target.value)}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Поставщик</label>
              <input
                type="text"
                value={formData.supplier}
                onChange={(e) => handleInputChange('supplier', e.target.value)}
                placeholder="Название поставщика"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Принял товар</label>
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
            </div>

            <div className={styles.formGroup}>
              <label>Примечания</label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows="3"
                placeholder="Дополнительная информация"
              />
            </div>

            <div className={styles.stocksSection}>
              <div className={styles.stocksHeader}>
                <h3>Товары в партии ({stocks.length})</h3>
                <button type="button" className={styles.addButton} onClick={addStock}>
                  <FaPlus />
                  Добавить товар
                </button>
              </div>

              <div className={styles.stocksList}>
                {stocks.map((stock, index) => (
                  <div key={index} className={styles.stockRow}>
                    {stock.variant_data && (
                      <div className={styles.selectedProductCard}>
                        {stock.variant_data.main_image?.image ? (
                          <img
                            src={getFileUrl(stock.variant_data.main_image.image)}
                            alt={stock.variant_name}
                            className={styles.selectedProductImage}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'https://via.placeholder.com/70x98?text=No+Image';
                            }}
                          />
                        ) : (
                          <div className={styles.selectedNoImage}>
                            <FaBoxes size={40} />
                          </div>
                        )}
                        <div className={styles.selectedProductInfo}>
                          <div className={styles.selectedProductName}>
                            {stock.variant_name}
                          </div>
                          <div className={styles.selectedProductVariant}>
                            {stock.variant_data.name || 'Без варианта'}
                          </div>
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

                    <div className={styles.stockControls}>
                      {stock.location_name && (
                        <div className={styles.locationDisplay}>
                          <strong>Локация:</strong> {stock.location_name}
                          {stock.price && (
                            <span className={styles.priceDisplay}>
                              Цена: {stock.price.toLocaleString('ru-RU')} ₸
                            </span>
                          )}
                        </div>
                      )}

                      <input
                        type="number"
                        min="1"
                        value={stock.quantity}
                        onChange={(e) => updateStock(index, 'quantity', parseInt(e.target.value))}
                        required
                        className={styles.quantityInput}
                        placeholder="Кол-во"
                      />

                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={stock.cost_price}
                        onChange={(e) => updateStock(index, 'cost_price', parseFloat(e.target.value) || '')}
                        className={styles.quantityInput}
                        placeholder="Себестоимость"
                        title="Себестоимость одной единицы"
                      />

                      <div className={styles.inputWithLabel}>
                        <label className={styles.fieldLabel}>Резерв 🔒</label>
                        <input
                          type="number"
                          min="0"
                          max={stock.quantity || 0}
                          value={stock.reserved_quantity || 0}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 0;
                            const maxValue = stock.quantity || 0;
                            updateStock(index, 'reserved_quantity', Math.min(value, maxValue));
                          }}
                          className={styles.quantityInput}
                          placeholder="0"
                          title={`Зарезервированное количество (недоступно для продажи, максимум ${stock.quantity || 0})`}
                        />
                      </div>

                        <label className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={stock.is_available_for_sale}
                          onChange={(e) => updateStock(index, 'is_available_for_sale', e.target.checked)}
                        />
                        Доступен
                      </label>

                      <div className={styles.activeFlagsSection}>
                        <div className={styles.activeFlagsTitle}>Активность товара:</div>
                        <div className={styles.activeFlagsList}>
                          <label className={styles.activeFlagItem}>
                            <input
                              type="checkbox"
                              checked={stock.is_active_on_marketplace || false}
                              onChange={(e) => updateStock(index, 'is_active_on_marketplace', e.target.checked)}
                              disabled={!stock.quantity || stock.quantity === 0}
                              title={!stock.quantity || stock.quantity === 0 ? 'Укажите количество товара' : ''}
                            />
                            <span className={styles.flagLabel}>
                              На маркетплейсе
                            </span>
                          </label>
                          <label className={styles.activeFlagItem}>
                            <input
                              type="checkbox"
                              checked={stock.is_active_for_offline_sale || false}
                              onChange={(e) => updateStock(index, 'is_active_for_offline_sale', e.target.checked)}
                              disabled={!stock.quantity || stock.quantity === 0}
                              title={!stock.quantity || stock.quantity === 0 ? 'Укажите количество товара' : ''}
                            />
                            <span className={styles.flagLabel}>
                              Оффлайн продажа
                            </span>
                          </label>
                          <label className={styles.activeFlagItem}>
                            <input
                              type="checkbox"
                              checked={stock.is_active_on_own_site || false}
                              onChange={(e) => updateStock(index, 'is_active_on_own_site', e.target.checked)}
                              disabled={!stock.quantity || stock.quantity === 0}
                              title={!stock.quantity || stock.quantity === 0 ? 'Укажите количество товара' : ''}
                            />
                            <span className={styles.flagLabel}>
                              На личном сайте
                            </span>
                          </label>
                        </div>
                      </div>

                      <button
                        type="button"
                        className={styles.removeButton}
                        onClick={() => removeStock(index)}
                      >
                        <FaTrash />
                      </button>
                    </div>

                    {editingDefect === index ? (
                      <div className={styles.defectForm}>
                        <div className={styles.defectFormRow}>
                          <div className={styles.inputWithLabel}>
                            <label className={styles.fieldLabel}>Количество брака</label>
                            <input
                              type="number"
                              min="1"
                              value={defectQuantity}
                              onChange={(e) => setDefectQuantity(parseInt(e.target.value) || 0)}
                              className={styles.quantityInput}
                              placeholder="0"
                            />
                          </div>
                          <div className={styles.inputWithLabel}>
                            <label className={styles.fieldLabel}>Причина брака</label>
                            <input
                              type="text"
                              value={defectReason}
                              onChange={(e) => setDefectReason(e.target.value)}
                              className={styles.textInput}
                              placeholder="Например: Сломана пуговица"
                            />
                          </div>
                        </div>
                        <div className={styles.defectFormActions}>
                          <button type="button" className={styles.addDefectBtn} onClick={() => handleAddDefect(index)}>Добавить</button>
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
                  </div>
                ))}

                {stocks.length === 0 && (
                  <div className={styles.emptyStocks}>
                    <p>Добавьте товары в партию</p>
                  </div>
                )}
              </div>
            </div>

            <div className={styles.documentsSection}>
              <div className={styles.sectionHeader}>
                <h3>Документы ({documents.length})</h3>
              </div>

              <input
                type="file"
                id="documentUploadCreate"
                style={{ display: 'none' }}
                onChange={handleDocumentFileSelect}
              />

              {newDocument.document ? (
                <div className={styles.documentUploadForm}>
                  <input
                    type="text"
                    placeholder="Название документа (обязательно)"
                    value={newDocument.name}
                    onChange={(e) => setNewDocument(prev => ({ ...prev, name: e.target.value }))}
                  />
                  <textarea
                    placeholder="Описание (опционально)"
                    value={newDocument.description}
                    onChange={(e) => setNewDocument(prev => ({ ...prev, description: e.target.value }))}
                    rows="2"
                  />
                  <div className={styles.documentUploadActions}>
                    <button type="button" onClick={handleAddDocument} disabled={!newDocument.name}>
                      <FaPlus />
                      Добавить
                    </button>
                    <button type="button" onClick={() => setNewDocument({ document: null, name: '', description: '' })}>
                      Отмена
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className={styles.addDocumentButton}
                  onClick={() => document.getElementById('documentUploadCreate').click()}
                >
                  <FaPlus />
                  Добавить документ
                </button>
              )}

              {documents.length > 0 && (
                <div className={styles.documentsList}>
                  {documents.map((doc, index) => (
                    <div key={index} className={styles.documentCard}>
                      <FaFileAlt className={styles.documentIcon} />
                      <div className={styles.documentInfo}>
                        <div className={styles.documentName}>{doc.name}</div>
                        {doc.description && (
                          <div className={styles.documentDescription}>{doc.description}</div>
                        )}
                      </div>
                      <button
                        type="button"
                        className={styles.deleteButton}
                        onClick={() => handleRemoveDocument(index)}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.actions}>
              <button type="button" className={styles.cancelButton} onClick={onClose}>
                Отмена
              </button>
              <button type="submit" className={styles.submitButton} disabled={loading}>
                Создать партию
              </button>
            </div>
          </form>
        </div>
      </div>

      {isSelectorOpen && (
        <ProductSelectorModal
          businessSlug={businessSlug}
          onSelect={handleVariantSelect}
          onClose={() => setIsSelectorOpen(false)}
        />
      )}
    </>
  );
};

export default CreateBatchModal;
