import React from 'react';
import { Modal, Button } from 'antd';
import { useNavigate } from 'react-router-dom';

/**
 * Модалка для гостя при попытке добавить товар в корзину.
 * После «Войти» — /registration-login?redirect=... (как в AuthPage).
 *
 * @param {boolean} open
 * @param {() => void} onClose
 * @param {string} redirectPath — куда вернуть после входа (например /marketplace/products/12)
 */
function AuthRequiredForCartModal({ open, onClose, redirectPath }) {
  const navigate = useNavigate();

  const handleLogin = () => {
    const path = (redirectPath && redirectPath.trim()) || '/marketplace';
    navigate(`/registration-login?redirect=${encodeURIComponent(path)}`);
    onClose?.();
  };

  return (
    <Modal
      title="Вход в аккаунт"
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      destroyOnClose
    >
      <p style={{ marginBottom: 0 }}>
        Вы не авторизованы. Чтобы добавлять товары в корзину, войдите в аккаунт.
      </p>
      <Button type="primary" block size="large" onClick={handleLogin} style={{ marginTop: 20 }}>
        Войти в аккаунт
      </Button>
    </Modal>
  );
}

export default AuthRequiredForCartModal;
