import React, { useEffect, useState } from 'react';
// import axios from 'axios';
import axios from "../../api/axiosDefault.js";
import { useNavigate } from 'react-router-dom';
import './AccountPage.css'; // Подключи сюда свои стили

const AccountPage = () => {
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAccountInfo = async () => {
      try {
        const response = await axios.get('accounts/api/account/', {
          withCredentials: true,
        });
        setUserData(response.data);
      } catch (err) {
        setError('Не удалось загрузить данные аккаунта');
        if (err.response && err.response.status === 401) {
          navigate('/registration-login');
        }
      }
    };

    fetchAccountInfo();
  }, [navigate]);

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!userData) {
    return <div className="loading">Загрузка...</div>;
  }

  return (
    <div className="account-page">
      <h1>Профиль пользователя</h1>
      <div className="account-info">
        <p><strong>Имя пользователя:</strong> {userData.username}</p>
        <p><strong>Email:</strong> {userData.email}</p>
        <p><strong>Телефон:</strong> {userData.phone || 'Не указан'}</p>
        <p><strong>Тип аккаунта:</strong> {userData.is_business ? 'Бизнес' : 'Обычный пользователь'}</p>
        <div className="roles">
          <strong>Роли:</strong>
          
        </div>
      </div>
      <button className="logout-button" onClick={handleLogout}>Выйти</button>
    </div>
  );

  async function handleLogout() {
  try {
    await axios.post('accounts/api/auth/logout/', {}, { withCredentials: true });
    window.location.href = '/registration-login';
  } catch (error) {
    console.error('Ошибка при выходе');
  }
}
};

export default AccountPage;
