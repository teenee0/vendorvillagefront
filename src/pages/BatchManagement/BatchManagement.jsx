import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import axios from '../../api/axiosDefault';
import styles from './BatchManagement.module.css';
import BatchCard from '../../components/BatchCard/BatchCard';
import TransferCard from '../../components/TransferCard/TransferCard';
import CreateBatchModal from '../../components/CreateBatchModal/CreateBatchModal';
import BatchDetailModal from '../../components/BatchDetailModal/BatchDetailModal';
import TransferDetailModal from '../../components/TransferDetailModal/TransferDetailModal';
import { FaPlus, FaBoxes, FaCalendarAlt, FaTruck } from 'react-icons/fa';
import Loader from '../../components/Loader';

const BatchManagement = () => {
  const { business_slug } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => {
    const tab = searchParams.get('tab');
    return tab === 'transfers' ? 'transfers' : 'batches';
  });
  const [batches, setBatches] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [isTransferDetailModalOpen, setIsTransferDetailModalOpen] = useState(false);

  // Инициализация активной вкладки из URL параметра
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'transfers') {
      if (activeTab !== 'transfers') {
        setActiveTab('transfers');
      }
      // Обновляем список перемещений при переключении на вкладку
      if (activeTab === 'transfers') {
        fetchTransfers(false);
      }
    } else if (tab !== 'transfers' && activeTab === 'transfers' && tab !== null) {
      setActiveTab('batches');
    }
  }, [searchParams]);

  useEffect(() => {
    if (activeTab === 'batches') {
      fetchBatches();
    } else if (activeTab === 'transfers') {
      fetchTransfers();
    }
  }, [business_slug, activeTab]);

  const fetchTransfers = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const response = await axios.get(`/api/business/${business_slug}/transfers/`);
      setTransfers(response.data);
    } catch (err) {
      console.error('Ошибка загрузки перемещений:', err);
      setError('Не удалось загрузить перемещения');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

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

  const handleViewTransfer = async (transferId) => {
    try {
      const response = await axios.get(`/api/business/${business_slug}/transfers/${transferId}/`);
      const transfer = response.data;
      
      // Если перемещение в статусе draft, открываем страницу редактирования
      if (transfer.status === 'draft') {
        navigate(`/business/${business_slug}/transfers/create?transfer_id=${transferId}`);
      } else {
        // Для проведенных/отмененных перемещений показываем модальное окно
        setSelectedTransfer(transfer);
        setIsTransferDetailModalOpen(true);
      }
    } catch (err) {
      console.error('Ошибка загрузки деталей перемещения:', err);
      alert('Не удалось загрузить детали перемещения');
    }
  };

  const handleDeleteTransfer = async (transferId) => {
    // Если передается ID, удаляем перемещение
    // Если не передан, значит удаление уже произошло в модальном окне
    if (transferId) {
      const transfer = transfers.find(t => t.id === transferId);
      
      if (!transfer) return;

      const confirmMessage = transfer.status === 'completed'
        ? 'Вы уверены, что хотите удалить проведенное перемещение? Используйте отмену для возврата товаров.'
        : 'Вы уверены, что хотите удалить это перемещение? Это действие нельзя отменить.';

      if (!window.confirm(confirmMessage)) {
        return;
      }

      try {
        await axios.delete(`/api/business/${business_slug}/transfers/${transferId}/delete/`);
        setTransfers(transfers.filter(t => t.id !== transferId));
        await fetchTransfers(false);
      } catch (err) {
        console.error('Ошибка удаления перемещения:', err);
        const errorMessage = err.response?.data?.detail || 'Не удалось удалить перемещение';
        alert(errorMessage);
      }
    } else {
      // Обновляем список после удаления из модального окна
      await fetchTransfers(false);
    }
  };

  const handleCloseTransferDetailModal = () => {
    setIsTransferDetailModalOpen(false);
    setSelectedTransfer(null);
    fetchTransfers(false);
  };

  const handleTransferUpdate = async () => {
    // Обновляем список перемещений (без показа полноэкранного loading)
    await fetchTransfers(false);
    // Перезагружаем детали текущего перемещения для обновления модального окна
    if (selectedTransfer && selectedTransfer.id) {
      try {
        const response = await axios.get(`/api/business/${business_slug}/transfers/${selectedTransfer.id}/`);
        setSelectedTransfer(response.data);
      } catch (err) {
        console.error('Ошибка загрузки деталей перемещения:', err);
      }
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
          {activeTab === 'batches' ? (
            <FaBoxes className={styles.titleIcon} />
          ) : (
            <FaTruck className={styles.titleIcon} />
          )}
          <h1 className={styles.title}>
            {activeTab === 'batches' ? 'Управление партиями' : 'Перемещения товаров'}
          </h1>
        </div>
        <button
          className={styles.createButton}
          onClick={() => {
            if (activeTab === 'batches') {
              setIsCreateModalOpen(true);
            } else {
              navigate(`/business/${business_slug}/transfers/create`);
            }
          }}
        >
          <FaPlus />
          <span>{activeTab === 'batches' ? 'Создать партию' : 'Создать перемещение'}</span>
        </button>
      </div>

      {/* Вкладки */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'batches' ? styles.tabActive : ''}`}
          onClick={() => {
            setActiveTab('batches');
            searchParams.delete('tab');
            setSearchParams(searchParams);
          }}
        >
          <FaBoxes />
          <span>Партии</span>
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'transfers' ? styles.tabActive : ''}`}
          onClick={() => {
            setActiveTab('transfers');
            searchParams.set('tab', 'transfers');
            setSearchParams(searchParams);
          }}
        >
          <FaTruck />
          <span>Перемещения</span>
        </button>
      </div>

      {activeTab === 'batches' ? (
        batches.length === 0 ? (
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
        )
      ) : (
        transfers.length === 0 ? (
          <div className={styles.emptyState}>
            <FaTruck className={styles.emptyIcon} />
            <h2>Нет перемещений</h2>
            <p>Создайте первое перемещение товаров</p>
            <button
              className={styles.createButton}
              onClick={() => navigate(`/business/${business_slug}/transfers/create`)}
            >
              <FaPlus />
              <span>Создать перемещение</span>
            </button>
          </div>
        ) : (
          <div className={styles.batchesGrid}>
            {transfers.map(transfer => (
              <TransferCard
                key={transfer.id}
                transfer={transfer}
                onView={() => handleViewTransfer(transfer.id)}
                onDelete={() => handleDeleteTransfer(transfer.id)}
              />
            ))}
          </div>
        )
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

      {isTransferDetailModalOpen && selectedTransfer && (
        <TransferDetailModal
          businessSlug={business_slug}
          transfer={selectedTransfer}
          onClose={handleCloseTransferDetailModal}
          onUpdate={handleTransferUpdate}
          onDelete={handleDeleteTransfer}
        />
      )}
    </div>
  );
};

export default BatchManagement;

