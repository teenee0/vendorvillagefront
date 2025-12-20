import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../../api/axiosDefault';
import {
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
  FaPaperPlane,
  FaUpload
} from 'react-icons/fa';
import styles from './TaskDetailPageMobile.module.css';
import Loader from '../../components/Loader';
import ModalCloseButton from '../../components/ModalCloseButton/ModalCloseButton';
import dayjs from 'dayjs';

const TaskDetailPageMobile = () => {
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
    const [quickEditType, setQuickEditType] = useState(null);
    const [fileInputRef, setFileInputRef] = useState(null);
    const [uploadingFile, setUploadingFile] = useState(false);

    useEffect(() => {
        fetchTask();
        fetchComments();
        fetchChecklist();
        fetchLocations();
        fetchEmployees();
    }, [business_slug, task_id]);

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
            fetchTask();
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
            fetchTask();
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
            fetchTask();
        } catch (err) {
            console.error('Ошибка удаления пункта:', err);
            alert(err.response?.data?.detail || 'Ошибка удаления пункта');
        }
    };

    const handleFileUpload = async (file) => {
        try {
            setUploadingFile(true);
            const formData = new FormData();
            formData.append('file', file);
            formData.append('name', file.name);

            await axios.post(
                `/api/business/${business_slug}/tasks/${task_id}/files/`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );
            fetchTask();
        } catch (err) {
            console.error('Ошибка загрузки файла:', err);
            alert(err.response?.data?.detail || 'Ошибка загрузки файла');
        } finally {
            setUploadingFile(false);
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
            <div className={styles.loadingContainer}>
                <Loader size="large" />
            </div>
        );
    }

    if (error || !task) {
        return (
            <div className={styles.container}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Задача</h1>
                    <div style={{ width: '44px' }} />
                </div>
                <div className={styles.content}>
                    <div className={styles.error}>
                        {error || 'Задача не найдена'}
                    </div>
                </div>
            </div>
        );
    }

    const location = locations.find(loc => loc.id === task.location_id);
    const progress = task.progress || { completed: 0, total: 0, percentage: 0 };

    return (
        <div className={styles.container}>
            {/* Sticky Header */}
            <div className={styles.header}>
                <div className={styles.headerContent}>
                    <h1 className={styles.title}>{task.title}</h1>
                    <span className={`${styles.badge} ${styles[`status${task.status.charAt(0).toUpperCase() + task.status.slice(1)}`]}`}>
                        {task.status_display}
                    </span>
                </div>
                <button
                    className={styles.menuButton}
                    onClick={() => {
                        // Можно добавить меню действий
                    }}
                >
                    <FaCog />
                </button>
            </div>

            {/* Content */}
            <div className={styles.content}>
                {/* Badges and Meta */}
                <div className={styles.taskBadgesSection}>
                    <div className={styles.badgesRow}>
                        <div className={styles.badgeWrapper}>
                            <span 
                                className={`${styles.badge} ${getStatusColor(task.status)} ${styles.clickableBadge}`}
                                onClick={() => setQuickEditType(quickEditType === 'status' ? null : 'status')}
                            >
                                {task.status_display}
                                <FaCaretDown />
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
                        <div className={styles.badgeWrapper}>
                            <span 
                                className={`${styles.badge} ${getPriorityColor(task.priority)} ${styles.clickableBadge}`}
                                onClick={() => setQuickEditType(quickEditType === 'priority' ? null : 'priority')}
                            >
                                {task.priority_display}
                                <FaCaretDown />
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

                    <div className={styles.taskMeta}>
                        {task.created_at && (
                            <div className={styles.metaItem}>
                                <FaCalendar /> Создано: {formatDate(task.created_at)}
                            </div>
                        )}
                        {task.due_date && (
                            <div className={styles.metaItem}>
                                <FaClock /> Дедлайн: {formatDate(task.due_date)}
                            </div>
                        )}
                        {location && (
                            <div className={styles.metaItem}>
                                <FaMapMarkerAlt /> {location.name}
                            </div>
                        )}
                    </div>
                </div>

                {/* Description */}
                {task.description && (
                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <FaFileAlt />
                            <h3>Описание</h3>
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

                {/* Progress */}
                {progress.total > 0 && (
                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <FaTasks />
                            <h3>Прогресс</h3>
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

                {/* Checklist */}
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

                {/* Files */}
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <FaPaperclip />
                        <h3>Вложения</h3>
                    </div>
                    <div className={styles.cardBody}>
                        {task.files && task.files.length > 0 ? (
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
                        ) : (
                            <div className={styles.emptyFiles}>
                                Нет вложений
                            </div>
                        )}
                        <input
                            type="file"
                            ref={(ref) => setFileInputRef(ref)}
                            style={{ display: 'none' }}
                            onChange={(e) => {
                                if (e.target.files[0]) {
                                    handleFileUpload(e.target.files[0]);
                                }
                            }}
                        />
                        <button
                            className={styles.uploadButton}
                            onClick={() => fileInputRef?.click()}
                            disabled={uploadingFile}
                        >
                            <FaUpload /> {uploadingFile ? 'Загрузка...' : 'Загрузить файл'}
                        </button>
                    </div>
                </div>

                {/* Assignees */}
                {task.assignees && task.assignees.length > 0 && (
                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <FaUser />
                            <h3>Исполнители</h3>
                        </div>
                        <div className={styles.cardBody}>
                            <div className={styles.assigneesList}>
                                {task.assignees.map(assignee => (
                                    <div key={assignee.id} className={styles.assigneeItem}>
                                        <div className={styles.assigneeAvatar}>
                                            {getInitials(assignee.name)}
                                        </div>
                                        <div className={styles.assigneeInfo}>
                                            <span className={styles.assigneeName}>{assignee.name}</span>
                                            {assignee.email && (
                                                <span className={styles.assigneeEmail}>{assignee.email}</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Created By */}
                {task.created_by_name && (
                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <FaInfoCircle />
                            <h3>Создатель</h3>
                        </div>
                        <div className={styles.cardBody}>
                            <div className={styles.assigneeItem}>
                                <div className={styles.assigneeAvatar}>
                                    {getInitials(task.created_by_name)}
                                </div>
                                <span className={styles.assigneeName}>{task.created_by_name}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Comments */}
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
                            <button
                                onClick={handleAddComment}
                                disabled={!newComment.trim() || savingComment}
                                className={styles.commentButton}
                            >
                                <FaPaperPlane /> {savingComment ? 'Отправка...' : 'Отправить'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Actions */}
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

            {/* Edit Modal */}
            {editModalOpen && (
                <div className={styles.modalOverlay} onClick={() => setEditModalOpen(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>Редактировать задачу</h2>
                            <ModalCloseButton onClick={() => setEditModalOpen(false)} />
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.formRow}>
                                <label>
                                    Название задачи *
                                    <input
                                        type="text"
                                        value={taskForm.title}
                                        onChange={(e) => setTaskForm({...taskForm, title: e.target.value})}
                                        className={styles.formInput}
                                    />
                                </label>
                            </div>
                            <div className={styles.formRow}>
                                <label>
                                    Описание
                                    <textarea
                                        value={taskForm.description}
                                        onChange={(e) => setTaskForm({...taskForm, description: e.target.value})}
                                        rows={5}
                                        className={styles.formTextarea}
                                    />
                                </label>
                            </div>
                            <div className={styles.formRow}>
                                <label>
                                    Приоритет
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
                                </label>
                            </div>
                            <div className={styles.formRow}>
                                <label>
                                    Статус
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
                                </label>
                            </div>
                            <div className={styles.formRow}>
                                <label>
                                    Срок выполнения
                                    <input
                                        type="date"
                                        value={taskForm.due_date}
                                        onChange={(e) => setTaskForm({...taskForm, due_date: e.target.value})}
                                        className={styles.formInput}
                                    />
                                </label>
                            </div>
                            <div className={styles.formRow}>
                                <label>
                                    Локация
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
                                </label>
                            </div>
                            <div className={styles.formRow}>
                                <label>
                                    Исполнители
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
                                                <FaUser /> {emp.name}
                                                {taskForm.assignee_ids.includes(emp.id) && (
                                                    <FaCheck className={styles.checkIcon} />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </label>
                            </div>
                        </div>
                        <div className={styles.modalFooter}>
                            <button
                                className={styles.cancelButton}
                                onClick={() => setEditModalOpen(false)}
                            >
                                Отмена
                            </button>
                            <button
                                className={styles.saveButton}
                                onClick={handleSaveTask}
                                disabled={saving || !taskForm.title.trim()}
                            >
                                {saving ? 'Сохранение...' : 'Сохранить'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Transfer Modal */}
            {transferModalOpen && (
                <div className={styles.modalOverlay} onClick={() => setTransferModalOpen(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>Передать задачу</h2>
                            <ModalCloseButton onClick={() => setTransferModalOpen(false)} />
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.formRow}>
                                <label>
                                    Выберите исполнителей
                                    <div className={styles.assigneesSelector}>
                                        {employees.map(emp => (
                                            <button
                                                key={emp.id}
                                                type="button"
                                                className={`${styles.employeeSelectButton} ${transferAssigneeIds.includes(emp.id) ? styles.selected : ''}`}
                                                onClick={() => toggleAssignee(emp.id)}
                                            >
                                                <FaUser /> {emp.name}
                                                {transferAssigneeIds.includes(emp.id) && (
                                                    <FaCheck className={styles.checkIcon} />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </label>
                            </div>
                        </div>
                        <div className={styles.modalFooter}>
                            <button
                                className={styles.cancelButton}
                                onClick={() => setTransferModalOpen(false)}
                            >
                                Отмена
                            </button>
                            <button
                                className={styles.saveButton}
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

export default TaskDetailPageMobile;

