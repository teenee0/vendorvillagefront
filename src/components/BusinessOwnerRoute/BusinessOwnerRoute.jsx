import { useEffect, useState } from 'react';
import { Navigate, Outlet, useParams, useLocation } from 'react-router-dom';
import axios from "../../api/axiosDefault.js";

const BusinessOwnerRoute = () => {
  const [accessStatus, setAccessStatus] = useState('checking');
  const { business_slug } = useParams();
  const location = useLocation();

  useEffect(() => {
    const checkBusinessAccess = async () => {
      try {
        // Проверяем права доступа к бизнесу
        const response = await axios.get(`business/api/check-access/${business_slug}/`, {
          withCredentials: true
        });

        if (response.data.has_access) {
          setAccessStatus('granted');
        } else {
          setAccessStatus('denied');
        }
      } catch (error) {
        console.error('Ошибка при проверке доступа:', error);
        if (error.response?.status === 401) {
          setAccessStatus('unauthenticated');
        } else {
          setAccessStatus('denied');
        }
      }
    };

    checkBusinessAccess();
  }, [business_slug, location.pathname]);

  if (accessStatus === 'checking') {
    return <div className="auth-loader">Проверка прав доступа...</div>;
  }

  if (accessStatus === 'unauthenticated') {
    return <Navigate to="/registration-login" state={{ from: location }} replace />;
  }

  if (accessStatus === 'denied') {
    return <Navigate to="/registration-login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export default BusinessOwnerRoute;