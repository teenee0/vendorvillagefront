import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../../api/axiosDefault';
import {
  FaPlay,
  FaCheck,
  FaSearch,
  FaSpinner,
  FaFilter,
  FaChevronDown,
  FaChevronUp,
  FaWarehouse
} from 'react-icons/fa';
import styles from './InventorySessionPageMobile.module.css';
import Loader from '../../components/Loader';
import dayjs from 'dayjs';
import { useFileUtils } from '../../hooks/useFileUtils';

const InventorySessionPageMobile = () => {
    const { business_slug, session_id } = useParams();
    const navigate = useNavigate();
    
    const [session, setSession] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [scanInput, setScanInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [updatingItem, setUpdatingItem] = useState(null);
    const [localQuantities, setLocalQuantities] = useState({});
    const [showFilters, setShowFilters] = useState(false);
    const scanInputRef = useRef(null);
    const { getFileUrl } = useFileUtils();

    useEffect(() => {
        fetchSession();
        fetchItems();
    }, [business_slug, session_id]);

    useEffect(() => {
        if (session?.status === 'in_progress' && scanInputRef.current) {
            scanInputRef.current.focus();
        }
    }, [session?.status]);

    useEffect(() => {
        fetchItems();
    }, [statusFilter, searchQuery]);

    const fetchSession = async () => {
        try {
            setLoading(true);
            const response = await axios.get(
                `/api/business/${business_slug}/inventory/${session_id}/`
            );
            setSession(response.data);
        } catch (err) {
            console.error('Ошибка загрузки сессии:', err);
            alert(err.response?.data?.detail || 'Ошибка загрузки сессии');
        } finally {
            setLoading(false);
        }
    };

    const fetchItems = async () => {
        try {
            const params = {};
            if (statusFilter) params.status = statusFilter;
            if (searchQuery) params.search = searchQuery;

            const response = await axios.get(
                `/api/business/${business_slug}/inventory/${session_id}/items/`,
                { params }
            );
            setItems(response.data || []);
        } catch (err) {
            console.error('Ошибка загрузки позиций:', err);
        }
    };

    const handleStartInventory = async () => {
        if (!window.confirm('Начать инвентаризацию? Будут созданы позиции для всех товаров на складе.')) {
            return;
        }

        try {
            await axios.post(
                `/api/business/${business_slug}/inventory/${session_id}/start/`
            );
            fetchSession();
            fetchItems();
            if (scanInputRef.current) {
                scanInputRef.current.focus();
            }
        } catch (err) {
            console.error('Ошибка начала инвентаризации:', err);
            alert(err.response?.data?.detail || 'Ошибка начала инвентаризации');
        }
    };

    const handleCompleteInventory = async () => {
        if (!window.confirm('Завершить инвентаризацию? Это создаст корректировки остатков.')) {
            return;
        }

        try {
            await axios.post(
                `/api/business/${business_slug}/inventory/${session_id}/complete/`
            );
            fetchSession();
            alert('Инвентаризация завершена! Остатки скорректированы.');
        } catch (err) {
            console.error('Ошибка завершения инвентаризации:', err);
            alert(err.response?.data?.detail || 'Ошибка завершения инвентаризации');
        }
    };

    const handleScan = async (sku) => {
        if (!sku.trim()) return;

        try {
            const response = await axios.get(
                `/api/business/${business_slug}/locations/${session.location}/variants/`,
                { params: { sku: sku.trim() } }
            );

            if (response.data.length === 0) {
                alert('Товар с таким SKU не найден на этом складе');
                return;
            }

            const variantLocation = response.data[0];
            let item = items.find(i => i.variant_on_location === variantLocation.id);
            
            if (!item) {
                const createResponse = await axios.post(
                    `/api/business/${business_slug}/inventory/${session_id}/items/`,
                    {
                        variant_on_location: variantLocation.id,
                        counted_quantity: 0,
                    }
                );
                item = createResponse.data;
                setItems([...items, item]);
            }

            const quantityInput = document.getElementById(`quantity-${item.id}`);
            if (quantityInput) {
                quantityInput.focus();
                quantityInput.select();
            }
        } catch (err) {
            console.error('Ошибка поиска товара:', err);
            alert(err.response?.data?.detail || 'Ошибка поиска товара');
        }
    };

    const handleScanSubmit = (e) => {
        e.preventDefault();
        if (scanInput.trim()) {
            handleScan(scanInput);
            setScanInput('');
        }
    };

    const handleQuantityInputChange = (itemId, value) => {
        const currentItem = items.find(i => i.id === itemId);
        const unitDisplay = currentItem?.unit_display || 'шт.';
        const isPieces = unitDisplay === 'шт.';
        
        if (value === '' || value === null) {
            setLocalQuantities(prev => ({
                ...prev,
                [itemId]: ''
            }));
            return;
        }
        
        if (isPieces && value.includes('.')) {
            const intValue = Math.floor(parseFloat(value) || 0);
            setLocalQuantities(prev => ({
                ...prev,
                [itemId]: intValue.toString()
            }));
            return;
        }
        
        const numValue = parseFloat(value);
        if (!isNaN(numValue) && numValue >= 0) {
            setLocalQuantities(prev => ({
                ...prev,
                [itemId]: value
            }));
        }
    };

    const handleQuantityBlur = async (itemId) => {
        const localValue = localQuantities[itemId];
        const currentItem = items.find(i => i.id === itemId);
        const unitDisplay = currentItem?.unit_display || 'шт.';
        const isPieces = unitDisplay === 'шт.';
        
        let qty;
        
        if (localValue === '' || localValue === null || localValue === undefined) {
            qty = 0;
        } else {
            if (isPieces) {
                qty = Math.max(0, Math.floor(parseFloat(localValue) || 0));
            } else {
                const numValue = parseFloat(localValue) || 0;
                if (numValue < 0) {
                    qty = 0;
                } else {
                    qty = parseFloat(numValue.toFixed(3));
                }
            }
        }

        setLocalQuantities(prev => {
            const newState = { ...prev };
            delete newState[itemId];
            return newState;
        });

        const currentCounted = parseFloat(currentItem?.counted_quantity || 0);
        if (currentItem && Math.abs(currentCounted - qty) < 0.001) {
            return;
        }

        setUpdatingItem(itemId);
        try {
            let payloadValue;
            if (isPieces) {
                payloadValue = qty;
            } else {
                if (localValue !== '' && localValue !== null && localValue !== undefined) {
                    const numVal = parseFloat(localValue);
                    if (!isNaN(numVal) && numVal >= 0) {
                        payloadValue = numVal.toFixed(3);
                    } else {
                        payloadValue = qty.toFixed(3);
                    }
                } else {
                    payloadValue = qty.toFixed(3);
                }
            }
            
            const response = await axios.patch(
                `/api/business/${business_slug}/inventory/${session_id}/items/${itemId}/`,
                { counted_quantity: payloadValue }
            );
            
            setItems(items.map(i => 
                i.id === itemId ? response.data : i
            ));
            
            if (scanInputRef.current) {
                setTimeout(() => scanInputRef.current.focus(), 100);
            }
        } catch (err) {
            console.error('Ошибка обновления количества:', err);
            alert(err.response?.data?.detail || 'Ошибка обновления количества');
        } finally {
            setUpdatingItem(null);
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            match: styles.statusMatch,
            shortage: styles.statusShortage,
            surplus: styles.statusSurplus,
        };
        return colors[status] || styles.statusMatch;
    };

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <Loader size="large" />
            </div>
        );
    }

    if (!session) {
        return (
            <div className={styles.container}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Инвентаризация</h1>
                    <div style={{ width: '44px' }} />
                </div>
                <div className={styles.content}>
                    <div className={styles.error}>Сессия инвентаризации не найдена</div>
                </div>
            </div>
        );
    }

    const canEdit = session.status === 'draft' || session.status === 'in_progress';
    const isInProgress = session.status === 'in_progress';

    return (
        <div className={styles.container}>
            {/* Sticky Header */}
            <div className={styles.header}>
                <div className={styles.headerContent}>
                    <h1 className={styles.title}>{session.location_name}</h1>
                    <span className={`${styles.badge} ${styles[`status${session.status.charAt(0).toUpperCase() + session.status.slice(1)}`]}`}>
                        {session.status_display}
                    </span>
                </div>
                <div style={{ width: '44px' }} />
            </div>

            {/* Stats */}
            <div className={styles.stats}>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Всего</div>
                    <div className={styles.statValue}>{session.total_items || 0}</div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Совпадает</div>
                    <div className={`${styles.statValue} ${styles.statMatch}`}>
                        {session.matched_items || 0}
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Недостача</div>
                    <div className={`${styles.statValue} ${styles.statShortage}`}>
                        {session.shortage_items || 0}
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Излишек</div>
                    <div className={`${styles.statValue} ${styles.statSurplus}`}>
                        {session.surplus_items || 0}
                    </div>
                </div>
                {session.total_difference !== 0 && (
                    <div className={styles.statCard}>
                        <div className={styles.statLabel}>Разница</div>
                        <div className={`${styles.statValue} ${session.total_difference > 0 ? styles.statSurplus : styles.statShortage}`}>
                            {session.total_difference > 0 ? '+' : ''}{session.total_difference}
                        </div>
                    </div>
                )}
            </div>

            {/* Actions */}
            {session.status === 'draft' && (
                <div className={styles.actions}>
                    <button
                        className={styles.actionButton}
                        onClick={handleStartInventory}
                    >
                        <FaPlay /> Начать инвентаризацию
                    </button>
                </div>
            )}

            {isInProgress && (
                <div className={styles.actions}>
                    <button
                        className={styles.actionButtonSuccess}
                        onClick={handleCompleteInventory}
                    >
                        <FaCheck /> Завершить инвентаризацию
                    </button>
                </div>
            )}

            {/* Scan Section */}
            {isInProgress && (
                <div className={styles.scanSection}>
                    <form onSubmit={handleScanSubmit} className={styles.scanForm}>
                        <input
                            ref={scanInputRef}
                            type="text"
                            value={scanInput}
                            onChange={(e) => setScanInput(e.target.value)}
                            placeholder="Сканируйте штрихкод или введите SKU..."
                            className={styles.scanInput}
                            autoFocus
                        />
                        <button
                            type="submit"
                            className={styles.scanButton}
                        >
                            <FaSearch />
                        </button>
                    </form>
                </div>
            )}

            {/* Filters */}
            <div className={styles.filtersSection}>
                <form onSubmit={(e) => { e.preventDefault(); }} className={styles.searchForm}>
                    <div className={styles.searchInputGroup}>
                        <FaSearch className={styles.searchIcon} />
                        <input
                            type="text"
                            placeholder="Поиск по названию или SKU..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={styles.searchInput}
                        />
                    </div>
                </form>

                <button
                    className={styles.filterToggle}
                    onClick={() => setShowFilters(!showFilters)}
                >
                    <FaFilter /> {showFilters ? 'Скрыть фильтры' : 'Показать фильтры'}
                    {showFilters ? <FaChevronUp /> : <FaChevronDown />}
                </button>

                {showFilters && (
                    <div className={styles.filtersPanel}>
                        <div className={styles.filterRow}>
                            <label className={styles.filterLabel}>Статус</label>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className={styles.filterSelect}
                            >
                                <option value="">Все статусы</option>
                                <option value="match">Совпадает</option>
                                <option value="shortage">Недостача</option>
                                <option value="surplus">Излишек</option>
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {/* Items List */}
            <div className={styles.content}>
                <div className={styles.itemsList}>
                    {items.map(item => (
                        <div
                            key={item.id}
                            className={`${styles.itemCard} ${getStatusColor(item.status)}`}
                        >
                            <div className={styles.itemHeader}>
                                {item.main_image?.image && (
                                    <img
                                        src={getFileUrl(item.main_image.image)}
                                        alt={item.variant_name || item.product_name}
                                        className={styles.itemImage}
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                        }}
                                    />
                                )}
                                <div className={styles.itemInfo}>
                                    <h3>{item.variant_name || item.product_name}</h3>
                                    {item.variant_sku && (
                                        <span className={styles.sku}>SKU: {item.variant_sku}</span>
                                    )}
                                </div>
                                <span className={`${styles.badge} ${getStatusColor(item.status)}`}>
                                    {item.status_display}
                                </span>
                            </div>

                            <div className={styles.itemBody}>
                                <div className={styles.quantityRow}>
                                    <div className={styles.quantityItem}>
                                        <label>Ожидаемое:</label>
                                        <span className={styles.expectedQty}>
                                            {item.expected_quantity} {item.unit_display || 'шт.'}
                                        </span>
                                    </div>
                                    <div className={styles.quantityItem}>
                                        <label>Посчитано:</label>
                                        {canEdit ? (() => {
                                            const unitDisplay = item.unit_display || 'шт.';
                                            const isPieces = unitDisplay === 'шт.';
                                            const step = isPieces ? 1 : 0.5;
                                            
                                            return (
                                                <div className={styles.quantityInputWrapper}>
                                                    <input
                                                        id={`quantity-${item.id}`}
                                                        type="number"
                                                        min={0}
                                                        step={step}
                                                        value={localQuantities[item.id] !== undefined 
                                                            ? localQuantities[item.id] 
                                                            : (item.counted_quantity !== null && item.counted_quantity !== undefined 
                                                                ? (isPieces ? Math.floor(parseFloat(item.counted_quantity)) : parseFloat(item.counted_quantity))
                                                                : 0)}
                                                        onChange={(e) => handleQuantityInputChange(item.id, e.target.value)}
                                                        onBlur={() => handleQuantityBlur(item.id)}
                                                        className={styles.quantityInput}
                                                        disabled={updatingItem === item.id}
                                                    />
                                                    <span className={styles.unitDisplay}>
                                                        {unitDisplay}
                                                    </span>
                                                    {updatingItem === item.id && (
                                                        <FaSpinner className={styles.updateSpinner} />
                                                    )}
                                                </div>
                                            );
                                        })() : (
                                            <span className={styles.countedQty}>
                                                {item.counted_quantity || 0} {item.unit_display || 'шт.'}
                                            </span>
                                        )}
                                    </div>
                                    <div className={styles.quantityItem}>
                                        <label>Разница:</label>
                                        <span className={`${styles.differenceQty} ${item.difference > 0 ? styles.differenceSurplus : item.difference < 0 ? styles.differenceShortage : ''}`}>
                                            {item.difference > 0 ? '+' : ''}{item.difference} {item.unit_display || 'шт.'}
                                        </span>
                                    </div>
                                </div>

                                {item.notes && (
                                    <div className={styles.itemNotes}>
                                        <strong>Примечания:</strong> {item.notes}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {items.length === 0 && (
                        <div className={styles.emptyState}>
                            <FaWarehouse className={styles.emptyIcon} />
                            <p>
                                {session.status === 'draft' 
                                    ? 'Нажмите "Начать инвентаризацию" для создания позиций'
                                    : 'Нет позиций для отображения'
                                }
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InventorySessionPageMobile;

