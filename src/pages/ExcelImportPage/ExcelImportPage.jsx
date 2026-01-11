import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExcelImport } from '../../hooks/useExcelImport';
import { useFileUtils } from '../../hooks/useFileUtils';
import { FaFileExcel, FaUpload, FaCheckCircle, FaExclamationCircle, FaSpinner, FaTimes, FaImage, FaGripVertical } from 'react-icons/fa';
import styles from './ExcelImportPage.module.css';
import Loader from '../../components/Loader';
import ImageCropper from '../../components/ImageCropper/ImageCropper';

const ExcelImportPage = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { getFileUrl } = useFileUtils();
  
  // Состояния для выпадающих списков с поиском (для каждого товара)
  const [categoryDropdowns, setCategoryDropdowns] = useState({});
  const [locationDropdowns, setLocationDropdowns] = useState({});
  const [categorySearchTerms, setCategorySearchTerms] = useState({});
  const [locationSearchTerms, setLocationSearchTerms] = useState({});
  
  // Состояния для обрезки изображений (для каждого товара)
  const [croppingData, setCroppingData] = useState({ productIndex: null, files: [], currentIndex: 0 });
  const {
    excelFile,
    parsedProducts,
    categories,
    locations,
    unitsOfMeasure,
    categoryAttributes,
    loading,
    parsing,
    importing,
    error,
    success,
    handleFileSelect,
    parseExcelFile,
          updateProductData,
          addProductImages,
          removeProductImage,
          reorderProductImages,
          removeProduct,
          importProducts,
          fetchCategoryAttributes,
    getUnitByCode,
    getCategoryById,
    getLocationById,
    setError,
    setSuccess,
    clearData,
    importErrors
  } = useExcelImport();

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  // Функции для работы с выпадающими списками категорий
  const toggleCategoryDropdown = (index) => {
    setCategoryDropdowns(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
    // Закрываем другие выпадающие списки
    setLocationDropdowns(prev => ({ ...prev, [index]: false }));
  };

  const handleCategorySelect = async (index, categoryId) => {
    // Сбрасываем атрибуты только если меняется категория
    const currentProduct = parsedProducts[index];
    if (currentProduct?.category_id !== categoryId) {
      updateProductData(index, { category_id: categoryId || null, attributes: {} });
    } else {
      updateProductData(index, { category_id: categoryId || null });
    }
    setCategoryDropdowns(prev => ({ ...prev, [index]: false }));
    setCategorySearchTerms(prev => ({ ...prev, [index]: '' }));
    
    // Загружаем атрибуты категории, если выбрана
    if (categoryId) {
      await fetchCategoryAttributes(categoryId);
    }
  };

  const setCategorySearchTerm = (index, term) => {
    setCategorySearchTerms(prev => ({ ...prev, [index]: term }));
  };

  // Функции для работы с выпадающими списками локаций
  const toggleLocationDropdown = (index) => {
    setLocationDropdowns(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
    // Закрываем другие выпадающие списки
    setCategoryDropdowns(prev => ({ ...prev, [index]: false }));
  };

  const handleLocationSelect = (index, locationId) => {
    updateProductData(index, { location_id: locationId || null });
    setLocationDropdowns(prev => ({ ...prev, [index]: false }));
    setLocationSearchTerms(prev => ({ ...prev, [index]: '' }));
  };

  const setLocationSearchTerm = (index, term) => {
    setLocationSearchTerms(prev => ({ ...prev, [index]: term }));
  };

  // Обработчик клика вне выпадающего списка
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(`[data-dropdown-container]`)) {
        setCategoryDropdowns({});
        setLocationDropdowns({});
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Автоматическая установка предустановленных значений атрибутов
  useEffect(() => {
    if (!parsedProducts.length || !categoryAttributes) return;

    parsedProducts.forEach((product, index) => {
      if (!product.category_id || !categoryAttributes[product.category_id]) return;

      const attrs = categoryAttributes[product.category_id];
      const currentAttributes = product.attributes || {};
      let hasChanges = false;
      const newAttributes = { ...currentAttributes };

      attrs.forEach(attr => {
        // Если у атрибута есть предустановленные значения и значение еще не установлено
        if (attr.has_predefined_values && attr.values && attr.values.length > 0) {
          const attrId = attr.id;
          // Проверяем и как число, и как строку для совместимости
          const currentValue = currentAttributes[attrId] || currentAttributes[String(attrId)];
          
          // Устанавливаем первое значение, если значение еще не установлено или пустое
          if (!currentValue || currentValue === '' || currentValue === null || currentValue === undefined) {
            const firstValue = attr.values[0];
            if (firstValue) {
              newAttributes[attrId] = String(firstValue.id);
              hasChanges = true;
            }
          }
        }
      });

      if (hasChanges) {
        updateProductData(index, { attributes: newAttributes });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryAttributes, parsedProducts.length, updateProductData]); // Зависимости: categoryAttributes и длина массива товаров

  // Функции для фильтрации опций
  const getFilteredCategories = (index) => {
    const searchTerm = (categorySearchTerms[index] || '').toLowerCase();
    if (!searchTerm) return categories;
    return categories.filter(cat => 
      (cat.full_path || cat.name).toLowerCase().includes(searchTerm)
    );
  };

  const getFilteredLocations = (index) => {
    const searchTerm = (locationSearchTerms[index] || '').toLowerCase();
    if (!searchTerm) return locations;
    return locations.filter(loc => 
      loc.name.toLowerCase().includes(searchTerm)
    );
  };

  // Получение названия выбранной категории/локации
  const getCategoryName = (categoryId) => {
    if (!categoryId) return 'Выберите категорию';
    const category = categories.find(cat => cat.id === categoryId);
    return category ? (category.full_path || category.name) : 'Выберите категорию';
  };

  const getLocationName = (locationId) => {
    if (!locationId) return 'Выберите локацию';
    const location = locations.find(loc => loc.id === locationId);
    return location ? location.name : 'Выберите локацию';
  };

  // Обработчики для обрезки изображений
  const handleImageFileSelect = (productIndex, files) => {
    if (files.length > 0) {
      setCroppingData({
        productIndex,
        files: Array.from(files),
        currentIndex: 0
      });
      document.body.classList.add(styles.bodyNoScroll);
    }
  };

  const handleCropComplete = (croppedFile, index) => {
    const { productIndex, files } = croppingData;
    if (productIndex === null) return;

    // Добавляем обрезанное изображение
    addProductImages(productIndex, [croppedFile]);

    // Если это последнее изображение, закрываем модалку
    if (index === files.length - 1) {
      setCroppingData({ productIndex: null, files: [], currentIndex: 0 });
      document.body.classList.remove(styles.bodyNoScroll);
    }
  };

  const handleCancelCropping = () => {
    setCroppingData({ productIndex: null, files: [], currentIndex: 0 });
    document.body.classList.remove(styles.bodyNoScroll);
  };

  const handleNextImage = () => {
    setCroppingData(prev => ({
      ...prev,
      currentIndex: prev.currentIndex + 1
    }));
  };

  const handlePreviousImage = () => {
    setCroppingData(prev => ({
      ...prev,
      currentIndex: prev.currentIndex - 1
    }));
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loaderContainer}>
          <Loader />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {croppingData.files.length > 0 && croppingData.productIndex !== null && (
        <div className={styles.cropModal}>
          <ImageCropper
            files={croppingData.files}
            currentIndex={croppingData.currentIndex}
            onCropComplete={handleCropComplete}
            onCancel={handleCancelCropping}
            onNext={handleNextImage}
            onPrevious={handlePreviousImage}
          />
        </div>
      )}
      <div className={styles.content}>
        <h1 className={styles.pageTitle}>
          <FaFileExcel className={styles.titleIcon} />
          Импорт товаров из Excel
        </h1>

        {/* Загрузка файла */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h5>
              <FaUpload className={styles.sectionIcon} />
              Загрузка файла
            </h5>
          </div>
          <div className={styles.sectionBody}>
            {!excelFile && !parsedProducts.length && (
              <div
                className={styles.uploadArea}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
              >
                <FaFileExcel className={styles.uploadIcon} />
                <h3>Перетащите Excel файл сюда</h3>
                <p>или нажмите для выбора файла</p>
                <p className={styles.uploadHint}>Поддерживаются файлы .xlsx, .xls</p>
              </div>
            )}

            {excelFile && (
              <div className={styles.fileInfo}>
                <div className={styles.fileName}>
                  <FaFileExcel />
                  {excelFile.name}
                </div>
                <div className={styles.fileActions}>
                  <button
                    className={styles.btnSecondary}
                    onClick={() => {
                      clearData();
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                  >
                    <FaTimes /> Удалить
                  </button>
                  {!parsedProducts.length && (
                    <button
                      className={styles.btnPrimary}
                      onClick={parseExcelFile}
                      disabled={parsing}
                    >
                      {parsing ? (
                        <>
                          <FaSpinner className={styles.spin} /> Парсинг...
                        </>
                      ) : (
                        <>
                          <FaUpload /> Парсить файл
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileInputChange}
              style={{ display: 'none' }}
            />
          </div>
        </div>

        {/* Сообщения об ошибках/успехе */}
        {error && (
          <div className={styles.alertError}>
            <FaExclamationCircle />
            <span>{error}</span>
            <button onClick={() => setError(null)}>
              <FaTimes />
            </button>
          </div>
        )}

        {success && (
          <div className={styles.alertSuccess}>
            <FaCheckCircle />
            <span>{success}</span>
            <button onClick={() => setSuccess(null)}>
              <FaTimes />
            </button>
          </div>
        )}

        {/* Список товаров после парсинга */}
        {parsedProducts.length > 0 && (
          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <h5>
                Найдено товаров: {parsedProducts.length}
              </h5>
            </div>
            <div className={styles.sectionBody}>
              <div className={styles.productsList}>
                {parsedProducts.map((product, index) => {
                  const productErrors = importErrors[index] || [];
                  // Определяем, является ли единица измерения целочисленной
                  const currentUnit = getUnitByCode(product.main_unit);
                  const isIntegerUnit = currentUnit ? (() => {
                    const unitCode = (currentUnit.code || '').toLowerCase();
                    const integerUnitCodes = ['pcs', 'шт', 'кор', 'уп', 'box', 'pack'];
                    if (integerUnitCodes.includes(unitCode)) {
                      return true;
                    }
                    // Проверяем по названию
                    const unitName = (currentUnit.name || '').toLowerCase();
                    const integerKeywords = ['шт', 'штук', 'коробк', 'упаковк'];
                    return integerKeywords.some(keyword => unitName.includes(keyword));
                  })() : false;
                  
                  return (
                  <div key={index} className={`${styles.productCard} ${productErrors.length > 0 ? styles.productCardError : ''}`}>
                    {productErrors.length > 0 && (
                      <div className={styles.productErrors}>
                        <FaExclamationCircle />
                        <div className={styles.productErrorsList}>
                          {productErrors.map((errorMsg, errIndex) => (
                            <div key={errIndex} className={styles.productErrorItem}>
                              {errorMsg}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className={styles.productHeader}>
                      <h4>Товар {index + 1}</h4>
                      <button
                        type="button"
                        className={styles.removeProductButton}
                        onClick={() => removeProduct(index)}
                        disabled={importing}
                        title="Удалить товар из списка"
                      >
                        <FaTimes />
                      </button>
                    </div>
                    <div className={styles.productBody}>
                      <div className={styles.formRow}>
                        <label>Наименование *</label>
                        <input
                          type="text"
                          value={product.name || ''}
                          onChange={(e) => updateProductData(index, { name: e.target.value })}
                          placeholder="Введите наименование товара"
                        />
                      </div>

                      <div className={styles.formRow}>
                        <label>Артикул (SKU)</label>
                        <input
                          type="text"
                          value={product.article || ''}
                          onChange={(e) => updateProductData(index, { article: e.target.value })}
                          placeholder="Введите артикул (SKU)"
                          disabled={parsedProducts.length > 0}
                          style={parsedProducts.length > 0 ? { cursor: 'not-allowed', backgroundColor: '#f5f5f5' } : {}}
                          title={parsedProducts.length > 0 ? 'Артикул нельзя изменить после парсинга' : ''}
                        />
                      </div>

                      <div className={styles.formRow}>
                        <label>Штрих-код (EAN-13)</label>
                        {product.barcode_from_existing ? (
                          // Если штрих-код уже есть у существующего товара - только отображение
                          <input
                            type="text"
                            value={product.barcode || ''}
                            disabled
                            style={{ cursor: 'not-allowed', backgroundColor: '#f5f5f5' }}
                            placeholder="Штрих-код из существующего товара"
                          />
                        ) : (
                          // Если товара нет или штрих-кода нет - можно выбрать способ ввода
                          <div className={styles.barcodeInputContainer}>
                            <div className={styles.toggleSwitch}>
                              <input
                                type="checkbox"
                                checked={product.use_auto_barcode !== false}
                                onChange={(e) => updateProductData(index, { use_auto_barcode: e.target.checked })}
                              />
                              <span className={styles.slider}></span>
                              <span className={styles.toggleLabel}>
                                {product.use_auto_barcode !== false ? 'Автоматически генерируется' : 'Вводим вручную'}
                              </span>
                            </div>
                            <input
                              type="text"
                              value={product.barcode || ''}
                              onChange={(e) => updateProductData(index, { barcode: e.target.value })}
                              disabled={product.use_auto_barcode !== false}
                              style={product.use_auto_barcode !== false ? { cursor: 'not-allowed', backgroundColor: '#f5f5f5' } : {}}
                              placeholder={product.use_auto_barcode !== false ? 'Автоматически генерируется' : 'Введите штрих-код (EAN-13)'}
                            />
                          </div>
                        )}
                      </div>

                      <div className={styles.formRow}>
                        <label>Категория *</label>
                        <div className={styles.dropdownContainer} data-dropdown-container>
                          <div 
                            className={styles.dropdownButton}
                            onClick={() => toggleCategoryDropdown(index)}
                          >
                            <span>{getCategoryName(product.category_id)}</span>
                            <i className={`fa fa-chevron-${categoryDropdowns[index] ? 'up' : 'down'}`}></i>
                          </div>
                          {categoryDropdowns[index] && (
                            <div className={styles.dropdown}>
                              <div className={styles.searchInputContainer}>
                                 
                                <input
                                  type="text"
                                  placeholder="Поиск категорий..."
                                  value={categorySearchTerms[index] || ''}
                                  onChange={(e) => setCategorySearchTerm(index, e.target.value)}
                                  className={styles.searchInput}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                              <div className={styles.dropdownList}>
                                <div
                                  className={`${styles.dropdownItem} ${!product.category_id ? styles.selected : ''}`}
                                  onClick={() => handleCategorySelect(index, null)}
                                >
                                  Выберите категорию
                                  {!product.category_id && <i className="fa fa-check"></i>}
                                </div>
                                {getFilteredCategories(index).map(cat => (
                                  <div
                                    key={cat.id}
                                    className={`${styles.dropdownItem} ${product.category_id === cat.id ? styles.selected : ''}`}
                                    onClick={() => handleCategorySelect(index, cat.id)}
                                  >
                                    {cat.full_path || cat.name}
                                    {product.category_id === cat.id && <i className="fa fa-check"></i>}
                                  </div>
                                ))}
                                {getFilteredCategories(index).length === 0 && (
                                  <div className={styles.noResults}>Категории не найдены</div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className={styles.formRow}>
                        <label>Локация *</label>
                        <div className={styles.dropdownContainer} data-dropdown-container>
                          <div 
                            className={styles.dropdownButton}
                            onClick={() => toggleLocationDropdown(index)}
                          >
                            <span>{getLocationName(product.location_id)}</span>
                            <i className={`fa fa-chevron-${locationDropdowns[index] ? 'up' : 'down'}`}></i>
                          </div>
                          {locationDropdowns[index] && (
                            <div className={styles.dropdown}>
                              <div className={styles.searchInputContainer}>
                                 
                                <input
                                  type="text"
                                  placeholder="Поиск локаций..."
                                  value={locationSearchTerms[index] || ''}
                                  onChange={(e) => setLocationSearchTerm(index, e.target.value)}
                                  className={styles.searchInput}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                              <div className={styles.dropdownList}>
                                <div
                                  className={`${styles.dropdownItem} ${!product.location_id ? styles.selected : ''}`}
                                  onClick={() => handleLocationSelect(index, null)}
                                >
                                  Выберите локацию
                                  {!product.location_id && <i className="fa fa-check"></i>}
                                </div>
                                {getFilteredLocations(index).map(loc => (
                                  <div
                                    key={loc.id}
                                    className={`${styles.dropdownItem} ${product.location_id === loc.id ? styles.selected : ''}`}
                                    onClick={() => handleLocationSelect(index, loc.id)}
                                  >
                                    {loc.name}
                                    {product.location_id === loc.id && <i className="fa fa-check"></i>}
                                  </div>
                                ))}
                                {getFilteredLocations(index).length === 0 && (
                                  <div className={styles.noResults}>Локации не найдены</div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className={styles.formRow}>
                        <label>Описание</label>
                        <textarea
                          value={product.description || ''}
                          onChange={(e) => updateProductData(index, { description: e.target.value })}
                          rows={3}
                        />
                      </div>

                      <div className={styles.formRow}>
                        <label>Цена</label>
                        <input
                          type="number"
                          value={product.price || ''}
                          onChange={(e) => updateProductData(index, { price: parseFloat(e.target.value) || null })}
                          step="0.01"
                        />
                      </div>

                      <div className={styles.formRow}>
                        <label>Единица измерения</label>
                        <select
                          value={product.main_unit || ''}
                          onChange={(e) => updateProductData(index, { main_unit: e.target.value || null })}
                        >
                          <option value="">Не выбрано</option>
                          {unitsOfMeasure.map(unit => (
                            <option key={unit.id} value={unit.code}>{unit.name} ({unit.short_name})</option>
                          ))}
                        </select>
                      </div>

                      <div className={styles.formRow}>
                        <label>Количество</label>
                        <input
                          type="number"
                          value={product.main_quantity || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '') {
                              updateProductData(index, { main_quantity: null });
                              return;
                            }
                            // Для целочисленных единиц разрешаем только целые числа
                            if (isIntegerUnit) {
                              // Разрешаем только целые числа (без точки и дробной части)
                              if (/^\d+$/.test(value)) {
                                updateProductData(index, { main_quantity: parseInt(value, 10) });
                              }
                            } else {
                              // Для других единиц разрешаем дробные числа
                              if (/^\d*\.?\d*$/.test(value)) {
                                const numValue = parseFloat(value);
                                updateProductData(index, { main_quantity: isNaN(numValue) ? null : numValue });
                              }
                            }
                          }}
                          onBlur={(e) => {
                            const value = e.target.value;
                            if (value === '' || value === null) {
                              updateProductData(index, { main_quantity: null });
                            } else {
                              const numValue = isIntegerUnit 
                                ? Math.max(0, parseInt(value, 10) || 0)
                                : Math.max(0, parseFloat(value) || 0);
                              updateProductData(index, { main_quantity: numValue });
                            }
                          }}
                          step={isIntegerUnit ? "1" : "0.001"}
                          min="0"
                          placeholder="0"
                        />
                      </div>

                      {/* Атрибуты категории */}
                      {product.category_id && categoryAttributes[product.category_id] && categoryAttributes[product.category_id].length > 0 && (
                        <div className={styles.formRow}>
                          <label>Атрибуты</label>
                          <div className={styles.attributesSection}>
                            {categoryAttributes[product.category_id].map(attr => (
                              <div key={attr.id} className={styles.attributeRow}>
                                <label className={styles.attributeLabel}>
                                  {attr.name}
                                  {attr.required && <span className={styles.requiredStar}>*</span>}
                                </label>
                                {attr.has_predefined_values ? (
                                  <select
                                    className={styles.formControl}
                                    value={product.attributes?.[attr.id] || ''}
                                    onChange={(e) => {
                                      const newAttributes = { ...(product.attributes || {}), [attr.id]: e.target.value };
                                      updateProductData(index, { attributes: newAttributes });
                                    }}
                                    required={attr.required}
                                  >
                                    {!attr.required && <option value="">Не выбрано</option>}
                                    {attr.values.map(value => (
                                      <option key={value.id} value={String(value.id)}>
                                        {value.value}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    type="text"
                                    className={styles.formControl}
                                    value={product.attributes?.[attr.id] || ''}
                                    onChange={(e) => {
                                      const newAttributes = { ...(product.attributes || {}), [attr.id]: e.target.value };
                                      updateProductData(index, { attributes: newAttributes });
                                    }}
                                    placeholder={`Введите ${attr.name}`}
                                    required={attr.required}
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className={styles.formRow}>
                        <label>Изображения</label>
                        <div className={styles.imagesSection}>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          style={{ display: 'none' }}
                          id={`image-upload-${index}`}
                          onChange={(e) => {
                            const files = Array.from(e.target.files);
                            if (files.length > 0) {
                              handleImageFileSelect(index, files);
                            }
                            e.target.value = '';
                          }}
                        />
                          <button
                            type="button"
                            className={styles.addImageButton}
                            onClick={() => document.getElementById(`image-upload-${index}`).click()}
                          >
                            <FaImage /> Добавить изображения
                          </button>
                          
                          {product.images && product.images.length > 0 && (
                            <div className={styles.imagesList}>
                              {product.images.map((image, imgIndex) => {
                                let imageUrl;
                                if (image instanceof File) {
                                  imageUrl = URL.createObjectURL(image);
                                } else if (typeof image === 'string') {
                                  imageUrl = getFileUrl(image);
                                } else if (image && typeof image === 'object') {
                                  // Объект с полями url или image
                                  const path = image.url || image.image;
                                  imageUrl = path ? getFileUrl(path) : '';
                                } else {
                                  imageUrl = '';
                                }
                                
                                return (
                                  <div
                                    key={imgIndex}
                                    className={styles.imageItem}
                                    draggable
                                    onDragStart={(e) => {
                                      e.dataTransfer.effectAllowed = 'move';
                                      e.dataTransfer.setData('text/html', imgIndex.toString());
                                      e.currentTarget.style.opacity = '0.5';
                                    }}
                                    onDragEnd={(e) => {
                                      e.currentTarget.style.opacity = '1';
                                    }}
                                    onDragOver={(e) => {
                                      e.preventDefault();
                                      e.dataTransfer.dropEffect = 'move';
                                      e.currentTarget.classList.add(styles.dragOver);
                                    }}
                                    onDragLeave={(e) => {
                                      e.currentTarget.classList.remove(styles.dragOver);
                                    }}
                                    onDrop={(e) => {
                                      e.preventDefault();
                                      e.currentTarget.classList.remove(styles.dragOver);
                                      const dragIndex = parseInt(e.dataTransfer.getData('text/html'));
                                      if (dragIndex !== imgIndex) {
                                        reorderProductImages(index, dragIndex, imgIndex);
                                      }
                                    }}
                                  >
                                    <div className={styles.imageDragHandle}>
                                      <FaGripVertical />
                                    </div>
                                    <img
                                      src={imageUrl}
                                      alt={`${product.name} - фото ${imgIndex + 1}`}
                                      className={styles.imagePreview}
                                      onError={(e) => {
                                        if (e.target.src && !e.target.src.startsWith('data:')) {
                                          e.target.onerror = null;
                                          e.target.style.display = 'none';
                                        }
                                      }}
                                    />
                                    <div className={styles.imageIndex}>{imgIndex + 1}</div>
                                    <div className={styles.imageActions}>
                                      <button
                                        type="button"
                                        className={styles.removeImageButton}
                                        onClick={() => removeProductImage(index, imgIndex)}
                                        title="Удалить изображение"
                                      >
                                        <FaTimes />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className={styles.checkboxRow}>
                        <div className={styles.toggleSwitch}>
                          <input
                            type="checkbox"
                            checked={product.is_visible_on_marketplace || false}
                            onChange={(e) => updateProductData(index, { is_visible_on_marketplace: e.target.checked })}
                          />
                          <span className={styles.slider}></span>
                          <span className={styles.toggleLabel}>
                            Видимость на маркетплейсе
                          </span>
                        </div>
                        <div className={styles.toggleSwitch}>
                          <input
                            type="checkbox"
                            checked={product.is_visible_on_own_site || false}
                            onChange={(e) => updateProductData(index, { is_visible_on_own_site: e.target.checked })}
                          />
                          <span className={styles.slider}></span>
                          <span className={styles.toggleLabel}>
                            Видимость на личном сайте
                          </span>
                        </div>
                        <div className={styles.toggleSwitch}>
                          <input
                            type="checkbox"
                            checked={product.is_active !== false}
                            onChange={(e) => updateProductData(index, { is_active: e.target.checked })}
                          />
                          <span className={styles.slider}></span>
                          <span className={styles.toggleLabel}>
                            Активен
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>

                      <div className={styles.actions}>
                        <button
                          className={styles.btnSecondary}
                          onClick={clearData}
                          disabled={importing}
                        >
                          Отмена
                        </button>
                        <div className={styles.importModeButtons}>
                          <button
                            className={styles.btnPrimary}
                            onClick={() => importProducts('upsert')}
                            disabled={importing}
                            title="Добавить новые товары и обновить существующие"
                          >
                            {importing ? (
                              <>
                                <FaSpinner className={styles.spin} /> Импорт...
                              </>
                            ) : (
                              <>
                                <FaCheckCircle /> Добавить/Обновить
                              </>
                            )}
                          </button>
                          <button
                            className={styles.btnSync}
                            onClick={() => importProducts('sync')}
                            disabled={importing}
                            title="Синхронизировать: добавить новые, обновить существующие и удалить те, которых нет в файле"
                          >
                            {importing ? (
                              <>
                                <FaSpinner className={styles.spin} /> Синхронизация...
                              </>
                            ) : (
                              <>
                                <FaCheckCircle /> Синхронизировать
                              </>
                            )}
                          </button>
                        </div>
                      </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExcelImportPage;

