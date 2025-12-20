import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from '../../api/axiosDefault';
import {
  FaSave,
  FaEdit,
  FaTrashAlt,
  FaPlus,
  FaCheck,
  FaBuilding,
  FaMapMarkerAlt,
  FaInfoCircle,
  FaCog,
  FaReceipt,
  FaTags,
  FaCode,
  FaEye,
  FaUserCog,
  FaImage,
  FaSpinner,
  FaChevronDown,
  FaChevronUp,
  FaTimes
} from 'react-icons/fa';
import styles from './SettingsPageMobile.module.css';
import Loader from '../../components/Loader';
import EmployeesManagement from '../../components/EmployeesManagement/EmployeesManagement';
import BonusSettings from '../../components/BonusSettings/BonusSettings';
import ModalCloseButton from '../../components/ModalCloseButton/ModalCloseButton';

const SettingsPageMobile = () => {
  const { business_slug } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('general');
  const [showTabMenu, setShowTabMenu] = useState(false);
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
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);

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

  const handleSaveBusiness = async () => {
    try {
      const res = await axios.patch(`api/business/${business_slug}/settings/`, business);
      setBusiness(res.data);
      setEditing(false);
    } catch (err) {
      setError(err.response?.data || err.message);
    }
  };

  const handleLogoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Файл должен быть изображением');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Размер файла не должен превышать 5MB');
      return;
    }

    try {
      setLogoUploading(true);
      setError(null);

      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);

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

  const handleDeleteLocation = async (id) => {
    if (!window.confirm('Удалить эту локацию?')) return;
    try {
      await axios.delete(`api/business/${business_slug}/locations/${id}/`);
      setLocations(locations.filter(loc => loc.id !== id));
    } catch (err) {
      setError(err.response?.data || err.message);
    }
  };

  const handleEditLocation = async (location) => {
    setCurrentLocation(location);
    
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

  const getTabLabel = (tab) => {
    const labels = {
      general: 'Основные',
      locations: 'Точки и склады',
      receipts: 'Шаблоны чеков',
      printers: 'Принтеры',
      employees: 'Сотрудники',
      bonus: 'Бонусы',
      products: 'Товары',
      photos: 'Фото'
    };
    return labels[tab] || tab;
  };

  const getTabIcon = (tab) => {
    const icons = {
      general: FaCog,
      locations: FaMapMarkerAlt,
      receipts: FaReceipt,
      printers: FaUserCog,
      employees: FaUserCog,
      bonus: FaTags,
      products: FaTags,
      photos: FaImage
    };
    const Icon = icons[tab] || FaCog;
    return <Icon />;
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Loader size="large" />
      </div>
    );
  }

  if (error && !business.name) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Настройки</h1>
          <div style={{ width: '44px' }} />
        </div>
        <div className={styles.content}>
          <div className={styles.error}>
            <FaInfoCircle /> {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Sticky Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Настройки</h1>
        <div style={{ width: '44px' }} />
      </div>

      {/* Tab Selector */}
      <div className={styles.tabSelector}>
        <button
          className={styles.tabSelectorButton}
          onClick={() => setShowTabMenu(!showTabMenu)}
        >
          {getTabIcon(activeTab)}
          <span>{getTabLabel(activeTab)}</span>
          {showTabMenu ? <FaChevronUp /> : <FaChevronDown />}
        </button>

        <AnimatePresence>
          {showTabMenu && (
            <motion.div
              className={styles.tabMenu}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {['general', 'locations', 'receipts', 'printers', 'employees', 'bonus', 'products', 'photos'].map(tab => (
                <button
                  key={tab}
                  className={`${styles.tabMenuItem} ${activeTab === tab ? styles.active : ''}`}
                  onClick={() => {
                    setActiveTab(tab);
                    setShowTabMenu(false);
                  }}
                >
                  {getTabIcon(tab)}
                  <span>{getTabLabel(tab)}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Content */}
      <div className={styles.content}>
        <AnimatePresence mode="wait">
          {/* General Tab */}
          {activeTab === 'general' && (
            <motion.div
              key="general"
              className={styles.tabContent}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className={styles.sectionHeader}>
                <h2>Основные настройки</h2>
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
                <div className={styles.formContainer}>
                  <div className={styles.formGroup}>
                    <label>Название бизнеса</label>
                    <input
                      type="text"
                      value={business.name}
                      onChange={(e) => setBusiness({ ...business, name: e.target.value })}
                      className={styles.formInput}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Описание</label>
                    <textarea
                      value={business.description}
                      onChange={(e) => setBusiness({ ...business, description: e.target.value })}
                      className={styles.formTextarea}
                      rows={4}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Телефон</label>
                    <input
                      type="text"
                      value={business.phone}
                      onChange={(e) => setBusiness({ ...business, phone: e.target.value })}
                      className={styles.formInput}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Адрес</label>
                    <input
                      type="text"
                      value={business.address}
                      onChange={(e) => setBusiness({ ...business, address: e.target.value })}
                      className={styles.formInput}
                    />
                  </div>
                </div>
              ) : (
                <div className={styles.infoContainer}>
                  <div className={styles.infoItem}>
                    <FaBuilding />
                    <div>
                      <h3>Название</h3>
                      <p>{business.name}</p>
                    </div>
                  </div>
                  <div className={styles.infoItem}>
                    <FaInfoCircle />
                    <div>
                      <h3>Описание</h3>
                      <p>{business.description || 'Не указано'}</p>
                    </div>
                  </div>
                  <div className={styles.infoItem}>
                    <FaBuilding />
                    <div>
                      <h3>Телефон</h3>
                      <p>{business.phone || 'Не указан'}</p>
                    </div>
                  </div>
                  <div className={styles.infoItem}>
                    <FaMapMarkerAlt />
                    <div>
                      <h3>Адрес</h3>
                      <p>{business.address || 'Не указан'}</p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Locations Tab */}
          {activeTab === 'locations' && (
            <motion.div
              key="locations"
              className={styles.tabContent}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className={styles.sectionHeader}>
                <h2>Точки и склады</h2>
                <button
                  className={styles.addButton}
                  onClick={() => setLocationDialog(true)}
                >
                  <FaPlus /> Добавить
                </button>
              </div>

              <div className={styles.listContainer}>
                {locations.length === 0 ? (
                  <div className={styles.emptyMessage}>
                    Нет добавленных точек или складов
                  </div>
                ) : (
                  locations.map((location) => (
                    <div key={location.id} className={styles.listItem}>
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
                        <p><FaMapMarkerAlt /> {location.address}</p>
                        <p>
                          {locationTypes.find(t => t.id === location.location_type)?.name || 'Неизвестный тип'}
                          {location.contact_phone && ` • ☎ ${location.contact_phone}`}
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
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {/* Receipts Tab */}
          {activeTab === 'receipts' && (
            <motion.div
              key="receipts"
              className={styles.tabContent}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className={styles.sectionHeader}>
                <h2>Шаблоны чеков</h2>
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
                      rows={15}
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
            </motion.div>
          )}

          {/* Printers Tab */}
          {activeTab === 'printers' && (
            <motion.div
              key="printers"
              className={styles.tabContent}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className={styles.infoAlert}>
                <FaInfoCircle /> Раздел в разработке
              </div>
            </motion.div>
          )}

          {/* Employees Tab */}
          {activeTab === 'employees' && (
            <motion.div
              key="employees"
              className={styles.tabContent}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <EmployeesManagement businessSlug={business_slug} />
            </motion.div>
          )}

          {/* Bonus Tab */}
          {activeTab === 'bonus' && (
            <motion.div
              key="bonus"
              className={styles.tabContent}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <BonusSettings />
            </motion.div>
          )}

          {/* Products Tab */}
          {activeTab === 'products' && (
            <motion.div
              key="products"
              className={styles.tabContent}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className={styles.infoAlert}>
                <FaInfoCircle /> Раздел в разработке
              </div>
            </motion.div>
          )}

          {/* Photos Tab */}
          {activeTab === 'photos' && (
            <motion.div
              key="photos"
              className={styles.tabContent}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className={styles.sectionHeader}>
                <h2>Логотип бизнеса</h2>
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
                  <p>Рекомендуемый размер: 512x512px. Максимальный размер файла: 5MB.</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Location Dialog */}
      {locationDialog && (
        <div className={styles.modalOverlay} onClick={() => {
          setLocationDialog(false);
          setCurrentLocation(null);
        }}>
          <motion.div
            className={styles.modal}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2>{currentLocation ? 'Редактирование локации' : 'Добавление новой локации'}</h2>
              <ModalCloseButton onClick={() => {
                setLocationDialog(false);
                setCurrentLocation(null);
              }} />
            </div>

            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>Название локации</label>
                <input
                  type="text"
                  value={newLocation.name}
                  onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Адрес</label>
                <input
                  type="text"
                  value={newLocation.address}
                  onChange={(e) => setNewLocation({ ...newLocation, address: e.target.value })}
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Страна</label>
                <select
                  value={selectedCountry}
                  onChange={(e) => {
                    setSelectedCountry(e.target.value);
                    setNewLocation({ ...newLocation, city: '' });
                  }}
                  className={styles.formSelect}
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
                  className={styles.formSelect}
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
                  className={styles.formSelect}
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
                  className={styles.formInput}
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
                  className={styles.formTextarea}
                  rows={4}
                />
              </div>
            </div>

            <div className={styles.modalFooter}>
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
        </div>
      )}
    </div>
  );
};

export default SettingsPageMobile;

