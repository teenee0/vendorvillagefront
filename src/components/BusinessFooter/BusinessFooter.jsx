// src/components/Footer.jsx
import { Link } from 'react-router-dom';
import './BusinessFooter.css';
import Dock from '../Dock/Dock';
const items = [
    { icon: <div>🏠</div>, label: 'Home', onClick: () => alert('Home!') },
    { icon: <div>📦</div>, label: 'Archive', onClick: () => alert('Archive!') },
    { icon: <div>👤</div>, label: 'Profile', onClick: () => alert('Profile!') },
    { icon: <div>⚙️</div>, label: 'Settings', onClick: () => alert('Settings!') },
    { icon: <div>⚙️</div>, label: 'Settings', onClick: () => alert('Settings!') },
    { icon: <div>⚙️</div>, label: 'Settings', onClick: () => alert('Settings!') },
    { icon: <div>⚙️</div>, label: 'Settings', onClick: () => alert('Settings!') },
    { icon: <div>⚙️</div>, label: 'Settings', onClick: () => alert('Settings!') },
    { icon: <div>⚙️</div>, label: 'Settings', onClick: () => alert('Settings!') },
    { icon: <div>⚙️</div>, label: 'Settings', onClick: () => alert('Settings!') },
    { icon: <div>⚙️</div>, label: 'Settings', onClick: () => alert('Settings!') },
    
  ];
export const BusinessFooter = () => {
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