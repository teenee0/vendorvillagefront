import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from '../../api/axiosDefault';
import {
  FaSave,
  FaEdit,
  FaTrashAlt,
  FaPlus,
  FaPrint,
  FaCheck,
  FaBuilding,
  FaWarehouse,
  FaMapMarkerAlt,
  FaInfoCircle,
  FaCog,
  FaStore,
  FaBoxes,
  FaBarcode,
  FaImage,
  FaSpinner,
  FaUserCog,
  FaReceipt,
  FaTags,
  FaCode,
  FaEye
} from 'react-icons/fa';
import styles from './SettingsPage.module.css';
import Loader from '../../components/Loader';
import EmployeesManagement from '../../components/EmployeesManagement/EmployeesManagement';
import BonusSettings from '../../components/BonusSettings/BonusSettings';

const BusinessSettings = () => {
  const { business_slug } = useParams();
  const [activeTab, setActiveTab] = useState('general');
  const [business, setBusiness] = useState({
    name: '',
    description: '',
    phone: '',
    address: '',
    business_logo: null,
    receipt_html_template: '',
    receipt_css_template: ''
  });
  const [locations, setLocations] = useState([]);
  const [locationTypes, setLocationTypes] = useState([]);
  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [locationDialog, setLocationDialog] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [newLocation, setNewLocation] = useState({
    name: '',
    address: '',
    location_type: '',
    city: '',
    contact_phone: '',
    is_active: true,
    description: '',
    opening_hours: {}
  });
  const [previewMode, setPreviewMode] = useState(false);
  const [printerSettings, setPrinterSettings] = useState({
    barcodePrinter: "",
    receiptPrinter: "",
    availablePrinters: [], // Будет заполняться при загрузке
  });
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);

  useEffect(() => {
  if (activeTab === 'printers') {
    const loadPrinters = async () => {
      // Здесь можно добавить запрос к API, если нужно получить список принтеров
      // Или использовать window.electron для десктоп-приложения
      const printers = ['Принтер 1', 'Принтер 2', 'Принтер 3']; // Пример списка
      
      // Загружаем сохраненные настройки из localStorage
      const savedSettings = JSON.parse(
        localStorage.getItem(`${business_slug}_printerSettings`) || '{}'
      );
      
      setPrinterSettings({
        availablePrinters: printers,
        barcodePrinter: savedSettings.barcodePrinter || "",
        receiptPrinter: savedSettings.receiptPrinter || "",
      });
    };
    
    loadPrinters();
  }
}, [activeTab, business_slug]);

// Сохранение в localStorage
const savePrinterSettings = () => {
  const settingsToSave = {
    barcodePrinter: printerSettings.barcodePrinter,
    receiptPrinter: printerSettings.receiptPrinter,
  };
  
  localStorage.setItem(
    `${business_slug}_printerSettings`,
    JSON.stringify(settingsToSave)
  );
  
  alert("Настройки принтеров сохранены!");
};

  // Загрузка данных бизнеса
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [businessRes, locationsRes, typesRes, countriesRes] = await Promise.all([
          axios.get(`api/business/${business_slug}/settings/`),
          axios.get(`api/business/${business_slug}/locations/`),
          axios.get('api/location-types/'),
          axios.get('api/countries/')
        ]);

        setBusiness(businessRes.data);
        if (businessRes.data.business_logo) {
          setLogoPreview(businessRes.data.business_logo);
        } else {
          setLogoPreview(null);
        }
        setLocations(locationsRes.data);
        setLocationTypes(typesRes.data);
        setCountries(countriesRes.data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchData();
  }, [business_slug]);

  // Загрузка городов при выборе страны
  useEffect(() => {
    const fetchCities = async () => {
      if (selectedCountry) {
        try {
          const response = await axios.get(`api/cities/?country=${selectedCountry}`);
          setCities(response.data);
        } catch (err) {
          console.error('Ошибка загрузки городов:', err);
          setCities([]);
        }
      } else {
        setCities([]);
      }
    };

    fetchCities();
  }, [selectedCountry]);

  // Обработчик сохранения бизнеса
  const handleSaveBusiness = async () => {
    try {
      const res = await axios.patch(`api/business/${business_slug}/settings/`, business);
      setBusiness(res.data);
      setEditing(false);
    } catch (err) {
      setError(err.response?.data || err.message);
    }
  };

  // Обработчик загрузки логотипа
  const handleLogoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Проверяем тип файла
    if (!file.type.startsWith('image/')) {
      setError('Файл должен быть изображением');
      return;
    }

    // Проверяем размер файла (макс 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Размер файла не должен превышать 5MB');
      return;
    }

    try {
      setLogoUploading(true);
      setError(null);

      // Создаем предпросмотр
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);

      // Загружаем файл
      const formData = new FormData();
      formData.append('logo', file);

      const response = await axios.post(
        `api/business/${business_slug}/upload-logo/`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      // Обновляем бизнес с новым URL логотипа
      const businessRes = await axios.get(`api/business/${business_slug}/settings/`);
      setBusiness(businessRes.data);
      setLogoPreview(response.data.logo_url || businessRes.data.business_logo);

      alert('Логотип успешно загружен!');
    } catch (err) {
      console.error('Ошибка загрузки логотипа:', err);
      setError(err.response?.data?.detail || 'Ошибка при загрузке логотипа');
      setLogoPreview(null);
    } finally {
      setLogoUploading(false);
    }
  };

  // Обработчик сохранения локации
  const handleSaveLocation = async () => {
    try {
      if (currentLocation) {
        const res = await axios.patch(
          `api/business/${business_slug}/locations/${currentLocation.id}/`,
          newLocation
        );
        setLocations(locations.map(loc => loc.id === currentLocation.id ? res.data : loc));
      } else {
        const res = await axios.post(
          `api/business/${business_slug}/locations/`,
          newLocation
        );
        setLocations([...locations, res.data]);
      }
      setLocationDialog(false);
      setCurrentLocation(null);
      setSelectedCountry('');
      setCities([]);
      setNewLocation({
        name: '',
        address: '',
        location_type: '',
        city: '',
        contact_phone: '',
        is_active: true,
        description: '',
        opening_hours: {}
      });
    } catch (err) {
      setError(err.response?.data || err.message);
    }
  };

  // Обработчик удаления локации
  const handleDeleteLocation = async (id) => {
    try {
      await axios.delete(`api/business/${business_slug}/locations/${id}/`);
      setLocations(locations.filter(loc => loc.id !== id));
    } catch (err) {
      setError(err.response?.data || err.message);
    }
  };

  // Обработчик редактирования локации
  const handleEditLocation = async (location) => {
    setCurrentLocation(location);
    
    // Если у локации есть город, загружаем его страну и города
    if (location.city_detail) {
      const cityCountryId = location.city_detail.country_detail?.id;
      if (cityCountryId) {
        setSelectedCountry(cityCountryId);
        try {
          const response = await axios.get(`api/cities/?country=${cityCountryId}`);
          setCities(response.data);
        } catch (err) {
          console.error('Ошибка загрузки городов:', err);
        }
      }
    }
    
    setNewLocation({
      name: location.name,
      address: location.address,
      location_type: location.location_type,
      city: location.city || '',
      contact_phone: location.contact_phone,
      is_active: location.is_active,
      description: location.description,
      opening_hours: location.opening_hours || {}
    });
    setLocationDialog(true);
  };

  // Генерация предпросмотра чека
  const generateReceiptPreview = () => {
    const template = business.receipt_html_template
      .replace(/{{ business\.name }}/g, business.name || 'Название бизнеса')
      .replace(/{{ business\.address }}/g, business.address || 'Адрес бизнеса')
      .replace(/{{ receipt\.number }}/g, '000001')
      .replace(/{{ receipt\.created_at\.strftime\("%d\.%m\.%Y %H:%M"\) }}/g, new Date().toLocaleString('ru-RU'))
      .replace(/{{ cashier or "—" }}/g, 'Кассир Иванова')
      .replace(/{% for sale in sales %}([\s\S]*?){% endfor %}/g, (match, content) => {
        const items = [
          { variant: { name: 'Товар 1' }, quantity: 2, price_per_unit: 1500, total_price: 3000 },
          { variant: { name: 'Товар 2 с длинным названием' }, quantity: 1, price_per_unit: 4500, total_price: 4500 }
        ];
        return items.map(item =>
          content
            .replace(/{{ sale\.variant\.name\|truncate\(18,true\) }}/g, item.variant.name.substring(0, 18))
            .replace(/{{ sale\.quantity }}/g, item.quantity)
            .replace(/{{ "%.2f"\|format\(sale\.price_per_unit\) }}/g, item.price_per_unit.toFixed(2))
            .replace(/{{ "%.2f"\|format\(sale\.total_price\) }}/g, item.total_price.toFixed(2))
        ).join('');
      })
      .replace(/{{ "%.2f"\|format\(receipt\.total_amount\) }}/g, '7500.00')
      .replace(/{{ receipt\.discount_percent }}/g, '10')
      .replace(/{{ receipt\.discount_amount }}/g, '750')
      .replace(/{{ now\.strftime\("%d\.%m\.%Y %H:%M:%S"\) }}/g, new Date().toLocaleString('ru-RU'));

    return template;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Loader size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <motion.div
        className={styles.errorContainer}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <FaInfoCircle className={styles.errorIcon} />
        <span>{error}</span>
      </motion.div>
    );
  }

  return (
    <div className={styles.contentWrapper}>
      <div className={styles.accountContainer}>
        {/* Боковая панель с вкладками */}
        <div className={styles.accountSidebar}>
          <div className={styles.accountMenu}>
            <button
              className={`${styles.menuButton} ${activeTab === 'general' ? styles.active : ''}`}
              onClick={() => setActiveTab('general')}
            >
              <FaCog /> Основные
            </button>
            <button
              className={`${styles.menuButton} ${activeTab === 'locations' ? styles.active : ''}`}
              onClick={() => setActiveTab('locations')}
            >
              <FaMapMarkerAlt /> Точки и склады
            </button>
            <button
              className={`${styles.menuButton} ${activeTab === 'receipts' ? styles.active : ''}`}
              onClick={() => setActiveTab('receipts')}
            >
              <FaReceipt /> Шаблоны чеков
            </button>
            <button
              className={`${styles.menuButton} ${activeTab === 'printers' ? styles.active : ''}`}
              onClick={() => setActiveTab('printers')}
            >
              <FaUserCog /> Принтеры
            </button>
            <button
              className={`${styles.menuButton} ${activeTab === 'employees' ? styles.active : ''}`}
              onClick={() => setActiveTab('employees')}
            >
              <FaUserCog /> Сотрудники
            </button>
            <button
              className={`${styles.menuButton} ${activeTab === 'bonus' ? styles.active : ''}`}
              onClick={() => setActiveTab('bonus')}
            >
              <FaTags /> Бонусы
            </button>
            <button
              className={`${styles.menuButton} ${activeTab === 'products' ? styles.active : ''}`}
              onClick={() => setActiveTab('products')}
            >
              <FaTags /> Товары
            </button>
            <button
              className={`${styles.menuButton} ${activeTab === 'photos' ? styles.active : ''}`}
              onClick={() => setActiveTab('photos')}
            >
              <FaImage /> Фото
            </button>
          </div>
        </div>

        {/* Основное содержимое */}
        <div className={styles.accountContent}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            {/* Вкладка "Основные" */}
            {activeTab === 'general' && (
              <motion.div 
                className={styles.settingsTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <h1>
                  <FaBuilding /> Основные настройки
                </h1>

                <div className={styles.businessInfo}>
                  <div className={styles.sectionHeader}>
                    <h2>Информация о бизнесе</h2>
                    {editing ? (
                      <div className={styles.actions}>
                        <button
                          className={styles.saveButton}
                          onClick={handleSaveBusiness}
                        >
                          <FaSave /> Сохранить
                        </button>
                        <button
                          className={styles.cancelButton}
                          onClick={() => setEditing(false)}
                        >
                          Отмена
                        </button>
                      </div>
                    ) : (
                      <button
                        className={styles.editButton}
                        onClick={() => setEditing(true)}
                      >
                        <FaEdit /> Редактировать
                      </button>
                    )}
                  </div>

                  {editing ? (
                    <motion.div 
                      className={styles.settingsGrid}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className={styles.formGroup}>
                        <label>Название бизнеса</label>
                        <input
                          type="text"
                          value={business.name}
                          onChange={(e) => setBusiness({ ...business, name: e.target.value })}
                          className={styles.editField}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Описание</label>
                        <textarea
                          value={business.description}
                          onChange={(e) => setBusiness({ ...business, description: e.target.value })}
                          className={styles.editField}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Телефон</label>
                        <input
                          type="text"
                          value={business.phone}
                          onChange={(e) => setBusiness({ ...business, phone: e.target.value })}
                          className={styles.editField}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Адрес</label>
                        <input
                          type="text"
                          value={business.address}
                          onChange={(e) => setBusiness({ ...business, address: e.target.value })}
                          className={styles.editField}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Логотип</label>
                        <div className={styles.fileInput}>
                          <input
                            type="file"
                            id="logo-upload"
                            onChange={(e) => {
                              // Обработка загрузки изображения
                            }}
                          />
                          <label htmlFor="logo-upload" className={styles.fileLabel}>
                            <FaImage /> Выбрать файл
                          </label>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div 
                      className={styles.settingsGrid}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className={styles.settingsItem}>
                        <div className={styles.settingsIcon}>
                          <FaBuilding />
                        </div>
                        <div>
                          <h3>Название</h3>
                          <p>{business.name}</p>
                        </div>
                      </div>
                      <div className={styles.settingsItem}>
                        <div className={styles.settingsIcon}>
                          <FaInfoCircle />
                        </div>
                        <div>
                          <h3>Описание</h3>
                          <p>{business.description || 'Не указано'}</p>
                        </div>
                      </div>
                      <div className={styles.settingsItem}>
                        <div className={styles.settingsIcon}>
                          <FaPrint />
                        </div>
                        <div>
                          <h3>Телефон</h3>
                          <p>{business.phone || 'Не указан'}</p>
                        </div>
                      </div>
                      <div className={styles.settingsItem}>
                        <div className={styles.settingsIcon}>
                          <FaMapMarkerAlt />
                        </div>
                        <div>
                          <h3>Адрес</h3>
                          <p>{business.address || 'Не указан'}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Вкладка "Точки и склады" */}
            {activeTab === 'locations' && (
              <motion.div 
                className={styles.settingsTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <h1>
                  <FaMapMarkerAlt /> Точки и склады
                </h1>

                <div className={styles.sectionHeader}>
                  <h2>Управление локациями</h2>
                  <button
                    className={styles.addButton}
                    onClick={() => setLocationDialog(true)}
                  >
                    <FaPlus /> Добавить локацию
                  </button>
                </div>

                <div className={styles.listContainer}>
                  {locations.length === 0 ? (
                    <motion.div 
                      className={styles.emptyMessage}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                    >
                      Нет добавленных точек или складов
                    </motion.div>
                  ) : (
                    locations.map((location, index) => (
                      <motion.div 
                        key={location.id} 
                        className={styles.listItem}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.1 }}
                        whileHover={{ scale: 1.02 }}
                      >
                        <div className={styles.itemInfo}>
                          <h4>
                            {location.name}
                            {location.is_active && (
                              <span className={styles.activeBadge}>Активна</span>
                            )}
                            {location.is_primary && (
                              <span className={styles.defaultBadge}>Основная</span>
                            )}
                          </h4>
                          <p>
                            <FaMapMarkerAlt /> {location.address}
                          </p>
                          <p>
                            {locationTypes.find(t => t.id === location.location_type)?.name || 'Неизвестный тип'} •
                            {location.contact_phone && ` ☎ ${location.contact_phone}`}
                          </p>
                        </div>
                        <div className={styles.itemActions}>
                          <button
                            className={styles.editButton}
                            onClick={() => handleEditLocation(location)}
                          >
                            <FaEdit />
                          </button>
                          <button
                            className={styles.deleteButton}
                            onClick={() => handleDeleteLocation(location.id)}
                            disabled={location.is_primary}
                          >
                            <FaTrashAlt />
                          </button>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {/* Вкладка "Шаблоны чеков" */}
            {activeTab === 'receipts' && (
              <motion.div 
                className={styles.settingsTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <h1>
                  <FaReceipt /> Шаблоны чеков
                </h1>

                <div className={styles.sectionHeader}>
                  <h2>Редактор шаблона чека</h2>
                  <div className={styles.actions}>
                    <button
                      className={styles.previewButton}
                      onClick={() => setPreviewMode(!previewMode)}
                    >
                      {previewMode ? <FaCode /> : <FaEye />}
                      {previewMode ? 'Редактор' : 'Предпросмотр'}
                    </button>
                    <button
                      className={styles.saveButton}
                      onClick={handleSaveBusiness}
                    >
                      <FaSave /> Сохранить
                    </button>
                  </div>
                </div>

                {previewMode ? (
                  <div className={styles.receiptPreviewContainer}>
                    <iframe
                      title="receipt-preview"
                      srcDoc={generateReceiptPreview()}
                      className={styles.receiptPreview}
                    />
                  </div>
                ) : (
                  <div className={styles.templateEditor}>
                    <div className={styles.formGroup}>
                      <label>HTML шаблон чека</label>
                      <textarea
                        value={business.receipt_html_template}
                        onChange={(e) => setBusiness({ ...business, receipt_html_template: e.target.value })}
                        className={styles.codeEditor}
                        spellCheck="false"
                        rows={20}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>CSS стили чека (опционально)</label>
                      <textarea
                        value={business.receipt_css_template}
                        onChange={(e) => setBusiness({ ...business, receipt_css_template: e.target.value })}
                        className={styles.codeEditor}
                        spellCheck="false"
                        rows={10}
                      />
                    </div>
                  </div>
                )}

                <div className={styles.templateVariables}>
                  <h3>Доступные переменные:</h3>
                  <div className={styles.variablesGrid}>
                    <div>
                      <h4>Информация о бизнесе:</h4>
                      <ul>
                        <li><code>{'{{ business.name }}'}</code> - Название бизнеса</li>
                        <li><code>{'{{ business.address }}'}</code> - Адрес бизнеса</li>
                      </ul>
                    </div>
                    <div>
                      <h4>Информация о чеке:</h4>
                      <ul>
                        <li><code>{'{{ receipt.number }}'}</code> - Номер чека</li>
                        <li><code>{'{{ receipt.created_at.strftime("%d.%m.%Y %H:%M") }}'}</code> - Дата и время</li>
                        <li><code>{'{{ receipt.total_amount }}'}</code> - Общая сумма</li>
                      </ul>
                    </div>
                    <div>
                      <h4>Товары:</h4>
                      <ul>
                        <li><code>{'{% for sale in sales %}'}</code> - Цикл по товарам</li>
                        <li><code>{'{{ sale.variant.name }}'}</code> - Название товара</li>
                        <li><code>{'{{ sale.quantity }}'}</code> - Количество</li>
                        <li><code>{'{{ sale.price_per_unit }}'}</code> - Цена за единицу</li>
                        <li><code>{'{{ sale.total_price }}'}</code> - Общая стоимость</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}


            {/* Вкладка "Принтеры" */}
            {activeTab === 'printers' && (
              <motion.div 
                className={styles.settingsTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <h1>
                  <FaUserCog /> Управление Принтерами
                </h1>
                <div className={styles.infoAlert}>
                  <FaInfoCircle /> Раздел в разработке
                </div>
              </motion.div>
            )}


            {/* Вкладка "Сотрудники" */}
            {activeTab === 'employees' && (
              <motion.div 
                className={styles.settingsTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <EmployeesManagement businessSlug={business_slug} />
              </motion.div>
            )}

            {/* Вкладка "Бонусы" */}
            {activeTab === 'bonus' && (
              <motion.div 
                className={styles.settingsTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <BonusSettings />
              </motion.div>
            )}

            {/* Вкладка "Фото" */}
            {activeTab === 'photos' && (
              <motion.div 
                className={styles.settingsTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <h1>
                  <FaImage /> Фото бизнеса
                </h1>

                <div className={styles.photoSection}>
                  <div className={styles.sectionHeader}>
                    <div>
                      <h2>Логотип бизнеса</h2>
                      <p>Загрузите логотип вашего бизнеса. Изображение будет автоматически конвертировано в формат WebP.</p>
                    </div>
                  </div>

                  <div className={styles.logoUploadContainer}>
                    <div className={styles.logoPreview}>
                      {logoPreview ? (
                        <img src={logoPreview} alt="Логотип бизнеса" className={styles.logoImage} />
                      ) : (
                        <div className={styles.logoPlaceholder}>
                          <FaImage />
                          <p>Логотип не загружен</p>
                        </div>
                      )}
                    </div>

                    <div className={styles.uploadControls}>
                      <label htmlFor="logo-upload" className={styles.uploadButton}>
                        {logoUploading ? (
                          <>
                            <FaSpinner className={styles.spinning} /> Загрузка...
                          </>
                        ) : (
                          <>
                            <FaImage /> {logoPreview ? 'Изменить логотип' : 'Загрузить логотип'}
                          </>
                        )}
                      </label>
                      <input
                        type="file"
                        id="logo-upload"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        disabled={logoUploading}
                        style={{ display: 'none' }}
                      />
                      {logoPreview && (
                        <button
                          className={styles.removeButton}
                          onClick={async () => {
                            try {
                              // Удаляем логотип через API
                              await axios.patch(`api/business/${business_slug}/settings/`, {
                                business_logo: null
                              });
                              const businessRes = await axios.get(`api/business/${business_slug}/settings/`);
                              setBusiness(businessRes.data);
                              setLogoPreview(null);
                              alert('Логотип удален');
                            } catch (err) {
                              setError(err.response?.data?.detail || 'Ошибка при удалении логотипа');
                            }
                          }}
                        >
                          <FaTrashAlt /> Удалить логотип
                        </button>
                      )}
                    </div>

                    <div className={styles.uploadInfo}>
                      <FaInfoCircle />
                      <p>Рекомендуемый размер: 512x512px. Максимальный размер файла: 5MB. Поддерживаемые форматы: JPG, PNG, GIF, WebP.</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Вкладка "Товары" */}
            {activeTab === 'products' && (
              <motion.div 
                className={styles.settingsTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <h1>
                  <FaTags /> Настройки товаров
                </h1>
                <div className={styles.infoAlert}>
                  <FaInfoCircle /> Раздел в разработке
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Диалог добавления/редактирования локации */}
      {locationDialog && (
        <motion.div
          className={styles.dialogOverlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            setLocationDialog(false);
            setCurrentLocation(null);
          }}
        >
          <motion.div 
            className={styles.dialog}
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            transition={{ type: "spring", duration: 0.5 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.dialogHeader}>
              <h3>
                {currentLocation ? 'Редактирование локации' : 'Добавление новой локации'}
              </h3>
              <button
                className={styles.closeButton}
                onClick={() => {
                  setLocationDialog(false);
                  setCurrentLocation(null);
                }}
              >
                &times;
              </button>
            </div>

            <div className={styles.dialogContent}>
              <div className={styles.formGroup}>
                <label>Название локации</label>
                <input
                  type="text"
                  value={newLocation.name}
                  onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                  className={styles.editField}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Адрес</label>
                <input
                  type="text"
                  value={newLocation.address}
                  onChange={(e) => setNewLocation({ ...newLocation, address: e.target.value })}
                  className={styles.editField}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Страна</label>
                <select
                  value={selectedCountry}
                  onChange={(e) => {
                    setSelectedCountry(e.target.value);
                    setNewLocation({ ...newLocation, city: '' }); // Очищаем город при смене страны
                  }}
                  className={styles.editField}
                >
                  <option value="">Выберите страну</option>
                  {countries.map(country => (
                    <option key={country.id} value={country.id}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Город</label>
                <select
                  value={newLocation.city}
                  onChange={(e) => setNewLocation({ ...newLocation, city: e.target.value })}
                  className={styles.editField}
                  disabled={!selectedCountry}
                >
                  <option value="">Выберите город</option>
                  {cities.map(city => (
                    <option key={city.id} value={city.id}>
                      {city.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Тип локации</label>
                <select
                  value={newLocation.location_type}
                  onChange={(e) => setNewLocation({ ...newLocation, location_type: e.target.value })}
                  className={styles.editField}
                >
                  <option value="">Выберите тип</option>
                  {locationTypes.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Контактный телефон</label>
                <input
                  type="text"
                  value={newLocation.contact_phone}
                  onChange={(e) => setNewLocation({ ...newLocation, contact_phone: e.target.value })}
                  className={styles.editField}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={newLocation.is_active}
                    onChange={(e) => setNewLocation({ ...newLocation, is_active: e.target.checked })}
                  />
                  <span>Активна</span>
                </label>
              </div>

              <div className={styles.formGroup}>
                <label>Описание</label>
                <textarea
                  value={newLocation.description}
                  onChange={(e) => setNewLocation({ ...newLocation, description: e.target.value })}
                  className={styles.editField}
                />
              </div>
            </div>

            <div className={styles.dialogFooter}>
              <button
                className={styles.cancelButton}
                onClick={() => {
                  setLocationDialog(false);
                  setCurrentLocation(null);
                }}
              >
                Отмена
              </button>
              <button
                className={styles.saveButton}
                onClick={handleSaveLocation}
              >
                <FaSave /> Сохранить
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default BusinessSettings;