import React, { useState, useEffect } from 'react';
import ModalCloseButton from '../ModalCloseButton/ModalCloseButton';

const RECURRENCE_OPTIONS = [
  { value: 'one_time', label: 'Разовый' },
  { value: 'day', label: 'Ежедневно' },
  { value: 'week', label: 'Еженедельно' },
  { value: 'month', label: 'Ежемесячно' },
  { value: 'year', label: 'Ежегодно' },
];

const INITIAL = {
  name: '',
  category: '',
  location: '',
  planned_amount: '',
  recurrence_unit: 'month',
  recurrence_interval: 1,
  start_date: '',
  end_date: '',
  description: '',
};

const ExpenseFormModal = ({
  isOpen,
  onClose,
  onSave,
  expense,
  categories,
  locations,
  styles,
}) => {
  const [form, setForm] = useState(INITIAL);

  useEffect(() => {
    if (expense) {
      setForm({
        name: expense.name || '',
        category: expense.category || '',
        location: expense.location || '',
        planned_amount: expense.planned_amount || '',
        recurrence_unit: expense.recurrence_unit || 'month',
        recurrence_interval: expense.recurrence_interval || 1,
        start_date: expense.start_date || '',
        end_date: expense.end_date || '',
        description: expense.description || '',
      });
    } else {
      setForm(INITIAL);
    }
  }, [expense, isOpen]);

  if (!isOpen) return null;

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.category || !form.planned_amount || !form.start_date) return;
    const data = { ...form };
    // Пустые опциональные поля: при POST поле можно не слать; при PATCH нужно явно null, иначе partial update не меняет значение в БД
    if (!data.location) {
      if (expense) data.location = null;
      else delete data.location;
    }
    if (!data.end_date) {
      if (expense) data.end_date = null;
      else delete data.end_date;
    }
    onSave(data);
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalWide} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>{expense ? 'Редактировать расход' : 'Новый расход'}</h3>
          <ModalCloseButton onClick={onClose} />
        </div>
        <form onSubmit={handleSubmit}>
          <p className={styles.formIntro}>
            Здесь задаётся правило расхода (название, сумма, как повторяется, срок действия).
            Отдельные оплаты и документы — во вкладке «Платежи».
          </p>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>Название *</label>
              <p className={styles.fieldHint}>Короткое имя в списках, например «Аренда склада».</p>
              <input type="text" value={form.name} onChange={set('name')} placeholder="Аренда офиса" />
            </div>

            <div className={styles.formGroup}>
              <label>Категория *</label>
              <p className={styles.fieldHint}>Группа для отчётов и сводки (можно завести в «Категории»).</p>
              <select value={form.category} onChange={set('category')}>
                <option value="">Выберите</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Сумма *</label>
              <p className={styles.fieldHint}>
                Плановая сумма за один период: месяц, неделя, день и т.д. Для разового расхода — сумма этой одной оплаты.
              </p>
              <input type="number" step="0.01" min="0" value={form.planned_amount} onChange={set('planned_amount')} />
            </div>

            <div className={styles.formGroup}>
              <label>Периодичность</label>
              <p className={styles.fieldHint}>
                Как часто ожидается платёж. «Разовый» — одна запись оплаты; остальное — регулярные периоды.
              </p>
              <select value={form.recurrence_unit} onChange={set('recurrence_unit')}>
                {RECURRENCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {form.recurrence_unit !== 'one_time' && (
              <div className={styles.formGroup}>
                <label>Интервал</label>
                <p className={styles.fieldHint}>Каждые N единиц из «Периодичность» (например каждые 2 месяца → 2).</p>
                <input type="number" min="1" value={form.recurrence_interval} onChange={set('recurrence_interval')} />
              </div>
            )}

            <div className={styles.formGroup}>
              <label>Дата начала *</label>
              <p className={styles.fieldHint}>
                С какого дня действует это правило. Для разового — день расхода. Для регулярного — от неё считаются периоды и плановые платежи.
              </p>
              <input type="date" value={form.start_date} onChange={set('start_date')} />
            </div>

            <div className={styles.formGroup}>
              <label>Дата окончания</label>
              <p className={styles.fieldHint}>
                До какого дня включительно расход актуален. Пусто — без срока. После этой даты новые плановые платежи не создаются.
              </p>
              <input type="date" value={form.end_date} onChange={set('end_date')} />
            </div>

            {locations.length > 0 && (
              <div className={styles.formGroup}>
                <label>Локация</label>
                <p className={styles.fieldHint}>Не выбрано — расход на весь бизнес; иначе только на эту точку.</p>
                <select value={form.location} onChange={set('location')}>
                  <option value="">Весь бизнес</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label>Описание</label>
            <p className={styles.fieldHint}>Произвольные заметки, в отчётах не участвует.</p>
            <textarea
              value={form.description}
              onChange={set('description')}
              rows={3}
              placeholder="Дополнительная информация..."
            />
          </div>

          <div className={styles.modalActions}>
            <button type="button" className={styles.btnSecondary} onClick={onClose}>
              Отмена
            </button>
            <button
              type="submit"
              className={styles.btnPrimary}
              disabled={!form.name.trim() || !form.category || !form.planned_amount || !form.start_date}
            >
              {expense ? 'Сохранить' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExpenseFormModal;
