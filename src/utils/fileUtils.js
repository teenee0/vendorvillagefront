import { ENV_CONFIG } from '../config/environment';

/**
 * Централизованные утилиты для работы с файлами и изображениями
 */

/**
 * Получает полный URL для изображения
 * @param {string} imagePath - путь к изображению
 * @returns {string} полный URL изображения
 */
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

/**
 * Получает полный URL для любого файла
 * @param {string} filePath - путь к файлу
 * @returns {string} полный URL файла
 */
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

/**
 * Получает URL для фонового изображения (для CSS)
 * @param {string} imagePath - путь к изображению
 * @returns {string} URL для CSS background-image
 */
export const getBackgroundImageUrl = (imagePath) => {
    const url = getImageUrl(imagePath);
    return url ? `url(${url})` : 'none';
};

/**
 * Получает URL для API запросов
 * @param {string} endpoint - endpoint API
 * @returns {string} полный URL для API
 */
export const getApiUrl = (endpoint = '') => {
    const baseUrl = ENV_CONFIG.API_BASE_URL;
    return `${baseUrl}${endpoint}`;
};

/**
 * Проверяет, является ли путь внешним URL
 * @param {string} path - путь для проверки
 * @returns {boolean} true если это внешний URL
 */
export const isExternalUrl = (path) => {
    return /^https?:\/\//i.test(path);
};

/**
 * Получает имя файла из пути
 * @param {string} filePath - путь к файлу
 * @returns {string} имя файла
 */
export const getFileName = (filePath) => {
    if (!filePath) return '';
    return filePath.split('/').pop();
};

/**
 * Получает расширение файла
 * @param {string} filePath - путь к файлу
 * @returns {string} расширение файла
 */
export const getFileExtension = (filePath) => {
    if (!filePath) return '';
    const fileName = getFileName(filePath);
    const lastDot = fileName.lastIndexOf('.');
    return lastDot > 0 ? fileName.substring(lastDot + 1).toLowerCase() : '';
};

/**
 * Проверяет, является ли файл изображением
 * @param {string} filePath - путь к файлу
 * @returns {boolean} true если это изображение
 */
export const isImageFile = (filePath) => {
    const extension = getFileExtension(filePath);
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
    return imageExtensions.includes(extension);
};

/**
 * Получает размер файла в читаемом формате
 * @param {number} bytes - размер в байтах
 * @returns {string} размер в читаемом формате
 */
export const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Создает объект стилей для фонового изображения
 * @param {string} imagePath - путь к изображению
 * @param {object} additionalStyles - дополнительные стили
 * @returns {object} объект стилей
 */
export const createBackgroundImageStyle = (imagePath, additionalStyles = {}) => {
    return {
        backgroundImage: getBackgroundImageUrl(imagePath),
        ...additionalStyles
    };
};

/**
 * Получает URL для превью изображения (если есть система превью)
 * @param {string} imagePath - путь к изображению
 * @param {string} size - размер превью (thumb, small, medium, large)
 * @returns {string} URL превью
 */
export const getThumbnailUrl = (imagePath, size = 'thumb') => {
    if (!imagePath) return '';
    
    const baseUrl = getImageUrl(imagePath);
    if (!baseUrl) return '';
    
    // Если это внешний URL, возвращаем как есть
    if (isExternalUrl(imagePath)) return baseUrl;
    
    // Добавляем параметр размера (зависит от бэкенда)
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}size=${size}`;
};

// Экспортируем все утилиты как объект для удобства
export const FileUtils = {
    getImageUrl,
    getFileUrl,
    getBackgroundImageUrl,
    getApiUrl,
    isExternalUrl,
    getFileName,
    getFileExtension,
    isImageFile,
    formatFileSize,
    createBackgroundImageStyle,
    getThumbnailUrl
};

export default FileUtils;
