import { useMemo } from 'react';
import { FileUtils } from '../utils/fileUtils';

/**
 * Хук для работы с файлами и изображениями
 * @returns {Object} объект с утилитами для работы с файлами
 */
export const useFileUtils = () => {
    // Мемоизируем утилиты для оптимизации
    const utils = useMemo(() => FileUtils, []);

    return {
        // Основные функции
        getImageUrl: utils.getImageUrl,
        getFileUrl: utils.getFileUrl,
        getBackgroundImageUrl: utils.getBackgroundImageUrl,
        getApiUrl: utils.getApiUrl,
        
        // Утилиты для работы с файлами
        isExternalUrl: utils.isExternalUrl,
        getFileName: utils.getFileName,
        getFileExtension: utils.getFileExtension,
        isImageFile: utils.isImageFile,
        formatFileSize: utils.formatFileSize,
        
        // Стили и превью
        createBackgroundImageStyle: utils.createBackgroundImageStyle,
        getThumbnailUrl: utils.getThumbnailUrl,
        
        // Весь объект утилит
        utils
    };
};

export default useFileUtils;
