import React, { useState, useEffect } from 'react';
import ModalCloseButton from '../ModalCloseButton/ModalCloseButton';

const ExpenseCategoryModal = ({
  isOpen,
  onClose,
  onSave,
  category,
  styles,
  stacked,
}) => {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');

  useEffect(() => {
    if (category) {
      setName(category.name || '');
      setIcon(category.icon || '');
    } else {
      setName('');
      setIcon('');
    }
  }, [category, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), icon: icon.trim() });
  };

  return (
    <div
      className={`${styles.modalOverlay} ${stacked ? styles.modalOverlayStacked : ''}`}
      onClick={onClose}
    >
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>{category ? 'Редактировать категорию' : 'Новая категория'}</h3>
          <ModalCloseButton onClick={onClose} />
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label>Название</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Аренда, Зарплата, Реклама..."
              autoFocus
            />
          </div>
          <div className={styles.formGroup}>
            <label>Иконка (emoji или код)</label>
            <input
              type="text"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="🏠"
            />
          </div>
          <div className={styles.modalActions}>
            <button type="button" className={styles.btnSecondary} onClick={onClose}>
              Отмена
            </button>
            <button type="submit" className={styles.btnPrimary} disabled={!name.trim()}>
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExpenseCategoryModal;
