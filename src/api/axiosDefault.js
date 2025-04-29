import axios_base from 'axios';

const axios = axios_base.create({
  baseURL: 'http://localhost:8000', // здесь лежит базовый домен, не надо миллион раз его писать
  withCredentials: true,  // Обязательно для отправки кук
});


export default axios;
