import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import axios from '../../api/axiosDefault';
import styles from './BatchManagement.module.css';
import BatchCard from '../../components/BatchCard/BatchCard';
import CreateBatchModal from '../../components/CreateBatchModal/CreateBatchModal';
import BatchDetailModal from '../../components/BatchDetailModal/BatchDetailModal';
import { FaPlus, FaBoxes, FaCalendarAlt } from 'react-icons/fa';
import Loader from '../../components/Loader';

const BatchManagement = () => {
  const { business_slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    fetchBatches();
  }, [business_slug]);

  // Автоматически открыть партию из query параметра
  useEffect(() => {
    const batchId = searchParams.get('batch');
    if (batchId && !selectedBatch && !loading) {
      // Загружаем полные детали партии через API
      fetchBatchDetails(parseInt(batchId));
      // Убираем параметр из URL
      searchParams.delete('batch');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, loading]);

  const fetchBatchDetails = async (batchId, showModal = true) => {
    try {
      if (showModal) setLoading(true);
      const response = await axios.get(`/api/business/${business_slug}/batches/${batchId}/`);
      setSelectedBatch(response.data);
      if (showModal) setIsDetailModalOpen(true);
    } catch (err) {
      console.error('Ошибка загрузки деталей партии:', err);
      if (showModal) alert('Не удалось загрузить детали партии');
    } finally {
      if (showModal) setLoading(false);
    }
  };

  const fetchBatches = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const response = await axios.get(`/api/business/${business_slug}/batches/`);
      setBatches(response.data);
    } catch (err) {
      console.error('Ошибка загрузки партий:', err);
      setError('Не удалось загрузить партии');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleCreateBatch = async (batchData, documents) => {
    try {
      // Создаем партию
      const response = await axios.post(
        `/api/business/${business_slug}/batches/create/`,
        batchData
      );
      
      const batchId = response.data.id;
      
      // Загружаем документы
      if (documents && documents.length > 0) {
        for (const doc of documents) {
          const formData = new FormData();
          formData.append('document', doc.document);
          formData.append('name', doc.name);
          if (doc.description) {
            formData.append('description', doc.description);
          }
          
          await axios.post(
            `/api/business/${business_slug}/batches/${batchId}/add-document/`,
            formData,
            {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
            }
          );
        }
      }
      
      // Обновляем список партий
      await fetchBatches();
      setIsCreateModalOpen(false);
      return true;
    } catch (err) {
      console.error('Ошибка создания партии:', err);
      throw err;
    }
  };

  const handleDeleteBatch = async (batchId) => {
    const batch = batches.find(b => b.id === batchId);
    
    const confirmMessage = batch && batch.status === 'completed'
      ? 'Вы уверены, что хотите удалить проведенную партию? Это действие можно выполнить только если из партии ничего не продавали.'
      : 'Вы уверены, что хотите удалить эту партию? Это действие нельзя отменить.';

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      await axios.delete(`/api/business/${business_slug}/batches/${batchId}/delete/`);
      setBatches(batches.filter(batch => batch.id !== batchId));
      // Обновляем список, чтобы убрать удаленную партию
      await fetchBatches(false);
    } catch (err) {
      console.error('Ошибка удаления партии:', err);
      const errorMessage = err.response?.data?.detail || 'Не удалось удалить партию';
      alert(errorMessage);
    }
  };

  const handleViewBatch = async (batchId) => {
    try {
      const response = await axios.get(`/api/business/${business_slug}/batches/${batchId}/`);
      setSelectedBatch(response.data);
      setIsDetailModalOpen(true);
    } catch (err) {
      console.error('Ошибка загрузки деталей партии:', err);
    }
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedBatch(null);
    // Обновляем список после закрытия модального окна
    fetchBatches();
  };

  const handleBatchUpdate = async () => {
    // Обновляем список партий (без показа полноэкранного loading)
    await fetchBatches(false);
    // Перезагружаем детали текущей партии для обновления модального окна (без показа loading)
    if (selectedBatch && selectedBatch.id) {
      await fetchBatchDetails(selectedBatch.id, false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <p>{error}</p>
        <button onClick={fetchBatches}>Попробовать снова</button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <FaBoxes className={styles.titleIcon} />
          <h1 className={styles.title}>Управление партиями</h1>
        </div>
        <button
          className={styles.createButton}
          onClick={() => setIsCreateModalOpen(true)}
        >
          <FaPlus />
          <span>Создать партию</span>
        </button>
      </div>

      {batches.length === 0 ? (
        <div className={styles.emptyState}>
          <FaBoxes className={styles.emptyIcon} />
          <h2>Нет партий</h2>
          <p>Создайте первую партию товаров</p>
          <button
            className={styles.createButton}
            onClick={() => setIsCreateModalOpen(true)}
          >
            <FaPlus />
            <span>Создать партию</span>
          </button>
        </div>
      ) : (
        <div className={styles.batchesGrid}>
          {batches.map(batch => (
            <BatchCard
              key={batch.id}
              batch={batch}
              onView={() => handleViewBatch(batch.id)}
              onDelete={() => handleDeleteBatch(batch.id)}
            />
          ))}
        </div>
      )}

      {isCreateModalOpen && (
        <CreateBatchModal
          businessSlug={business_slug}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={handleCreateBatch}
        />
      )}

      {isDetailModalOpen && selectedBatch && (
        <BatchDetailModal
          businessSlug={business_slug}
          batch={selectedBatch}
          onClose={handleCloseDetailModal}
          onUpdate={handleBatchUpdate}
          onDelete={handleDeleteBatch}
        />
      )}
    </div>
  );
};

export default BatchManagement;

