import { Routes, Route, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Header from './components/Header/Header';
import Footer from './components/Footer/Footer';
import Main from './pages/Main/Main';
import Registration from './pages/Registration/Registration';
import Marketplace from './pages/Marketplace/Marketplace';

import "./App.css";
import BusinessCategories from './pages/BusinessCategories/BusinessCategories';
import MarketplaceCategories from './pages/MarketplaceCategories/MarketplaceCategories';
import ChildCategories from './pages/ChildCategories/ChildCategories';
import ProductsPage from './pages/MarkeplaceProducts/ProductsPage';
import ProductDetail from './pages/ProductDetail/ProductDetail';

function App() {
  const location = useLocation();

  return (
    <>
      <Header />
      <div className="content-wrapper">
        <AnimatePresence mode='wait'>
          <motion.main
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="page-content"
          >
            <Routes location={location}>
              <Route path="/" element={<Main />} />
              <Route path="/account" element={<Registration />} />
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path='/business-categories' element={<BusinessCategories/>} />
              <Route path='/marketplace/categories' element={<MarketplaceCategories/>} />
              <Route path="/marketplace/categories/:pk" element={<ChildCategories />} />
              <Route path="/marketplace/categories/:pk/products" element={<ProductsPage />} />
              <Route path="/marketplace/products/:pk" element={<ProductDetail />} />
            </Routes>
          </motion.main>
        </AnimatePresence>
      </div>
      <Footer />
    </>
  );
}

export default App;