// ProductVariantEditor.jsx
import React, { useState, useEffect } from 'react';
import axios from '../../api/axiosDefault';
import styles from './ProductVariantEditor.module.css';

const ProductVariantEditor = ({ productId, businessSlug }) => {
  const [attributes, setAttributes] = useState([]);
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingVariant, setEditingVariant] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(
          `/api/business/${businessSlug}/products/${productId}/attributes/`
        );
        setAttributes(response.data.attributes);
        setVariants(response.data.existing_variants);
        setLoading(false);
      } catch (err) {
        setError('Не удалось загрузить данные вариантов');
        setLoading(false);
        console.error('Ошибка загрузки:', err);
      }
    };

    fetchData();
  }, [productId, businessSlug]);

  const handleAddVariant = () => {
    setEditingVariant({
      id: null,
      sku: '',
      price: '',
      discount: '',
      stock_quantity: 0,
      show_this: false,
      has_custom_name: false,
      custom_name: '',
      has_custom_description: false,
      custom_description: '',
      attributes: attributes.map(attr => ({
        category_attribute_id: attr.id,
        attribute_id: attr.attribute_id,
        attribute_name: attr.name,
        predefined_value_id: attr.has_predefined_values ? null : undefined,
        custom_value: '',
        required: attr.required,
        has_predefined_values: attr.has_predefined_values,
        predefined_values: attr.values || []
      }))
    });
    setShowModal(true);
  };

  const handleEditVariant = (variant) => {
    setEditingVariant({
      ...variant,
      attributes: attributes.map(attr => {
        const existingAttr = variant.attributes.find(a => a.category_attribute_id === attr.id);
        return existingAttr || {
          category_attribute_id: attr.id,
          attribute_id: attr.attribute_id,
          attribute_name: attr.name,
          predefined_value_id: attr.has_predefined_values ? null : undefined,
          custom_value: '',
          required: attr.required,
          has_predefined_values: attr.has_predefined_values,
          predefined_values: attr.values || []
        };
      })
    });
    setShowModal(true);
  };

  const handleDeleteVariant = async (variantId) => {
    if (window.confirm('Вы уверены, что хотите удалить этот вариант?')) {
      try {
        await axios.delete(
          `/api/business/${businessSlug}/products/${productId}/variants/${variantId}/`
        );
        setVariants(variants.filter(v => v.id !== variantId));
      } catch (err) {
        setError('Ошибка при удалении варианта');
      }
    }
  };

  const handleSaveVariant = async () => {
    try {
      const variantData = {
        ...editingVariant,
        attributes: editingVariant.attributes.map(attr => ({
          category_attribute_id: attr.category_attribute_id,
          predefined_value_id: attr.has_predefined_values ? attr.predefined_value_id : null,
          custom_value: attr.has_predefined_values ? '' : attr.custom_value
        }))
      };

      const response = editingVariant.id
        ? await axios.put(
            `/api/business/${businessSlug}/products/${productId}/variants/${editingVariant.id}/`,
            variantData
          )
        : await axios.post(
            `/api/business/${businessSlug}/products/${productId}/variants/`,
            variantData
          );

      setVariants(prev => 
        editingVariant.id
          ? prev.map(v => v.id === editingVariant.id ? response.data : v)
          : [...prev, response.data]
      );
      
      setShowModal(false);
    } catch (err) {
      setError('Ошибка при сохранении варианта');
      console.error('Ошибка сохранения:', err);
    }
  };

  const handleAttributeChange = (attrIndex, field, value) => {
    setEditingVariant(prev => {
      const newAttributes = [...prev.attributes];
      newAttributes[attrIndex] = { ...newAttributes[attrIndex], [field]: value };
      return { ...prev, attributes: newAttributes };
    });
  };

  

  if (loading) return <div className={styles.loading}>Загрузка вариантов...</div>;
  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>Варианты товара</h3>
        <button className={styles.addButton} onClick={handleAddVariant}>
          + Добавить вариант
        </button>
      </div>

      {variants.length === 0 ? (
        <div className={styles.emptyState}>
          <p>Нет вариантов товара</p>
        </div>
      ) : (
        <div className={styles.variantsList}>
          {variants.map(variant => (
            <div key={variant.id} className={styles.variantItem}>
              <div className={styles.variantInfo}>
                <h4>{variant.custom_name || `Вариант #${variant.id}`}</h4>
                <div className={styles.attributes}>
                  {variant.attributes.map(attr => (
                    <span key={`${variant.id}-${attr.category_attribute_id}`} className={styles.attribute}>
                      {attr.attribute_name}: {attr.predefined_value || attr.custom_value}
                    </span>
                  ))}
                </div>
                <div className={styles.priceInfo}>
                  <span className={styles.price}>
                    {parseFloat(variant.price).toFixed(2)} ₽
                    {variant.discount && (
                      <span className={styles.discountedPrice}>
                        ({(parseFloat(variant.price) * (1 - parseFloat(variant.discount)/100).toFixed(2))} ₽ со скидкой {variant.discount}%)
                      </span>
                    )}
                  </span>
                </div>
                <div className={styles.stockInfo}>
                  В наличии: {variant.stock_quantity} шт.
                </div>
              </div>
              <div className={styles.actions}>
                <button 
                  className={styles.editButton}
                  onClick={() => handleEditVariant(variant)}
                >
                  Редактировать
                </button>
                <button 
                  className={styles.deleteButton}
                  onClick={() => handleDeleteVariant(variant.id)}
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && editingVariant && (
        <VariantModal
          variant={editingVariant}
          onChange={setEditingVariant}
          onSave={handleSaveVariant}
          onClose={() => setShowModal(false)}
          onAttributeChange={handleAttributeChange}
        />
      )}
    </div>
  );
};

const VariantModal = ({ variant, onChange, onSave, onClose, onAttributeChange }) => {
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    onChange(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h3>{variant.id ? 'Редактирование' : 'Добавление'} варианта</h3>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.formGroup}>
            <label>Артикул (SKU)</label>
            <input
              type="text"
              name="sku"
              value={variant.sku || ''}
              onChange={handleChange}
              placeholder="Уникальный идентификатор"
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Цена *</label>
              <input
                type="number"
                name="price"
                value={variant.price || ''}
                onChange={handleChange}
                min="0"
                step="0.01"
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label>Скидка (%)</label>
              <input
                type="number"
                name="discount"
                value={variant.discount || ''}
                onChange={handleChange}
                min="0"
                max="100"
                step="1"
              />
            </div>
            <div className={styles.formGroup}>
              <label>Количество *</label>
              <input
                type="number"
                name="stock_quantity"
                value={variant.stock_quantity || 0}
                onChange={handleChange}
                min="0"
                required
              />
            </div>
          </div>

          <div className={styles.checkboxGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                name="show_this"
                checked={variant.show_this}
                onChange={handleChange}
              />
              Показывать в поиске
            </label>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                name="has_custom_name"
                checked={variant.has_custom_name}
                onChange={handleChange}
              />
              Использовать своё название
            </label>
            {variant.has_custom_name && (
              <div className={styles.formGroup}>
                <label>Название варианта</label>
                <input
                  type="text"
                  name="custom_name"
                  value={variant.custom_name || ''}
                  onChange={handleChange}
                  placeholder="Название этого варианта"
                />
              </div>
            )}
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                name="has_custom_description"
                checked={variant.has_custom_description}
                onChange={handleChange}
              />
              Использовать своё описание
            </label>
            {variant.has_custom_description && (
              <div className={styles.formGroup}>
                <label>Описание варианта</label>
                <textarea
                  name="custom_description"
                  value={variant.custom_description || ''}
                  onChange={handleChange}
                  rows="3"
                  placeholder="Описание этого варианта"
                />
              </div>
            )}
          </div>

          <div className={styles.attributesSection}>
            <h4>Атрибуты варианта</h4>
            {variant.attributes.map((attr, index) => (
                <div key={attr.category_attribute_id} className={styles.attributeGroup}>
                    <label>
                    {attr.attribute_name}
                    {attr.required && <span className={styles.required}> *</span>}
                    </label>
                    {attr.has_predefined_values ? (
                    <div className={styles.customSelect}>
                        <select
                        value={attr.predefined_value_id || ''}
                        onChange={(e) => onAttributeChange(
                            index,
                            'predefined_value_id',
                            e.target.value || null
                        )}
                        required={attr.required}
                        className={styles.selectInput}
                        >
                        <option value="">Выберите значение</option>
                        {attr.predefined_values?.map(value => (
                            <option key={value.id} value={value.id}>
                            {value.value}
                            {value.color_code && (
                                <span 
                                className={styles.colorBadge} 
                                style={{ backgroundColor: value.color_code }}
                                />
                            )}
                            </option>
                        ))}
                        </select>
                        <span className={styles.selectArrow}>▼</span>
                    </div>
                    ) : (
                    <input
                        type="text"
                        value={attr.custom_value || ''}
                        onChange={(e) => onAttributeChange(
                        index,
                        'custom_value',
                        e.target.value
                        )}
                        required={attr.required}
                        placeholder={`Введите ${attr.attribute_name.toLowerCase()}`}
                        className={styles.textInput}
                    />
                    )}
                </div>
                ))}
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.cancelButton} onClick={onClose}>
            Отмена
          </button>
          <button className={styles.saveButton} onClick={onSave}>
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductVariantEditor;