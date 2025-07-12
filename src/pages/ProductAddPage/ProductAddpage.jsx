// ProductAddPage.jsx
import { useState, useRef, useEffect } from 'react';
import styles from './ProductAddPage.module.css';
import { FaPlusCircle, FaImages, FaInfoCircle, FaListUl, FaCloudUploadAlt, FaStar, FaTimes, FaTrash, FaPlus, FaCopy, FaSave } from 'react-icons/fa';
import axios from "../../api/axiosDefault.js";
import DraggableImageList from '../../components/DraggableThumbnail/DraggableImageList.jsx';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useParams, useNavigate } from 'react-router-dom';
import ImageCropper from '../../components/ImageCropper/ImageCropper.jsx';

const ProductAddPage = () => {
  // Основная информация
  const { business_slug } = useParams();
  const navigate = useNavigate();
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isVisibleOnMarketplace, setIsVisibleOnMarketplace] = useState(true);
  const [isVisibleOnOwnSite, setIsVisibleOnOwnSite] = useState(true);

  // Категории и атрибуты
  const [categoryAttributes, setCategoryAttributes] = useState([]);
  const [isLoadingAttributes, setIsLoadingAttributes] = useState(false);
  const [attributesError, setAttributesError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [error, setError] = useState(null);

  // Локации (склады)
  const [locations, setLocations] = useState([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [locationsError, setLocationsError] = useState(null);

  // Изображения
  const [images, setImages] = useState([]);
  const fileInputRef = useRef(null);
  const [croppingData, setCroppingData] = useState({
    files: [],
    currentIndex: 0,
    croppedImages: []
  });
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Варианты товара
  const [variants, setVariants] = useState([]);
  const [variantCounter, setVariantCounter] = useState(1);

  // Загрузка данных при монтировании
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Загрузка категорий
        const categoriesResponse = await axios.get(`/api/business/${business_slug}/categories/`);
        setCategories(categoriesResponse.data);

        // Загрузка локаций
        const locationsResponse = await axios.get(`/api/business/${business_slug}/locations/`);
        setLocations(locationsResponse.data);

        setIsLoadingCategories(false);
        setIsLoadingLocations(false);
      } catch (err) {
        setError(err.message);
        setIsLoadingCategories(false);
        setIsLoadingLocations(false);
        console.error('Ошибка при загрузке данных:', err);
      }
    };

    fetchInitialData();
  }, [business_slug]);

  // Загрузка атрибутов при изменении категории
  const fetchCategoryAttributes = async (categoryId) => {
    try {
      setIsLoadingAttributes(true);
      setAttributesError(null);
      const response = await axios.get(`/api/categories/${categoryId}/attributes/`);
      setCategoryAttributes(response.data);

      // Сбрасываем варианты при смене категории
      setVariants([]);
      setVariantCounter(1);
    } catch (err) {
      setAttributesError(err.message);
      console.error('Ошибка при загрузке атрибутов категории:', err);
    } finally {
      setIsLoadingAttributes(false);
    }
  };

  const handleCategoryChange = (e) => {
    const selectedCategoryId = e.target.value;
    setCategoryId(selectedCategoryId);

    if (selectedCategoryId) {
      fetchCategoryAttributes(selectedCategoryId);
    } else {
      setCategoryAttributes([]);
      setVariants([]);
    }
  };

  // Добавление нового варианта
  const handleAddVariant = () => {
    const newVariant = {
      id: variantCounter,
      price: '',
      discount: '0',
      quantity: '0', // Это должно быть перенесено в stocks
      description: '',
      showThis: true,
      reserved_quantity: '0', // Это должно быть перенесено в stocks
      is_available_for_sale: true,
      location_id: locations.length > 0 ? String(locations[0].id) : '',
      attributes: categoryAttributes.reduce((acc, attr) => {
        acc[String(attr.id)] = attr.values.length > 0 ?
          (attr.values[0].id ? String(attr.values[0].id) : String(attr.values[0])) : '';
        return acc;
      }, {}),
      stocks: [{
        location_id: locations.length > 0 ? String(locations[0].id) : '',
        quantity: '0',
        reserved_quantity: '0',
        is_available_for_sale: true
      }]
    };

    setVariants([...variants, newVariant]);
    setVariantCounter(variantCounter + 1);
  };

  // Изменение варианта
  const handleVariantChange = (id, field, value, attributeId = null, stockIndex = 0) => {
    setVariants(variants.map(variant => {
      if (variant.id === id) {
        if (attributeId !== null) {
          return {
            ...variant,
            attributes: {
              ...variant.attributes,
              [String(attributeId)]: typeof value === 'number' ? String(value) : value
            }
          };
        } else if (field.startsWith('stocks')) {
          const stockField = field.split('.')[1];
          const updatedStocks = [...variant.stocks];
          updatedStocks[stockIndex] = {
            ...updatedStocks[stockIndex],
            [stockField]: value
          };
          return {
            ...variant,
            stocks: updatedStocks
          };
        } else {
          return {
            ...variant,
            [field]: field === 'location_id' ? String(value) : value
          };
        }
      }
      return variant;
    }));
  };

  // Копирование последнего варианта
  const handleCopyLastVariant = () => {
    if (variants.length === 0) return;

    const lastVariant = variants[variants.length - 1];

    // Преобразуем все ID в строки при копировании
    const copiedAttributes = {};
    Object.entries(lastVariant.attributes || {}).forEach(([key, value]) => {
      copiedAttributes[String(key)] = typeof value === 'number' ? String(value) : value;
    });

    // Копируем stocks с преобразованием ID в строки
    const copiedStocks = (lastVariant.stocks || []).map(stock => ({
      location_id: String(stock.location_id),
      quantity: stock.quantity,
      reserved_quantity: stock.reserved_quantity || '0',
      is_available_for_sale: stock.is_available_for_sale !== undefined ?
        stock.is_available_for_sale : true
    }));

    const newVariant = {
      id: variantCounter,
      price: lastVariant.price,
      discount: lastVariant.discount,
      description: lastVariant.description,
      showThis: lastVariant.showThis,
      is_available_for_sale: lastVariant.is_available_for_sale,
      attributes: copiedAttributes,
      stocks: copiedStocks.length > 0 ? copiedStocks : [{
        location_id: locations.length > 0 ? String(locations[0].id) : '',
        quantity: '0',
        reserved_quantity: '0',
        is_available_for_sale: true
      }]
    };

    setVariants([...variants, newVariant]);
    setVariantCounter(variantCounter + 1);
  };

  // Удаление варианта
  const handleRemoveVariant = (id) => {
    setVariants(variants.filter(variant => variant.id !== id));
  };

  // Изображения
  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      setCroppingData({
        files: Array.from(files),
        currentIndex: 0,
        croppedImages: []
      });
      setIsModalOpen(true);
      document.body.classList.add(styles.bodyNoScroll);
    }
    e.target.value = '';
  };

  const handleCropComplete = (croppedFile, index) => {
    const newImage = {
      id: Date.now() + index,
      file: croppedFile,
      preview: URL.createObjectURL(croppedFile),
      isMain: images.length === 0 && index === 0
    };

    setImages(prev => [...prev, newImage]);

    // Если это последнее изображение, закрываем модальное окно
    if (index === croppingData.files.length - 1) {
      setIsModalOpen(false);
      document.body.classList.remove(styles.bodyNoScroll);
      setCroppingData({
        files: [],
        currentIndex: 0,
        croppedImages: []
      });
    }
  };

  const handleNextImage = () => {
    setCroppingData(prev => ({
      ...prev,
      currentIndex: prev.currentIndex + 1
    }));
  };

  const handleCancelCropping = () => {
    setIsModalOpen(false);
    document.body.classList.remove(styles.bodyNoScroll);
    setCroppingData({
      files: [],
      currentIndex: 0,
      croppedImages: []
    });
  };

  const handlePreviousImage = () => {
    setCroppingData(prev => ({
      ...prev,
      currentIndex: prev.currentIndex - 1
    }));
  };


  const handleSetMainImage = (id) => {
    setImages(prevImages => {
      // Если пытаемся сделать главным уже главное изображение
      const currentMain = prevImages.find(img => img.isMain);
      if (currentMain?.id === id) return prevImages;

      // Создаем новый массив изображений
      const newImages = [...prevImages];

      // Находим индекс изображения, которое делаем главным
      const newMainIndex = newImages.findIndex(img => img.id === id);

      if (newMainIndex === -1) return prevImages; // если не нашли изображение

      // Обновляем флаги isMain у всех изображений
      const updatedImages = newImages.map(img => ({
        ...img,
        isMain: img.id === id
      }));

      // Перемещаем новое главное изображение в начало массива
      const [newMainImage] = updatedImages.splice(newMainIndex, 1);
      return [newMainImage, ...updatedImages];
    });
  };

  const handleRemoveImage = (id) => {
    setImages(prevImages => {
      // Находим удаляемое изображение
      const imageToRemove = prevImages.find(img => img.id === id);
      if (imageToRemove?.isMain && images.length > 1) {
        if (!window.confirm('Вы удаляете главное изображение. Продолжить?')) {
          return;
        }
      }
      if (!imageToRemove) return prevImages;

      // Фильтруем массив без удаленного изображения
      const newImages = prevImages.filter(img => img.id !== id);

      // Если удалили главное изображение и остались другие изображения
      if (imageToRemove.isMain && newImages.length > 0) {
        // Делаем первое изображение главным
        newImages[0].isMain = true;
      }

      return newImages;
    });
  };

  const handleImagesReorder = (newImages) => {
    setImages(newImages);
  };

  // Расчет цены со скидкой
  const calculateDiscountedPrice = (price, discount) => {
    const priceNum = parseFloat(price) || 0;
    const discountNum = parseFloat(discount) || 0;
    return (priceNum * (1 - discountNum / 100)).toFixed(2);
  };

  // Валидация формы
  const validateForm = () => {
    // Проверка основной информации
    if (!productName.trim()) {
      return { valid: false, message: "Заполните название товара." };
    }

    if (!categoryId) {
      return { valid: false, message: "Выберите категорию товара." };
    }

    if (!productDescription.trim()) {
      return { valid: false, message: "Добавьте описание товара." };
    }

    if (images.length === 0) {
      return { valid: false, message: "Добавьте хотя бы одно изображение." };
    }

    if (!images.some(img => img.isMain)) {
      return { valid: false, message: "Выберите главное изображение." };
    }

    if (variants.length === 0) {
      return { valid: false, message: "Добавьте хотя бы один вариант товара." };
    }

    for (let [index, variant] of variants.entries()) {
      if (!variant.price) {
        return { valid: false, message: `Вариант ${index + 1}: укажите цену.` };
      }
      if (!variant.quantity) {
        return { valid: false, message: `Вариант ${index + 1}: укажите количество.` };
      }
      if (!variant.location_id) {
        return { valid: false, message: `Вариант ${index + 1}: выберите склад/локацию.` };
      }

      for (let attr of categoryAttributes) {
        if (attr.required) {
          const val = variant.attributes[attr.id];
          if (val === undefined || val === null || val === '') {
            return {
              valid: false,
              message: `Вариант ${index + 1}: заполните обязательный атрибут "${attr.name}".`
            };
          }
        }
      }
    }

    return { valid: true, message: "" };
  };

  // Подготовка данных для отправки
  const prepareProductData = () => {
    const formData = new FormData();

    // Сначала собираем JSON-часть
    const jsonPayload = {
      name: productName,
      description: productDescription,
      category: categoryId,
      is_active: isActive,
      is_visible_on_marketplace: isVisibleOnMarketplace,
      is_visible_on_own_site: isVisibleOnOwnSite,
      variants: variants.map(variant => ({
        price: variant.price,
        discount: variant.discount,
        show_this: variant.showThis,
        description: variant.description,
        attributes: Object.entries(variant.attributes || {}).map(([attrId, value]) => {
          const attribute = categoryAttributes.find(a => String(a.id) === String(attrId));
          return {
            category_attribute: Number(attrId),
            predefined_value: attribute?.has_predefined_values ? Number(value) : null,
            custom_value: attribute?.has_predefined_values ? '' : String(value)
          };
        }),
        stocks: (variant.stocks || []).map(stock => ({
          location: Number(stock.location_id),
          quantity: Number(stock.quantity),
          reserved_quantity: Number(stock.reserved_quantity || 0),
          is_available_for_sale: !!stock.is_available_for_sale
        }))
      }))
    };

    formData.append("data", JSON.stringify(jsonPayload));  // <-- 👈 тут упаковываем всё в одно поле

    // Теперь добавляем изображения
    images.forEach((image, index) => {
      formData.append(`images[${index}][image]`, image.file);
      formData.append(`images[${index}][is_main]`, image.isMain ? 'true' : 'false');
      formData.append(`images[${index}][display_order]`, String(index));
    });

    return formData;
  };




  // Отправка формы
  const handleSubmit = async (e) => {
    e.preventDefault();
    const productData = prepareProductData();
    for (let pair of productData.entries()) {
      console.log(pair[0], pair[1]);
    }


    if (!validateForm()) {
      console.error('Пожалуйста, заполните все обязательные поля');
      return;
    }

    try {
      const productData = prepareProductData();
      for (let pair of productData.entries()) {
        console.log(pair[0], pair[1]);
      }

      const response = await axios.post(
        `/api/business/${business_slug}/products/create/`,
        productData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      console.log('Товар успешно создан:', response.data); //datalog
      alert('Товар успешно сохранён');
      navigate(-1);
    } catch (error) {
      console.error('Ошибка при подготовке данных:', error.response?.data || error.message);
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className={styles.container}>
        {croppingData.files.length > 0 && (
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
          <h2 className={styles.pageTitle}>
            <FaPlusCircle className={styles.titleIcon} /> Добавление нового товара
          </h2>

          <form onSubmit={handleSubmit} className={styles.productForm}>
            {/* Секция фотографий */}
            <div className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <h5><FaImages className={styles.sectionIcon} /> Фотографии товара</h5>
              </div>
              <div className={styles.sectionBody}>
                <div className={styles.uploadRow}>
                  <div className={styles.uploadColumn}>
                    <div
                      className={styles.uploadArea}
                      onClick={handleUploadClick}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        handleFileChange({ target: { files: e.dataTransfer.files } });
                      }}
                    >
                      <div className={styles.uploadIcon}>
                        <FaCloudUploadAlt />
                      </div>
                      <h5>Перетащите сюда фотографии</h5>
                      <p className={styles.uploadHint}>или нажмите для выбора файлов</p>
                      <input
                        type="file"
                        ref={fileInputRef}
                        multiple
                        accept="image/*"
                        onChange={handleFileChange}
                        className={styles.fileInput}
                      />
                    </div>
                  </div>
                  <div className={styles.infoColumn}>
                    <div className={styles.infoAlert}>
                      <h6><FaInfoCircle className={styles.infoIcon} /> Советы по фотографиям:</h6>
                      <ul>
                        <li>Используйте качественные изображения</li>
                        <li>Первое фото будет главным</li>
                        <li>Минимум 3 фото для лучшего эффекта</li>
                        <li>Формат JPG или PNG</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Секция с превью изображений */}
                <div className={styles.thumbnailsSection}>
                  <h6 className={styles.thumbnailsTitle}>
                    Загруженные фотографии ({images.length}):
                  </h6>
                  <DraggableImageList
                    images={images}
                    onImagesReorder={handleImagesReorder}
                    onSetMainImage={handleSetMainImage}
                    onRemoveImage={handleRemoveImage}
                  />
                </div>
              </div>
            </div>

            {/* Секция основной информации */}
            <div className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <h5><FaInfoCircle className={styles.sectionIcon} /> Основная информация</h5>
              </div>
              <div className={styles.sectionBody}>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="product-name" className={styles.formLabel}>Название товара *</label>
                    <input
                      type="text"
                      id="product-name"
                      className={styles.formControl}
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="product-category" className={styles.formLabel}>Категория *</label>
                    <select
                      id="product-category"
                      className={styles.formControl}
                      value={categoryId}
                      onChange={handleCategoryChange}
                      required
                      disabled={isLoadingCategories}
                    >
                      <option value="" disabled>Выберите категорию</option>
                      {isLoadingCategories ? (
                        <option>Загрузка категорий...</option>
                      ) : error ? (
                        <option>Ошибка загрузки категорий</option>
                      ) : (
                        categories.map(category => (
                          <option key={category.id} value={category.id}>
                            {category.full_path}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="product-description" className={styles.formLabel}>Описание товара *</label>
                  <textarea
                    id="product-description"
                    className={styles.formControl}
                    rows="5"
                    value={productDescription}
                    onChange={(e) => setProductDescription(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.formRow}>
                  <div className={styles.checkboxGroup}>
                    <input
                      type="checkbox"
                      id="visible-on-marketplace"
                      className={styles.formCheckbox}
                      checked={isVisibleOnMarketplace}
                      onChange={(e) => setIsVisibleOnMarketplace(e.target.checked)}
                    />
                    <label htmlFor="visible-on-marketplace" className={styles.checkboxLabel}>
                      Виден на маркетплейсе
                    </label>
                  </div>
                  <div className={styles.checkboxGroup}>
                    <input
                      type="checkbox"
                      id="visible-on-own-site"
                      className={styles.formCheckbox}
                      checked={isVisibleOnOwnSite}
                      onChange={(e) => setIsVisibleOnOwnSite(e.target.checked)}
                    />
                    <label htmlFor="visible-on-own-site" className={styles.checkboxLabel}>
                      Виден на собственном сайте
                    </label>
                  </div>
                  <div className={styles.checkboxGroup}>
                    <input
                      type="checkbox"
                      id="is-active"
                      className={styles.formCheckbox}
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                    />
                    <label htmlFor="is-active" className={styles.checkboxLabel}>
                      Товар активен (доступен для покупки)
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Секция атрибутов и вариантов */}
            {categoryId && (
              <div className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                  <h5><FaListUl className={styles.sectionIcon} /> Варианты товара</h5>
                </div>
                <div className={styles.sectionBody}>
                  <div className={styles.infoAlert}>
                    Создайте варианты товара с разными комбинациями атрибутов, ценами и количеством.
                    Новые атрибуты будут автоматически добавляться как колонки в таблицу.
                  </div>

                  {isLoadingAttributes ? (
                    <div>Загрузка атрибутов категории...</div>
                  ) : attributesError ? (
                    <div className={styles.errorAlert}>Ошибка загрузки атрибутов: {attributesError}</div>
                  ) : (
                    <>
                      <div className={styles.tableWrapper}>
                        <div className={styles.horizontalScroll}>
                          <table className={styles.variantTable}>
                            <thead>
                              <tr>
                                <th className={styles.stickyColumn}>№</th>
                                <th>Активность</th>
                                {/* Динамические заголовки для атрибутов */}
                                {categoryAttributes.map(attr => (
                                  <th key={attr.id}>
                                    {attr.name}
                                    {attr.required && <span className={styles.requiredStar}>*</span>}
                                  </th>
                                ))}
                                <th>Цена*</th>
                                <th>Скидка %</th>
                                <th>Цена со скидкой</th>
                                <th>Количество*</th>
                                <th>Зарезервировано</th>
                                {/* <th>Доступность для продажи</th> */}
                                <th>Склад*</th>
                                <th className={styles.stickyColumn}>Действия</th>
                              </tr>
                            </thead>
                            <tbody>
                              {variants.length === 0 ? (
                                <tr>
                                  <td colSpan={categoryAttributes.length + 9} className={styles.noVariants}>
                                    Нет вариантов. Нажмите "Добавить вариант" чтобы создать первый.
                                  </td>
                                </tr>
                              ) : (
                                variants.map((variant, index) => (
                                  <tr key={variant.id}>
                                    <td className={styles.stickyColumn}>{index + 1}</td>
                                    <td>
                                      <input
                                        type="checkbox"
                                        className={styles.formControltd}
                                        checked={variant.showThis}
                                        onChange={(e) => handleVariantChange(
                                          variant.id,
                                          'showThis',
                                          e.target.checked
                                        )}
                                      />
                                    </td>

                                    {/* Поля для атрибутов */}
                                    {categoryAttributes.map(attr => (
                                      <td key={attr.id}>
                                        {attr.values.length > 0 ? (
                                          <select
                                            className={styles.formSelect}
                                            value={variant.attributes[attr.id] || ''}
                                            onChange={(e) => handleVariantChange(
                                              variant.id,
                                              null,
                                              e.target.value,
                                              attr.id
                                            )}
                                            required={attr.required}
                                          >
                                            {!attr.required && <option value="">Не выбрано</option>}
                                            {attr.values.map(value => (
                                              <option
                                                key={value.id}
                                                value={value.id}
                                              >
                                                {value.value}
                                              </option>
                                            ))}
                                          </select>
                                        ) : (
                                          <input
                                            type="text"
                                            className={styles.formControltd}
                                            value={variant.attributes[attr.id] || ''}
                                            onChange={(e) => handleVariantChange(
                                              variant.id,
                                              null,
                                              e.target.value,
                                              attr.id
                                            )}
                                            placeholder={`Введите ${attr.name}`}
                                            required={attr.required}
                                          />
                                        )}
                                      </td>
                                    ))}
                                    <td>
                                      <input
                                        type="number"
                                        className={styles.formControltd}
                                        value={variant.price}
                                        onChange={(e) => handleVariantChange(
                                          variant.id,
                                          'price',
                                          e.target.value
                                        )}
                                        step="0.01"
                                        min="0"
                                        required
                                      />
                                    </td>
                                    <td>
                                      <input
                                        type="number"
                                        className={styles.formControltd}
                                        value={variant.discount}
                                        onChange={(e) => handleVariantChange(
                                          variant.id,
                                          'discount',
                                          e.target.value
                                        )}
                                        min="0"
                                        max="100"
                                      />
                                    </td>
                                    <td>
                                      {calculateDiscountedPrice(variant.price, variant.discount)} ₸
                                    </td>
                                    <td>
                                      <input
                                        type="number"
                                        className={styles.formControltd}
                                        value={variant.stocks[0]?.quantity || ''}
                                        onChange={(e) => handleVariantChange(
                                          variant.id,
                                          'stocks.quantity',
                                          e.target.value
                                        )}
                                        min="0"
                                        required
                                      />
                                    </td>
                                    <td>
                                      <input
                                        type="number"
                                        className={styles.formControltd}
                                        value={variant.stocks[0]?.reserved_quantity || ''}
                                        onChange={(e) => handleVariantChange(
                                          variant.id,
                                          'stocks.reserved_quantity',
                                          e.target.value
                                        )}
                                        min="0"
                                      />
                                    </td>
                                    {/* доступноть для продажи из таблицы Stock (пока что не нужно, потому чтор логика пока что, что у одного варианата - один склад) */}
                                    {/* <td>
                                    <input
                                      type="checkbox"
                                      className={styles.formControl}
                                      value={variant.is_available_for_sale}
                                      onChange={(e) => handleVariantChange(
                                        variant.id,
                                        'is_available_for_sale',
                                        e.target.value
                                      )}
                                      min="0"
                                      required
                                    />
                                  </td> */}
                                    <td>
                                      <select
                                        className={styles.formSelect}
                                        value={variant.location_id}
                                        onChange={(e) => handleVariantChange(
                                          variant.id,
                                          'location_id',
                                          e.target.value
                                        )}
                                        required
                                        disabled={isLoadingLocations || locations.length === 0}
                                      >
                                        {isLoadingLocations ? (
                                          <option>Загрузка складов...</option>
                                        ) : locationsError ? (
                                          <option>Ошибка загрузки складов</option>
                                        ) : locations.length === 0 ? (
                                          <option>Нет доступных складов</option>
                                        ) : (
                                          locations.map(location => (
                                            <option key={location.id} value={location.id}>
                                              {location.name}
                                            </option>
                                          ))
                                        )}
                                      </select>
                                    </td>
                                    {/* если нужно буцлет добавить свое названи/ описание */}
                                    {/* <td>
                                    <textarea
                                      className={styles.formControl}
                                      rows="1"
                                      value={variant.description}
                                      onChange={(e) => handleVariantChange(
                                        variant.id,
                                        'description',
                                        e.target.value
                                      )}
                                      placeholder="Описание варианта"
                                    />
                                  </td> */}
                                    <td className={`${styles.stickyColumn} ${styles.variantActions}`}>
                                      <button
                                        type="button"
                                        className={styles.variantButton}
                                        onClick={() => handleRemoveVariant(variant.id)}
                                        title="Удалить"
                                      >
                                        <FaTrash />
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>

                        <div className={styles.variantControls}>
                          <div>
                            <button
                              type="button"
                              className={styles.variantAddButton}
                              onClick={handleAddVariant}
                              disabled={categoryAttributes.length === 0}
                            >
                              <FaPlus className={styles.buttonIcon} /> Добавить вариант
                            </button>
                            <button
                              type="button"
                              className={styles.variantCopyButton}
                              onClick={handleCopyLastVariant}
                              disabled={variants.length === 0}
                            >
                              <FaCopy className={styles.buttonIcon} /> Копировать последний
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Кнопки отправки формы */}
            <div className={styles.formActions}>
              <button
                type="button"
                onClick={() => navigate(`/business/${business_slug}/products/`)}
                className={styles.cancelButton}
              >
                <FaTimes className={styles.buttonIcon} /> Отменить
              </button>
              <button
                type="submit"
                className={styles.submitButton}
              >
                <FaSave className={styles.buttonIcon} /> Сохранить товар
              </button>
            </div>
          </form>
        </div>
      </div>
    </DndProvider>
  );
};

export default ProductAddPage;