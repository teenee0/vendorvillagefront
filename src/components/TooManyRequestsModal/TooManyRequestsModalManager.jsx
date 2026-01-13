import React, { useEffect } from 'react';
import { useTooManyRequests } from '../../contexts/TooManyRequestsContext';
import TooManyRequestsModal from './TooManyRequestsModal';

const TooManyRequestsModalManager = () => {
  const { isOpen, retryAfter, showModal, retryRequest } = useTooManyRequests();

  useEffect(() => {
    // Устанавливаем глобальную функцию для вызова из axios interceptor
    window.showTooManyRequestsModal = (retryAfterSeconds, retryFn) => {
      showModal(retryAfterSeconds, retryFn);
    };

    // Очищаем при размонтировании
    return () => {
      delete window.showTooManyRequestsModal;
    };
  }, [showModal]);

  return (
    <TooManyRequestsModal
      isOpen={isOpen}
      retryAfter={retryAfter}
      onRetry={retryRequest}
    />
  );
};

export default TooManyRequestsModalManager;

