import { ENV_CONFIG } from '../config/environment';

export const getFileUrl = (filePath) => {
    if (!filePath) return '';
    
    // Если уже полный URL, возвращаем как есть
    if (/^https?:\/\//i.test(filePath)) return filePath;
    
    // Используем конфигурацию из environment
    const baseUrl = ENV_CONFIG.MEDIA_BASE_URL;
    
    if (filePath.startsWith('/media/')) {
        return `${baseUrl}${filePath}`;
    }
    
    if (!filePath.startsWith('/')) {
        return `${baseUrl}/media/${filePath}`;
    }
    
    return `${baseUrl}${filePath}`;
};