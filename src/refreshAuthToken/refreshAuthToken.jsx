// TODO попытаться сделать обновление токена раз в какое то время
// Функция для обновления токена
// const refreshAccessToken = async () => {
//     try {
//         const response = await axios.post('http://localhost:8000/accounts/api/token/refresh/', {
//             withCredentials: true,
//         });
  
      
  
//     } catch (error) {
//       console.error('Ошибка при обновлении токена:', error);
//       // Можно выполнить очистку токенов и перенаправить на страницу логина
      
//       window.location.href = '/registration-login'; // Перенаправление на страницу логина
//     }
//   };
  
//   // Обновлять токен каждые 14 минут (840000 мс)
//   setInterval(refreshAccessToken, 14 * 60 * 1000);
  
  