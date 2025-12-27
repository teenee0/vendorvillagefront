import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import axios from '../../api/axiosDefault';
import { FaTimes, FaPlus, FaTrash, FaTruck, FaArrowLeft, FaChevronDown, FaChevronUp, FaFileAlt, FaDownload, FaCheck } from 'react-icons/fa';
import styles from './CreateTransferPage.module.css';
import Loader from '../../components/Loader';
import { useFileUtils } from '../../hooks/useFileUtils';

const CreateTransferPage = () => {
  const { business_slug } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const transferId = searchParams.get('transfer_id');
  const isEditMode = !!transferId;
  const { getFileUrl } = useFileUtils();
  const [loading, setLoading] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [locations, setLocations] = useState([]);
  const [availableStocks, setAvailableStocks] = useState([]);
  const [transferData, setTransferData] = useState(null);
  const [formData, setFormData] = useState({
    from_location: '',
    to_location: '',
    notes: '',
  });
  const [items, setItems] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [newDocument, setNewDocument] = useState({
    document: null,
    name: '',
    description: ''
  });
  const [selectedStock, setSelectedStock] = useState(null);
  const [transferQuantity, setTransferQuantity] = useState('');
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [showStocksList, setShowStocksList] = useState(true);

  useEffect(() => {
    fetchLocations();
    if (isEditMode && transferId) {
      fetchTransferData(transferId);
    }
  }, []);

  useEffect(() => {
    if (formData.from_location) {
      fetchAvailableStocks(formData.from_location);
    } else {
      setAvailableStocks([]);
      setItems([]);
    }
  }, [formData.from_location]);

  const fetchLocations = async () => {
    try {
      const response = await axios.get(`/api/business/${business_slug}/locations/?warehouses_only=true`);
      const locations = response.data.results || response.data || [];
      setLocations(locations);
      
      if (locations.length === 0) {
        console.warn('Не найдено складов для перемещения');
      }
    } catch (err) {
      console.error('Ошибка загрузки локаций:', err);
      alert('Не удалось загрузить склады');
    }
  };

  const fetchTransferData = async (id) => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/business/${business_slug}/transfers/${id}/`);
      const transfer = response.data;
      setTransferData(transfer);
      
      // Заполняем форму данными перемещения
      setFormData({
        from_location: transfer.from_location.toString(),
        to_location: transfer.to_location.toString(),
        notes: transfer.notes || '',
      });
      
      // Заполняем позиции
      if (transfer.items && transfer.items.length > 0) {
        const formattedItems = transfer.items.map(item => {
          // Используем данные из API напрямую
          const availableQty = parseFloat(item.available_quantity || 0);
          const reservedQty = parseFloat(item.reserved_quantity || 0);
          const defectQty = parseFloat(item.defect_quantity || 0);
          const maxTransferable = availableQty + reservedQty + defectQty;
          
          return {
            id: item.id, // ID позиции для удаления через API
            stock_id: item.stock_id,
            stock: item.stock,
            quantity: parseFloat(item.quantity),
            notes: item.notes || '',
            variant_name: item.variant_name,
            variant_data: item.variant_data || item.stock?.variant_data, // Используем variant_data из API
            available_quantity: availableQty,
            reserved_quantity: reservedQty,
            defect_quantity: defectQty,
            total_quantity: parseFloat(item.stock?.quantity || 0),
            max_transferable: maxTransferable,
            batch_number: item.batch_number || 'Без партии',
            location_name: item.location_name,
            unit_display: item.unit_display || item.variant_data?.unit_display || 'шт.',
          };
        });
        setItems(formattedItems);
      }
      
      // Заполняем документы
      if (transfer.documents) {
        setDocuments(transfer.documents);
      }
      
      // Загружаем доступные товары для склада-источника
      if (transfer.from_location) {
        await fetchAvailableStocks(transfer.from_location);
      }
    } catch (err) {
      console.error('Ошибка загрузки перемещения:', err);
      alert('Не удалось загрузить перемещение');
      navigate(`/business/${business_slug}/batches?tab=transfers`);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableStocks = async (locationId) => {
    try {
      const response = await axios.get(
        `/api/business/${business_slug}/transfers/available-stocks/${locationId}/`
      );
      setAvailableStocks(response.data);
    } catch (err) {
      console.error('Ошибка загрузки доступных товаров:', err);
      alert('Не удалось загрузить доступные товары');
      setAvailableStocks([]);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleStockClick = (stock) => {
    // Проверяем, не добавлен ли уже этот stock
    if (items.some(item => item.stock_id === stock.id)) {
      alert('Этот товар уже добавлен в перемещение');
      return;
    }
    
    setSelectedStock(stock);
    setTransferQuantity('');
    setShowQuantityModal(true);
  };

  const handleAddItem = () => {
    if (!selectedStock) {
      return;
    }

    const quantity = parseFloat(transferQuantity);
    const isIntegerUnit = selectedStock.unit_display === 'шт.';
    const minValue = isIntegerUnit ? 1 : 0.001;
    
    if (!quantity || quantity < minValue) {
      alert(`Укажите количество (минимум: ${minValue} ${selectedStock.unit_display || 'шт.'})`);
      return;
    }
    
    // Для "шт." проверяем, что это целое число
    if (isIntegerUnit && !Number.isInteger(quantity)) {
      alert('Для товара в штуках можно указать только целое число');
      return;
    }

    // Максимальное количество для перемещения = все, что не продано
    // available_quantity + reserved_quantity + defect_quantity
    const availableQty = parseFloat(selectedStock.available_quantity || 0);
    const reservedQty = parseFloat(selectedStock.reserved_quantity || 0);
    const defectQty = parseFloat(selectedStock.defect_quantity || 0);
    const maxTransferable = availableQty + reservedQty + defectQty;
    const totalQty = parseFloat(selectedStock.quantity || 0);
    
    // Можно перемещать только то, что не продано
    if (quantity > maxTransferable) {
      alert(
        `Недостаточно количества для перемещения. ` +
        `Доступно для перемещения: ${maxTransferable} ${selectedStock.unit_display || 'шт.'} ` +
        `(доступно: ${availableQty}, резерв: ${reservedQty}, брак: ${defectQty})`
      );
      return;
    }

    const newItem = {
      stock_id: selectedStock.id,
      stock: selectedStock,
      quantity: quantity,
      notes: '',
      variant_name: selectedStock.variant_name,
      variant_data: selectedStock.variant_data,
      available_quantity: availableQty,
      reserved_quantity: reservedQty,
      defect_quantity: defectQty,
      total_quantity: totalQty,
      max_transferable: maxTransferable,
      batch_number: selectedStock.batch_number || 'Без партии',
      location_name: selectedStock.location_name,
      unit_display: selectedStock.unit_display || 'шт.',
    };

    setItems([...items, newItem]);
    setSelectedStock(null);
    setTransferQuantity('');
    setShowQuantityModal(false);
  };

  const handleCloseQuantityModal = () => {
    setShowQuantityModal(false);
    setSelectedStock(null);
    setTransferQuantity('');
  };


  const updateItem = (index, field, value) => {
    const newItems = [...items];
    const item = newItems[index];
    
    if (field === 'quantity') {
      const isIntegerUnit = item.unit_display === 'шт.';
      
      // Если значение не пустое, проверяем валидность
      if (value !== '') {
        const qty = parseFloat(value);
        
        // Для "шт." проверяем, что это целое число
        if (isIntegerUnit && !isNaN(qty) && !Number.isInteger(qty)) {
          // Автоматически округляем до целого
          const rounded = Math.floor(qty);
          value = rounded > 0 ? rounded.toString() : '1';
        }
        
        // Проверяем максимальное количество
        if (!isNaN(qty)) {
          const maxTransferable = parseFloat(item.max_transferable || 0);
          if (qty > maxTransferable) {
            const availableQty = parseFloat(item.available_quantity || 0);
            const reservedQty = parseFloat(item.reserved_quantity || 0);
            const defectQty = parseFloat(item.defect_quantity || 0);
            alert(
              `Недостаточно количества для перемещения. ` +
              `Доступно для перемещения: ${maxTransferable} ${item.unit_display || 'шт.'} ` +
              `(доступно: ${availableQty}, резерв: ${reservedQty}, брак: ${defectQty})`
            );
            return;
          }
        }
      }
    }
    
    newItems[index] = {
      ...item,
      [field]: value
    };
    setItems(newItems);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.from_location || !formData.to_location) {
      alert('Выберите склад-источник и склад-получатель');
      return;
    }

    if (formData.from_location === formData.to_location) {
      alert('Склад-источник и склад-получатель не могут совпадать');
      return;
    }

    if (items.length === 0) {
      alert('Добавьте хотя бы один товар в перемещение');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        from_location: parseInt(formData.from_location),
        to_location: parseInt(formData.to_location),
        notes: formData.notes || '',
        items: items.map(item => ({
          stock_id: item.stock_id,
          quantity: parseFloat(item.quantity),
          notes: item.notes || ''
        }))
      };

      if (isEditMode) {
        // Обновляем существующее перемещение
        await axios.patch(
          `/api/business/${business_slug}/transfers/${transferId}/update/`,
          payload
        );
      } else {
        // Создаем новое перемещение
        await axios.post(
          `/api/business/${business_slug}/transfers/create/`,
          payload
        );
      }

      // Перенаправляем на страницу управления партиями с вкладкой перемещений
      navigate(`/business/${business_slug}/batches?tab=transfers`);
    } catch (err) {
      console.error(`Ошибка ${isEditMode ? 'обновления' : 'создания'} перемещения:`, err);
      const errorMessage = err.response?.data?.detail || 
        err.response?.data?.items || 
        `Не удалось ${isEditMode ? 'обновить' : 'создать'} перемещение`;
      alert(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
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
      await axios.post(`/api/business/${business_slug}/transfers/${transferId}/complete/`);
      navigate(`/business/${business_slug}/batches?tab=transfers`);
    } catch (err) {
      console.error('Ошибка проведения перемещения:', err);
      alert(err.response?.data?.detail || 'Не удалось провести перемещение');
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

    setUploadingDocument(true);
    try {
      const formData = new FormData();
      formData.append('document', newDocument.document);
      formData.append('name', newDocument.name);
      if (newDocument.description) {
        formData.append('description', newDocument.description);
      }

      const response = await axios.post(
        `/api/business/${business_slug}/transfers/${transferId}/add-document/`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      setDocuments([...documents, response.data]);
      setNewDocument({ document: null, name: '', description: '' });
      document.getElementById('documentUpload').value = '';
    } catch (err) {
      console.error('Ошибка загрузки документа:', err);
      alert(err.response?.data?.detail || 'Не удалось загрузить документ');
    } finally {
      setUploadingDocument(false);
    }
  };

  const handleDeleteDocument = async (documentId) => {
    if (!confirm('Вы уверены, что хотите удалить этот документ?')) {
      return;
    }

    try {
      await axios.delete(
        `/api/business/${business_slug}/transfers/${transferId}/delete-document/${documentId}/`
      );
      setDocuments(documents.filter(doc => doc.id !== documentId));
    } catch (err) {
      console.error('Ошибка удаления документа:', err);
      alert(err.response?.data?.detail || 'Не удалось удалить документ');
    }
  };

  const handleRemoveItem = async (index) => {
    const item = items[index];
    
    // Если это режим редактирования и у позиции есть ID, удаляем через API
    if (isEditMode && item.id) {
      if (!confirm('Вы уверены, что хотите удалить эту позицию из перемещения?')) {
        return;
      }
      
      try {
        await axios.delete(
          `/api/business/${business_slug}/transfers/${transferId}/remove-item/${item.id}/`
        );
        setItems(items.filter((_, i) => i !== index));
      } catch (err) {
        console.error('Ошибка удаления позиции:', err);
        alert(err.response?.data?.detail || 'Не удалось удалить позицию');
      }
    } else {
      // Просто удаляем из локального состояния
      setItems(items.filter((_, i) => i !== index));
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button
          className={styles.backButton}
          onClick={() => navigate(`/business/${business_slug}/batches?tab=transfers`)}
        >
          <FaArrowLeft />
          <span>Назад</span>
        </button>
        <h1 className={styles.title}>
          <FaTruck className={styles.titleIcon} />
          {isEditMode ? `Редактирование перемещения ${transferData?.transfer_number || ''}` : 'Создание перемещения'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formSection}>
          <h2 className={styles.sectionTitle}>Информация о перемещении</h2>
          
          {locations.length === 0 ? (
            <div className={styles.emptyMessage}>
              <p>Не найдено складов для перемещения.</p>
              <p>Создайте склады с типом локации, где is_warehouse = true.</p>
            </div>
          ) : (
            <>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Склад-источник *</label>
                  <select
                    value={formData.from_location}
                    onChange={(e) => handleInputChange('from_location', e.target.value)}
                    required
                    disabled={loading || isEditMode}
                  >
                    <option value="">Выберите склад</option>
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} {loc.city_detail ? `(${loc.city_detail.name})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Склад-получатель *</label>
                  <select
                    value={formData.to_location}
                    onChange={(e) => handleInputChange('to_location', e.target.value)}
                    required
                    disabled={loading || !formData.from_location || isEditMode}
                  >
                    <option value="">Выберите склад</option>
                    {locations
                      .filter(loc => {
                        const fromId = formData.from_location ? parseInt(formData.from_location) : null;
                        return fromId ? loc.id !== fromId : true;
                      })
                      .map(loc => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name} {loc.city_detail ? `(${loc.city_detail.name})` : ''}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </>
          )}

          <div className={styles.formGroup}>
            <label>Примечания</label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Дополнительная информация о перемещении..."
              rows={3}
              disabled={loading}
            />
          </div>
        </div>

        {formData.from_location && (
          <div className={styles.formSection}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Товары для перемещения</h2>
              {availableStocks.length > 0 && (
                <button
                  type="button"
                  className={styles.toggleButton}
                  onClick={() => setShowStocksList(!showStocksList)}
                  title={showStocksList ? 'Скрыть товары' : 'Показать товары'}
                >
                  {showStocksList ? (
                    <>
                      <FaChevronUp />
                      <span>Скрыть</span>
                    </>
                  ) : (
                    <>
                      <FaChevronDown />
                      <span>Показать</span>
                    </>
                  )}
                </button>
              )}
            </div>
            
            {availableStocks.length === 0 ? (
              <div className={styles.emptyItems}>
                <p>На этом складе нет товаров доступных для перемещения</p>
                <p className={styles.emptySubtext}>
                  Доступными считаются товары с available_quantity &gt; 0 или имеющие резервы/брак
                </p>
              </div>
            ) : (
              <>
                {showStocksList && (
                  <div className={styles.stocksGrid}>
                  {availableStocks
                    .filter(stock => !items.some(item => item.stock_id === stock.id))
                    .map(stock => {
                      const availableQty = parseFloat(stock.available_quantity || 0);
                      const reservedQty = parseFloat(stock.reserved_quantity || 0);
                      const defectQty = parseFloat(stock.defect_quantity || 0);
                      const totalQty = parseFloat(stock.quantity || 0);
                      const maxTransferable = availableQty + reservedQty + defectQty;
                      const unit = stock.unit_display || 'шт.';
                      
                      return (
                        <div
                          key={stock.id}
                          className={styles.stockCard}
                          onClick={() => handleStockClick(stock)}
                        >
                          {stock.variant_data?.main_image?.image ? (
                            <img
                              src={getFileUrl(stock.variant_data.main_image.image)}
                              alt={stock.variant_name}
                              className={styles.stockImage}
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'https://via.placeholder.com/200x280?text=No+Image';
                              }}
                            />
                          ) : (
                            <div className={styles.stockNoImage}>
                              <FaTruck size={24} />
                            </div>
                          )}
                          
                          <div className={styles.stockInfo}>
                            <h4 className={styles.stockName}>{stock.variant_name}</h4>
                            <p className={styles.stockBatch}>
                              Партия: {stock.batch_number || 'Без партии'}
                            </p>
                            
                            <div className={styles.stockQuantities}>
                              <div className={styles.quantityRow}>
                                <span className={styles.quantityLabel}>Всего:</span>
                                <span className={styles.quantityValue}>{totalQty} {unit}</span>
                              </div>
                              {maxTransferable > 0 && (
                                <div className={styles.quantityRow}>
                                  <span className={styles.quantityLabel}>Можно переместить:</span>
                                  <span className={styles.quantityValueAvailable} style={{ fontWeight: 700 }}>
                                    {maxTransferable} {unit}
                                  </span>
                                </div>
                              )}
                              {availableQty > 0 && (
                                <div className={styles.quantityRow}>
                                  <span className={styles.quantityLabel}>Доступно:</span>
                                  <span className={styles.quantityValueAvailable}>{availableQty} {unit}</span>
                                </div>
                              )}
                              {reservedQty > 0 && (
                                <div className={styles.quantityRow}>
                                  <span className={styles.quantityLabel}>Резерв:</span>
                                  <span className={styles.quantityValueReserved}>{reservedQty} {unit}</span>
                                </div>
                              )}
                              {defectQty > 0 && (
                                <div className={styles.quantityRow}>
                                  <span className={styles.quantityLabel}>Брак:</span>
                                  <span className={styles.quantityValueDefect}>{defectQty} {unit}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className={styles.stockAction}>
                            <FaPlus className={styles.addIcon} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {!showStocksList && (
                  <div className={styles.collapsedMessage}>
                    <p>Список товаров скрыт. Нажмите "Показать" для просмотра доступных товаров.</p>
                    <p className={styles.collapsedCount}>
                      Доступно товаров: {availableStocks.filter(stock => !items.some(item => item.stock_id === stock.id)).length}
                    </p>
                  </div>
                )}
              </>
            )}

            {items.length > 0 && (
              <div className={styles.itemsList}>
                {items.map((item, index) => (
                  <div key={index} className={styles.itemCard}>
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
                            Партия: {item.batch_number}
                          </p>
                          <div className={styles.itemQuantities}>
                            <span>Всего: {item.total_quantity} {item.unit_display || 'шт.'}</span>
                            {item.available_quantity > 0 && (
                              <span className={styles.availableBadge}>
                                Доступно: {item.available_quantity}
                              </span>
                            )}
                            {item.reserved_quantity > 0 && (
                              <span className={styles.reservedBadge}>
                                Резерв: {item.reserved_quantity}
                              </span>
                            )}
                            {item.defect_quantity > 0 && (
                              <span className={styles.defectBadge}>
                                Брак: {item.defect_quantity}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className={styles.removeButton}
                        onClick={() => handleRemoveItem(index)}
                        disabled={loading}
                      >
                        <FaTrash />
                      </button>
                    </div>
                    
                    <div className={styles.itemControls}>
                      <div className={styles.formGroup}>
                        <label>
                          Количество для перемещения (макс: {item.max_transferable} {item.unit_display || 'шт.'})
                        </label>
                        <div className={styles.quantityInputWrapper}>
                          <input
                            type="number"
                            step={item.unit_display === 'шт.' ? "1" : "0.001"}
                            min={item.unit_display === 'шт.' ? "1" : "0.001"}
                            max={item.max_transferable}
                            value={item.quantity}
                            onChange={(e) => {
                              const value = e.target.value;
                              const isIntegerUnit = item.unit_display === 'шт.';
                              
                              if (value === '') {
                                updateItem(index, 'quantity', value);
                                return;
                              }
                              
                              // Для "шт." разрешаем только целые числа
                              if (isIntegerUnit) {
                                // Разрешаем только целые числа (без точки и дробной части)
                                if (/^\d+$/.test(value)) {
                                  updateItem(index, 'quantity', value);
                                }
                              } else {
                                // Для других единиц разрешаем дробные числа
                                if (/^\d*\.?\d*$/.test(value)) {
                                  updateItem(index, 'quantity', value);
                                }
                              }
                            }}
                            onBlur={(e) => {
                              const value = parseFloat(e.target.value);
                              const isIntegerUnit = item.unit_display === 'шт.';
                              const minValue = isIntegerUnit ? 1 : 0.001;
                              
                              if (isNaN(value) || value < minValue) {
                                updateItem(index, 'quantity', minValue.toString());
                              } else {
                                const maxTransferable = parseFloat(item.max_transferable || 0);
                                const finalValue = Math.min(value, maxTransferable);
                                
                                // Для "шт." округляем до целого, для других - до 3 знаков
                                if (isIntegerUnit) {
                                  const rounded = Math.floor(finalValue);
                                  updateItem(index, 'quantity', Math.max(1, rounded).toString());
                                } else {
                                  const rounded = Math.round(finalValue / 0.001) * 0.001;
                                  updateItem(index, 'quantity', Math.max(0.001, rounded).toFixed(3).replace(/\.?0+$/, ''));
                                }
                              }
                            }}
                            disabled={loading}
                            className={styles.quantityInput}
                          />
                          <span className={styles.unitLabel}>{item.unit_display || 'шт.'}</span>
                        </div>
                        <small className={styles.helpText}>
                          {item.unit_display === 'шт.' 
                            ? 'Для товара в штуках можно указать только целое число. При перемещении резервы и брак будут перемещены пропорционально.'
                            : 'При перемещении резервы и брак будут перемещены пропорционально'}
                        </small>
                      </div>
                      
                      <div className={styles.formGroup}>
                        <label>Примечание к позиции</label>
                        <input
                          type="text"
                          value={item.notes}
                          onChange={(e) => updateItem(index, 'notes', e.target.value)}
                          placeholder="Опционально"
                          disabled={loading}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {items.length === 0 && formData.from_location && (
              <div className={styles.emptyItems}>
                <p>Добавьте товары для перемещения</p>
              </div>
            )}
          </div>
        )}

        {/* Секция документов */}
        {isEditMode && (
          <div className={styles.formSection}>
            <h2 className={styles.sectionTitle}>Документы</h2>
            
            {documents.length > 0 && (
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
                          Загрузил: {doc.uploaded_by_name} • {new Date(doc.uploaded_at).toLocaleDateString('ru-RU')}
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
                          <FaDownload />
                        </a>
                      )}
                      <button
                        className={styles.deleteDocumentButton}
                        onClick={() => handleDeleteDocument(doc.id)}
                        title="Удалить"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className={styles.addDocumentSection}>
              <div className={styles.formGroup}>
                <label>Название документа *</label>
                <input
                  type="text"
                  value={newDocument.name}
                  onChange={(e) => setNewDocument(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Например: Накладная, Акт перемещения"
                  disabled={uploadingDocument}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Описание (опционально)</label>
                <input
                  type="text"
                  value={newDocument.description}
                  onChange={(e) => setNewDocument(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Дополнительная информация"
                  disabled={uploadingDocument}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Файл *</label>
                <input
                  type="file"
                  id="documentUpload"
                  onChange={handleDocumentFileSelect}
                  disabled={uploadingDocument}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                />
              </div>
              <button
                type="button"
                className={styles.addDocumentButton}
                onClick={handleAddDocument}
                disabled={uploadingDocument || !newDocument.document || !newDocument.name}
              >
                {uploadingDocument ? <Loader /> : <><FaPlus /> Добавить документ</>}
              </button>
            </div>
          </div>
        )}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={() => navigate(`/business/${business_slug}/batches?tab=transfers`)}
            disabled={loading}
          >
            Отмена
          </button>
          {isEditMode && transferData?.status === 'draft' && (
            <button
              type="button"
              className={styles.completeButton}
              onClick={handleCompleteTransfer}
              disabled={loading || items.length === 0}
            >
              {loading ? <Loader /> : <><FaCheck /> Провести перемещение</>}
            </button>
          )}
          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading || items.length === 0 || !formData.from_location || !formData.to_location}
          >
            {loading ? <Loader /> : (isEditMode ? 'Сохранить изменения' : 'Создать перемещение')}
          </button>
        </div>
      </form>

      {/* Модальное окно для указания количества */}
      {showQuantityModal && selectedStock && (
        <div className={styles.modalOverlay} onClick={handleCloseQuantityModal}>
          <div className={styles.quantityModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Укажите количество для перемещения</h3>
              <button
                type="button"
                className={styles.modalCloseButton}
                onClick={handleCloseQuantityModal}
              >
                <FaTimes />
              </button>
            </div>
            
            <div className={styles.modalContent}>
              <div className={styles.modalStockInfo}>
                {selectedStock.variant_data?.main_image?.image ? (
                  <img
                    src={getFileUrl(selectedStock.variant_data.main_image.image)}
                    alt={selectedStock.variant_name}
                    className={styles.modalStockImage}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://via.placeholder.com/80x112?text=No+Image';
                    }}
                  />
                ) : (
                  <div className={styles.modalStockNoImage}>
                    <FaTruck size={32} />
                  </div>
                )}
                <div>
                  <h4>{selectedStock.variant_name}</h4>
                  <p>Партия: {selectedStock.batch_number || 'Без партии'}</p>
                </div>
              </div>
              
              <div className={styles.modalQuantities}>
                <div className={styles.quantityInfo}>
                  <span>Всего на складе:</span>
                  <strong>{parseFloat(selectedStock.quantity || 0)} {selectedStock.unit_display || 'шт.'}</strong>
                </div>
                {(() => {
                  const availableQty = parseFloat(selectedStock.available_quantity || 0);
                  const reservedQty = parseFloat(selectedStock.reserved_quantity || 0);
                  const defectQty = parseFloat(selectedStock.defect_quantity || 0);
                  const maxTransferable = availableQty + reservedQty + defectQty;
                  
                  return maxTransferable > 0 ? (
                    <div className={styles.quantityInfo} style={{ borderTop: '2px solid var(--royal-emerald)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                      <span>Можно переместить:</span>
                      <strong className={styles.availableText} style={{ fontSize: '1.1rem' }}>
                        {maxTransferable} {selectedStock.unit_display || 'шт.'}
                      </strong>
                    </div>
                  ) : null;
                })()}
                {parseFloat(selectedStock.available_quantity || 0) > 0 && (
                  <div className={styles.quantityInfo}>
                    <span>Доступно:</span>
                    <strong className={styles.availableText}>
                      {parseFloat(selectedStock.available_quantity || 0)} {selectedStock.unit_display || 'шт.'}
                    </strong>
                  </div>
                )}
                {parseFloat(selectedStock.reserved_quantity || 0) > 0 && (
                  <div className={styles.quantityInfo}>
                    <span>В резерве:</span>
                    <strong className={styles.reservedText}>
                      {parseFloat(selectedStock.reserved_quantity || 0)} {selectedStock.unit_display || 'шт.'}
                    </strong>
                  </div>
                )}
                {parseFloat(selectedStock.defect_quantity || 0) > 0 && (
                  <div className={styles.quantityInfo}>
                    <span>Брак:</span>
                    <strong className={styles.defectText}>
                      {parseFloat(selectedStock.defect_quantity || 0)} {selectedStock.unit_display || 'шт.'}
                    </strong>
                  </div>
                )}
              </div>
              
              <div className={styles.modalFormGroup}>
                <label>
                  Количество для перемещения (макс: {parseFloat(selectedStock.available_quantity || 0) + parseFloat(selectedStock.reserved_quantity || 0) + parseFloat(selectedStock.defect_quantity || 0)} {selectedStock.unit_display || 'шт.'})
                </label>
                <div className={styles.quantityInputWrapper}>
                  <input
                    type="number"
                    step={selectedStock.unit_display === 'шт.' ? "1" : "0.001"}
                    min={selectedStock.unit_display === 'шт.' ? "1" : "0.001"}
                    max={parseFloat(selectedStock.available_quantity || 0) + parseFloat(selectedStock.reserved_quantity || 0) + parseFloat(selectedStock.defect_quantity || 0)}
                    value={transferQuantity}
                    onChange={(e) => {
                      const value = e.target.value;
                      const isIntegerUnit = selectedStock.unit_display === 'шт.';
                      
                      if (value === '') {
                        setTransferQuantity(value);
                        return;
                      }
                      
                      // Для "шт." разрешаем только целые числа
                      if (isIntegerUnit) {
                        // Разрешаем только целые числа (без точки и дробной части)
                        if (/^\d+$/.test(value)) {
                          setTransferQuantity(value);
                        }
                      } else {
                        // Для других единиц разрешаем дробные числа
                        if (/^\d*\.?\d*$/.test(value)) {
                          setTransferQuantity(value);
                        }
                      }
                    }}
                    onBlur={(e) => {
                      const value = parseFloat(e.target.value);
                      const isIntegerUnit = selectedStock.unit_display === 'шт.';
                      const minValue = isIntegerUnit ? 1 : 0.001;
                      
                      if (isNaN(value) || value < minValue) {
                        setTransferQuantity('');
                      } else {
                        const maxTransferable = parseFloat(selectedStock.available_quantity || 0) + parseFloat(selectedStock.reserved_quantity || 0) + parseFloat(selectedStock.defect_quantity || 0);
                        const finalValue = Math.min(value, maxTransferable);
                        
                        // Для "шт." округляем до целого, для других - до 3 знаков
                        if (isIntegerUnit) {
                          const rounded = Math.floor(finalValue);
                          setTransferQuantity(Math.max(1, rounded).toString());
                        } else {
                          const rounded = Math.round(finalValue / 0.001) * 0.001;
                          setTransferQuantity(Math.max(0.001, rounded).toFixed(3).replace(/\.?0+$/, ''));
                        }
                      }
                    }}
                    autoFocus
                    placeholder="0"
                    className={styles.quantityInput}
                  />
                  <span className={styles.unitLabel}>{selectedStock.unit_display || 'шт.'}</span>
                </div>
                <small className={styles.helpText}>
                  {selectedStock.unit_display === 'шт.' 
                    ? 'Для товара в штуках можно указать только целое число. При перемещении резервы и брак будут перемещены пропорционально количеству.'
                    : 'При перемещении резервы и брак будут перемещены пропорционально количеству'}
                </small>
              </div>
            </div>
            
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalCancelButton}
                onClick={handleCloseQuantityModal}
              >
                Отмена
              </button>
              <button
                type="button"
                className={styles.modalAddButton}
                onClick={handleAddItem}
                disabled={!transferQuantity || parseFloat(transferQuantity) <= 0}
              >
                <FaPlus />
                <span>Добавить</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateTransferPage;

