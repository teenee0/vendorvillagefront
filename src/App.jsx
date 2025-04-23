import { Routes, Route, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Header from './components/Header/Header';
import Footer from './components/Footer/Footer';
import Main from './pages/Main/Main';
import Registration from './pages/Registration/Registration';
import Marketplace from './pages/Marketplace/Marketplace';

import "./App.css";

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
            </Routes>
          </motion.main>
        </AnimatePresence>
      </div>
      <Footer />
    </>
  );
}

export default App;