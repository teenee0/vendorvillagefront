import { useNavigate, useLocation } from 'react-router-dom';
import './BusinessFooter.css';
import Dock from '../Dock/Dock';

export const BusinessFooter = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Достаём `business_slug` из URL (например, "/business/myshop/main" → "myshop")
  const business_slug = location.pathname.split('/')[2];

  const handleNavigate = (path) => {
    navigate(`/business/${business_slug}${path}`);
  };

  const items = [
    { icon: <div>🏠</div>, label: 'Главная', onClick: () => handleNavigate('/main') },
    { icon: <div>📦</div>, label: 'Товары', onClick: () => handleNavigate('/products') },
  ];

  return (
    <Dock 
      items={items}
      panelHeight={68}
      baseItemSize={50}
      magnification={70}
    />
  );
};

export default BusinessFooter;