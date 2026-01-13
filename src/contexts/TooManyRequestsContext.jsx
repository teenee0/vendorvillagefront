import React, { createContext, useContext, useState, useCallback } from 'react';

const TooManyRequestsContext = createContext(null);

export const useTooManyRequests = () => {
  const context = useContext(TooManyRequestsContext);
  if (!context) {
    throw new Error('useTooManyRequests must be used within TooManyRequestsProvider');
  }
  return context;
};

export const TooManyRequestsProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [retryAfter, setRetryAfter] = useState(null);
  const [retryFunction, setRetryFunction] = useState(null);

  const showModal = useCallback((retryAfterSeconds = null, retryFn = null) => {
    setRetryAfter(retryAfterSeconds);
    setRetryFunction(() => retryFn);
    setIsOpen(true);
  }, []);

  const hideModal = useCallback(() => {
    setIsOpen(false);
    setRetryAfter(null);
    setRetryFunction(null);
  }, []);

  const retryRequest = useCallback(async () => {
    if (retryFunction) {
      hideModal();
      try {
        await retryFunction();
      } catch (error) {
        // Если снова ошибка 429, модальное окно покажется автоматически через interceptor
        console.error('Ошибка при повторном запросе:', error);
      }
    }
  }, [retryFunction, hideModal]);

  return (
    <TooManyRequestsContext.Provider
      value={{
        isOpen,
        retryAfter,
        showModal,
        hideModal,
        retryRequest,
      }}
    >
      {children}
    </TooManyRequestsContext.Provider>
  );
};

