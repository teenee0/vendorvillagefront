import { useState, useEffect } from 'react';
import axios from "../../api/axiosDefault.js";

export const useBusinessCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get('api/business-categories/');
        setCategories(response.data);
      } catch (error) {
        console.error('Ошибка загрузки категорий:', error);
      } finally {
        setLoading(false);
      }
    };
  
    fetchCategories();
  }, []);

  const getBusinessEmoji = (name) => {
    switch(name) {
      case 'Маркетплейс': return '🛍️';
      case 'ТРЦ': return '🏬';
      case 'Рестораны': return '🍽️';
      default: return '🏢';
    }
  };

  return {
    categories,
    loading,
    getBusinessEmoji
  };
};
