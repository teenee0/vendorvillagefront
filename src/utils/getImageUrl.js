import { ENV_CONFIG } from '../config/environment';

export const getImageUrl = (imagePath) => {
    if (!imagePath) return '';
    
    // Если уже полный URL, возвращаем как есть
    if (/^https?:\/\//i.test(imagePath)) return imagePath;
    
    // Используем конфигурацию из environment
    const baseUrl = ENV_CONFIG.MEDIA_BASE_URL;
    
    if (imagePath.startsWith('/media/')) {
        return `${baseUrl}${imagePath}`;
    }
    
    if (!imagePath.startsWith('/')) {
        return `${baseUrl}/media/${imagePath}`;
    }
    
    return `${baseUrl}${imagePath}`;
};