import React, { useState } from 'react';
import styles from './DeleteProductModal.module.css';
import { FaExclamationTriangle, FaArchive, FaTrash, FaTimes } from 'react-icons/fa';

const DeleteProductModal = ({ isOpen, onClose, onConfirm, productName }) => {
    const [selectedType, setSelectedType] = useState('soft');

    if (!isOpen) return null;

    const handleConfirm = () => {
        onConfirm(selectedType);
        onClose();
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <div className={styles.title}>
                        <FaExclamationTriangle className={styles.warningIcon} />
                        <span>Удаление товара</span>
                    </div>
                    <button className={styles.closeButton} onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>

                <div className={styles.content}>
                    <div className={styles.productInfo}>
                        <strong>Товар:</strong> {productName}
                    </div>

                    <div className={styles.warning}>
                        <FaExclamationTriangle className={styles.warningIcon} />
                        <span>Выберите тип удаления:</span>
                    </div>

                    <div className={styles.options}>
                        <div 
                            className={`${styles.option} ${selectedType === 'soft' ? styles.selected : ''}`}
                            onClick={() => setSelectedType('soft')}
                        >
                            <div className={styles.optionHeader}>
                                <FaArchive className={styles.optionIcon} />
                                <span className={styles.optionTitle}>Мягкое удаление</span>
                                <div className={styles.recommended}>Рекомендуется</div>
                            </div>
                            <div className={styles.optionDescription}>
                                <ul>
                                    <li>✅ Товар скрывается из всех списков</li>
                                    <li>✅ Все продажи и история сохраняются</li>
                                    <li>✅ Данные можно восстановить</li>
                                    <li>✅ Отчеты остаются корректными</li>
                                </ul>
                            </div>
                        </div>

                        <div 
                            className={`${styles.option} ${selectedType === 'hard' ? styles.selected : ''}`}
                            onClick={() => setSelectedType('hard')}
                        >
                            <div className={styles.optionHeader}>
                                <FaTrash className={styles.optionIcon} />
                                <span className={styles.optionTitle}>Жесткое удаление</span>
                                <div className={styles.dangerous}>Опасно!</div>
                            </div>
                            <div className={styles.optionDescription}>
                                <div className={styles.dangerWarning}>
                                    <FaExclamationTriangle className={styles.dangerIcon} />
                                    <strong>ВНИМАНИЕ!</strong> Будет удалено навсегда:
                                </div>
                                <ul>
                                    <li>❌ Товар и все варианты</li>
                                    <li>❌ Все изображения</li>
                                    <li>❌ Вся история продаж</li>
                                    <li>❌ Все связанные данные</li>
                                </ul>
                                <div className={styles.irreversible}>
                                    ⚠️ Это действие необратимо!
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles.footer}>
                    <button className={styles.cancelButton} onClick={onClose}>
                        Отмена
                    </button>
                    <button 
                        className={`${styles.confirmButton} ${selectedType === 'hard' ? styles.dangerButton : styles.safeButton}`}
                        onClick={handleConfirm}
                    >
                        {selectedType === 'soft' ? (
                            <>
                                <FaArchive />
                                Архивировать товар
                            </>
                        ) : (
                            <>
                                <FaTrash />
                                Удалить навсегда
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteProductModal;
