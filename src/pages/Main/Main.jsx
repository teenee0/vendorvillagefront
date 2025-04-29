import React from 'react';
import './Main.css';
import { Link } from 'react-router-dom';

function Main() {
  const categories = [
    { name: "Electronics", icon: "fa-laptop" },
    { name: "Clothing", icon: "fa-tshirt" },
    { name: "Home & Garden", icon: "fa-home" },
    { name: "Books", icon: "fa-book" },
  ];

  return (
    <div className="main-page">
      <section className="hero-section">
        <div className="main-page-container">
          <h1 className="hero-title">Добро пожаловать на VendorVillage</h1>
          <p className="hero-subtitle">Открывайте для себя новые товары и не только</p>
          <Link to="/business-categories" className="cta-button">Смотреть</Link>
        </div>
      </section>

      <section className="categories-section">
        <div className="main-page-container">
          <h2 className="section-title">Shop by Category</h2>
          <div className="categories-grid">
            {categories.map((category, index) => (
              <Link to={`/categories/${category.name.toLowerCase()}`} key={index} className="category-card">
                <i className={`fas ${category.icon}`}></i>
                <h3>{category.name}</h3>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default Main;