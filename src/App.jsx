import { Routes, Route, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { useIsMobile } from './hooks/useIsMobile';
import { TooManyRequestsProvider } from './contexts/TooManyRequestsContext';
import TooManyRequestsModalManager from './components/TooManyRequestsModal/TooManyRequestsModalManager';
import Header from './components/Header/Header';
import Footer from './components/Footer/Footer';
import BottomNavigation from './components/BottomNavigation/BottomNavigation';
import BusinessBottomNavigation from './components/BusinessBottomNavigation/BusinessBottomNavigation';
import BusinessHeader from './components/BusinessHeader/BusinessHeader.jsx';
import BusinessFooter from './components/BusinessFooter/BusinessFooter.jsx';
import EnvironmentIndicator from './components/EnvironmentIndicator/EnvironmentIndicator';
import TokenRefreshManager from './components/TokenRefreshManager/TokenRefreshManager';
import CityRequiredWrapper from './components/CityRequiredWrapper/CityRequiredWrapper';
import SnowfallEffect from './components/Snowfall/Snowfall.jsx';
import Main from './pages/Main/Main';
import MainMobile from './pages/Main/MainMobile';
import Marketplace from './pages/Marketplace/Marketplace';

import "./App.css";
import BusinessCategoriesDesktop from './pages/BusinessCategories/BusinessCategoriesDesktop';
import BusinessCategoriesMobile from './pages/BusinessCategories/BusinessCategoriesMobile';
import MarketplaceCategoriesDesktop from './pages/MarketplaceCategories/MarketplaceCategoriesDesktop';
import MarketplaceCategoriesMobile from './pages/MarketplaceCategories/MarketplaceCategoriesMobile';
import ChildCategoriesDesktop from './pages/ChildCategories/ChildCategoriesDesktop';
import ChildCategoriesMobile from './pages/ChildCategories/ChildCategoriesMobile';
import ProductsPageDesktop from './pages/MarkeplaceProducts/ProductsPageDesktop';
import ProductsPageMobile from './pages/MarkeplaceProducts/ProductsPageMobile';
import ProductDetail from './pages/ProductDetail/ProductDetail';
import PrivateRoute from './pages/PrivateRoute/PrivateRoute';
import AccountPage from './pages/Account/AccoutPage';
import AccountPageMobile from './pages/Account/AccountPageMobile';
import AuthPage from './pages/Registration/Registration';
import PasswordReset from './pages/PasswordReset/PasswordReset';
import PublicRoute from './pages/PublicRoute/PublicRoute';
import ProductManagement from './pages/ProductManagement/ProductManagement';
import ProductManagementMobile from './pages/ProductManagement/ProductManagementMobile';
import ProductEditPage from './pages/ProductEditPage/ProductEditPage';
import ProductEditPageMobile from './pages/ProductEditPage/ProductEditPageMobile';
import ResponsiveRoute from './components/ResponsiveRoute/ResponsiveRoute';
import BusinessMainPage from './pages/BusinessMainPage/BusinessMainPage.jsx';
import BusinessMainPageMobile from './pages/BusinessMainPage/BusinessMainPageMobile.jsx';
import BusinessOwnerRoute from './components/BusinessOwnerRoute/BusinessOwnerRoute.jsx';
import LocationWrapper from './components/LocationWrapper/LocationWrapper.jsx';
import LocationSelectPage from './pages/LocationSelectPage/LocationSelectPage.jsx';
import ProductAddPage from './pages/ProductAddPage/ProductAddPage.jsx';
import ProductAddPageMobile from './pages/ProductAddPage/ProductAddPageMobile.jsx';
import ExcelImportPage from './pages/ExcelImportPage/ExcelImportPage.jsx';
import ExcelImportPageMobile from './pages/ExcelImportPage/ExcelImportPageMobile.jsx';
import ProductPageNew from './pages/ProductPage/ProductPageNew.jsx';
import ProductPageNewMobile from './pages/ProductPage/ProductPageNewMobile.jsx';
import SalesPage from './pages/SalesPage/SalesPage.jsx';
import SalesPageMobile from './pages/SalesPage/SalesPageMobile.jsx';
import SettingsPage from './pages/SettingsPage/SettingsPage.jsx';
import SettingsPageMobile from './pages/SettingsPage/SettingsPageMobile.jsx';
import TransactionsPage from './pages/Transactions/Transactions.jsx';
import TransactionsMobile from './pages/Transactions/TransactionsMobile.jsx';
import EmployeeInvite from './pages/EmployeeInvite/EmployeeInvite.jsx';
import VariantLocationPricePage from './pages/VariantLocationPricePage/VariantLocationPricePage.jsx';
import BatchManagement from './pages/BatchManagement/BatchManagement.jsx';
import BatchManagementMobile from './pages/BatchManagement/BatchManagementMobile.jsx';
import CreateTransferPage from './pages/CreateTransferPage/CreateTransferPage.jsx';
import CreateTransferPageMobile from './pages/CreateTransferPage/CreateTransferPageMobile.jsx';
import TasksPage from './pages/TasksPage/TasksPage.jsx';
import TasksPageMobile from './pages/TasksPage/TasksPageMobile.jsx';
import TaskDetailPage from './pages/TaskDetailPage/TaskDetailPage.jsx';
import TaskDetailPageMobile from './pages/TaskDetailPage/TaskDetailPageMobile.jsx';
import InventoryListPage from './pages/InventoryPage/InventoryListPage.jsx';
import InventoryListPageMobile from './pages/InventoryPage/InventoryListPageMobile.jsx';
import InventorySessionPage from './pages/InventoryPage/InventorySessionPage.jsx';
import InventorySessionPageMobile from './pages/InventoryPage/InventorySessionPageMobile.jsx';
import PrivacyPolicy from './pages/PrivacyPolicy/PrivacyPolicy.jsx';
import CookieConsent from './components/CookieConsent/CookieConsent.jsx';
import BonusHistory from './pages/BonusHistory/BonusHistory.jsx';
import BonusHistoryMobile from './pages/BonusHistory/BonusHistoryMobile.jsx';

function App() {
  const location = useLocation();
  const isMobile = useIsMobile();

  // Определяем бизнес-маршруты
  const isBusinessRoute = (
    location.pathname.startsWith('/business/')
  );

  // Определяем клиентские маршруты (маркетплейс) - все, что НЕ начинается с /business
  const isMarketplaceRoute = !isBusinessRoute;

  // Управление классами body для разных тем
  useEffect(() => {
    if (isBusinessRoute) {
      document.body.classList.add('business-theme');
      document.body.classList.remove('marketplace-theme');
    } else {
      // Если не бизнес-маршрут, то маркетплейс
      document.body.classList.add('marketplace-theme');
      document.body.classList.remove('business-theme');
    }

    // Очистка при размонтировании
    return () => {
      document.body.classList.remove('business-theme');
      document.body.classList.remove('marketplace-theme');
    };
  }, [isBusinessRoute, isMarketplaceRoute]);

  if (isBusinessRoute) {
    // Рендеринг для бизнес-страниц
    return (
      <>
        {/* <EnvironmentIndicator /> */}
        <TokenRefreshManager />
        <SnowfallEffect />
        <TooManyRequestsModalManager />
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
                      <Route 
                        path="/business/:business_slug/products/create" 
                        element={
                          <ResponsiveRoute 
                            desktopComponent={ProductAddPage}
                            mobileComponent={ProductAddPageMobile}
                          />
                        } 
                      />
                      <Route 
                        path="/business/:business_slug/products/excel-import" 
                        element={
                          <ResponsiveRoute 
                            desktopComponent={ExcelImportPage}
                            mobileComponent={ExcelImportPageMobile}
                          />
                        } 
                      />
                      <Route 
                        path="/business/:business_slug/products/:product_id" 
                        element={
                          <ResponsiveRoute 
                            desktopComponent={ProductPageNew}
                            mobileComponent={ProductPageNewMobile}
                          />
                        } 
                      />
                      <Route 
                        path="/business/:business_slug/products/:product_id/edit" 
                        element={
                          <ResponsiveRoute 
                            desktopComponent={ProductEditPage}
                            mobileComponent={ProductEditPageMobile}
                          />
                        } 
                      />
                      <Route path="/business/:business_slug/variants-location-price" element={<VariantLocationPricePage />} />
                      <Route 
                        path="/business/:business_slug/sale-products" 
                        element={
                          <ResponsiveRoute
                            desktopComponent={SalesPage}
                            mobileComponent={SalesPageMobile}
                          />
                        } 
                      />
                      <Route 
                        path="/business/:business_slug/transactions" 
                        element={
                          <ResponsiveRoute
                            desktopComponent={TransactionsPage}
                            mobileComponent={TransactionsMobile}
                          />
                        } 
                      />
                      <Route 
                        path="/business/:business_slug/bonus-history" 
                        element={
                          <ResponsiveRoute
                            desktopComponent={BonusHistory}
                            mobileComponent={BonusHistoryMobile}
                          />
                        } 
                      />
                      <Route 
                        path="/business/:business_slug/settings" 
                        element={
                          <ResponsiveRoute
                            desktopComponent={SettingsPage}
                            mobileComponent={SettingsPageMobile}
                          />
                        } 
                      />
                      <Route 
                        path="/business/:business_slug/batches" 
                        element={
                          <ResponsiveRoute 
                            desktopComponent={BatchManagement}
                            mobileComponent={BatchManagementMobile}
                          />
                        } 
                      />
                      <Route 
                        path="/business/:business_slug/transfers/create" 
                        element={
                          <ResponsiveRoute 
                            desktopComponent={CreateTransferPage}
                            mobileComponent={CreateTransferPageMobile}
                          />
                        } 
                      />
                      <Route 
                        path="/business/:business_slug/tasks" 
                        element={
                          <ResponsiveRoute
                            desktopComponent={TasksPage}
                            mobileComponent={TasksPageMobile}
                          />
                        } 
                      />
                      <Route 
                        path="/business/:business_slug/tasks/:task_id" 
                        element={
                          <ResponsiveRoute
                            desktopComponent={TaskDetailPage}
                            mobileComponent={TaskDetailPageMobile}
                          />
                        } 
                      />
                      <Route 
                        path="/business/:business_slug/inventory" 
                        element={
                          <ResponsiveRoute
                            desktopComponent={InventoryListPage}
                            mobileComponent={InventoryListPageMobile}
                          />
                        } 
                      />
                      <Route 
                        path="/business/:business_slug/inventory/:session_id" 
                        element={
                          <ResponsiveRoute
                            desktopComponent={InventorySessionPage}
                            mobileComponent={InventorySessionPageMobile}
                          />
                        } 
                      />
                    </Route>
                  </Route>
                </Route>
              </Routes>
            </motion.main>
          </AnimatePresence>
        </div>
        <BusinessFooter />
        {isMobile && <BusinessBottomNavigation />}
      </>
    );
  } else {
    // Рендеринг для обычных страниц
    return (
      <>
        {/* <EnvironmentIndicator /> */}
        <TokenRefreshManager />
        <SnowfallEffect />
        <TooManyRequestsModalManager />
        <Header />
        <div className="content-wrapper">
          <CityRequiredWrapper>
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
                  <Route 
                    path="/" 
                    element={
                      <ResponsiveRoute
                        desktopComponent={Main}
                        mobileComponent={MainMobile}
                      />
                    } 
                  />
                  <Route path="/registration-login" element={<AuthPage />} />
                  <Route path="/password-reset" element={<PasswordReset />} />
                  <Route path="/marketplace" element={<Marketplace />} />
                  <Route 
                    path='/marketplace/categories' 
                    element={
                      <ResponsiveRoute
                        desktopComponent={MarketplaceCategoriesDesktop}
                        mobileComponent={MarketplaceCategoriesMobile}
                      />
                    } 
                  />
                  <Route 
                    path="/marketplace/categories/:pk" 
                    element={
                      <ResponsiveRoute
                        desktopComponent={ChildCategoriesDesktop}
                        mobileComponent={ChildCategoriesMobile}
                      />
                    } 
                  />
                  <Route 
                    path="/marketplace/categories/:pk/products" 
                    element={
                      <ResponsiveRoute
                        desktopComponent={ProductsPageDesktop}
                        mobileComponent={ProductsPageMobile}
                      />
                    } 
                  />
                  <Route path="/marketplace/products/:pk" element={<ProductDetail />} />
                  <Route 
                    path='/business-categories' 
                    element={
                      <ResponsiveRoute
                        desktopComponent={BusinessCategoriesDesktop}
                        mobileComponent={BusinessCategoriesMobile}
                      />
                    } 
                  />
                  <Route path="/invite/employee/:token" element={<EmployeeInvite />} />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
                </Route>
                <Route element={<PrivateRoute />}>
                  <Route 
                    path="/account" 
                    element={
                      <ResponsiveRoute 
                        desktopComponent={AccountPage}
                        mobileComponent={AccountPageMobile}
                      />
                    } 
                  />
                </Route>
              </Routes>
            </motion.main>
          </AnimatePresence>
          </CityRequiredWrapper>
        </div>
        <Footer />
        {isMobile && <BottomNavigation />}
        <CookieConsent />
      </>
    );
  }
}

export default App;


