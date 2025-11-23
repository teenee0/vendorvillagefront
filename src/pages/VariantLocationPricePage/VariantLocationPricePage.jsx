import React, { useState, useEffect } from 'react';
import axios from "../../api/axiosDefault.js";
import { useParams, useNavigate } from 'react-router-dom';
import { useFileUtils } from '../../hooks/useFileUtils';
import styles from './VariantLocationPricePage.module.css';

const VariantLocationPricePage = () => {
    const { business_slug } = useParams();
    const navigate = useNavigate();
    const { getFileUrl } = useFileUtils();

    const [locations, setLocations] = useState([]);
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [prices, setPrices] = useState({}); // {variantId: price}
    const [viewMode, setViewMode] = useState('unbound'); // 'unbound' или 'bound'
    const [unbinding, setUnbinding] = useState({}); // {priceId: true} для отслеживания процесса отвязки

    // Загрузка локаций
    useEffect(() => {
        const fetchLocations = async () => {
            try {
                const response = await axios.get(`/api/business/${business_slug}/locations/`);
                setLocations(response.data.results || response.data);
                if (response.data.results && response.data.results.length > 0) {
                    setSelectedLocation(response.data.results[0]);
                } else if (response.data.length > 0) {
                    setSelectedLocation(response.data[0]);
                }
            } catch (error) {
                console.error('Ошибка загрузки локаций:', error);
            }
        };
        fetchLocations();
    }, [business_slug]);

    // Загрузка вариантов в зависимости от режима просмотра
    useEffect(() => {
        if (selectedLocation) {
            if (viewMode === 'unbound') {
                fetchVariantsWithoutPrices();
            } else {
                fetchVariantsWithPrices();
            }
        }
    }, [selectedLocation, business_slug, viewMode]);

    const fetchVariantsWithoutPrices = async () => {
        setLoading(true);
        try {
            const response = await axios.get(
                `/api/business/${business_slug}/variants-without-location-price/${selectedLocation.id}/`
            );
            setProducts(response.data.products || []);
            setLoading(false);
        } catch (error) {
            console.error('Ошибка загрузки вариантов:', error);
            setLoading(false);
        }
    };

    const fetchVariantsWithPrices = async () => {
        setLoading(true);
        try {
            const response = await axios.get(
                `/api/business/${business_slug}/location-prices/${selectedLocation.id}/`
            );
            setProducts(response.data.products || []);
            setLoading(false);
        } catch (error) {
            console.error('Ошибка загрузки привязанных вариантов:', error);
            setLoading(false);
        }
    };

    const handlePriceChange = (variantId, price) => {
        setPrices(prev => ({
            ...prev,
            [variantId]: price
        }));
    };

    const handleSaveAll = async () => {
        if (!selectedLocation) return;

        setSaving(true);
        try {
            const pricesArray = Object.entries(prices).map(([variant_id, selling_price]) => ({
                variant_id,
                selling_price,
                is_active: true
            })).filter(item => item.selling_price > 0);

            if (pricesArray.length === 0) {
                alert('Нет цен для сохранения');
                setSaving(false);
                return;
            }

            await axios.post(
                `/api/business/${business_slug}/location-price/bulk-create/`,
                {
                    location_id: selectedLocation.id,
                    prices: pricesArray
                }
            );

            alert(`Успешно сохранено ${pricesArray.length} цен`);
            setPrices({});
            fetchVariantsWithoutPrices();
        } catch (error) {
            console.error('Ошибка сохранения:', error);
            alert('Ошибка сохранения цен: ' + (error.response?.data?.detail || error.message));
        } finally {
            setSaving(false);
        }
    };

    const handleLocationChange = (locationId) => {
        const location = locations.find(loc => loc.id === parseInt(locationId));
        setSelectedLocation(location);
        setPrices({});
    };

    const handleUnbind = async (priceId, variantId) => {
        if (!window.confirm('Вы уверены, что хотите отвязать этот вариант от локации?')) {
            return;
        }

        setUnbinding(prev => ({ ...prev, [priceId]: true }));
        try {
            await axios.delete(
                `/api/business/${business_slug}/location-price/${priceId}/delete/`
            );
            // Обновляем список после отвязки
            fetchVariantsWithPrices();
        } catch (error) {
            console.error('Ошибка отвязки варианта:', error);
            alert('Ошибка отвязки варианта: ' + (error.response?.data?.detail || error.message));
        } finally {
            setUnbinding(prev => {
                const newState = { ...prev };
                delete newState[priceId];
                return newState;
            });
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <button
                    className={styles.backButton}
                    onClick={() => navigate(`/business/${business_slug}/products/`)}
                >
                    ← Назад к товарам
                </button>
                <h2>Привязка вариантов к локации</h2>
            </div>

            <div className={styles.filters}>
                <div className={styles.filterGroup}>
                    <label>Выберите локацию:</label>
                    <select
                        value={selectedLocation?.id || ''}
                        onChange={(e) => handleLocationChange(e.target.value)}
                        className={styles.locationSelect}
                    >
                        {locations.map(location => (
                            <option key={location.id} value={location.id}>
                                {location.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className={styles.viewModeToggle}>
                    <button
                        className={`${styles.toggleButton} ${viewMode === 'unbound' ? styles.toggleButtonActive : ''}`}
                        onClick={() => setViewMode('unbound')}
                    >
                        Непривязанные
                    </button>
                    <button
                        className={`${styles.toggleButton} ${viewMode === 'bound' ? styles.toggleButtonActive : ''}`}
                        onClick={() => setViewMode('bound')}
                    >
                        Привязанные
                    </button>
                </div>

                {selectedLocation && viewMode === 'unbound' && (
                    <button
                        className={styles.saveButton}
                        onClick={handleSaveAll}
                        disabled={saving || Object.keys(prices).length === 0}
                    >
                        {saving ? 'Сохранение...' : `Сохранить (${Object.keys(prices).length})`}
                    </button>
                )}
            </div>

            {loading ? (
                <div className={styles.loading}>Загрузка...</div>
            ) : products.length === 0 ? (
                <div className={styles.emptyState}>
                    <p>
                        {viewMode === 'unbound' 
                            ? 'Все варианты уже привязаны к этой локации' 
                            : 'Нет привязанных вариантов к этой локации'}
                    </p>
                </div>
            ) : (
                <div className={styles.productsList}>
                    {products.map(product => (
                        <div key={product.id} className={styles.productCard}>
                            <div className={styles.productHeader}>
                                {product.main_image && (
                                    <img
                                        src={getFileUrl(product.main_image.image)}
                                        alt={product.name}
                                        className={styles.productImage}
                                    />
                                )}
                                <div className={styles.productInfo}>
                                    <h3>{product.name}</h3>
                                    <p className={styles.category}>{product.category_name}</p>
                                </div>
                            </div>

                            <div className={styles.variantsList}>
                                <h4>Варианты:</h4>
                                {product.variants.map(variant => (
                                    <div key={variant.id} className={styles.variantRow}>
                                        <div className={styles.variantInfo}>
                                            <span className={styles.variantSku}>Артикул: {variant.sku}</span>
                                            {variant.attributes.length > 0 && (
                                                <div className={styles.variantAttributes}>
                                                    {variant.attributes.map((attr, idx) => (
                                                        <span key={idx} className={styles.attributeTag}>
                                                            {attr.name}: {attr.value}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            {(variant.min_price || variant.max_price) && (
                                                <div className={styles.priceRange}>
                                                    {variant.min_price && variant.max_price && variant.min_price === variant.max_price ? (
                                                        <span className={styles.priceRangeText}>
                                                            Цена на других локациях: <strong>{variant.min_price.toLocaleString('ru-RU')} ₸</strong>
                                                        </span>
                                                    ) : (
                                                        <span className={styles.priceRangeText}>
                                                            Диапазон на других локациях: 
                                                            {variant.min_price && (
                                                                <strong> {variant.min_price.toLocaleString('ru-RU')} ₸</strong>
                                                            )}
                                                            {variant.min_price && variant.max_price && variant.min_price !== variant.max_price && (
                                                                <> - <strong>{variant.max_price.toLocaleString('ru-RU')} ₸</strong></>
                                                            )}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        {viewMode === 'unbound' ? (
                                            <div className={styles.priceInput}>
                                                <input
                                                    type="number"
                                                    placeholder={variant.min_price ? `От ${variant.min_price.toLocaleString('ru-RU')}` : "Цена"}
                                                    value={prices[variant.id] || ''}
                                                    onChange={(e) => handlePriceChange(variant.id, e.target.value)}
                                                    min="0"
                                                    step="0.01"
                                                    className={styles.priceField}
                                                />
                                                <span className={styles.currency}>₸</span>
                                            </div>
                                        ) : (
                                            <div className={styles.boundVariantActions}>
                                                <div className={styles.boundPrice}>
                                                    <span className={styles.boundPriceValue}>
                                                        {variant.selling_price !== undefined && variant.selling_price !== null
                                                            ? Number(variant.selling_price).toLocaleString('ru-RU')
                                                            : '0'} ₸
                                                    </span>
                                                </div>
                                                <button
                                                    className={styles.unbindButton}
                                                    onClick={() => handleUnbind(variant.price_id, variant.id)}
                                                    disabled={unbinding[variant.price_id] || !variant.price_id}
                                                >
                                                    {unbinding[variant.price_id] ? 'Отвязка...' : 'Отвязать'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default VariantLocationPricePage;

