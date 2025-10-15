import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import axios from '../../api/axiosDefault';
import {
  FaUserPlus,
  FaQrcode,
  FaTrash,
  FaEdit,
  FaTimes,
  FaCheck,
  FaCopy,
  FaUserTie,
  FaMapMarkerAlt,
  FaKey,
  FaCalendar,
  FaExclamationTriangle,
  FaUndo,
  FaEye,
  FaEyeSlash,
  FaUser,
  FaSearch,
  FaFilter,
  FaSyncAlt
} from 'react-icons/fa';
import styles from './EmployeesManagement.module.css';

const EmployeesManagement = ({ businessSlug }) => {
  const [employees, setEmployees] = useState([]);
  const [invites, setInvites] = useState([]);
  const [locations, setLocations] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [currentInvite, setCurrentInvite] = useState(null);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    is_active: true,
    notes: '',
    employee_locations: []
  });
  const [editTab, setEditTab] = useState('info'); // info, locations, permissions
  const [newLocationForm, setNewLocationForm] = useState({
    location_id: '',
    position: '',
    permission_ids: []
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Форма для создания приглашения
  const getDefaultExpiryDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 7); // По умолчанию +7 дней
    return date.toISOString().slice(0, 16); // Формат для datetime-local
  };

  const [inviteForm, setInviteForm] = useState({
    employee_name: '',
    position: '',
    location_ids: [],
    permission_ids: [],
    notes: '',
    expires_at: getDefaultExpiryDate()
  });

  // Загрузка данных
  useEffect(() => {
    loadData();
  }, [businessSlug, showDeleted]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [employeesRes, invitesRes, locationsRes, permissionsRes] = await Promise.all([
        axios.get(`api/business/${businessSlug}/employees/?include_deleted=${showDeleted}`),
        axios.get(`api/business/${businessSlug}/invites/`),
        axios.get(`api/business/${businessSlug}/locations/`),
        axios.get('api/permissions/flat/')
      ]);

      setEmployees(employeesRes.data);
      setInvites(invitesRes.data);
      setLocations(locationsRes.data);
      setPermissions(permissionsRes.data);
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    } finally {
      setLoading(false);
    }
  };

  // Создание приглашения
  const handleCreateInvite = async (e) => {
    e.preventDefault();
    try {
      // Конвертируем expires_at в правильный формат для Django
      const formData = {
        ...inviteForm,
        expires_at: new Date(inviteForm.expires_at).toISOString()
      };
      
      const response = await axios.post(
        `api/business/${businessSlug}/invites/create/`,
        formData
      );
      
      setCurrentInvite(response.data);
      setShowQRModal(true);
      setShowInviteModal(false);
      setInviteForm({
        employee_name: '',
        position: '',
        location_ids: [],
        permission_ids: [],
        notes: '',
        expires_at: getDefaultExpiryDate()
      });
      loadData();
    } catch (error) {
      console.error('Ошибка создания приглашения:', error);
      alert('Ошибка при создании приглашения');
    }
  };

  // Отмена приглашения
  const handleCancelInvite = async (inviteId) => {
    if (!window.confirm('Отменить это приглашение?')) return;

    try {
      await axios.delete(`api/business/${businessSlug}/invites/${inviteId}/cancel/`);
      loadData();
    } catch (error) {
      console.error('Ошибка отмены приглашения:', error);
      alert('Ошибка при отмене приглашения');
    }
  };

  // Открытие формы редактирования
  const openEditForm = (employee) => {
    setEditingEmployee(employee);
    setEditForm({
      name: employee.name || '',
      is_active: employee.is_active,
      notes: employee.notes || '',
      employee_locations: employee.employee_locations || []
    });
  };

  // Обновление основной информации сотрудника
  const handleUpdateEmployee = async (e) => {
    e.preventDefault();
    try {
      await axios.patch(
        `api/business/${businessSlug}/employees/${editingEmployee.id}/update/`,
        {
          name: editForm.name,
          is_active: editForm.is_active,
          notes: editForm.notes
        }
      );
      loadData();
      setEditingEmployee(null);
    } catch (error) {
      console.error('Ошибка обновления сотрудника:', error);
      alert('Ошибка при обновлении данных сотрудника');
    }
  };

  // Обновление локации сотрудника
  const handleUpdateEmployeeLocation = async (empLocId, data) => {
    try {
      await axios.patch(
        `api/business/${businessSlug}/employees/${editingEmployee.id}/locations/${empLocId}/`,
        data
      );
      
      // Обновляем локальное состояние для мгновенного отображения
      const updatedLocations = editForm.employee_locations.map(el => 
        el.id === empLocId ? { ...el, ...data } : el
      );
      setEditForm({ ...editForm, employee_locations: updatedLocations });
      
      // Перезагружаем данные сотрудника для получения актуальной информации
      const response = await axios.get(
        `api/business/${businessSlug}/employees/${editingEmployee.id}/`
      );
      setEditingEmployee(response.data);
      setEditForm({
        ...editForm,
        employee_locations: response.data.employee_locations
      });
    } catch (error) {
      console.error('Ошибка обновления локации:', error);
      alert('Ошибка при обновлении локации сотрудника');
    }
  };

  // Добавление новой локации к сотруднику
  const handleAddLocationToEmployee = async (locationId, position, permissionIds) => {
    try {
      await axios.post(
        `api/business/${businessSlug}/employees/${editingEmployee.id}/locations/`,
        {
          location_id: locationId,
          position: position,
          permission_ids: permissionIds
        }
      );
      // Перезагружаем данные сотрудника
      const response = await axios.get(
        `api/business/${businessSlug}/employees/${editingEmployee.id}/`
      );
      setEditingEmployee(response.data);
      setEditForm({
        ...editForm,
        employee_locations: response.data.employee_locations
      });
    } catch (error) {
      console.error('Ошибка добавления локации:', error);
      alert('Ошибка при добавлении локации');
    }
  };

  // Удаление локации у сотрудника
  const handleRemoveLocationFromEmployee = async (locationId) => {
    if (!window.confirm('Удалить эту локацию у сотрудника?')) return;
    
    try {
      await axios.delete(
        `api/business/${businessSlug}/employees/${editingEmployee.id}/locations/${locationId}/`
      );
      // Обновляем локальное состояние
      setEditForm({
        ...editForm,
        employee_locations: editForm.employee_locations.filter(
          el => el.location !== locationId
        )
      });
    } catch (error) {
      console.error('Ошибка удаления локации:', error);
      alert('Ошибка при удалении локации');
    }
  };

  // Удаление сотрудника
  const handleDeleteEmployee = async (employeeId) => {
    if (!window.confirm('Удалить этого сотрудника? Данные будут сохранены и вы сможете восстановить сотрудника позже.')) return;

    try {
      await axios.delete(`api/business/${businessSlug}/employees/${employeeId}/delete/`);
      loadData();
    } catch (error) {
      console.error('Ошибка удаления сотрудника:', error);
      alert('Ошибка при удалении сотрудника');
    }
  };

  // Восстановление сотрудника
  const handleRestoreEmployee = async (employeeId) => {
    if (!window.confirm('Восстановить этого сотрудника?')) return;

    try {
      await axios.post(`api/business/${businessSlug}/employees/${employeeId}/restore/`);
      loadData();
    } catch (error) {
      console.error('Ошибка восстановления сотрудника:', error);
      alert('Ошибка при восстановлении сотрудника');
    }
  };

  // Копирование ссылки
  const copyInviteLink = (invite) => {
    const link = `${window.location.origin}/invite/employee/${invite.token}/`;
    navigator.clipboard.writeText(link);
    alert('Ссылка скопирована в буфер обмена!');
  };

  // Фильтрация сотрудников
  const getFilteredEmployees = () => {
    let filtered = employees;

    // Поиск по имени и email
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(emp => {
        const name = (emp.name || emp.full_name || '').toLowerCase();
        const email = (emp.user_email || '').toLowerCase();
        const phone = (emp.user_phone || '').toLowerCase();
        return name.includes(query) || email.includes(query) || phone.includes(query);
      });
    }

    // Фильтр по локации
    if (selectedLocation !== 'all') {
      filtered = filtered.filter(emp => 
        emp.employee_locations?.some(
          empLoc => empLoc.location === parseInt(selectedLocation)
        )
      );
    }

    return filtered;
  };

  const filteredEmployees = getFilteredEmployees();

  // Обновление данных
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setTimeout(() => setIsRefreshing(false), 500); // Минимум 500мс для анимации
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Загрузка данных...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Кнопка создания приглашения */}
      <div className={styles.header}>
        <h2>
          <FaUserTie /> Управление сотрудниками
        </h2>
        <div className={styles.headerActions}>
          <motion.button
            className={styles.refreshButton}
            onClick={handleRefresh}
            disabled={isRefreshing}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            animate={{ rotate: isRefreshing ? 360 : 0 }}
            transition={{ duration: 0.5, repeat: isRefreshing ? Infinity : 0, ease: "linear" }}
          >
            <FaSyncAlt /> Обновить
          </motion.button>
          <motion.button
            className={styles.createButton}
            onClick={() => setShowInviteModal(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FaUserPlus /> Пригласить сотрудника
          </motion.button>
        </div>
      </div>

      {/* Ожидающие приглашения */}
      {invites.length > 0 && (
        <div className={styles.section}>
          <h3>
            <FaQrcode /> Ожидающие приглашения ({invites.length})
          </h3>
          <div className={styles.invitesGrid}>
            {invites.map((invite) => (
              <motion.div
                key={invite.id}
                className={styles.inviteCard}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className={styles.inviteHeader}>
                  <h4>{invite.employee_name || 'Новый сотрудник'}</h4>
                  <div className={styles.inviteActions}>
                    <button
                      className={styles.qrButton}
                      onClick={() => {
                        setCurrentInvite(invite);
                        setShowQRModal(true);
                      }}
                      title="Показать QR-код"
                    >
                      <FaQrcode />
                    </button>
                    <button
                      className={styles.copyButton}
                      onClick={() => copyInviteLink(invite)}
                      title="Скопировать ссылку"
                    >
                      <FaCopy />
                    </button>
                    <button
                      className={styles.cancelButton}
                      onClick={() => handleCancelInvite(invite.id)}
                      title="Отменить приглашение"
                    >
                      <FaTimes />
                    </button>
                  </div>
                </div>
                <div className={styles.inviteDetails}>
                  {invite.position && (
                    <p>
                      <FaUserTie /> {invite.position}
                    </p>
                  )}
                  <p>
                    <FaCalendar /> Создано: {new Date(invite.created_at).toLocaleDateString('ru-RU')}
                  </p>
                  <p>
                    <FaExclamationTriangle /> Истекает:{' '}
                    {new Date(invite.expires_at).toLocaleDateString('ru-RU')}
                  </p>
                  {invite.locations_details.length > 0 && (
                    <div className={styles.inviteLocations}>
                      <FaMapMarkerAlt /> Локации:
                      <ul>
                        {invite.locations_details.map((loc) => (
                          <li key={loc.id}>{loc.name}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Список сотрудников */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3>
            <FaUserTie /> Сотрудники ({employees.filter(e => !e.is_deleted).length})
            {showDeleted && employees.filter(e => e.is_deleted).length > 0 && (
              <span className={styles.deletedCount}>
                +{employees.filter(e => e.is_deleted).length} удаленных
              </span>
            )}
          </h3>
          <motion.button
            className={styles.toggleDeletedButton}
            onClick={() => setShowDeleted(!showDeleted)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {showDeleted ? <FaEyeSlash /> : <FaEye />}
            {showDeleted ? 'Скрыть удаленных' : 'Показать удаленных'}
          </motion.button>
        </div>

        {/* Панель поиска и фильтрации */}
        <div className={styles.filtersPanel}>
          <div className={styles.searchBox}>
            <FaSearch className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Поиск по имени, email или телефону..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
            {searchQuery && (
              <button
                className={styles.clearSearch}
                onClick={() => setSearchQuery('')}
              >
                <FaTimes />
              </button>
            )}
          </div>

          <div className={styles.filterBox}>
            <FaFilter className={styles.filterIcon} />
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="all">Все локации</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>

          {(searchQuery || selectedLocation !== 'all') && (
            <div className={styles.filterResults}>
              Найдено: <strong>{filteredEmployees.length}</strong> из {employees.length}
            </div>
          )}
        </div>

        <div className={styles.employeesGrid}>
          {filteredEmployees.length === 0 ? (
            <div className={styles.emptyState}>
              <FaUserTie size={64} />
              {employees.length === 0 ? (
                <>
                  <p>Нет добавленных сотрудников</p>
                  <p className={styles.hint}>
                    Нажмите "Пригласить сотрудника" чтобы добавить первого сотрудника
                  </p>
                </>
              ) : (
                <>
                  <p>Нет результатов по заданным фильтрам</p>
                  <p className={styles.hint}>
                    Попробуйте изменить параметры поиска
                  </p>
                </>
              )}
            </div>
          ) : (
            filteredEmployees.map((employee) => (
              <motion.div
                key={employee.id}
                className={`${styles.employeeCard} ${employee.is_deleted ? styles.deletedCard : ''}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className={styles.employeeHeader}>
                  <div className={styles.employeeInfo}>
                    <h4>{employee.name || employee.full_name || 'Без имени'}</h4>
                    {employee.is_deleted && (
                      <span className={styles.deletedBadge}>🗑️ Удален</span>
                    )}
                    {!employee.is_active && !employee.is_deleted && (
                      <span className={styles.inactiveBadge}>Неактивен</span>
                    )}
                  </div>
                  <div className={styles.employeeActions}>
                    {employee.is_deleted ? (
                      <button
                        className={styles.restoreButton}
                        onClick={() => handleRestoreEmployee(employee.id)}
                        title="Восстановить"
                      >
                        <FaUndo />
                      </button>
                    ) : (
                      <>
                        <button
                          className={styles.editButton}
                          onClick={() => openEditForm(employee)}
                          title="Редактировать"
                        >
                          <FaEdit />
                        </button>
                        <button
                          className={styles.deleteButton}
                          onClick={() => handleDeleteEmployee(employee.id)}
                          title="Удалить"
                        >
                          <FaTrash />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className={styles.employeeDetails}>
                  {employee.user_email && <p>📧 {employee.user_email}</p>}
                  {employee.user_phone && <p>📱 {employee.user_phone}</p>}
                  {employee.hired_date && (
                    <p>
                      <FaCalendar /> Принят:{' '}
                      {new Date(employee.hired_date).toLocaleDateString('ru-RU')}
                    </p>
                  )}
                  {employee.employee_locations && employee.employee_locations.length > 0 && (
                    <div className={styles.employeeLocations}>
                      <FaMapMarkerAlt /> Локации:
                      <ul>
                        {employee.employee_locations.map((empLoc) => (
                          <li key={empLoc.id}>
                            {empLoc.location_name}
                            {empLoc.position && ` (${empLoc.position})`}
                            {empLoc.permissions.length > 0 && (
                              <span className={styles.permissionCount}>
                                <FaKey /> {empLoc.permissions.length}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Модальное окно создания приглашения */}
      <AnimatePresence>
        {showInviteModal && (
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowInviteModal(false)}
          >
            <motion.div
              className={styles.modal}
              initial={{ opacity: 0, scale: 0.8, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 50 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <h3>
                  <FaUserPlus /> Создать приглашение для сотрудника
                </h3>
                <button
                  className={styles.closeButton}
                  onClick={() => setShowInviteModal(false)}
                >
                  <FaTimes />
                </button>
              </div>
              <form onSubmit={handleCreateInvite} className={styles.inviteForm}>
                <div className={styles.formGroup}>
                  <label>Имя и фамилия сотрудника</label>
                  <input
                    type="text"
                    value={inviteForm.employee_name}
                    onChange={(e) =>
                      setInviteForm({ ...inviteForm, employee_name: e.target.value })
                    }
                    placeholder="Иван Иванов"
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Должность</label>
                  <input
                    type="text"
                    value={inviteForm.position}
                    onChange={(e) =>
                      setInviteForm({ ...inviteForm, position: e.target.value })
                    }
                    placeholder="Продавец, Кассир и т.д."
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Срок действия приглашения</label>
                  <input
                    type="datetime-local"
                    value={inviteForm.expires_at}
                    onChange={(e) =>
                      setInviteForm({ ...inviteForm, expires_at: e.target.value })
                    }
                    required
                  />
                  <small>
                    После этой даты приглашение перестанет работать
                  </small>
                </div>

                <div className={styles.formGroup}>
                  <label>Локации (выберите одну или несколько)</label>
                  <div className={styles.checkboxGroup}>
                    {locations.map((location) => (
                      <label key={location.id} className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={inviteForm.location_ids.includes(location.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setInviteForm({
                                ...inviteForm,
                                location_ids: [...inviteForm.location_ids, location.id]
                              });
                            } else {
                              setInviteForm({
                                ...inviteForm,
                                location_ids: inviteForm.location_ids.filter(
                                  (id) => id !== location.id
                                )
                              });
                            }
                          }}
                        />
                        <span>{location.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Права доступа</label>
                  <div className={styles.permissionsGroup}>
                    {permissions.map((permission) => (
                      <label key={permission.id} className={styles.permissionLabel}>
                        <input
                          type="checkbox"
                          checked={inviteForm.permission_ids.includes(permission.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setInviteForm({
                                ...inviteForm,
                                permission_ids: [...inviteForm.permission_ids, permission.id]
                              });
                            } else {
                              setInviteForm({
                                ...inviteForm,
                                permission_ids: inviteForm.permission_ids.filter(
                                  (id) => id !== permission.id
                                )
                              });
                            }
                          }}
                        />
                        <div className={styles.permissionInfo}>
                          <span className={styles.permissionCode}>{permission.code}</span>
                          {permission.description && (
                            <span className={styles.permissionDesc}>
                              {permission.description}
                            </span>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Примечания (необязательно)</label>
                  <textarea
                    value={inviteForm.notes}
                    onChange={(e) =>
                      setInviteForm({ ...inviteForm, notes: e.target.value })
                    }
                    rows={3}
                    placeholder="Дополнительная информация..."
                  />
                </div>

                <div className={styles.modalFooter}>
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={() => setShowInviteModal(false)}
                  >
                    Отмена
                  </button>
                  <button type="submit" className={styles.submitBtn}>
                    <FaCheck /> Создать приглашение
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Модальное окно с QR-кодом */}
      <AnimatePresence>
        {showQRModal && currentInvite && (
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowQRModal(false)}
          >
            <motion.div
              className={styles.qrModal}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <h3>
                  <FaQrcode /> Приглашение для {currentInvite.employee_name}
                </h3>
                <button
                  className={styles.closeButton}
                  onClick={() => setShowQRModal(false)}
                >
                  <FaTimes />
                </button>
              </div>
              <div className={styles.qrContent}>
                <div className={styles.qrCode}>
                  <QRCodeSVG
                    value={`${window.location.origin}/invite/employee/${currentInvite.token}/`}
                    size={256}
                    level="H"
                    includeMargin={true}
                  />
                </div>
                <p className={styles.qrInstruction}>
                  Отсканируйте QR-код или отправьте ссылку сотруднику
                </p>
                <div className={styles.linkBox}>
                  <input
                    type="text"
                    value={`${window.location.origin}/invite/employee/${currentInvite.token}/`}
                    readOnly
                    className={styles.linkInput}
                  />
                  <button
                    className={styles.copyLinkButton}
                    onClick={() => copyInviteLink(currentInvite)}
                  >
                    <FaCopy /> Копировать
                  </button>
                </div>
                <p className={styles.qrExpiry}>
                  Срок действия до:{' '}
                  {new Date(currentInvite.expires_at).toLocaleDateString('ru-RU')}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Модальное окно редактирования сотрудника */}
      <AnimatePresence>
        {editingEmployee && (
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setEditingEmployee(null);
              setEditTab('info');
            }}
          >
            <motion.div
              className={`${styles.modal} ${styles.largeModal}`}
              initial={{ opacity: 0, scale: 0.8, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 50 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <h3>
                  <FaEdit /> Редактировать сотрудника: {editingEmployee.name || editingEmployee.full_name}
                </h3>
                <button
                  className={styles.closeButton}
                  onClick={() => {
                    setEditingEmployee(null);
                    setEditTab('info');
                  }}
                >
                  <FaTimes />
                </button>
              </div>

              {/* Табы */}
              <div className={styles.editTabs}>
                <button
                  className={`${styles.editTab} ${editTab === 'info' ? styles.activeEditTab : ''}`}
                  onClick={() => setEditTab('info')}
                  type="button"
                >
                  <FaUser /> Основная информация
                </button>
                <button
                  className={`${styles.editTab} ${editTab === 'locations' ? styles.activeEditTab : ''}`}
                  onClick={() => setEditTab('locations')}
                  type="button"
                >
                  <FaMapMarkerAlt /> Локации ({editForm.employee_locations.length})
                </button>
              </div>

              {/* Основная информация */}
              {editTab === 'info' && (
                <form onSubmit={handleUpdateEmployee} className={styles.inviteForm}>
                  <div className={styles.formGroup}>
                    <label>Имя и фамилия</label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={editForm.is_active}
                        onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                      />
                      <span>Активен</span>
                    </label>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Примечания</label>
                    <textarea
                      value={editForm.notes}
                      onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className={styles.modalFooter}>
                    <button
                      type="button"
                      className={styles.cancelBtn}
                      onClick={() => {
                        setEditingEmployee(null);
                        setEditTab('info');
                      }}
                    >
                      Отмена
                    </button>
                    <button type="submit" className={styles.submitBtn}>
                      <FaCheck /> Сохранить
                    </button>
                  </div>
                </form>
              )}

              {/* Локации и права */}
              {editTab === 'locations' && (
                <div className={styles.inviteForm}>
                  <div className={styles.locationsManager}>
                    {editForm.employee_locations.map((empLoc) => (
                      <div key={empLoc.id} className={styles.locationBlock}>
                        <div className={styles.locationBlockHeader}>
                          <h4>
                            <FaMapMarkerAlt /> {empLoc.location_name}
                          </h4>
                          <button
                            className={styles.removeLocationBtn}
                            onClick={() => handleRemoveLocationFromEmployee(empLoc.location)}
                            type="button"
                          >
                            <FaTrash />
                          </button>
                        </div>

                        {/* Должность */}
                        <div className={styles.formGroup}>
                          <label>Должность</label>
                          <input
                            type="text"
                            value={empLoc.position || ''}
                            onChange={(e) => {
                              handleUpdateEmployeeLocation(empLoc.id, {
                                position: e.target.value
                              });
                            }}
                            placeholder="Кассир, Продавец..."
                          />
                        </div>

                        {/* Права доступа */}
                        <div className={styles.formGroup}>
                          <label>Права доступа ({empLoc.permissions?.length || 0})</label>
                          <div className={styles.permissionsGroup}>
                            {permissions.map((permission) => {
                              const hasPermission = empLoc.permissions?.some(
                                p => p.permission.id === permission.id
                              );
                              return (
                                <label key={permission.id} className={styles.permissionLabel}>
                                  <input
                                    type="checkbox"
                                    checked={hasPermission}
                                    onChange={(e) => {
                                      const currentPermIds = empLoc.permissions?.map(p => p.permission.id) || [];
                                      const newPermIds = e.target.checked
                                        ? [...currentPermIds, permission.id]
                                        : currentPermIds.filter(id => id !== permission.id);
                                      
                                      handleUpdateEmployeeLocation(empLoc.id, {
                                        permission_ids: newPermIds
                                      });
                                    }}
                                  />
                                  <div className={styles.permissionInfo}>
                                    <span className={styles.permissionCode}>{permission.code}</span>
                                    {permission.description && (
                                      <span className={styles.permissionDesc}>
                                        {permission.description}
                                      </span>
                                    )}
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Добавление новой локации */}
                    <div className={styles.addLocationBlock}>
                      <h4>
                        <FaMapMarkerAlt /> Добавить новую локацию
                      </h4>
                      <div className={styles.formGroup}>
                        <label>Выберите локацию</label>
                        <select
                          value={newLocationForm.location_id}
                          onChange={(e) => setNewLocationForm({
                            ...newLocationForm,
                            location_id: e.target.value
                          })}
                        >
                          <option value="">Выберите локацию</option>
                          {locations
                            .filter(loc => !editForm.employee_locations.some(el => el.location === loc.id))
                            .map(location => (
                              <option key={location.id} value={location.id}>
                                {location.name}
                              </option>
                            ))}
                        </select>
                      </div>

                      <div className={styles.formGroup}>
                        <label>Должность</label>
                        <input
                          type="text"
                          value={newLocationForm.position}
                          onChange={(e) => setNewLocationForm({
                            ...newLocationForm,
                            position: e.target.value
                          })}
                          placeholder="Кассир, Продавец..."
                        />
                      </div>

                      <div className={styles.formGroup}>
                        <label>Права доступа</label>
                        <div className={styles.permissionsGroup}>
                          {permissions.map((permission) => (
                            <label key={permission.id} className={styles.permissionLabel}>
                              <input
                                type="checkbox"
                                checked={newLocationForm.permission_ids.includes(permission.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setNewLocationForm({
                                      ...newLocationForm,
                                      permission_ids: [...newLocationForm.permission_ids, permission.id]
                                    });
                                  } else {
                                    setNewLocationForm({
                                      ...newLocationForm,
                                      permission_ids: newLocationForm.permission_ids.filter(
                                        id => id !== permission.id
                                      )
                                    });
                                  }
                                }}
                              />
                              <div className={styles.permissionInfo}>
                                <span className={styles.permissionCode}>{permission.code}</span>
                                {permission.description && (
                                  <span className={styles.permissionDesc}>
                                    {permission.description}
                                  </span>
                                )}
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        className={styles.addLocationButton}
                        onClick={() => {
                          if (newLocationForm.location_id) {
                            handleAddLocationToEmployee(
                              parseInt(newLocationForm.location_id),
                              newLocationForm.position,
                              newLocationForm.permission_ids
                            );
                            setNewLocationForm({
                              location_id: '',
                              position: '',
                              permission_ids: []
                            });
                          }
                        }}
                        disabled={!newLocationForm.location_id}
                      >
                        <FaCheck /> Добавить локацию
                      </button>
                    </div>
                  </div>

                  <div className={styles.modalFooter}>
                    <button
                      type="button"
                      className={styles.cancelBtn}
                      onClick={() => {
                        setEditingEmployee(null);
                        setEditTab('info');
                      }}
                    >
                      Закрыть
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EmployeesManagement;

