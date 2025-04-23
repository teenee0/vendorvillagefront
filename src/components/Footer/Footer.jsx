import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';
import { FaFacebook, FaTwitter, FaInstagram, FaLinkedin } from 'react-icons/fa';

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-section">
          <h3 className="footer-logo">
            <span className="logo-icon">^</span>
            <span className="logo-icon">V</span>
            VendorVillage
          </h3>
          <p className="footer-description">
            Your marketplace for unique products and local sellers.
          </p>
          <div className="social-icons">
            <a href="#" aria-label="Facebook"><FaFacebook /></a>
            <a href="#" aria-label="Twitter"><FaTwitter /></a>
            <a href="#" aria-label="Instagram"><FaInstagram /></a>
            <a href="#" aria-label="LinkedIn"><FaLinkedin /></a>
          </div>
        </div>

        <div className="footer-section">
          <h4>Quick Links</h4>
          <ul className="footer-links">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/marketplace">Marketplace</Link></li>
            <li><Link to="/categories">Categories</Link></li>
            <li><Link to="/about">About Us</Link></li>
          </ul>
        </div>

        <div className="footer-section">
          <h4>Help & Support</h4>
          <ul className="footer-links">
            <li><Link to="/contact">Contact Us</Link></li>
            <li><Link to="/faq">FAQ</Link></li>
            <li><Link to="/shipping">Shipping Policy</Link></li>
            <li><Link to="/returns">Returns</Link></li>
          </ul>
        </div>

        <div className="footer-section">
          <h4>Newsletter</h4>
          <form className="newsletter-form">
            <input type="email" placeholder="Your email address" required />
            <button type="submit">Subscribe</button>
          </form>
          <p className="footer-text">
            Subscribe to get updates on new products and offers
          </p>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} VendorVillage. All rights reserved.</p>
        <div className="legal-links">
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/terms">Terms of Service</Link>
        </div>
      </div>
    </footer>
  );
}

export default Footer;