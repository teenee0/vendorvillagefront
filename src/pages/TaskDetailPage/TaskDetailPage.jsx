import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../../api/axiosDefault';
import {
  FaArrowLeft,
  FaCalendar,
  FaClock,
  FaFileAlt,
  FaTasks,
  FaCheckSquare,
  FaPaperclip,
  FaComments,
  FaInfoCircle,
  FaCog,
  FaEdit,
  FaCheck,
  FaExchangeAlt,
  FaTrash,
  FaTimes,
  FaFile,
  FaExternalLinkAlt,
  FaPlus,
  FaCaretDown,
  FaMapMarkerAlt,
  FaUser,
  FaEnvelope,
  FaPaperPlane
} from 'react-icons/fa';
import styles from './TaskDetailPage.module.css';
import Loader from '../../components/Loader';
import dayjs from 'dayjs';

const TaskDetailPage = () => {
    const { business_slug, task_id } = useParams();
    const navigate = useNavigate();
    
    const [task, setTask] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [comments, setComments] = useState([]);
    const [checklistItems, setChecklistItems] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [newChecklistItem, setNewChecklistItem] = useState('');
    const [savingComment, setSavingComment] = useState(false);
    const [savingChecklist, setSavingChecklist] = useState(false);
    const [locations, setLocations] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [transferModalOpen, setTransferModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [taskForm, setTaskForm] = useState({
        title: '',
        description: '',
        priority: 'medium',
        status: 'todo',
        due_date: '',
        location: '',
        assignee_ids: [],
    });
    const [transferAssigneeIds, setTransferAssigneeIds] = useState([]);
    const [quickEditType, setQuickEditType] = useState(null); // 'status' or 'priority'

    useEffect(() => {
        fetchTask();
        fetchComments();
        fetchChecklist();
        fetchLocations();
        fetchEmployees();
    }, [business_slug, task_id]);

    // Закрываем выпадающее меню при клике вне его
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (quickEditType && !event.target.closest(`.${styles.badgeWrapper}`)) {
                setQuickEditType(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [quickEditType]);

    const fetchTask = async () => {
        try {
            setLoading(true);
            const response = await axios.get(
                `/api/business/${business_slug}/tasks/${task_id}/`
            );
            setTask(response.data);
        } catch (err) {
            console.error('Ошибка загрузки задачи:', err);
            setError(err.response?.data?.detail || 'Ошибка загрузки задачи');
        } finally {
            setLoading(false);
        }
    };

    const fetchComments = async () => {
        try {
            const response = await axios.get(
                `/api/business/${business_slug}/tasks/${task_id}/comments/`
            );
            setComments(response.data || []);
        } catch (err) {
            console.error('Ошибка загрузки комментариев:', err);
        }
    };

    const fetchChecklist = async () => {
        try {
            const response = await axios.get(
                `/api/business/${business_slug}/tasks/${task_id}/checklist/`
            );
            setChecklistItems(response.data || []);
        } catch (err) {
            console.error('Ошибка загрузки чек-листа:', err);
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

    const fetchEmployees = async () => {
        try {
            const response = await axios.get(
                `/api/business/${business_slug}/employees/`
            );
            const employeesList = (response.data || []).map(emp => ({
                id: emp.user,
                name: emp.name || emp.full_name || 'Без имени',
                email: emp.user_email || '',
            }));
            setEmployees(employeesList);
        } catch (err) {
            console.error('Ошибка загрузки сотрудников:', err);
        }
    };

    const handleAddComment = async () => {
        if (!newComment.trim()) return;

        try {
            setSavingComment(true);
            const response = await axios.post(
                `/api/business/${business_slug}/tasks/${task_id}/comments/`,
                { text: newComment }
            );
            setComments([...comments, response.data]);
            setNewComment('');
        } catch (err) {
            console.error('Ошибка добавления комментария:', err);
            alert(err.response?.data?.detail || 'Ошибка добавления комментария');
        } finally {
            setSavingComment(false);
        }
    };

    const handleAddChecklistItem = async () => {
        if (!newChecklistItem.trim()) return;

        try {
            setSavingChecklist(true);
            const response = await axios.post(
                `/api/business/${business_slug}/tasks/${task_id}/checklist/`,
                { 
                    text: newChecklistItem,
                    order: checklistItems.length 
                }
            );
            setChecklistItems([...checklistItems, response.data]);
            setNewChecklistItem('');
            fetchTask(); // Обновляем прогресс
        } catch (err) {
            console.error('Ошибка добавления пункта:', err);
            alert(err.response?.data?.detail || 'Ошибка добавления пункта');
        } finally {
            setSavingChecklist(false);
        }
    };

    const handleToggleChecklistItem = async (item) => {
        try {
            const response = await axios.patch(
                `/api/business/${business_slug}/tasks/${task_id}/checklist/${item.id}/`,
                { is_completed: !item.is_completed }
            );
            setChecklistItems(checklistItems.map(i => 
                i.id === item.id ? response.data : i
            ));
            fetchTask(); // Обновляем прогресс
        } catch (err) {
            console.error('Ошибка обновления пункта:', err);
            alert(err.response?.data?.detail || 'Ошибка обновления пункта');
        }
    };

    const handleDeleteChecklistItem = async (itemId) => {
        if (!window.confirm('Удалить пункт?')) return;

        try {
            await axios.delete(
                `/api/business/${business_slug}/tasks/${task_id}/checklist/${itemId}/`
            );
            setChecklistItems(checklistItems.filter(i => i.id !== itemId));
            fetchTask(); // Обновляем прогресс
        } catch (err) {
            console.error('Ошибка удаления пункта:', err);
            alert(err.response?.data?.detail || 'Ошибка удаления пункта');
        }
    };

    const handleEditTask = () => {
        if (!task) return;
        setTaskForm({
            title: task.title,
            description: task.description || '',
            priority: task.priority,
            status: task.status,
            due_date: task.due_date ? task.due_date.split('T')[0] : '',
            location: task.location_id || '',
            assignee_ids: task.assignees.map(a => a.id),
        });
        setEditModalOpen(true);
    };

    const handleSaveTask = async () => {
        try {
            setSaving(true);
            const data = {
                ...taskForm,
                location: taskForm.location || null,
                due_date: taskForm.due_date ? taskForm.due_date : null,
            };

            await axios.patch(
                `/api/business/${business_slug}/tasks/${task_id}/`,
                data
            );

            setEditModalOpen(false);
            fetchTask();
        } catch (err) {
            console.error('Ошибка сохранения задачи:', err);
            alert(err.response?.data?.detail || 'Ошибка сохранения задачи');
        } finally {
            setSaving(false);
        }
    };

    const handleCompleteTask = async () => {
        if (!window.confirm('Завершить задачу?')) return;

        try {
            await axios.patch(
                `/api/business/${business_slug}/tasks/${task_id}/`,
                { status: 'done' }
            );
            fetchTask();
        } catch (err) {
            console.error('Ошибка завершения задачи:', err);
            alert(err.response?.data?.detail || 'Ошибка завершения задачи');
        }
    };

    const handleTransferTask = () => {
        if (!task) return;
        setTransferAssigneeIds(task.assignees.map(a => a.id));
        setTransferModalOpen(true);
    };

    const handleSaveTransfer = async () => {
        try {
            setSaving(true);
            await axios.patch(
                `/api/business/${business_slug}/tasks/${task_id}/`,
                { assignee_ids: transferAssigneeIds }
            );
            setTransferModalOpen(false);
            fetchTask();
        } catch (err) {
            console.error('Ошибка передачи задачи:', err);
            alert(err.response?.data?.detail || 'Ошибка передачи задачи');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteTask = async () => {
        if (!window.confirm('Вы уверены, что хотите удалить эту задачу? Это действие нельзя отменить.')) return;

        try {
            await axios.delete(
                `/api/business/${business_slug}/tasks/${task_id}/`
            );
            navigate(`/business/${business_slug}/tasks`);
        } catch (err) {
            console.error('Ошибка удаления задачи:', err);
            alert(err.response?.data?.detail || 'Ошибка удаления задачи');
        }
    };

    const toggleAssignee = (assigneeId) => {
        setTransferAssigneeIds(prev => 
            prev.includes(assigneeId)
                ? prev.filter(id => id !== assigneeId)
                : [...prev, assigneeId]
        );
    };

    const handleQuickStatusChange = async (newStatus) => {
        try {
            await axios.patch(
                `/api/business/${business_slug}/tasks/${task_id}/`,
                { status: newStatus }
            );
            setQuickEditType(null);
            fetchTask();
        } catch (err) {
            console.error('Ошибка изменения статуса:', err);
            alert(err.response?.data?.detail || 'Ошибка изменения статуса');
        }
    };

    const handleQuickPriorityChange = async (newPriority) => {
        try {
            await axios.patch(
                `/api/business/${business_slug}/tasks/${task_id}/`,
                { priority: newPriority }
            );
            setQuickEditType(null);
            fetchTask();
        } catch (err) {
            console.error('Ошибка изменения приоритета:', err);
            alert(err.response?.data?.detail || 'Ошибка изменения приоритета');
        }
    };

    const getStatusOptions = () => [
        { value: 'todo', label: 'К выполнению', color: '#969696' },
        { value: 'in_progress', label: 'В работе', color: '#6496ff' },
        { value: 'review', label: 'На проверке', color: '#ffc864' },
        { value: 'done', label: 'Выполнено', color: '#64c864' },
        { value: 'cancelled', label: 'Отменено', color: '#ff4757' },
    ];

    const getPriorityOptions = () => [
        { value: 'low', label: 'Низкий', color: '#64c864' },
        { value: 'medium', label: 'Средний', color: '#d4af37' },
        { value: 'high', label: 'Высокий', color: '#ffa500' },
        { value: 'critical', label: 'Критический', color: '#ff4757' },
    ];

    const formatDate = (dateString) => {
        if (!dateString) return '';
        return dayjs(dateString).format('DD.MM.YYYY HH:mm');
    };

    const getPriorityColor = (priority) => {
        const colors = {
            low: styles.priorityLow,
            medium: styles.priorityMedium,
            high: styles.priorityHigh,
            critical: styles.priorityCritical,
        };
        return colors[priority] || styles.priorityMedium;
    };

    const getStatusColor = (status) => {
        const colors = {
            todo: styles.statusTodo,
            in_progress: styles.statusInProgress,
            review: styles.statusReview,
            done: styles.statusDone,
            cancelled: styles.statusCancelled,
        };
        return colors[status] || styles.statusTodo;
    };

    const getInitials = (name) => {
        if (!name) return '?';
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
                <Loader size="large" />
            </div>
        );
    }

    if (error || !task) {
        return (
            <div className={styles.container}>
                <div className={styles.error}>
                    {error || 'Задача не найдена'}
                </div>
                <button
                    className={styles.backButton}
                    onClick={() => navigate(`/business/${business_slug}/tasks`)}
                >
                    <FaArrowLeft /> Вернуться к списку задач
                </button>
            </div>
        );
    }

    const location = locations.find(loc => loc.id === task.location_id);
    const progress = task.progress || { completed: 0, total: 0, percentage: 0 };

    return (
        <div className={styles.container}>
            {/* Заголовок задачи */}
            <div className={styles.taskHeader}>
                <button
                    className={styles.backButtonHeader}
                    onClick={() => navigate(`/business/${business_slug}/tasks`)}
                >
                    <FaArrowLeft /> Назад
                </button>
                <div className={styles.taskHeaderContent}>
                    <div className={styles.taskHeaderLeft}>
                        <h1>{task.title}</h1>
                        <div className={styles.taskHeaderBadges}>
                            <span className={`${styles.badge} ${getStatusColor(task.status)}`}>
                                {task.status_display}
                            </span>
                            <span className={`${styles.badge} ${getPriorityColor(task.priority)}`}>
                                {task.priority_display}
                            </span>
                        </div>
                    </div>
                    <div className={styles.taskHeaderRight}>
                        {task.created_at && (
                            <div className={styles.taskHeaderMeta}>
                                <FaCalendar />
                                <span>Создано: {formatDate(task.created_at)}</span>
                            </div>
                        )}
                        {task.due_date && (
                            <div className={styles.taskHeaderMeta}>
                                <FaClock />
                                <span>Дедлайн: {formatDate(task.due_date)}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className={styles.content}>
                {/* Основная информация */}
                <div className={styles.mainColumn}>
                    {/* Описание */}
                    {task.description && (
                        <div className={styles.card}>
                            <div className={styles.cardHeader}>
                                <FaFileAlt />
                                <h3>Описание задачи</h3>
                            </div>
                            <div className={styles.cardBody}>
                                <div className={styles.descriptionText}>
                                    {task.description.split('\n').map((line, idx) => (
                                        <p key={idx}>{line || '\u00A0'}</p>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Прогресс выполнения */}
                    {progress.total > 0 && (
                        <div className={styles.card}>
                            <div className={styles.cardHeader}>
                                <FaTasks />
                                <h3>Прогресс выполнения</h3>
                            </div>
                            <div className={styles.cardBody}>
                                <div className={styles.progressSection}>
                                    <div className={styles.progressInfo}>
                                        <span>Выполнение задачи</span>
                                        <span className={styles.progressPercentage}>
                                            {progress.percentage}%
                                        </span>
                                    </div>
                                    <div className={styles.progressBar}>
                                        <div 
                                            className={styles.progressBarFill}
                                            style={{ width: `${progress.percentage}%` }}
                                        ></div>
                                    </div>
                                    <div className={styles.progressStats}>
                                        {progress.completed} из {progress.total} пунктов выполнено
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Чек-лист */}
                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <FaCheckSquare />
                            <h3>Чек-лист</h3>
                        </div>
                        <div className={styles.cardBody}>
                            <div className={styles.checklistList}>
                                {checklistItems.map(item => (
                                    <div key={item.id} className={styles.checklistItem}>
                                        <label className={styles.checklistLabel}>
                                            <input
                                                type="checkbox"
                                                checked={item.is_completed}
                                                onChange={() => handleToggleChecklistItem(item)}
                                                className={styles.checklistCheckbox}
                                            />
                                            <span className={`${styles.checklistText} ${item.is_completed ? styles.checklistTextCompleted : ''}`}>
                                                {item.text}
                                            </span>
                                        </label>
                                        <button
                                            className={styles.checklistDelete}
                                            onClick={() => handleDeleteChecklistItem(item.id)}
                                            title="Удалить"
                                        >
                                            <FaTimes />
                                        </button>
                                    </div>
                                ))}
                                {checklistItems.length === 0 && (
                                    <div className={styles.emptyChecklist}>
                                        Пока нет пунктов в чек-листе
                                    </div>
                                )}
                            </div>
                            <div className={styles.checklistForm}>
                                <input
                                    type="text"
                                    value={newChecklistItem}
                                    onChange={(e) => setNewChecklistItem(e.target.value)}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                            handleAddChecklistItem();
                                        }
                                    }}
                                    placeholder="Добавить пункт..."
                                    className={styles.checklistInput}
                                />
                                <button
                                    onClick={handleAddChecklistItem}
                                    disabled={!newChecklistItem.trim() || savingChecklist}
                                    className={styles.checklistAddButton}
                                >
                                    {savingChecklist ? '...' : <FaPlus />}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Файлы */}
                    {task.files && task.files.length > 0 && (
                        <div className={styles.card}>
                            <div className={styles.cardHeader}>
                                <FaPaperclip />
                                <h3>Вложения</h3>
                            </div>
                            <div className={styles.cardBody}>
                                <div className={styles.filesList}>
                                    {task.files.map(file => (
                                        <a
                                            key={file.id}
                                            href={file.file_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={styles.fileItem}
                                        >
                                            <FaFile />
                                            <span>{file.name}</span>
                                            <FaExternalLinkAlt />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Комментарии */}
                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <FaComments />
                            <h3>Комментарии ({comments.length})</h3>
                        </div>
                        <div className={styles.cardBody}>
                            <div className={styles.commentsList}>
                                {comments.map(comment => (
                                    <div key={comment.id} className={styles.comment}>
                                        <div className={styles.commentAvatar}>
                                            {getInitials(comment.author_name)}
                                        </div>
                                        <div className={styles.commentContent}>
                                            <div className={styles.commentHeader}>
                                                <span className={styles.commentAuthor}>
                                                    {comment.author_name}
                                                </span>
                                                <span className={styles.commentDate}>
                                                    {formatDate(comment.created_at)}
                                                </span>
                                            </div>
                                            <div className={styles.commentText}>
                                                {comment.text}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {comments.length === 0 && (
                                    <div className={styles.noComments}>
                                        Пока нет комментариев
                                    </div>
                                )}
                            </div>
                            <div className={styles.commentForm}>
                                <textarea
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder="Введите ваш комментарий..."
                                    rows={4}
                                    className={styles.commentInput}
                                />
                                <div className={styles.commentFormActions}>
                                    <button
                                        onClick={handleAddComment}
                                        disabled={!newComment.trim() || savingComment}
                                        className={styles.commentButton}
                                    >
                                        <FaPaperPlane /> Отправить
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Боковая панель */}
                <div className={styles.sidebar}>
                    {/* Информация */}
                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <FaInfoCircle />
                            <h3>Информация</h3>
                        </div>
                        <div className={styles.cardBody}>
                            {task.assignees && task.assignees.length > 0 && (
                                <div className={styles.infoItem}>
                                    <label>Исполнители:</label>
                                    <div className={styles.assigneesList}>
                                        {task.assignees.map(assignee => (
                                            <div key={assignee.id} className={styles.assigneeItem}>
                                                <div className={styles.assigneeAvatar}>
                                                    {getInitials(assignee.name)}
                                                </div>
                                                <span>{assignee.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            {task.created_by_name && (
                                <div className={styles.infoItem}>
                                    <label>Создатель:</label>
                                    <div className={styles.assigneeItem}>
                                        <div className={styles.assigneeAvatar}>
                                            {getInitials(task.created_by_name)}
                                        </div>
                                        <span>{task.created_by_name}</span>
                                    </div>
                                </div>
                            )}

                            <div className={styles.infoItem}>
                                <label>Приоритет:</label>
                                <div className={styles.badgeWrapper} style={{ position: 'relative' }}>
                                    <span 
                                        className={`${styles.badge} ${getPriorityColor(task.priority)} ${styles.clickableBadge}`}
                                        onClick={() => setQuickEditType(quickEditType === 'priority' ? null : 'priority')}
                                    >
                                        {task.priority_display}
                                        <FaCaretDown style={{ marginLeft: '8px', fontSize: '12px' }} />
                                    </span>
                                    {quickEditType === 'priority' && (
                                        <div className={styles.quickEditDropdown} onClick={(e) => e.stopPropagation()}>
                                            {getPriorityOptions().map(option => (
                                                <div
                                                    key={option.value}
                                                    className={`${styles.quickEditOption} ${task.priority === option.value ? styles.active : ''}`}
                                                    onClick={() => handleQuickPriorityChange(option.value)}
                                                    style={{ borderLeftColor: option.color }}
                                                >
                                                    {option.label}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className={styles.infoItem}>
                                <label>Статус:</label>
                                <div className={styles.badgeWrapper} style={{ position: 'relative' }}>
                                    <span 
                                        className={`${styles.badge} ${getStatusColor(task.status)} ${styles.clickableBadge}`}
                                        onClick={() => setQuickEditType(quickEditType === 'status' ? null : 'status')}
                                    >
                                        {task.status_display}
                                        <FaCaretDown style={{ marginLeft: '8px', fontSize: '12px' }} />
                                    </span>
                                    {quickEditType === 'status' && (
                                        <div className={styles.quickEditDropdown} onClick={(e) => e.stopPropagation()}>
                                            {getStatusOptions().map(option => (
                                                <div
                                                    key={option.value}
                                                    className={`${styles.quickEditOption} ${task.status === option.value ? styles.active : ''}`}
                                                    onClick={() => handleQuickStatusChange(option.value)}
                                                    style={{ borderLeftColor: option.color }}
                                                >
                                                    {option.label}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {location && (
                                <div className={styles.infoItem}>
                                    <label>Локация:</label>
                                    <span className={styles.infoValue}>
                                        <FaMapMarkerAlt /> {location.name}
                                    </span>
                                </div>
                            )}

                            {task.due_date && (
                                <div className={styles.infoItem}>
                                    <label>Срок выполнения:</label>
                                    <span className={styles.infoValue}>
                                        {formatDate(task.due_date)}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Действия */}
                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <FaCog />
                            <h3>Действия</h3>
                        </div>
                        <div className={styles.cardBody}>
                            <div className={styles.actionsList}>
                                <button 
                                    className={styles.actionButton}
                                    onClick={handleEditTask}
                                >
                                    <FaEdit /> Редактировать задачу
                                </button>
                                {task.status !== 'done' && (
                                    <button 
                                        className={styles.actionButtonSuccess}
                                        onClick={handleCompleteTask}
                                    >
                                        <FaCheck /> Завершить задачу
                                    </button>
                                )}
                                <button 
                                    className={styles.actionButtonWarning}
                                    onClick={handleTransferTask}
                                >
                                    <FaExchangeAlt /> Передать задачу
                                </button>
                                <button 
                                    className={styles.actionButtonDanger}
                                    onClick={handleDeleteTask}
                                >
                                    <FaTrash /> Удалить задачу
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Модальное окно редактирования */}
            {editModalOpen && (
                <div className={styles.modalOverlay} onClick={() => setEditModalOpen(false)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>Редактировать задачу</h2>
                            <button 
                                className={styles.modalClose}
                                onClick={() => setEditModalOpen(false)}
                            >
                                <FaTimes />
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.formGroup}>
                                <label>Название задачи *</label>
                                <input
                                    type="text"
                                    value={taskForm.title}
                                    onChange={(e) => setTaskForm({...taskForm, title: e.target.value})}
                                    className={styles.formInput}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Описание</label>
                                <textarea
                                    value={taskForm.description}
                                    onChange={(e) => setTaskForm({...taskForm, description: e.target.value})}
                                    rows={5}
                                    className={styles.formTextarea}
                                />
                            </div>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>Приоритет</label>
                                    <select
                                        value={taskForm.priority}
                                        onChange={(e) => setTaskForm({...taskForm, priority: e.target.value})}
                                        className={styles.formSelect}
                                    >
                                        <option value="low">Низкий</option>
                                        <option value="medium">Средний</option>
                                        <option value="high">Высокий</option>
                                        <option value="critical">Критический</option>
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Статус</label>
                                    <select
                                        value={taskForm.status}
                                        onChange={(e) => setTaskForm({...taskForm, status: e.target.value})}
                                        className={styles.formSelect}
                                    >
                                        <option value="todo">К выполнению</option>
                                        <option value="in_progress">В работе</option>
                                        <option value="review">На проверке</option>
                                        <option value="done">Выполнено</option>
                                        <option value="cancelled">Отменено</option>
                                    </select>
                                </div>
                            </div>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>Срок выполнения</label>
                                    <input
                                        type="date"
                                        value={taskForm.due_date}
                                        onChange={(e) => setTaskForm({...taskForm, due_date: e.target.value})}
                                        className={styles.formInput}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Локация</label>
                                    <select
                                        value={taskForm.location}
                                        onChange={(e) => setTaskForm({...taskForm, location: e.target.value})}
                                        className={styles.formSelect}
                                    >
                                        <option value="">Не выбрана</option>
                                        {locations.map(loc => (
                                            <option key={loc.id} value={loc.id}>{loc.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className={styles.formGroup}>
                                <label>Исполнители</label>
                                <div className={styles.assigneesSelector}>
                                    {employees.map(emp => (
                                        <button
                                            key={emp.id}
                                            type="button"
                                            className={`${styles.employeeSelectButton} ${taskForm.assignee_ids.includes(emp.id) ? styles.selected : ''}`}
                                            onClick={() => {
                                                const newIds = taskForm.assignee_ids.includes(emp.id)
                                                    ? taskForm.assignee_ids.filter(id => id !== emp.id)
                                                    : [...taskForm.assignee_ids, emp.id];
                                                setTaskForm({...taskForm, assignee_ids: newIds});
                                            }}
                                        >
                                            {emp.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className={styles.modalFooter}>
                            <button
                                className={styles.modalButtonCancel}
                                onClick={() => setEditModalOpen(false)}
                            >
                                Отмена
                            </button>
                            <button
                                className={styles.modalButtonSave}
                                onClick={handleSaveTask}
                                disabled={saving || !taskForm.title.trim()}
                            >
                                {saving ? 'Сохранение...' : 'Сохранить'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Модальное окно передачи задачи */}
            {transferModalOpen && (
                <div className={styles.modalOverlay} onClick={() => setTransferModalOpen(false)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>Передать задачу</h2>
                            <button 
                                className={styles.modalClose}
                                onClick={() => setTransferModalOpen(false)}
                            >
                                <FaTimes />
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.formGroup}>
                                <label>Выберите исполнителей</label>
                                <div className={styles.assigneesSelector}>
                                    {employees.map(emp => (
                                        <button
                                            key={emp.id}
                                            type="button"
                                            className={`${styles.employeeSelectButton} ${transferAssigneeIds.includes(emp.id) ? styles.selected : ''}`}
                                            onClick={() => toggleAssignee(emp.id)}
                                        >
                                            {emp.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className={styles.modalFooter}>
                            <button
                                className={styles.modalButtonCancel}
                                onClick={() => setTransferModalOpen(false)}
                            >
                                Отмена
                            </button>
                            <button
                                className={styles.modalButtonSave}
                                onClick={handleSaveTransfer}
                                disabled={saving}
                            >
                                {saving ? 'Сохранение...' : 'Сохранить'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TaskDetailPage;
