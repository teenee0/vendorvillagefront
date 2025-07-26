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
  FaSpinner
} from 'react-icons/fa';
import styles from './SettingsPage.module.css';

const SettingsPage = () => {
  const { business_slug } = useParams();
  const [activeTab, setActiveTab] = useState('business');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  
  const [businessInfo, setBusinessInfo] = useState({
    name: '',
    description: '',
    phone: '',
    address: '',
    business_logo: null,
    background_image: null
  });
  
  const [locations, setLocations] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [printers, setPrinters] = useState([]);
  const [editingField, setEditingField] = useState(null);
  const [newLocation, setNewLocation] = useState({ name: '', address: '' });
  const [newWarehouse, setNewWarehouse] = useState({ name: '', location: '' });
  const [newPrinter, setNewPrinter] = useState({ name: '', type: 'barcode' });
  const [logoFile, setLogoFile] = useState(null);
  const [bgFile, setBgFile] = useState(null);

  useEffect(() => {
    const fetchBusinessData = async () => {
      try {
        const response = await axios.get(`/api/business/${business_slug}/settings/`);
        setBusinessInfo({
          name: response.data.name,
          description: response.data.description,
          phone: response.data.phone,
          address: response.data.address,
          business_logo: response.data.business_logo,
          background_image: response.data.background_image
        });
        setLoading(false);
      } catch (err) {
        setError(err.response?.data?.detail || err.message);
        setLoading(false);
      }
    };

    fetchBusinessData();
  }, [business_slug]);

  const getFileUrl = (imagePath) => {
    if (!imagePath) return '';
    if (/^https?:\/\//i.test(imagePath)) return imagePath;
    if (imagePath.startsWith('/media/')) return `http://localhost:8000${imagePath}`;
    if (!imagePath.startsWith('/')) return `http://localhost:8000/media/${imagePath}`;
    return `http://localhost:8000${imagePath}`;
  };

  const handleBusinessInfoChange = (e) => {
    const { name, value } = e.target;
    setBusinessInfo(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (type === 'logo') {
      setLogoFile(file);
    } else {
      setBgFile(file);
    }
  };

  const saveBusinessInfo = async () => {
    setSaving(true);
    try {
      const formData = new FormData();
      
      // Добавляем измененные поля
      if (editingField) {
        formData.append(editingField, businessInfo[editingField]);
      }
      
      // Добавляем изображения, если они были изменены
      if (logoFile) formData.append('business_logo', logoFile);
      if (bgFile) formData.append('background_image', bgFile);

      const response = await axios.patch(
        `/api/business/${business_slug}/settings/`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      setBusinessInfo(prev => ({
        ...prev,
        ...response.data,
        business_logo: response.data.business_logo || prev.business_logo,
        background_image: response.data.background_image || prev.background_image
      }));
      
      setLogoFile(null);
      setBgFile(null);
      setEditingField(null);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setSaving(false);
    }
  };

  const saveEditing = () => {
    if (editingField) {
      saveBusinessInfo();
    } else {
      setEditingField(null);
    }
  };

  const renderEditableField = (label, field, value, type = 'text') => (
    <div className={styles.formGroup}>
      <label>{label}</label>
      {editingField === field ? (
        <div className={styles.editField}>
          {type === 'textarea' ? (
            <textarea 
              name={field} 
              value={value} 
              onChange={handleBusinessInfoChange} 
              autoFocus 
            />
          ) : (
            <input 
              type={type} 
              name={field} 
              value={value} 
              onChange={handleBusinessInfoChange} 
              autoFocus 
            />
          )}
          <button 
            className={styles.saveButton} 
            onClick={saveEditing}
            disabled={saving}
          >
            {saving ? <FaSpinner className={styles.spinner} /> : <FaCheck />}
          </button>
        </div>
      ) : (
        <div className={styles.viewField}>
          <span>{value || 'Не указано'}</span>
          <button 
            className={styles.editButton} 
            onClick={() => setEditingField(field)}
            disabled={saving}
          >
            <FaEdit />
          </button>
        </div>
      )}
    </div>
  );

  const renderImageField = (label, field, value) => (
    <div className={styles.formGroup}>
      <label>{label}</label>
      <div className={styles.imageField}>
        {value ? (
          <img 
            src={getFileUrl(value)} 
            alt={label} 
            className={styles.imagePreview}
          />
        ) : (
          <div className={styles.imagePlaceholder}>
            <FaImage size={24} />
          </div>
        )}
        <label className={styles.imageUploadButton}>
          <input 
            type="file" 
            accept="image/*" 
            onChange={(e) => handleImageChange(e, field === 'business_logo' ? 'logo' : 'bg')} 
            style={{ display: 'none' }} 
          />
          {value ? 'Изменить' : 'Загрузить'}
        </label>
        {(logoFile || bgFile) && (
          <button 
            className={styles.imageSaveButton}
            onClick={saveBusinessInfo}
            disabled={saving}
          >
            {saving ? <FaSpinner className={styles.spinner} /> : 'Сохранить'}
          </button>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <FaSpinner className={styles.spinner} size={32} />
        <p>Загрузка данных...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <p className={styles.errorText}>{error}</p>
        <button 
          className={styles.retryButton}
          onClick={() => window.location.reload()}
        >
          Попробовать снова
        </button>
      </div>
    );
  }
// ----------------------------------------------------------------------------------
  const toggleLocationActive = (id) => {
    setLocations((prev) => prev.map(loc => loc.id === id ? { ...loc, isActive: !loc.isActive } : loc));
  };

  const setDefaultWarehouse = (id) => {
    setWarehouses((prev) => prev.map(wh => ({ ...wh, isDefault: wh.id === id })));
  };

  const setDefaultPrinter = (id) => {
    setPrinters((prev) => prev.map(prt => ({ ...prt, isDefault: prt.id === id })));
  };

  const handleAdd = (type) => {
    if (type === 'location' && newLocation.name && newLocation.address) {
      setLocations((prev) => [...prev, { id: Date.now(), ...newLocation, isActive: false }]);
      setNewLocation({ name: '', address: '' });
    } else if (type === 'warehouse' && newWarehouse.name && newWarehouse.location) {
      setWarehouses((prev) => [...prev, { id: Date.now(), ...newWarehouse, isDefault: false }]);
      setNewWarehouse({ name: '', location: '' });
    } else if (type === 'printer' && newPrinter.name) {
      setPrinters((prev) => [...prev, { id: Date.now(), ...newPrinter, isDefault: false }]);
      setNewPrinter({ name: '', type: 'barcode' });
    }
  };

  const handleDelete = (id, type) => {
    if (type === 'location') setLocations((prev) => prev.filter((loc) => loc.id !== id));
    if (type === 'warehouse') setWarehouses((prev) => prev.filter((wh) => wh.id !== id));
    if (type === 'printer') setPrinters((prev) => prev.filter((prt) => prt.id !== id));
  };


  const renderList = (items, type) => items.map(item => (
    <motion.div key={item.id} className={styles.listItem} whileHover={{ y: -2 }}>
      <div className={styles.itemInfo}>
        <h4>
          {item.name}
          {(item.isActive || item.isDefault) && (
            <span className={item.isActive ? styles.activeBadge : styles.defaultBadge}>
              {item.isActive ? 'Активна' : 'По умолчанию'}
            </span>
          )}
        </h4>
        <p><FaMapMarkerAlt /> {item.address || item.location || `Тип: ${item.type}`}</p>
      </div>
      <div className={styles.itemActions}>
        {type === 'location' && (
          <button
            className={item.isActive ? styles.activeButton : styles.inactiveButton}
            onClick={() => toggleLocationActive(item.id)}
          >
            {item.isActive ? 'Деактивировать' : 'Активировать'}
          </button>
        )}
        {type === 'warehouse' && !item.isDefault && (
          <button className={styles.setDefaultButton} onClick={() => setDefaultWarehouse(item.id)}>
            Сделать основным
          </button>
        )}
        {type === 'printer' && !item.isDefault && (
          <button className={styles.setDefaultButton} onClick={() => setDefaultPrinter(item.id)}>
            Сделать основным
          </button>
        )}
        <button className={styles.deleteButton} onClick={() => handleDelete(item.id, type)}>
          <FaTrashAlt />
        </button>
      </div>
    </motion.div>
  ));

  const tabList = [
    { key: 'business', label: 'Информация о бизнесе', icon: <FaBuilding /> },
    { key: 'locations', label: 'Торговые точки', icon: <FaStore /> },
    { key: 'warehouses', label: 'Склады', icon: <FaWarehouse /> },
    { key: 'printers', label: 'Принтеры', icon: <FaBarcode /> },
    { key: 'settings', label: 'Другие настройки', icon: <FaCog /> },
  ];

  return (
    <div className={styles.contentWrapper}>
      <div className={styles.accountContainer}>
        <motion.nav 
          className={styles.accountSidebar} 
          initial={{ x: -20, opacity: 0 }} 
          animate={{ x: 0, opacity: 1 }}
        >
          <div className={styles.accountMenu}>
            <button 
              className={activeTab === 'business' ? styles.active : ''} 
              onClick={() => setActiveTab('business')}
            >
              <FaBuilding /> Информация о бизнесе
            </button>
            <button 
              className={activeTab === 'locations' ? styles.active : ''} 
              onClick={() => setActiveTab('locations')}
            >
              <FaStore /> Торговые точки
            </button>
            <button 
              className={activeTab === 'warehouses' ? styles.active : ''} 
              onClick={() => setActiveTab('warehouses')}
            >
              <FaWarehouse /> Склады
            </button>
            <button 
              className={activeTab === 'printers' ? styles.active : ''} 
              onClick={() => setActiveTab('printers')}
            >
              <FaBarcode /> Принтеры
            </button>
            <button 
              className={activeTab === 'settings' ? styles.active : ''} 
              onClick={() => setActiveTab('settings')}
            >
              <FaCog /> Другие настройки
            </button>
          </div>
        </motion.nav>

        <div className={styles.accountContent}>
          {activeTab === 'business' && (
            <motion.div 
              className={styles.settingsTab} 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
            >
              <h1>Информация о бизнесе</h1>
              
              {renderImageField('Логотип бизнеса', 'business_logo', businessInfo.business_logo)}
              {renderImageField('Фоновое изображение', 'background_image', businessInfo.background_image)}
              
              {renderEditableField('Название бизнеса', 'name', businessInfo.name)}
              {renderEditableField('Описание', 'description', businessInfo.description, 'textarea')}
              {renderEditableField('Телефон', 'phone', businessInfo.phone, 'tel')}
              {renderEditableField('Адрес', 'address', businessInfo.address)}
            </motion.div>
          )}

          {['locations', 'warehouses', 'printers'].includes(activeTab) && (
            <motion.div className={styles.settingsTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h1>{activeTab === 'locations' ? 'Торговые точки' : activeTab === 'warehouses' ? 'Склады' : 'Принтеры'}</h1>
              {activeTab === 'printers' && (
                <div className={styles.infoAlert}><FaInfoCircle /> Настройте принтеры для чеков и штрих-кодов</div>
              )}
              <div className={styles.listContainer}>
                {renderList(
                  activeTab === 'locations' ? locations : activeTab === 'warehouses' ? warehouses : printers,
                  activeTab
                )}
              </div>
              <div className={styles.addForm}>
                <h2>Добавить</h2>
                <div className={styles.formRow}>
                  <input
                    type="text"
                    placeholder="Название"
                    value={activeTab === 'locations' ? newLocation.name : activeTab === 'warehouses' ? newWarehouse.name : newPrinter.name}
                    onChange={(e) => {
                      if (activeTab === 'locations') setNewLocation({ ...newLocation, name: e.target.value });
                      if (activeTab === 'warehouses') setNewWarehouse({ ...newWarehouse, name: e.target.value });
                      if (activeTab === 'printers') setNewPrinter({ ...newPrinter, name: e.target.value });
                    }}
                  />
                  {(activeTab === 'locations' || activeTab === 'warehouses') && (
                    <input
                      type="text"
                      placeholder="Адрес"
                      value={activeTab === 'locations' ? newLocation.address : newWarehouse.location}
                      onChange={(e) => {
                        if (activeTab === 'locations') setNewLocation({ ...newLocation, address: e.target.value });
                        if (activeTab === 'warehouses') setNewWarehouse({ ...newWarehouse, location: e.target.value });
                      }}
                    />
                  )}
                  {activeTab === 'printers' && (
                    <select value={newPrinter.type} onChange={(e) => setNewPrinter({ ...newPrinter, type: e.target.value })}>
                      <option value="barcode">Штрих-коды</option>
                      <option value="receipt">Чеки</option>
                    </select>
                  )}
                  <button
                    className={styles.addButton}
                    onClick={() => handleAdd(activeTab)}
                    disabled={
                      (activeTab === 'locations' && (!newLocation.name || !newLocation.address)) ||
                      (activeTab === 'warehouses' && (!newWarehouse.name || !newWarehouse.location)) ||
                      (activeTab === 'printers' && !newPrinter.name)
                    }
                  >
                    <FaPlus /> Добавить
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div className={styles.settingsTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h1>Другие настройки</h1>
              <div className={styles.settingsGrid}>
                {[{
                  icon: <FaCog />,
                  title: 'Основные настройки',
                  desc: 'Интерфейс и поведение системы',
                }, {
                  icon: <FaPrint />,
                  title: 'Печать чеков и этикеток',
                  desc: 'Настройки печати',
                }, {
                  icon: <FaBoxes />,
                  title: 'Товары',
                  desc: 'Параметры управления товарами',
                }].map(({ icon, title, desc }, idx) => (
                  <div className={styles.settingsItem} key={idx}>
                    <div className={styles.settingsIcon}>{icon}</div>
                    <div>
                      <h3>{title}</h3>
                      <p>{desc}</p>
                    </div>
                    <button className={styles.settingsBtn}>Настроить</button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
