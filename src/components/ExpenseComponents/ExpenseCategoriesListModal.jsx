import React from 'react';
import { FaEdit, FaPlus, FaTrashAlt } from 'react-icons/fa';
import ModalCloseButton from '../ModalCloseButton/ModalCloseButton';

/**
 * Список категорий расходов: просмотр, переход к добавлению/редактированию, мягкое удаление.
 */
const ExpenseCategoriesListModal = ({
  isOpen,
  onClose,
  categories,
  onAdd,
  onEdit,
  onDelete,
  styles,
}) => {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modalWide}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="expense-categories-list-title"
      >
        <div className={styles.modalHeader}>
          <h3 id="expense-categories-list-title">Категории расходов</h3>
          <ModalCloseButton onClick={onClose} />
        </div>
        <p className={styles.fieldHint}>
          Удаление скрывает категорию из выбора при создании расходов; уже созданные расходы сохраняют привязку.
        </p>
        <div className={styles.categoriesToolbar}>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={() => {
              onAdd();
            }}
          >
            <FaPlus /> Добавить категорию
          </button>
        </div>

        {categories.length === 0 ? (
          <p className={styles.categoriesEmpty}>Пока нет категорий — нажмите «Добавить».</p>
        ) : (
          <ul className={styles.categoriesList}>
            {categories.map((cat) => (
              <li key={cat.id} className={styles.categoriesListItem}>
                <span className={styles.categoriesListIcon} aria-hidden>
                  {cat.icon?.trim() ? cat.icon : '📁'}
                </span>
                <span className={styles.categoriesListName}>{cat.name}</span>
                <div className={styles.categoriesListActions}>
                  <button
                    type="button"
                    className={`${styles.btnSmall} ${styles.btnEdit}`}
                    title="Изменить"
                    aria-label={`Изменить категорию «${cat.name}»`}
                    onClick={() => onEdit(cat)}
                  >
                    <FaEdit />
                  </button>
                  <button
                    type="button"
                    className={`${styles.btnSmall} ${styles.btnDelete}`}
                    title="Удалить"
                    aria-label={`Удалить категорию «${cat.name}»`}
                    onClick={() => onDelete(cat.id)}
                  >
                    <FaTrashAlt />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ExpenseCategoriesListModal;
