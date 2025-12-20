import React from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';

/**
 * Компонент для автоматического выбора мобильной или десктопной версии
 * @param {React.Component} desktopComponent - Компонент для десктопной версии
 * @param {React.Component} mobileComponent - Компонент для мобильной версии
 * @param {object} props - Пропсы, которые будут переданы в выбранный компонент
 * @param {number} breakpoint - Точка разрыва в пикселях (по умолчанию 768px)
 */
const ResponsiveRoute = ({ 
  desktopComponent: DesktopComponent, 
  mobileComponent: MobileComponent, 
  breakpoint = 768,
  ...props 
}) => {
  const isMobile = useIsMobile(breakpoint);

  // Выбираем компонент в зависимости от устройства
  const Component = isMobile ? MobileComponent : DesktopComponent;
  console.log('isMobile', isMobile, 'Component', Component);

  // Если мобильная версия не предоставлена, используем десктопную
  if (isMobile && !MobileComponent) {
    return <DesktopComponent {...props} />;
  }

  return <Component {...props} />;
};

export default ResponsiveRoute;

