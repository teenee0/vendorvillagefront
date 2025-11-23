import { useState, useEffect, useCallback } from 'react';
import axios from '../../api/axiosDefault';
import { FaTimes, FaSearch, FaSortAmountDown, FaSortAmountUp, FaCheck, FaSpinner } from 'react-icons/fa';
import styles from './ProductSelectorModal.module.css';
import { useFileUtils } from '../../hooks/useFileUtils';

const ProductSelectorModal = ({ businessSlug, onSelect, onClose, selectedVariants = [] }) => {
  const { getFileUrl } = useFileUtils();
  const [bindings, setBindings] = useState([]); // Привязки вариант + локация
  const [allBindings, setAllBindings] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedLocationId, setSelectedLocationId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [selectedItems, setSelectedItems] = useState(selectedVariants);

  // Загрузка локаций
  const fetchLocations = useCallback(async () => {
    try {
      const response = await axios.get(`/api/business/${businessSlug}/locations/`);
      setLocations(response.data.results || response.data || []);
    } catch (err) {
      console.error('Ошибка загрузки локаций:', err);
    }
  }, [businessSlug]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const sortParam = sortOrder === 'newest' ? '-created_at' : 'created_at';
      const locationParam = selectedLocationId ? `&location=${selectedLocationId}` : '';
      const response = await axios.get(
        `/api/v1/business/${businessSlug}/products/?sort=${sortParam}${locationParam}`
      );
      
      // Преобразуем в привязки (вариант + локация + цена)
      const allBindingsData = [];
      response.data.products?.forEach(product => {
        const mainImage = product.main_image;
        product.variants?.forEach(variant => {
          variant.locations?.forEach(location => {
            allBindingsData.push({
              id: `${variant.id}-${location.id}`, // Уникальный ID для привязки
              variant_id: variant.id,
              variant_name: variant.name,
              product_name: product.name,
              product_id: product.id,
              full_name: `${product.name} ${variant.name || ''}`.trim(),
              main_image: mainImage,
              category_name: product.category_name,
              attributes: variant.attributes || [],
              location_id: location.location_id,
              location_name: location.location_name,
              location_price_id: location.id, // ID ProductVariantLocationPrice
              price: location.price,
              quantity: location.quantity,
              variant_on_location_id: location.id, // Для создания ProductStock
            });
          });
        });
      });
      
      setBindings(allBindingsData);
      setAllBindings(allBindingsData);
    } catch (err) {
      console.error('Ошибка загрузки товаров:', err);
    } finally {
      setLoading(false);
    }
  }, [businessSlug, sortOrder, selectedLocationId]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const toggleSelection = (binding) => {
    setSelectedItems(prev => {
      const isSelected = prev.some(item => item.id === binding.id);
      if (isSelected) {
        return prev.filter(item => item.id !== binding.id);
      } else {
        return [...prev, binding];
      }
    });
  };

  const handleConfirm = () => {
    onSelect(selectedItems);
    onClose();
  };

  const isSelected = (bindingId) => {
    return selectedItems.some(item => item.id === bindingId);
  };

  const handleSearch = () => {
    setSearchQuery(searchInput);
  };

  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const filteredBindings = searchQuery 
    ? allBindings.filter(b => 
        b.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.category_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.location_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allBindings;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Выбор товаров</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className={styles.searchSection}>
          <div className={styles.searchBox}>
            <FaSearch className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Поиск товара..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyPress={handleSearchKeyPress}
            />
            <button
              type="button"
              className={styles.searchButton}
              onClick={handleSearch}
              disabled={loading}
            >
              {loading ? <FaSpinner className={styles.spinner} /> : 'Поиск'}
            </button>
          </div>

          <div className={styles.filterSection}>
            <select
              className={styles.locationFilter}
              value={selectedLocationId || ''}
              onChange={(e) => setSelectedLocationId(e.target.value || null)}
            >
              <option value="">Все локации</option>
              {locations.map(location => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.sortControl}>
            <button
              className={`${styles.sortButton} ${sortOrder === 'newest' ? styles.active : ''}`}
              onClick={() => setSortOrder('newest')}
            >
              <FaSortAmountDown />
              Новые
            </button>
            <button
              className={`${styles.sortButton} ${sortOrder === 'oldest' ? styles.active : ''}`}
              onClick={() => setSortOrder('oldest')}
            >
              <FaSortAmountUp />
              Старые
            </button>
          </div>

          {sortOrder === 'newest' && (
            <button
              className={styles.refreshButton}
              onClick={fetchProducts}
              disabled={loading}
            >
              Обновить
            </button>
          )}
        </div>

        <div className={styles.content}>
          {loading ? (
            <div className={styles.loading}>Загрузка...</div>
          ) : filteredBindings.length === 0 ? (
            <div className={styles.emptyState}>
              <p>Товары не найдены</p>
            </div>
          ) : (
            <div className={styles.productGrid}>
              {filteredBindings.map(binding => (
                <div
                  key={binding.id}
                  className={`${styles.productCard} ${isSelected(binding.id) ? styles.selected : ''}`}
                  onClick={() => toggleSelection(binding)}
                >
                  <div className={styles.checkbox}>
                    {isSelected(binding.id) && <FaCheck />}
                  </div>

                  {binding.main_image?.image ? (
                    <img
                      src={getFileUrl(binding.main_image.image)}
                      alt={binding.full_name}
                      className={styles.productImage}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://via.placeholder.com/200x280?text=No+Image';
                      }}
                    />
                  ) : (
                    <div className={styles.noImagePlaceholder}>
                      📦
                    </div>
                  )}

                  <div className={styles.productInfo}>
                    <div className={styles.productName}>{binding.product_name}</div>
                    <div className={styles.productVariant}>
                      {binding.variant_name || 'Без варианта'}
                    </div>
                    
                    {binding.attributes && binding.attributes.length > 0 && (
                      <div className={styles.attributes}>
                        {binding.attributes.map((attr, idx) => (
                          <span key={idx} className={styles.attribute}>
                            {attr.attribute_name}: {attr.display_value || attr.custom_value}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className={styles.locationInfo}>
                      <div className={styles.locationName}>{binding.location_name}</div>
                      <div className={styles.price}>{binding.price?.toLocaleString('ru-RU')} ₸</div>
                      {binding.quantity !== null && (
                        <div className={styles.quantity}>{binding.quantity} шт.</div>
                      )}
                    </div>

                    <div className={styles.productCategory}>{binding.category_name}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <div className={styles.selectedCount}>
            Выбрано: {selectedItems.length}
          </div>
          <div className={styles.actions}>
            <button className={styles.cancelButton} onClick={onClose}>
              Отмена
            </button>
            <button
              className={styles.confirmButton}
              onClick={handleConfirm}
              disabled={selectedItems.length === 0}
            >
              Добавить выбранные
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductSelectorModal;

