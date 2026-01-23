import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from "../../api/axiosDefault.js";

export const useChildCategories = () => {
  const { pk } = useParams();
  const navigate = useNavigate();
  const [category, setCategory] = useState(null);
  const [children, setChildren] = useState([]);
  const [hasAllDescendants, setHasAllDescendants] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`marketplace/api/categories/${pk}/`);
  
        if (response.data.should_redirect) {
          navigate(response.data.redirect_to);
          return;
        }
  
        if (response.data && response.data.category) {
          setCategory(response.data.category);
          setChildren(response.data.children || []);
          setHasAllDescendants(response.data.has_all_descendants || false);
        } else {
          throw new Error('Неверная структура ответа от сервера');
        }
      } catch (err) {
        console.error('Ошибка загрузки:', err);
        setError(err.message);
        navigate('/business-categories', { replace: true });
      } finally {
        setLoading(false);
      }
    };
  
    fetchData();
  }, [pk, navigate]);

  return {
    category,
    children,
    hasAllDescendants,
    loading,
    error,
    pk
  };
};


