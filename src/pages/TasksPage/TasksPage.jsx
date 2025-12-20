import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from '../../api/axiosDefault';
import {
  FaPlus,
  FaSearch,
  FaTimes,
  FaEye,
  FaEdit,
  FaTrash,
  FaUpload,
  FaFile,
  FaMapMarkerAlt,
  FaCalendar,
  FaUsers,
  FaCheck,
  FaUser,
  FaEnvelope,
  FaCaretDown
} from 'react-icons/fa';
import styles from './TasksPage.module.css';
import Loader from '../../components/Loader';

const TasksPage = () => {
    const { business_slug } = useParams();
    const navigate = useNavigate();
    
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState(null);
    
    // Фильтры
    const [statusFilter, setStatusFilter] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');
    const [locationFilter, setLocationFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [showSubtasks, setShowSubtasks] = useState(true);
    
    // Модальное окно
    const [modalOpen, setModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [taskForm, setTaskForm] = useState({
        title: '',
        description: '',
        priority: 'medium',
        status: 'todo',
        due_date: '',
        location: '',
        parent_task: '',
        assignee_ids: [],
    });
    const [locations, setLocations] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [saving, setSaving] = useState(false);
    const [uploadingFile, setUploadingFile] = useState(null);
    const [formErrors, setFormErrors] = useState({});
    const [quickEditTaskId, setQuickEditTaskId] = useState(null);
    const [quickEditType, setQuickEditType] = useState(null); // 'status' or 'priority'

    useEffect(() => {
        fetchTasks();
        fetchLocations();
        fetchEmployees();
    }, [business_slug, statusFilter, priorityFilter, locationFilter, searchQuery, showSubtasks]);

    // Закрываем выпадающее меню при клике вне его
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (quickEditTaskId && !event.target.closest(`.${styles.badgeWrapper}`)) {
                setQuickEditTaskId(null);
                setQuickEditType(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [quickEditTaskId]);

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const params = {
                page: 1,
                page_size: 50,
            };
            if (statusFilter) params.status = statusFilter;
            if (priorityFilter) params.priority = priorityFilter;
            if (locationFilter) params.location = locationFilter;
            if (searchQuery) params.search = searchQuery;
            params.show_subtasks = showSubtasks;

            const response = await axios.get(
                `/api/business/${business_slug}/tasks/`,
                { params }
            );
            setTasks(response.data.results || []);
            setPagination(response.data.pagination);
        } catch (err) {
            console.error('Ошибка загрузки задач:', err);
            setError(err.response?.data?.detail || 'Ошибка загрузки задач');
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

    const fetchEmployees = async () => {
        try {
            const response = await axios.get(
                `/api/business/${business_slug}/employees/`
            );
            // Преобразуем Employee в формат для селекта (используем user.id и name)
            const employeesList = (response.data || []).map(emp => ({
                id: emp.user,
                name: emp.name || emp.full_name || 'Без имени',
                email: emp.user_email || '',
            }));
            setEmployees(employeesList);
        } catch (err) {
            console.error('Ошибка загрузки сотрудников:', err);
            setEmployees([]);
        }
    };

    const handleCreateTask = () => {
        setEditingTask(null);
        setTaskForm({
            title: '',
            description: '',
            priority: 'medium',
            status: 'todo',
            due_date: '',
            location: '',
            parent_task: '',
            assignee_ids: [],
        });
        setFormErrors({});
        setModalOpen(true);
    };

    const handleEditTask = (task) => {
        setEditingTask(task);
        setTaskForm({
            title: task.title,
            description: task.description || '',
            priority: task.priority,
            status: task.status,
            due_date: task.due_date ? task.due_date.split('T')[0] : '',
            location: task.location_id || '',
            parent_task: task.parent_task_id || '',
            assignee_ids: task.assignees.map(a => a.id),
        });
        setFormErrors({});
        setModalOpen(true);
    };

    const handleSaveTask = async () => {
        try {
            setSaving(true);
            setFormErrors({});
            
            // Подготавливаем данные: преобразуем пустые строки в null
            const data = {
                ...taskForm,
                location: taskForm.location || null,
                parent_task: taskForm.parent_task || null,
                due_date: taskForm.due_date ? taskForm.due_date : null,
            };

            if (editingTask) {
                await axios.patch(
                    `/api/business/${business_slug}/tasks/${editingTask.id}/`,
                    data
                );
            } else {
                await axios.post(
                    `/api/business/${business_slug}/tasks/`,
                    data
                );
            }

            setModalOpen(false);
            setFormErrors({});
            fetchTasks();
        } catch (err) {
            console.error('Ошибка сохранения задачи:', err);
            
            // Обрабатываем ошибки валидации
            if (err.response?.data) {
                const errorData = err.response.data;
                
                // Если это объект с полями (ошибки валидации)
                if (typeof errorData === 'object' && !errorData.detail) {
                    const fieldErrors = {};
                    Object.keys(errorData).forEach(key => {
                        const error = errorData[key];
                        if (Array.isArray(error)) {
                            fieldErrors[key] = error.join(', ');
                        } else if (typeof error === 'string') {
                            fieldErrors[key] = error;
                        } else if (typeof error === 'object' && error.length) {
                            fieldErrors[key] = error[0];
                        }
                    });
                    setFormErrors(fieldErrors);
                } else {
                    // Общая ошибка
                    setFormErrors({ 
                        non_field_errors: errorData.detail || 'Ошибка сохранения задачи' 
                    });
                }
            } else {
                setFormErrors({ 
                    non_field_errors: 'Ошибка сохранения задачи. Проверьте подключение к интернету.' 
                });
            }
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteTask = async (taskId) => {
        if (!window.confirm('Удалить задачу?')) return;

        try {
            await axios.delete(
                `/api/business/${business_slug}/tasks/${taskId}/`
            );
            fetchTasks();
        } catch (err) {
            console.error('Ошибка удаления задачи:', err);
            alert(err.response?.data?.detail || 'Ошибка удаления задачи');
        }
    };

    const handleQuickStatusChange = async (taskId, newStatus) => {
        try {
            await axios.patch(
                `/api/business/${business_slug}/tasks/${taskId}/`,
                { status: newStatus }
            );
            setQuickEditTaskId(null);
            setQuickEditType(null);
            fetchTasks();
        } catch (err) {
            console.error('Ошибка изменения статуса:', err);
            alert(err.response?.data?.detail || 'Ошибка изменения статуса');
        }
    };

    const handleQuickPriorityChange = async (taskId, newPriority) => {
        try {
            await axios.patch(
                `/api/business/${business_slug}/tasks/${taskId}/`,
                { priority: newPriority }
            );
            setQuickEditTaskId(null);
            setQuickEditType(null);
            fetchTasks();
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

    const handleFileUpload = async (taskId, file) => {
        try {
            setUploadingFile(taskId);
            const formData = new FormData();
            formData.append('file', file);
            formData.append('name', file.name);

            await axios.post(
                `/api/business/${business_slug}/tasks/${taskId}/files/`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );
            fetchTasks();
        } catch (err) {
            console.error('Ошибка загрузки файла:', err);
            alert(err.response?.data?.detail || 'Ошибка загрузки файла');
        } finally {
            setUploadingFile(null);
        }
    };

    const handleFileDelete = async (taskId, fileId) => {
        if (!window.confirm('Удалить файл?')) return;

        try {
            await axios.delete(
                `/api/business/${business_slug}/tasks/${taskId}/files/${fileId}/`
            );
            fetchTasks();
        } catch (err) {
            console.error('Ошибка удаления файла:', err);
            alert(err.response?.data?.detail || 'Ошибка удаления задачи');
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU');
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

    if (loading && tasks.length === 0) {
        return <Loader />;
    }

    const handleSearch = (e) => {
        e.preventDefault();
        fetchTasks();
    };

    if (loading && tasks.length === 0) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
                <Loader size="large" />
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Задачи</h1>
                <div className={styles.businessInfo}>
                    <span>Бизнес: {business_slug}</span>
                </div>
                <button
                    className={styles.createButton}
                    onClick={handleCreateTask}
                >
                    <FaPlus /> Создать задачу
                </button>
            </div>

            {/* Фильтры */}
            <div className={styles.filters}>
                <div className={styles.searchBar}>
                    <form onSubmit={handleSearch}>
                <input
                    type="text"
                    placeholder="Поиск по названию или описанию..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                        <button type="submit">
                            <FaSearch />
                        </button>
                    </form>
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className={styles.filterSelect}
                >
                    <option value="">Все статусы</option>
                    <option value="todo">К выполнению</option>
                    <option value="in_progress">В работе</option>
                    <option value="review">На проверке</option>
                    <option value="done">Выполнена</option>
                    <option value="cancelled">Отменена</option>
                </select>
                <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className={styles.filterSelect}
                >
                    <option value="">Все приоритеты</option>
                    <option value="low">Низкая</option>
                    <option value="medium">Средняя</option>
                    <option value="high">Высокая</option>
                    <option value="critical">Критическая</option>
                </select>
                <SearchableSelect
                    options={locations}
                    value={locationFilter}
                    onChange={(value) => setLocationFilter(value)}
                    placeholder="Поиск локации..."
                    emptyOption="Все локации"
                />
                <label className={styles.checkboxLabel}>
                    <input
                        type="checkbox"
                        checked={showSubtasks}
                        onChange={(e) => setShowSubtasks(e.target.checked)}
                    />
                    Показывать подзадачи
                </label>
            </div>

            {/* Список задач */}
            <div className={styles.content}>
            {error && <div className={styles.error}>{error}</div>}
            
            <div className={styles.tasksList}>
                {tasks.length === 0 ? (
                    <div className={styles.emptyState}>
                        Нет задач. Создайте первую задачу!
                    </div>
                ) : (
                    tasks.map(task => (
                        <TaskCard
                            key={task.id}
                            task={task}
                            onEdit={handleEditTask}
                            onDelete={handleDeleteTask}
                            onFileUpload={handleFileUpload}
                            onFileDelete={handleFileDelete}
                            uploadingFile={uploadingFile}
                            getPriorityColor={getPriorityColor}
                            getStatusColor={getStatusColor}
                            formatDate={formatDate}
                            business_slug={business_slug}
                            quickEditTaskId={quickEditTaskId}
                            setQuickEditTaskId={setQuickEditTaskId}
                            quickEditType={quickEditType}
                            setQuickEditType={setQuickEditType}
                            onQuickStatusChange={handleQuickStatusChange}
                            onQuickPriorityChange={handleQuickPriorityChange}
                            getStatusOptions={getStatusOptions}
                            getPriorityOptions={getPriorityOptions}
                        />
                    ))
                )}
                </div>
            </div>

            {/* Модальное окно создания/редактирования */}
            {modalOpen && (
                <TaskModal
                    taskForm={taskForm}
                    setTaskForm={setTaskForm}
                    editingTask={editingTask}
                    locations={locations}
                    employees={employees}
                    tasks={tasks}
                    onSave={handleSaveTask}
                    onClose={() => {
                        setModalOpen(false);
                        setFormErrors({});
                    }}
                    saving={saving}
                    formErrors={formErrors}
                    setFormErrors={setFormErrors}
                />
            )}
        </div>
    );
};

const TaskCard = ({
    task,
    onEdit,
    onDelete,
    onFileUpload,
    onFileDelete,
    uploadingFile,
    getPriorityColor,
    getStatusColor,
    formatDate,
    business_slug,
    quickEditTaskId,
    setQuickEditTaskId,
    quickEditType,
    setQuickEditType,
    onQuickStatusChange,
    onQuickPriorityChange,
    getStatusOptions,
    getPriorityOptions,
}) => {
    const [expanded, setExpanded] = useState(false);
    const fileInputRef = React.useRef(null);

    return (
        <div className={`${styles.taskCard} ${task.parent_task_id ? styles.subtask : ''}`}>
            <div className={styles.taskHeader} onClick={() => setExpanded(!expanded)}>
                <div className={styles.taskTitleRow}>
                    <h3>
                        <Link
                            to={`/business/${business_slug}/tasks/${task.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className={styles.taskTitleLink}
                        >
                            {task.title}
                        </Link>
                    </h3>
                    <div className={styles.taskBadges}>
                        <div className={styles.badgeWrapper} style={{ position: 'relative' }}>
                            <span 
                                className={`${styles.badge} ${getPriorityColor(task.priority)} ${styles.clickableBadge}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setQuickEditTaskId(quickEditTaskId === task.id && quickEditType === 'priority' ? null : task.id);
                                    setQuickEditType(quickEditTaskId === task.id && quickEditType === 'priority' ? null : 'priority');
                                }}
                            >
                                {task.priority_display}
                                <FaCaretDown style={{ marginLeft: '6px', fontSize: '12px' }} />
                            </span>
                            {quickEditTaskId === task.id && quickEditType === 'priority' && (
                                <div className={styles.quickEditDropdown} onClick={(e) => e.stopPropagation()}>
                                    {getPriorityOptions().map(option => (
                                        <div
                                            key={option.value}
                                            className={`${styles.quickEditOption} ${task.priority === option.value ? styles.active : ''}`}
                                            onClick={() => onQuickPriorityChange(task.id, option.value)}
                                            style={{ borderLeftColor: option.color }}
                                        >
                                            {option.label}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className={styles.badgeWrapper} style={{ position: 'relative' }}>
                            <span 
                                className={`${styles.badge} ${getStatusColor(task.status)} ${styles.clickableBadge}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setQuickEditTaskId(quickEditTaskId === task.id && quickEditType === 'status' ? null : task.id);
                                    setQuickEditType(quickEditTaskId === task.id && quickEditType === 'status' ? null : 'status');
                                }}
                            >
                                {task.status_display}
                                <FaCaretDown style={{ marginLeft: '6px', fontSize: '12px' }} />
                            </span>
                            {quickEditTaskId === task.id && quickEditType === 'status' && (
                                <div className={styles.quickEditDropdown} onClick={(e) => e.stopPropagation()}>
                                    {getStatusOptions().map(option => (
                                        <div
                                            key={option.value}
                                            className={`${styles.quickEditOption} ${task.status === option.value ? styles.active : ''}`}
                                            onClick={() => onQuickStatusChange(task.id, option.value)}
                                            style={{ borderLeftColor: option.color }}
                                        >
                                            {option.label}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className={styles.taskMeta}>
                    {task.location_name && (
                        <span className={styles.metaItem}>
                            <FaMapMarkerAlt /> {task.location_name}
                        </span>
                    )}
                    {task.due_date && (
                        <span className={styles.metaItem}>
                            <FaCalendar /> {formatDate(task.due_date)}
                        </span>
                    )}
                    {task.assignees.length > 0 && (
                        <span className={styles.metaItem}>
                            <FaUsers /> {task.assignees.map(a => a.name || a.full_name).join(', ')}
                        </span>
                    )}
                </div>
            </div>

            {expanded && (
                <div className={styles.taskBody}>
                    {task.description && (
                        <div className={styles.taskDescription}>
                            {task.description}
                        </div>
                    )}

                    {task.files && task.files.length > 0 && (
                        <div className={styles.taskFiles}>
                            <h4>Файлы:</h4>
                            {task.files.map(file => (
                                <div key={file.id} className={styles.fileItem}>
                                    <a
                                        href={file.file_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <FaFile /> {file.name}
                                    </a>
                                    <button
                                        className={styles.deleteFileButton}
                                        onClick={() => onFileDelete(task.id, file.id)}
                                    >
                                        <FaTimes />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className={styles.taskActions}>
                        <input
                            type="file"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            onChange={(e) => {
                                if (e.target.files[0]) {
                                    onFileUpload(task.id, e.target.files[0]);
                                }
                            }}
                        />
                        <Link
                            to={`/business/${business_slug}/tasks/${task.id}`}
                            className={styles.actionButton}
                        >
                            <FaEye /> Подробнее
                        </Link>
                        <button
                            className={styles.actionButton}
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingFile === task.id}
                        >
                            <FaUpload /> Загрузить файл
                        </button>
                        <button
                            className={styles.actionButton}
                            onClick={() => onEdit(task)}
                        >
                            <FaEdit /> Редактировать
                        </button>
                        <button
                            className={styles.actionButtonDanger}
                            onClick={() => onDelete(task.id)}
                        >
                            <FaTrash /> Удалить
                        </button>
                    </div>

                    {task.subtasks && task.subtasks.length > 0 && (
                        <div className={styles.subtasks}>
                            <h4>Подзадачи:</h4>
                            {task.subtasks.map(subtask => (
                                <TaskCard
                                    key={subtask.id}
                                    task={subtask}
                                    onEdit={onEdit}
                                    onDelete={onDelete}
                                    onFileUpload={onFileUpload}
                                    onFileDelete={onFileDelete}
                                    uploadingFile={uploadingFile}
                                    getPriorityColor={getPriorityColor}
                                    getStatusColor={getStatusColor}
                                    formatDate={formatDate}
                                    business_slug={business_slug}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const TaskModal = ({
    taskForm,
    setTaskForm,
    editingTask,
    locations,
    employees,
    tasks,
    onSave,
    onClose,
    saving,
    formErrors,
    setFormErrors,
}) => {
    const clearFieldError = (fieldName) => {
        if (formErrors[fieldName]) {
            const newErrors = { ...formErrors };
            delete newErrors[fieldName];
            setFormErrors(newErrors);
        }
    };
    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2>{editingTask ? 'Редактировать задачу' : 'Создать задачу'}</h2>
                    <button className={styles.closeButton} onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>
                <div className={styles.modalBody}>
                    {formErrors.non_field_errors && (
                        <div className={styles.formError}>
                            {formErrors.non_field_errors}
                        </div>
                    )}
                    <label>
                        Название *
                        <input
                            type="text"
                            value={taskForm.title}
                            onChange={(e) => {
                                setTaskForm({ ...taskForm, title: e.target.value });
                                clearFieldError('title');
                            }}
                            required
                            className={formErrors.title ? styles.inputError : ''}
                        />
                        {formErrors.title && (
                            <span className={styles.fieldError}>{formErrors.title}</span>
                        )}
                    </label>
                    <label>
                        Описание
                        <textarea
                            value={taskForm.description}
                            onChange={(e) => {
                                setTaskForm({ ...taskForm, description: e.target.value });
                                clearFieldError('description');
                            }}
                            rows={4}
                            className={formErrors.description ? styles.inputError : ''}
                        />
                        {formErrors.description && (
                            <span className={styles.fieldError}>{formErrors.description}</span>
                        )}
                    </label>
                    <div className={styles.formRow}>
                        <label>
                            Важность
                            <select
                                value={taskForm.priority}
                                onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                            >
                                <option value="low">Низкая</option>
                                <option value="medium">Средняя</option>
                                <option value="high">Высокая</option>
                                <option value="critical">Критическая</option>
                            </select>
                        </label>
                        <label>
                            Статус
                            <select
                                value={taskForm.status}
                                onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}
                            >
                                <option value="todo">К выполнению</option>
                                <option value="in_progress">В работе</option>
                                <option value="review">На проверке</option>
                                <option value="done">Выполнена</option>
                                <option value="cancelled">Отменена</option>
                            </select>
                        </label>
                    </div>
                    <label>
                        Срок выполнения
                        <input
                            type="date"
                            value={taskForm.due_date}
                            onChange={(e) => {
                                setTaskForm({ ...taskForm, due_date: e.target.value });
                                clearFieldError('due_date');
                            }}
                            className={formErrors.due_date ? styles.inputError : ''}
                        />
                        {formErrors.due_date && (
                            <span className={styles.fieldError}>{formErrors.due_date}</span>
                        )}
                    </label>
                    <label>
                        Локация
                        <SearchableSelect
                            options={locations}
                            value={taskForm.location}
                            onChange={(value) => {
                                setTaskForm({ ...taskForm, location: value });
                                clearFieldError('location');
                            }}
                            placeholder="Поиск локации..."
                            emptyOption="Не выбрана"
                            error={!!formErrors.location}
                        />
                        {formErrors.location && (
                            <span className={styles.fieldError}>{formErrors.location}</span>
                        )}
                    </label>
                    {!editingTask && (
                        <label>
                            Родительская задача
                            <select
                                value={taskForm.parent_task}
                                onChange={(e) => {
                                    setTaskForm({ ...taskForm, parent_task: e.target.value });
                                    clearFieldError('parent_task');
                                }}
                                className={formErrors.parent_task ? styles.inputError : ''}
                            >
                                <option value="">Нет (основная задача)</option>
                                {tasks.filter(t => !t.parent_task_id).map(t => (
                                    <option key={t.id} value={t.id}>
                                        {t.title}
                                    </option>
                                ))}
                            </select>
                            {formErrors.parent_task && (
                                <span className={styles.fieldError}>{formErrors.parent_task}</span>
                            )}
                        </label>
                    )}
                    <label>
                        Ответственные
                        <div className={`${styles.employeeList} ${formErrors.assignee_ids ? styles.inputError : ''}`}>
                            {employees.length === 0 ? (
                                <div className={styles.emptyEmployees}>Нет доступных сотрудников</div>
                            ) : (
                                employees.map(emp => {
                                    const isSelected = taskForm.assignee_ids.includes(emp.id);
                                    return (
                                        <button
                                            key={emp.id}
                                            type="button"
                                            className={`${styles.employeeButton} ${isSelected ? styles.employeeButtonSelected : ''}`}
                                            onClick={() => {
                                                let newAssigneeIds;
                                                if (isSelected) {
                                                    newAssigneeIds = taskForm.assignee_ids.filter(id => id !== emp.id);
                                                } else {
                                                    newAssigneeIds = [...taskForm.assignee_ids, emp.id];
                                                }
                                                setTaskForm({ ...taskForm, assignee_ids: newAssigneeIds });
                                                clearFieldError('assignee_ids');
                                            }}
                                        >
                                            <div className={styles.employeeInfo}>
                                                <div className={styles.employeeNameRow}>
                                                    <FaUser className={styles.employeeIcon} />
                                                    <span className={styles.employeeName}>{emp.name}</span>
                                                    {isSelected && (
                                                        <FaCheck className={styles.checkIcon} />
                                                    )}
                                                </div>
                                                {emp.email && (
                                                    <span className={styles.employeeEmail}>
                                                        <FaEnvelope /> {emp.email}
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                        {formErrors.assignee_ids && (
                            <span className={styles.fieldError}>{formErrors.assignee_ids}</span>
                        )}
                    </label>
                </div>
                <div className={styles.modalFooter}>
                    <button
                        className={styles.cancelButton}
                        onClick={onClose}
                        disabled={saving}
                    >
                        Отмена
                    </button>
                    <button
                        className={styles.saveButton}
                        onClick={onSave}
                        disabled={saving || !taskForm.title}
                    >
                        {saving ? 'Сохранение...' : 'Сохранить'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const SearchableSelect = ({ 
    options, 
    value, 
    onChange, 
    placeholder = "Выберите...", 
    emptyOption = "Не выбрано",
    className = "",
    error = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const selectRef = React.useRef(null);

    // Фильтруем опции по поисковому запросу
    const filteredOptions = options.filter(option =>
        option.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Получаем выбранную опцию
    const selectedOption = options.find(opt => String(opt.id) === String(value));

    // Закрываем при клике вне компонента
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (selectRef.current && !selectRef.current.contains(event.target)) {
                setIsOpen(false);
                setSearchQuery('');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (optionId) => {
        onChange(optionId);
        setIsOpen(false);
        setSearchQuery('');
    };

    return (
        <div className={`${styles.searchableSelect} ${className} ${error ? styles.inputError : ''}`} ref={selectRef}>
            <div
                className={styles.searchableSelectTrigger}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className={styles.searchableSelectValue}>
                    {selectedOption ? selectedOption.name : emptyOption}
                </span>
                <FaCaretDown className={styles.searchableSelectArrow} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s ease' }} />
            </div>
            {isOpen && (
                <div className={styles.searchableSelectDropdown}>
                    <div className={styles.searchableSelectSearch}>
                        <FaSearch />
                        <input
                            type="text"
                            placeholder={placeholder}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                        />
                    </div>
                    <div className={styles.searchableSelectOptions}>
                        <div
                            className={`${styles.searchableSelectOption} ${!value ? styles.searchableSelectOptionSelected : ''}`}
                            onClick={() => handleSelect('')}
                        >
                            {emptyOption}
                        </div>
                        {filteredOptions.length === 0 ? (
                            <div className={styles.searchableSelectNoResults}>
                                Ничего не найдено
                            </div>
                        ) : (
                            filteredOptions.map(option => (
                                <div
                                    key={option.id}
                                    className={`${styles.searchableSelectOption} ${String(option.id) === String(value) ? styles.searchableSelectOptionSelected : ''}`}
                                    onClick={() => handleSelect(option.id)}
                                >
                                    {option.name}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TasksPage;

