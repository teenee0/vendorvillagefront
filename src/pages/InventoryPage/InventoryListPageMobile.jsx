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
  FaSpinner,
  FaFilter,
  FaChevronDown,
  FaChevronUp,
  FaWarehouse
} from 'react-icons/fa';
import styles from './InventoryListPageMobile.module.css';
import Loader from '../../components/Loader';
import ModalCloseButton from '../../components/ModalCloseButton/ModalCloseButton';
import dayjs from 'dayjs';

const InventoryListPageMobile = () => {
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
    const [showFilters, setShowFilters] = useState(false);

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
        e.stopPropagation();
        
        if (!window.confirm('Вы уверены, что хотите удалить эту инвентаризацию?')) {
            return;
        }

        try {
            setDeletingId(inventoryId);
            await axios.delete(
                `/api/business/${business_slug}/inventory/${inventoryId}/`
            );
            fetchInventories();
        } catch (err) {
            console.error('Ошибка удаления инвентаризации:', err);
            alert(err.response?.data?.detail || 'Ошибка удаления инвентаризации');
        } finally {
            setDeletingId(null);
        }
    };

    if (loading && inventories.length === 0) {
        return (
            <div className={styles.loadingContainer}>
                <Loader size="large" />
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Sticky Header */}
            <div className={styles.header}>
                <h1 className={styles.title}>Инвентаризация</h1>
                <button
                    className={styles.createButton}
                    onClick={() => setModalOpen(true)}
                >
                    <FaPlus />
                </button>
            </div>

            {/* Search and Filters */}
            <div className={styles.filtersSection}>
                <form onSubmit={(e) => { e.preventDefault(); }} className={styles.searchForm}>
                    <div className={styles.searchInputGroup}>
                        <FaSearch className={styles.searchIcon} />
                        <input
                            type="text"
                            placeholder="Поиск по складу или примечаниям..."
                            value={filters.search}
                            onChange={(e) => setFilters({...filters, search: e.target.value})}
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
                        </div>

                        <div className={styles.filterRow}>
                            <label className={styles.filterLabel}>Склад</label>
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
                    </div>
                )}
            </div>

            {/* Content */}
            <div className={styles.content}>
                <div className={styles.inventoryList}>
                    {inventories.map(inventory => (
                        <div
                            key={inventory.id}
                            className={styles.inventoryCard}
                            onClick={() => navigate(`/business/${business_slug}/inventory/${inventory.id}`)}
                        >
                            <div className={styles.cardHeader}>
                                <div className={styles.cardHeaderLeft}>
                                    <div className={styles.locationName}>
                                        <FaWarehouse className={styles.locationIcon} />
                                        <h3>{inventory.location_name}</h3>
                                    </div>
                                    <span className={`${styles.badge} ${getStatusColor(inventory.status)}`}>
                                        {inventory.status_display}
                                    </span>
                                </div>
                                    <button
                                        className={styles.deleteButton}
                                        onClick={(e) => handleDeleteInventory(e, inventory.id, inventory.status)}
                                        disabled={deletingId === inventory.id}
                                        title="Удалить инвентаризацию"
                                    >
                                        {deletingId === inventory.id ? (
                                            <FaSpinner className={styles.spinner} />
                                        ) : (
                                            <FaTrash />
                                        )}
                                    </button>
                            </div>

                            {inventory.notes && (
                                <div className={styles.notes}>
                                    {inventory.notes}
                                </div>
                            )}

                            <div className={styles.stats}>
                                <div className={styles.statRow}>
                                    <div className={styles.statItem}>
                                        <span className={styles.statLabel}>Всего:</span>
                                        <span className={styles.statValue}>{inventory.total_items || 0}</span>
                                    </div>
                                    <div className={styles.statItem}>
                                        <span className={styles.statLabel}>Совпадает:</span>
                                        <span className={`${styles.statValue} ${styles.statMatch}`}>
                                            {inventory.matched_items || 0}
                                        </span>
                                    </div>
                                </div>
                                <div className={styles.statRow}>
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
                                </div>
                                {inventory.total_difference !== 0 && (
                                    <div className={styles.statRow}>
                                        <div className={styles.statItem}>
                                            <span className={styles.statLabel}>Разница:</span>
                                            <span className={`${styles.statValue} ${inventory.total_difference > 0 ? styles.statSurplus : styles.statShortage}`}>
                                                {inventory.total_difference > 0 ? '+' : ''}{inventory.total_difference}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className={styles.meta}>
                                <div className={styles.metaItem}>
                                    <FaClock />
                                    <span>Создано: {formatDate(inventory.created_at)}</span>
                                </div>
                                {inventory.started_at && (
                                    <div className={styles.metaItem}>
                                        <FaClock />
                                        <span>Начато: {formatDate(inventory.started_at)}</span>
                                    </div>
                                )}
                                {inventory.completed_at && (
                                    <div className={styles.metaItem}>
                                        <FaCheck />
                                        <span>Завершено: {formatDate(inventory.completed_at)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {inventories.length === 0 && !loading && (
                        <div className={styles.emptyState}>
                            <FaWarehouse className={styles.emptyIcon} />
                            <p>Нет инвентаризаций</p>
                            <button
                                className={styles.emptyButton}
                                onClick={() => setModalOpen(true)}
                            >
                                <FaPlus /> Создать инвентаризацию
                            </button>
                        </div>
                    )}
                </div>

                {/* Pagination */}
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
                            {pagination.page} / {pagination.total_pages}
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

            {/* Create Modal */}
            {modalOpen && (
                <div className={styles.modalOverlay} onClick={() => setModalOpen(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>Начать инвентаризацию</h2>
                            <ModalCloseButton onClick={() => setModalOpen(false)} />
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.formRow}>
                                <label>
                                    Склад/Локация *
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
                                </label>
                            </div>
                            <div className={styles.formRow}>
                                <label>
                                    Примечания
                                    <textarea
                                        value={newInventory.notes}
                                        onChange={(e) => setNewInventory({...newInventory, notes: e.target.value})}
                                        rows={4}
                                        className={styles.formTextarea}
                                        placeholder="Дополнительная информация..."
                                    />
                                </label>
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

export default InventoryListPageMobile;

