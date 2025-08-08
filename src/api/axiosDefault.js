import axios_base from 'axios';

const axios = axios_base.create({
  baseURL: 'https://w0320x8c-8000.euw.devtunnels.ms', // здесь лежит базовый домен, не надо миллион раз его писать
  withCredentials: true,  // Обязательно для отправки кук
});


export default axios;
