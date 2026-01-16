import { useState, useEffect } from 'react';
import axios from "../../api/axiosDefault.js";

export const useMarketplaceCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get('marketplace/api/categories/');
        setCategories(response.data);
      } catch (error) {
        console.error('Ошибка загрузки категорий:', error);
      } finally {
        setLoading(false);
      }
    };
  
    fetchCategories();
  }, []);

  return {
    categories,
    loading
  };
};


