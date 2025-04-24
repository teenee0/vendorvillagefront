import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Breadcrumbs.css';

const Breadcrumbs = ({ breadcrumbs, productName }) => {
  const navigate = useNavigate();

  return (
    <nav className="product-breadcrumbs">
      <button onClick={() => navigate('/marketplace/categories')}>
        Главная
      </button>
      
      {breadcrumbs?.map((category, index) => (
        <React.Fragment key={category.id}>
          <span className="separator">/</span>
          <button onClick={() => navigate(`/marketplace/categories/${category.id}`)}>
            {category.name}
          </button>
        </React.Fragment>
      ))}
      
      {productName && (
        <>
          <span className="separator">/</span>
          <span className="current">{productName}</span>
        </>
      )}
    </nav>
  );
};

export default Breadcrumbs;