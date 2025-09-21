import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import axios from '../../api/axiosDefault';
import { isDevelopment } from '../../utils/devUtils';

const TokenTest = () => {
  const { isAuthenticated, user, refreshToken } = useAuth();
  const [testResult, setTestResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Дополнительная проверка - не рендерим в продакшене
  if (!isDevelopment()) {
    return null;
  }

  const testApiCall = async () => {
    setIsLoading(true);
    setTestResult('');
    
    try {
      const response = await axios.get('accounts/api/auth/me/', {
        withCredentials: true
      });
      setTestResult(`✅ API вызов успешен: ${JSON.stringify(response.data, null, 2)}`);
    } catch (error) {
      setTestResult(`❌ Ошибка API вызова: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testTokenRefresh = async () => {
    setIsLoading(true);
    setTestResult('');
    
    try {
      const success = await refreshToken();
      setTestResult(success ? '✅ Токен успешно обновлен' : '❌ Не удалось обновить токен');
    } catch (error) {
      setTestResult(`❌ Ошибка обновления токена: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div style={{ padding: '20px', border: '1px solid #ccc', margin: '20px' }}>
        <h3>Тест токенов</h3>
        <p>Пользователь не аутентифицирован</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', margin: '20px'}}>
      <h3>🔧 Тест автообновления токенов (DEV MODE)</h3>
      <p style={{ fontSize: '12px', color: '#666', marginBottom: '15px' }}>
        ⚠️ Этот компонент отображается только в режиме разработки
      </p>
      <p><strong>Статус:</strong> {isAuthenticated ? 'Аутентифицирован' : 'Не аутентифицирован'}</p>
      <p><strong>Пользователь:</strong> {user?.email || 'Не определен'}</p>
      
      <div style={{ marginTop: '20px' }}>
        <button 
          onClick={testApiCall} 
          disabled={isLoading}
          style={{ marginRight: '10px', padding: '10px' }}
        >
          {isLoading ? 'Загрузка...' : 'Тест API вызова'}
        </button>
        
        <button 
          onClick={testTokenRefresh} 
          disabled={isLoading}
          style={{ padding: '10px' }}
        >
          {isLoading ? 'Загрузка...' : 'Тест обновления токена'}
        </button>
      </div>
      
      {testResult && (
        <div style={{ 
          marginTop: '20px', 
          padding: '10px', 
          borderRadius: '4px',
          whiteSpace: 'pre-wrap',
          fontSize: '12px'
        }}>
          {testResult}
        </div>
      )}
    </div>
  );
};

export default TokenTest;
