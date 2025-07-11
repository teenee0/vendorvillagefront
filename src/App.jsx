import { Routes, Route, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Header from './components/Header/Header';
import Footer from './components/Footer/Footer';
import BusinessHeader from './components/BusinessHeader/BusinessHeader.jsx';
import BusinessFooter from './components/BusinessFooter/BusinessFooter.jsx';
import Main from './pages/Main/Main';
import Marketplace from './pages/Marketplace/Marketplace';

import "./App.css";
import BusinessCategories from './pages/BusinessCategories/BusinessCategories';
import MarketplaceCategories from './pages/MarketplaceCategories/MarketplaceCategories';
import ChildCategories from './pages/ChildCategories/ChildCategories';
import ProductsPage from './pages/MarkeplaceProducts/ProductsPage';
import ProductDetail from './pages/ProductDetail/ProductDetail';
import PrivateRoute from './pages/PrivateRoute/PrivateRoute';
import AccountPage from './pages/Account/AccoutPage';
import AuthPage from './pages/Registration/Registration';
import PublicRoute from './pages/PublicRoute/PublicRoute';
import ProductManagement from './pages/ProductManagement/ProductManagement';
import ProductEditPage from './pages/ProductEditPage/ProductEditPage'
import BusinessMainPage from './pages/BusinessMainPage/BusinessMainPage.jsx';
import BusinessOwnerRoute from './components/BusinessOwnerRoute/BusinessOwnerRoute.jsx';
import ProductAddPage from './pages/ProductAddPage/ProductAddpage.jsx';
import ProductPage from './pages/ProductPage/ProductPage.jsx';
import SalesPage from './pages/SalesPage/SalesPage.jsx';

function App() {
  const location = useLocation();

  // Определяем бизнес-маршруты
  const isBusinessRoute = (
    location.pathname.startsWith('/business/')
  );

  if (isBusinessRoute) {
    // Рендеринг для бизнес-страниц
    return (
      <>
        <BusinessHeader />
        <div className="content-wrapper-business">
          <AnimatePresence mode='wait'>
            <motion.main
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="page-content-business"
            >
              <Routes location={location}>
                <Route element={<PrivateRoute />}>
                  <Route element={<BusinessOwnerRoute />}>
                    <Route path="/business/:business_slug/main" element={<BusinessMainPage />} />
                    <Route path="/business/:business_slug/products" element={<ProductManagement />} />
                    <Route path="/business/:business_slug/products/create" element={<ProductAddPage />} />
                    <Route path="/business/:business_slug/products/:product_id" element={<ProductPage />} />
                    <Route path="/business/:business_slug/products/:product_id/edit" element={<ProductEditPage />} />
                    <Route path="/business/:business_slug/sale-products" element={<SalesPage />} />

                  </Route>
                </Route>
              </Routes>
            </motion.main>
          </AnimatePresence>
        </div>
        <BusinessFooter />
      </>
    );
  } else {
    // Рендеринг для обычных страниц
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
                <Route element={<PublicRoute />}>
                  <Route path="/" element={<Main />} />
                  <Route path="/registration-login" element={<AuthPage />} />
                  <Route path="/marketplace" element={<Marketplace />} />
                  <Route path='/marketplace/categories' element={<MarketplaceCategories />} />
                  <Route path="/marketplace/categories/:pk" element={<ChildCategories />} />
                  <Route path="/marketplace/categories/:pk/products" element={<ProductsPage />} />
                  <Route path="/marketplace/products/:pk" element={<ProductDetail />} />
                  <Route path='/business-categories' element={<BusinessCategories />} />
                </Route>
                <Route element={<PrivateRoute />}>
                  <Route path="/account" element={<AccountPage />} />
                </Route>
              </Routes>
            </motion.main>
          </AnimatePresence>
        </div>
        <Footer />
      </>
    );
  }
}

export default App;