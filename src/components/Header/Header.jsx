import React, { useState, useEffect } from 'react';
import './Header.css';
import caretIcon from '../../assets/icons/^.svg';
import vIcon from '../../assets/icons/v.svg';
import { Link } from 'react-router-dom';

function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <header className={`header ${scrolled ? 'scrolled' : ''}`}>
      <nav className="navbar">
        <div className="container">
          <Link to="/" className="brand">
            <img src={caretIcon} alt="^ Icon" className="logo-icon" />
            <img src={vIcon} alt="V Icon" className="logo-icon" />
            <span>VendorVillage</span>
          </Link>

          <div className={`navbar-collapse ${isMobileMenuOpen ? 'open' : ''}`}>
            <ul className="navbar-nav">
              <li className="nav-item">
                <Link to="/categories" className="nav-link">Categories</Link>
              </li>
              <li className="nav-item">
                <Link to="/sites" className="nav-link">Sites</Link>
              </li>
            </ul>

            <form className="search-form" role="search">
              <input 
                className="search-input" 
                type="search" 
                placeholder="Search products..." 
                aria-label="Search" 
              />
              <button className="search-button" type="submit">
                <i className="fas fa-search"></i>
              </button>
            </form>

            <ul className="navbar-nav">
              <li className="nav-item">
                <Link to="/cart" className="nav-link">
                  <i className="fas fa-shopping-cart"></i> Cart
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/account" className="nav-link">
                  <i className="fas fa-user"></i> Account
                </Link>
              </li>
            </ul>
          </div>

          <button
            className={`navbar-toggler ${isMobileMenuOpen ? 'open' : ''}`}
            onClick={toggleMobileMenu}
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
        </div>
      </nav>
    </header>
  );
}

export default Header;