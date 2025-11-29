import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../../api/axiosDefault';
import styles from './InventorySessionPage.module.css';
import Loader from '../../components/Loader';
import dayjs from 'dayjs';

const InventorySessionPage = () => {
    const { business_slug, session_id } = useParams();
    const navigate = useNavigate();
    
    const [session, setSession] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [scanInput, setScanInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [updatingItem, setUpdatingItem] = useState(null);
    const [localQuantities, setLocalQuantities] = useState({}); // Локальное состояние для значений ввода
    const scanInputRef = useRef(null);

    useEffect(() => {
        fetchSession();
        fetchItems();
    }, [business_slug, session_id]);

    // Фокус на поле сканирования при загрузке
    useEffect(() => {
        if (session?.status === 'in_progress' && scanInputRef.current) {
            scanInputRef.current.focus();
        }
    }, [session?.status]);

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

    useEffect(() => {
        fetchItems();
    }, [statusFilter, searchQuery]);

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
            // Ищем вариант по SKU
            const response = await axios.get(
                `/api/business/${business_slug}/locations/${session.location}/variants/`,
                { params: { sku: sku.trim() } }
            );

            if (response.data.length === 0) {
                alert('Товар с таким SKU не найден на этом складе');
                return;
            }

            const variantLocation = response.data[0];
            
            // Ищем или создаем позицию инвентаризации
            let item = items.find(i => i.variant_on_location === variantLocation.id);
            
            if (!item) {
                // Создаем новую позицию
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

            // Фокусируемся на поле ввода количества для этого товара
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

    // Обновление локального значения при вводе
    const handleQuantityInputChange = (itemId, value) => {
        const currentItem = items.find(i => i.id === itemId);
        const unitDisplay = currentItem?.unit_display || 'шт.';
        const isPieces = unitDisplay === 'шт.';
        
        // Разрешаем пустое значение для возможности очистки поля
        if (value === '' || value === null) {
            setLocalQuantities(prev => ({
                ...prev,
                [itemId]: ''
            }));
            return;
        }
        
        // Для штук - округляем вниз при вводе дробных значений
        if (isPieces && value.includes('.')) {
            const intValue = Math.floor(parseFloat(value) || 0);
            setLocalQuantities(prev => ({
                ...prev,
                [itemId]: intValue.toString()
            }));
            return;
        }
        
        // Разрешаем ввод только цифр и точки
        const numValue = parseFloat(value);
        if (!isNaN(numValue) && numValue >= 0) {
            setLocalQuantities(prev => ({
                ...prev,
                [itemId]: value
            }));
        }
    };

    // Сохранение значения на сервер при потере фокуса
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
                // Для штук - только целые числа
                qty = Math.max(0, Math.floor(parseFloat(localValue) || 0));
            } else {
                // Для других единиц - может быть дробным
                // Сохраняем точность, отправляем как строку для точной передачи
                const numValue = parseFloat(localValue) || 0;
                if (numValue < 0) {
                    qty = 0;
                } else {
                    // Используем toFixed для сохранения точности до 3 знаков
                    // но отправляем как строку, чтобы избежать потери точности
                    qty = parseFloat(numValue.toFixed(3));
                }
            }
        }

        // Очищаем локальное значение после сохранения
        setLocalQuantities(prev => {
            const newState = { ...prev };
            delete newState[itemId];
            return newState;
        });

        // Проверяем, изменилось ли значение
        const currentCounted = parseFloat(currentItem?.counted_quantity || 0);
        if (currentItem && Math.abs(currentCounted - qty) < 0.001) {
            return; // Значение не изменилось, не отправляем запрос
        }

        setUpdatingItem(itemId);
        try {
            // Для дробных значений отправляем строку для сохранения точности
            // DRF DecimalField правильно обработает строковое значение
            let payloadValue;
            if (isPieces) {
                payloadValue = qty;
            } else {
                // Используем исходное строковое значение, если оно есть
                if (localValue !== '' && localValue !== null && localValue !== undefined) {
                    // Берем исходное значение и нормализуем до 3 знаков после запятой
                    const numVal = parseFloat(localValue);
                    if (!isNaN(numVal) && numVal >= 0) {
                        // Форматируем до 3 знаков и отправляем как строку для точности
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
            
            // После обновления возвращаем фокус на поле сканирования
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

    const formatDate = (dateString) => {
        if (!dateString) return '';
        return dayjs(dateString).format('DD.MM.YYYY HH:mm');
    };

    if (loading) {
        return <Loader />;
    }

    if (!session) {
        return (
            <div className={styles.container}>
                <div className={styles.error}>Сессия инвентаризации не найдена</div>
                <button
                    className={styles.backButton}
                    onClick={() => navigate(`/business/${business_slug}/inventory`)}
                >
                    Вернуться к списку
                </button>
            </div>
        );
    }

    const canEdit = session.status === 'draft' || session.status === 'in_progress';
    const isInProgress = session.status === 'in_progress';

    return (
        <div className={styles.container}>
            {/* Заголовок */}
            <div className={styles.header}>
                <button
                    className={styles.backButton}
                    onClick={() => navigate(`/business/${business_slug}/inventory`)}
                >
                    <i className="fa fa-arrow-left"></i> Назад
                </button>
                <div className={styles.headerContent}>
                    <h1>{session.location_name}</h1>
                    <span className={`${styles.badge} ${styles[`status${session.status.charAt(0).toUpperCase() + session.status.slice(1)}`]}`}>
                        {session.status_display}
                    </span>
                </div>
            </div>

            {/* Статистика */}
            <div className={styles.stats}>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Всего позиций</div>
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
                        <div className={styles.statLabel}>Общая разница</div>
                        <div className={`${styles.statValue} ${session.total_difference > 0 ? styles.statSurplus : styles.statShortage}`}>
                            {session.total_difference > 0 ? '+' : ''}{session.total_difference}
                        </div>
                    </div>
                )}
            </div>

            {/* Действия */}
            {session.status === 'draft' && (
                <div className={styles.actions}>
                    <button
                        className={styles.actionButton}
                        onClick={handleStartInventory}
                    >
                        <i className="fa fa-play"></i> Начать инвентаризацию
                    </button>
                </div>
            )}

            {isInProgress && (
                <div className={styles.actions}>
                    <button
                        className={styles.actionButtonSuccess}
                        onClick={handleCompleteInventory}
                    >
                        <i className="fa fa-check"></i> Завершить инвентаризацию
                    </button>
                </div>
            )}

            {/* Поле сканирования */}
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
                            <i className="fa fa-search"></i> Найти
                        </button>
                    </form>
                </div>
            )}

            {/* Фильтры */}
            <div className={styles.filters}>
                <input
                    type="text"
                    placeholder="Поиск по названию или SKU..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={styles.searchInput}
                />
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

            {/* Список позиций */}
            <div className={styles.itemsList}>
                {items.map(item => (
                    <div
                        key={item.id}
                        className={`${styles.itemCard} ${getStatusColor(item.status)}`}
                    >
                        <div className={styles.itemHeader}>
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
                                        const minValue = 0;
                                        
                                        return (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <input
                                                    id={`quantity-${item.id}`}
                                                    type="number"
                                                    min={minValue}
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
                                                <span style={{ fontSize: '0.9em', color: 'var(--silver-whisper)' }}>
                                                    {unitDisplay}
                                                </span>
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
                        {session.status === 'draft' 
                            ? 'Нажмите "Начать инвентаризацию" для создания позиций'
                            : 'Нет позиций для отображения'
                        }
                    </div>
                )}
            </div>
        </div>
    );
};

export default InventorySessionPage;

