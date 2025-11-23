import { Routes, Route, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import Header from './components/Header/Header';
import Footer from './components/Footer/Footer';
import BusinessHeader from './components/BusinessHeader/BusinessHeader.jsx';
import BusinessFooter from './components/BusinessFooter/BusinessFooter.jsx';
import EnvironmentIndicator from './components/EnvironmentIndicator/EnvironmentIndicator';
import TokenRefreshManager from './components/TokenRefreshManager/TokenRefreshManager';
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
import PasswordReset from './pages/PasswordReset/PasswordReset';
import PublicRoute from './pages/PublicRoute/PublicRoute';
import ProductManagement from './pages/ProductManagement/ProductManagement';
import ProductManagementMobile from './pages/ProductManagement/ProductManagementMobile';
import ProductEditPage from './pages/ProductEditPage/ProductEditPage';
import ResponsiveRoute from './components/ResponsiveRoute/ResponsiveRoute';
import BusinessMainPage from './pages/BusinessMainPage/BusinessMainPage.jsx';
import BusinessMainPageMobile from './pages/BusinessMainPage/BusinessMainPageMobile.jsx';
import BusinessOwnerRoute from './components/BusinessOwnerRoute/BusinessOwnerRoute.jsx';
import LocationWrapper from './components/LocationWrapper/LocationWrapper.jsx';
import LocationSelectPage from './pages/LocationSelectPage/LocationSelectPage.jsx';
import ProductAddPage from './pages/ProductAddPage/ProductAddPage.jsx';
import ProductPageNew from './pages/ProductPage/ProductPageNew.jsx';
import SalesPage from './pages/SalesPage/SalesPage.jsx';
import SettingsPage from './pages/SettingsPage/SettingsPage.jsx';
import TransactionsPage from './pages/Transactions/Transactions.jsx';
import EmployeeInvite from './pages/EmployeeInvite/EmployeeInvite.jsx';
import VariantLocationPricePage from './pages/VariantLocationPricePage/VariantLocationPricePage.jsx';
import BatchManagement from './pages/BatchManagement/BatchManagement.jsx';
import TasksPage from './pages/TasksPage/TasksPage.jsx';
import TaskDetailPage from './pages/TaskDetailPage/TaskDetailPage.jsx';
import InventoryListPage from './pages/InventoryPage/InventoryListPage.jsx';
import InventorySessionPage from './pages/InventoryPage/InventorySessionPage.jsx';

function App() {
  const location = useLocation();

  // Определяем бизнес-маршруты
  const isBusinessRoute = (
    location.pathname.startsWith('/business/')
  );

  // Управление классом body для бизнес-темы
  useEffect(() => {
    if (isBusinessRoute) {
      document.body.classList.add('business-theme');
    } else {
      document.body.classList.remove('business-theme');
    }

    // Очистка при размонтировании
    return () => {
      document.body.classList.remove('business-theme');
    };
  }, [isBusinessRoute]);

  if (isBusinessRoute) {
    // Рендеринг для бизнес-страниц
    return (
      <>
        {/* <EnvironmentIndicator /> */}
        <TokenRefreshManager />
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
                    <Route element={<LocationWrapper />}>
                      <Route path="/business/:business_slug/location-select" element={<LocationSelectPage />} />
                      <Route 
                        path="/business/:business_slug/main" 
                        element={
                          <ResponsiveRoute 
                            desktopComponent={BusinessMainPage}
                            mobileComponent={BusinessMainPageMobile}
                          />
                        } 
                      />
                      <Route 
                        path="/business/:business_slug/products" 
                        element={
                          <ResponsiveRoute 
                            desktopComponent={ProductManagement}
                            mobileComponent={ProductManagementMobile}
                          />
                        } 
                      />
                      <Route path="/business/:business_slug/products/create" element={<ProductAddPage />} />
                      <Route path="/business/:business_slug/products/:product_id" element={<ProductPageNew />} />
                      <Route path="/business/:business_slug/products/:product_id/edit" element={<ProductEditPage />} />
                      <Route path="/business/:business_slug/variants-location-price" element={<VariantLocationPricePage />} />
                      <Route path="/business/:business_slug/sale-products" element={<SalesPage />} />
                      <Route path="/business/:business_slug/transactions" element={<TransactionsPage />} />
                      <Route path="/business/:business_slug/settings" element={<SettingsPage />} />
                      <Route path="/business/:business_slug/batches" element={<BatchManagement />} />
                      <Route path="/business/:business_slug/tasks" element={<TasksPage />} />
                      <Route path="/business/:business_slug/tasks/:task_id" element={<TaskDetailPage />} />
                      <Route path="/business/:business_slug/inventory" element={<InventoryListPage />} />
                      <Route path="/business/:business_slug/inventory/:session_id" element={<InventorySessionPage />} />
                    </Route>
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
        <EnvironmentIndicator />
        <TokenRefreshManager />
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
                  <Route path="/password-reset" element={<PasswordReset />} />
                  <Route path="/marketplace" element={<Marketplace />} />
                  <Route path='/marketplace/categories' element={<MarketplaceCategories />} />
                  <Route path="/marketplace/categories/:pk" element={<ChildCategories />} />
                  <Route path="/marketplace/categories/:pk/products" element={<ProductsPage />} />
                  <Route path="/marketplace/products/:pk" element={<ProductDetail />} />
                  <Route path='/business-categories' element={<BusinessCategories />} />
                  <Route path="/invite/employee/:token" element={<EmployeeInvite />} />
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


