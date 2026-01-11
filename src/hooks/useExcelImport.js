import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../api/axiosDefault';

/**
 * Хук для работы с импортом товаров из Excel
 */
export const useExcelImport = () => {
  const { business_slug } = useParams();
  const navigate = useNavigate();

  // Состояния
  const [excelFile, setExcelFile] = useState(null);
  const [parsedProducts, setParsedProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [unitsOfMeasure, setUnitsOfMeasure] = useState([]);
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [importErrors, setImportErrors] = useState({});

  // Загружаем необходимые справочники
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [categoriesRes, locationsRes, unitsRes] = await Promise.all([
          axios.get(`/api/business/${business_slug}/categories/`),
          axios.get(`/api/business/${business_slug}/locations/`),
          axios.get('/api/units-of-measure/')
        ]);
        setCategories(categoriesRes.data || []);
        setLocations(locationsRes.data || []);
        setUnitsOfMeasure(unitsRes.data || []);
      } catch (err) {
        console.error('Ошибка загрузки справочников:', err);
        setError('Ошибка загрузки данных');
      } finally {
        setLoading(false);
      }
    };

    if (business_slug) {
      fetchData();
    }
  }, [business_slug]);

  // Обработка выбора файла
  const handleFileSelect = useCallback((file) => {
    if (!file) {
      setExcelFile(null);
      setParsedProducts([]);
      return;
    }

    // Проверяем расширение файла
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setError('Поддерживаются только файлы .xlsx и .xls');
      return;
    }

    setExcelFile(file);
    setError(null);
    setParsedProducts([]);
  }, []);

  // Парсинг Excel файла
  const parseExcelFile = useCallback(async () => {
    if (!excelFile) {
      setError('Выберите файл для парсинга');
      return;
    }

    try {
      setParsing(true);
      setError(null);

      const formData = new FormData();
      formData.append('excel_file', excelFile);

      const response = await axios.post(
        `/api/business/${business_slug}/excel-import/parse/`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      console.log('Response from API:', response.data);
      console.log('Products:', response.data.products);
      console.log('Products length:', response.data.products?.length);
      
      const products = (response.data.products || []).map(product => ({
        ...product,
        use_auto_barcode: product.use_auto_barcode !== undefined ? product.use_auto_barcode : true
      }));
      
      // Получаем артикулы для проверки существующих товаров
      const articles = products
        .filter(p => p.article && p.article.trim())
        .map(p => p.article.trim());
      
      if (articles.length > 0) {
        // Запрашиваем существующие товары
        try {
          const existingResponse = await axios.post(
            `/api/business/${business_slug}/excel-import/get-existing/`,
            { articles }
          );
          
          const existingProducts = existingResponse.data.products || {};
          
          // Объединяем данные: берем из Excel (name, description, price, main_quantity),
          // остальное из существующих товаров
                 const mergedProducts = products.map(product => {
                   const article = (product.article || '').trim();
                   if (article && existingProducts[article]) {
                     const existing = existingProducts[article];
                     return {
                       ...product,
                       // Из Excel (приоритет)
                       name: product.name,
                       description: product.description || '',
                       price: product.price,
                       main_quantity: product.main_quantity,
                       // Из существующего товара
                       category_id: existing.category_id || product.category_id,
                       location_id: existing.location_id || product.location_id,
                       images: existing.images || product.images || [],
                       attributes: existing.attributes || product.attributes || {},
                      barcode: existing.barcode,
                      barcode_from_existing: !!existing.barcode, // Флаг, что штрих-код из существующего товара
                      use_auto_barcode: existing.use_auto_barcode !== undefined 
                        ? existing.use_auto_barcode 
                        : product.use_auto_barcode,
                       main_unit: existing.unit_of_measure_code || product.main_unit,
                       is_active: existing.is_active !== undefined 
                         ? existing.is_active 
                         : product.is_active,
                       is_visible_on_marketplace: (
                         existing.is_visible_on_marketplace !== undefined 
                         ? existing.is_visible_on_marketplace 
                         : product.is_visible_on_marketplace
                       ),
                       is_visible_on_own_site: (
                         existing.is_visible_on_own_site !== undefined 
                         ? existing.is_visible_on_own_site 
                         : product.is_visible_on_own_site
                       ),
                     };
                   }
                   return product;
                 });
          
          // Загружаем атрибуты для всех категорий, которые есть в слитых товарах
          const categoryIds = new Set();
          mergedProducts.forEach(product => {
            if (product.category_id) {
              categoryIds.add(product.category_id);
            }
          });
          
          // Загружаем атрибуты для всех категорий параллельно
          await Promise.all(
            Array.from(categoryIds).map(categoryId => 
              fetchCategoryAttributes(categoryId)
            )
          );
          
          setParsedProducts(mergedProducts);
        } catch (err) {
          console.error('Ошибка загрузки существующих товаров:', err);
          // Если не удалось загрузить, используем данные из Excel
          setParsedProducts(products);
        }
      } else {
        setParsedProducts(products);
      }
      
      if (response.data.errors && response.data.errors.length > 0) {
        setError(`Найдены ошибки: ${response.data.errors.join(', ')}`);
      }
      
      if (products.length === 0) {
        setError('Товары не найдены в файле. Проверьте формат файла.');
      }
    } catch (err) {
      console.error('Ошибка парсинга файла:', err);
      setError(err.response?.data?.detail || 'Ошибка при парсинге файла');
      setParsedProducts([]);
    } finally {
      setParsing(false);
    }
  }, [excelFile, business_slug]);

  // Состояние для хранения атрибутов категорий
  const [categoryAttributes, setCategoryAttributes] = useState({}); // {categoryId: [attributes]}

  // Загрузка атрибутов категории
  const fetchCategoryAttributes = useCallback(async (categoryId) => {
    if (!categoryId) return [];
    
    // Если атрибуты уже загружены, возвращаем их
    if (categoryAttributes[categoryId]) {
      return categoryAttributes[categoryId];
    }

    try {
      const response = await axios.get(`/api/categories/${categoryId}/attributes/`);
      const formattedAttributes = response.data.map(attr => ({
        ...attr,
        values: attr.values || [],
        has_predefined_values: attr.has_predefined_values || false
      }));
      
      setCategoryAttributes(prev => ({
        ...prev,
        [categoryId]: formattedAttributes
      }));
      
      return formattedAttributes;
    } catch (err) {
      console.error('Ошибка при загрузке атрибутов категории:', err);
      return [];
    }
  }, [categoryAttributes]);

  // Обновление данных товара после парсинга
  const updateProductData = useCallback((index, data) => {
    setParsedProducts(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], ...data };
      return updated;
    });
  }, []);

  // Добавление изображений к товару
  const addProductImages = useCallback((index, images) => {
    setParsedProducts(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        images: [...(updated[index].images || []), ...images]
      };
      return updated;
    });
  }, []);

  // Удаление изображения товара
  const removeProductImage = useCallback((productIndex, imageIndex) => {
    setParsedProducts(prev => {
      const updated = [...prev];
      updated[productIndex] = {
        ...updated[productIndex],
        images: updated[productIndex].images.filter((_, idx) => idx !== imageIndex)
      };
      return updated;
    });
  }, []);

  // Изменение порядка изображений
  const reorderProductImages = useCallback((productIndex, startIndex, endIndex) => {
    setParsedProducts(prev => {
      const updated = [...prev];
      const images = [...(updated[productIndex].images || [])];
      const [removed] = images.splice(startIndex, 1);
      images.splice(endIndex, 0, removed);
      updated[productIndex] = {
        ...updated[productIndex],
        images
      };
      return updated;
    });
  }, []);

  // Удаление товара из списка
  const removeProduct = useCallback((productIndex) => {
    setParsedProducts(prev => {
      const updated = [...prev];
      updated.splice(productIndex, 1);
      return updated;
    });
  }, []);

  // Импорт товаров
  const importProducts = useCallback(async (mode = 'upsert') => {
    if (!parsedProducts || parsedProducts.length === 0) {
      setError('Нет товаров для импорта');
      return;
    }

    // Валидация: проверяем, что у всех товаров заполнены обязательные поля
    const validationErrors = [];
    
    parsedProducts.forEach((product, index) => {
      const errors = [];
      
      // Проверка обязательных полей
      if (!product.name || (typeof product.name === 'string' && !product.name.trim())) {
        errors.push('Название товара');
      }
      if (!product.article || (typeof product.article === 'string' && !product.article.trim())) {
        errors.push('Артикул');
      }
      if (!product.price || product.price === null || product.price === undefined) {
        errors.push('Цена');
      }
      if (!product.category_id) {
        errors.push('Категория');
      }
      if (!product.location_id) {
        errors.push('Локация');
      }
      if (!product.main_unit || (typeof product.main_unit === 'string' && !product.main_unit.trim())) {
        errors.push('Единица измерения');
      }
      if (product.main_quantity === null || product.main_quantity === undefined || product.main_quantity === '') {
        errors.push('Количество');
      }
      
      // Проверка обязательных атрибутов категории
      if (product.category_id && categoryAttributes[product.category_id]) {
        const requiredAttributes = categoryAttributes[product.category_id].filter(attr => attr.required);
        requiredAttributes.forEach(attr => {
          const attrValue = product.attributes?.[attr.id];
          if (!attrValue || (typeof attrValue === 'string' && !attrValue.trim())) {
            errors.push(`Атрибут "${attr.name}"`);
          }
        });
      }
      
      if (errors.length > 0) {
        validationErrors.push({
          index: index + 1,
          name: product.name || `Товар ${index + 1}`,
          errors: errors
        });
      }
    });

    if (validationErrors.length > 0) {
      const errorMessages = validationErrors.map(err => {
        return `Товар ${err.index} (${err.name}): ${err.errors.join(', ')}`;
      });
      setError(`Заполните все обязательные поля:\n${errorMessages.join('\n')}`);
      return;
    }

    try {
      setImporting(true);
      setError(null);
      setSuccess(null);

      // Формируем данные для отправки через FormData
      const formData = new FormData();
      formData.append('mode', mode);
      
      // Подготавливаем данные товаров (без изображений)
      const productsData = parsedProducts.map((product, productIndex) => {
        // Подсчитываем количество файлов для этого товара
        const validImages = (product.images || []).filter(img => {
          return img instanceof File;
        });
        
        return {
          name: product.name,
          description: product.description || '',
          article: product.article || '',  // SKU (артикул) - всегда передаем
          barcode: product.use_auto_barcode ? null : (product.barcode || ''),  // EAN-13 (штрих-код)
          use_auto_barcode: product.use_auto_barcode || false,
          price: product.price || null,
          main_unit: product.main_unit || null,
          main_quantity: product.main_quantity || null,
          category_id: product.category_id,
          location_id: product.location_id,
          is_visible_on_marketplace: product.is_visible_on_marketplace || false,
          is_visible_on_own_site: product.is_visible_on_own_site || false,
          is_active: product.is_active !== undefined ? product.is_active : true,
          attributes: product.attributes || {},
          images_count: validImages.length  // Количество изображений для этого товара
        };
      });
      
      // Добавляем JSON с данными товаров
      formData.append('products', JSON.stringify(productsData));
      
      // Добавляем файлы изображений
      parsedProducts.forEach((product, productIndex) => {
        const validImages = (product.images || []).filter(img => {
          return img instanceof File;
        });
        
        validImages.forEach((imageFile, imageIndex) => {
          formData.append(`product_${productIndex}_image_${imageIndex}`, imageFile);
        });
      });

      const response = await axios.post(
        `/api/business/${business_slug}/excel-import/create/`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.errors && response.data.errors.length > 0) {
        const errorCount = response.data.errors.length;
        const createdCount = response.data.summary?.created_count || 0;
        const updatedCount = response.data.summary?.updated_count || 0;
        const deletedCount = response.data.summary?.deleted_count || 0;
        setError(`Ошибки при импорте: ${errorCount} товаров. Создано: ${createdCount}, Обновлено: ${updatedCount}${deletedCount > 0 ? `, Удалено: ${deletedCount}` : ''}`);
      } else {
        const createdCount = response.data.summary?.created_count || 0;
        const updatedCount = response.data.summary?.updated_count || 0;
        const deletedCount = response.data.summary?.deleted_count || 0;
        let message = `Успешно импортировано: создано ${createdCount}`;
        if (updatedCount > 0) message += `, обновлено ${updatedCount}`;
        if (deletedCount > 0) message += `, удалено ${deletedCount}`;
        setSuccess(message);
      }

      // Переходим на страницу товаров через небольшую задержку
      // НЕ сбрасываем importing до редиректа, чтобы кнопки оставались заблокированными
      setTimeout(() => {
        navigate(`/business/${business_slug}/products`);
      }, 2000);
    } catch (err) {
      console.error('Ошибка импорта товаров:', err);
      setError(err.response?.data?.detail || 'Ошибка при импорте товаров');
      setImporting(false);
    }
  }, [parsedProducts, categoryAttributes, business_slug, navigate]);

  // Получение единицы измерения по коду
  const getUnitByCode = useCallback((code) => {
    return unitsOfMeasure.find(unit => unit.code === code);
  }, [unitsOfMeasure]);

  // Получение категории по ID
  const getCategoryById = useCallback((id) => {
    return categories.find(cat => cat.id === id);
  }, [categories]);

  // Получение локации по ID
  const getLocationById = useCallback((id) => {
    return locations.find(loc => loc.id === id);
  }, [locations]);

  return {
    // Данные
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
    importErrors,

    // Методы
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

    // Утилиты
    setError,
    setSuccess,
    clearData: () => {
      setExcelFile(null);
      setParsedProducts([]);
      setError(null);
      setSuccess(null);
      setImportErrors({});
    }
  };
};

