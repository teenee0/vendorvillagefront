import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../../api/axiosDefault';
import {
  FaPlus,
  FaSearch,
  FaTimes,
  FaTrash,
  FaChevronLeft,
  FaChevronRight,
  FaClock,
  FaCheck,
  FaSpinner
} from 'react-icons/fa';
import styles from './InventoryListPage.module.css';
import Loader from '../../components/Loader';
import dayjs from 'dayjs';

const InventoryListPage = () => {
    const { business_slug } = useParams();
    const navigate = useNavigate();
    
    const [inventories, setInventories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [locations, setLocations] = useState([]);
    const [filters, setFilters] = useState({
        status: '',
        location: '',
        search: '',
    });
    const [pagination, setPagination] = useState({
        page: 1,
        page_size: 20,
        total_pages: 1,
        count: 0,
    });
    const [modalOpen, setModalOpen] = useState(false);
    const [newInventory, setNewInventory] = useState({
        location: '',
        notes: '',
    });
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    useEffect(() => {
        fetchInventories();
        fetchLocations();
    }, [business_slug, filters, pagination.page]);

    const fetchInventories = async () => {
        try {
            setLoading(true);
            const params = {
                page: pagination.page,
                page_size: pagination.page_size,
                ...filters,
            };
            const response = await axios.get(
                `/api/business/${business_slug}/inventory/`,
                { params }
            );
            setInventories(response.data.results || []);
            setPagination(prev => ({
                ...prev,
                total_pages: response.data.total_pages || 1,
                count: response.data.count || 0,
            }));
        } catch (err) {
            console.error('Ошибка загрузки инвентаризаций:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchLocations = async () => {
        try {
            const response = await axios.get(
                `/api/business/${business_slug}/locations/`
            );
            setLocations(response.data || []);
        } catch (err) {
            console.error('Ошибка загрузки локаций:', err);
        }
    };

    const handleCreateInventory = async () => {
        if (!newInventory.location) {
            alert('Выберите локацию');
            return;
        }

        try {
            setSaving(true);
            const response = await axios.post(
                `/api/business/${business_slug}/inventory/`,
                newInventory
            );
            setModalOpen(false);
            setNewInventory({ location: '', notes: '' });
            navigate(`/business/${business_slug}/inventory/${response.data.id}`);
        } catch (err) {
            console.error('Ошибка создания инвентаризации:', err);
            alert(err.response?.data?.detail || 'Ошибка создания инвентаризации');
        } finally {
            setSaving(false);
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            draft: styles.statusDraft,
            in_progress: styles.statusInProgress,
            completed: styles.statusCompleted,
            cancelled: styles.statusCancelled,
        };
        return colors[status] || styles.statusDraft;
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        return dayjs(dateString).format('DD.MM.YYYY HH:mm');
    };

    const handleDeleteInventory = async (e, inventoryId, status) => {
        e.stopPropagation(); // Предотвращаем переход на страницу деталей
        
        if (!window.confirm('Вы уверены, что хотите удалить эту инвентаризацию?')) {
            return;
        }

        try {
            setDeletingId(inventoryId);
            await axios.delete(
                `/api/business/${business_slug}/inventory/${inventoryId}/`
            );
            fetchInventories(); // Обновляем список
        } catch (err) {
            console.error('Ошибка удаления инвентаризации:', err);
            alert(err.response?.data?.detail || 'Ошибка удаления инвентаризации');
        } finally {
            setDeletingId(null);
        }
    };

    if (loading && inventories.length === 0) {
        return <Loader />;
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Инвентаризация</h1>
                <div className={styles.businessInfo}>
                    <span>Бизнес: {business_slug}</span>
                </div>
                <button
                    className={styles.createButton}
                    onClick={() => setModalOpen(true)}
                >
                    <FaPlus /> Начать инвентаризацию
                </button>
            </div>

            <div className={styles.content}>
            {/* Фильтры */}
            <div className={styles.filters}>
                    <div className={styles.searchBar}>
                        <form onSubmit={(e) => { e.preventDefault(); }}>
                <input
                    type="text"
                    placeholder="Поиск по складу или примечаниям..."
                    value={filters.search}
                    onChange={(e) => setFilters({...filters, search: e.target.value})}
                    className={styles.searchInput}
                />
                            <button type="submit">
                                <FaSearch />
                            </button>
                        </form>
                    </div>
                <select
                    value={filters.status}
                    onChange={(e) => setFilters({...filters, status: e.target.value})}
                    className={styles.filterSelect}
                >
                    <option value="">Все статусы</option>
                    <option value="draft">Черновик</option>
                    <option value="in_progress">В процессе</option>
                    <option value="completed">Завершена</option>
                    <option value="cancelled">Отменена</option>
                </select>
                <select
                    value={filters.location}
                    onChange={(e) => setFilters({...filters, location: e.target.value})}
                    className={styles.filterSelect}
                >
                    <option value="">Все склады</option>
                    {locations.map(loc => (
                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                </select>
            </div>

            {/* Список инвентаризаций */}
            <div className={styles.inventoryList}>
                {inventories.map(inventory => (
                    <div
                        key={inventory.id}
                        className={styles.inventoryCard}
                        onClick={() => navigate(`/business/${business_slug}/inventory/${inventory.id}`)}
                    >
                        <div className={styles.cardHeader}>
                            <div className={styles.cardHeaderLeft}>
                                <h3>{inventory.location_name}</h3>
                                <span className={`${styles.badge} ${getStatusColor(inventory.status)}`}>
                                    {inventory.status_display}
                                </span>
                            </div>
                            <div className={styles.cardHeaderRight}>
                                <span className={styles.date}>
                                    {formatDate(inventory.created_at)}
                                </span>
                                    <button
                                        className={styles.deleteButton}
                                        onClick={(e) => handleDeleteInventory(e, inventory.id, inventory.status)}
                                        disabled={deletingId === inventory.id}
                                        title="Удалить инвентаризацию"
                                    >
                                        {deletingId === inventory.id ? (
                                            <FaSpinner style={{ animation: 'spin 1s linear infinite' }} />
                                        ) : (
                                            <FaTrash />
                                        )}
                                    </button>
                            </div>
                        </div>

                        {inventory.notes && (
                            <div className={styles.notes}>
                                {inventory.notes}
                            </div>
                        )}

                        <div className={styles.stats}>
                            <div className={styles.statItem}>
                                <span className={styles.statLabel}>Всего позиций:</span>
                                <span className={styles.statValue}>{inventory.total_items || 0}</span>
                            </div>
                            <div className={styles.statItem}>
                                <span className={styles.statLabel}>Совпадает:</span>
                                <span className={`${styles.statValue} ${styles.statMatch}`}>
                                    {inventory.matched_items || 0}
                                </span>
                            </div>
                            <div className={styles.statItem}>
                                <span className={styles.statLabel}>Недостача:</span>
                                <span className={`${styles.statValue} ${styles.statShortage}`}>
                                    {inventory.shortage_items || 0}
                                </span>
                            </div>
                            <div className={styles.statItem}>
                                <span className={styles.statLabel}>Излишек:</span>
                                <span className={`${styles.statValue} ${styles.statSurplus}`}>
                                    {inventory.surplus_items || 0}
                                </span>
                            </div>
                            {inventory.total_difference !== 0 && (
                                <div className={styles.statItem}>
                                    <span className={styles.statLabel}>Разница:</span>
                                    <span className={`${styles.statValue} ${inventory.total_difference > 0 ? styles.statSurplus : styles.statShortage}`}>
                                        {inventory.total_difference > 0 ? '+' : ''}{inventory.total_difference}
                                    </span>
                                </div>
                            )}
                        </div>

                        {inventory.started_at && (
                            <div className={styles.meta}>
                                <FaClock />
                                Начато: {formatDate(inventory.started_at)}
                            </div>
                        )}
                        {inventory.completed_at && (
                            <div className={styles.meta}>
                                <FaCheck />
                                Завершено: {formatDate(inventory.completed_at)}
                            </div>
                        )}
                    </div>
                ))}

                {inventories.length === 0 && !loading && (
                    <div className={styles.emptyState}>
                        Нет инвентаризаций
                    </div>
                )}
            </div>

            {/* Пагинация */}
            {pagination.total_pages > 1 && (
                <div className={styles.pagination}>
                    <button
                        onClick={() => setPagination({...pagination, page: pagination.page - 1})}
                        disabled={pagination.page === 1}
                        className={styles.pageButton}
                    >
                            <FaChevronLeft />
                    </button>
                    <span className={styles.pageInfo}>
                        Страница {pagination.page} из {pagination.total_pages}
                    </span>
                    <button
                        onClick={() => setPagination({...pagination, page: pagination.page + 1})}
                        disabled={pagination.page >= pagination.total_pages}
                        className={styles.pageButton}
                    >
                            <FaChevronRight />
                    </button>
                </div>
            )}
            </div>

            {/* Модальное окно создания */}
            {modalOpen && (
                <div className={styles.modalOverlay} onClick={() => setModalOpen(false)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>Начать инвентаризацию</h2>
                            <button
                                className={styles.closeButton}
                                onClick={() => setModalOpen(false)}
                            >
                                <FaTimes />
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.formGroup}>
                                <label>Склад/Локация *</label>
                                <select
                                    value={newInventory.location}
                                    onChange={(e) => setNewInventory({...newInventory, location: e.target.value})}
                                    className={styles.formSelect}
                                >
                                    <option value="">Выберите склад</option>
                                    {locations.map(loc => (
                                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className={styles.formGroup}>
                                <label>Примечания</label>
                                <textarea
                                    value={newInventory.notes}
                                    onChange={(e) => setNewInventory({...newInventory, notes: e.target.value})}
                                    rows={4}
                                    className={styles.formTextarea}
                                    placeholder="Дополнительная информация..."
                                />
                            </div>
                        </div>
                        <div className={styles.modalFooter}>
                            <button
                                className={styles.cancelButton}
                                onClick={() => setModalOpen(false)}
                            >
                                Отмена
                            </button>
                            <button
                                className={styles.saveButton}
                                onClick={handleCreateInventory}
                                disabled={saving || !newInventory.location}
                            >
                                {saving ? 'Создание...' : 'Создать'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InventoryListPage;

