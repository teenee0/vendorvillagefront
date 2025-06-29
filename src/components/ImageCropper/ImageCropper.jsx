import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import styles from './ImageCropper.module.css';

const ImageCropper = ({ files, currentIndex, onCropComplete, onCancel, onNext, onPrevious }) => {
    const [crop, setCrop] = useState();
    const [completedCrop, setCompletedCrop] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const imgRef = useRef(null);

    // Генерируем и чистим object URL
    const [objectUrl, setObjectUrl] = useState(null);

    // СБРОС crop при смене фото
    useEffect(() => {
        setCrop(undefined);
        setCompletedCrop(null);
        imgRef.current = null;
    }, [currentIndex]);

    // Генерация object URL
    useEffect(() => {
        const url = URL.createObjectURL(files[currentIndex]);
        setObjectUrl(url);

        return () => {
            URL.revokeObjectURL(url);
        };
    }, [files, currentIndex]);

    // При загрузке — ставим crop
    const onImageLoad = useCallback((e) => {
        const img = e.target;
        imgRef.current = img;

        const aspect = 5 / 7;
        const { width, height } = img;

        let cropWidth, cropHeight;
        if (width / height > aspect) {
            cropHeight = height;
            cropWidth = cropHeight * aspect;
        } else {
            cropWidth = width;
            cropHeight = cropWidth / aspect;
        }

        setCrop({
            unit: 'px',
            x: (width - cropWidth) / 2,
            y: (height - cropHeight) / 2,
            width: cropWidth,
            height: cropHeight,
            aspect,
        });

        setCompletedCrop(null);
    }, []);

    const getCroppedImageBlob = async () => {
        if (!imgRef.current || !completedCrop) return null;

        const canvas = document.createElement('canvas');
        const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
        const scaleY = imgRef.current.naturalHeight / imgRef.current.height;

        canvas.width = Math.floor(completedCrop.width);
        canvas.height = Math.floor(completedCrop.height);

        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(
            imgRef.current,
            completedCrop.x * scaleX,
            completedCrop.y * scaleY,
            completedCrop.width * scaleX,
            completedCrop.height * scaleY,
            0,
            0,
            canvas.width,
            canvas.height
        );

        return new Promise((resolve) => {
            canvas.toBlob(
                (blob) => resolve(blob),
                files[currentIndex].type || 'image/jpeg',
                0.95
            );
        });
    };

    const handleSaveCurrent = async () => {
        if (!completedCrop || isProcessing) return;

        setIsProcessing(true);
        try {
            const blob = await getCroppedImageBlob();
            if (!blob) throw new Error('Blob creation failed');

            const croppedFile = new File([blob], files[currentIndex].name, {
                type: blob.type,
                lastModified: Date.now(),
            });

            await onCropComplete(croppedFile, currentIndex);
        } catch (error) {
            console.error('Ошибка сохранения:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleNextWithSave = async () => {
        await handleSaveCurrent();
        onNext();
    };

    const handleFinishWithSave = async () => {
        await handleSaveCurrent();
        onCancel();
    };

    return (
        <div className={styles.cropModalContent}>
            <div className={styles.cropperHeader}>
                <h4>Обрезка фото ({currentIndex + 1}/{files.length})</h4>
                {isProcessing && <div className={styles.processingIndicator}>Сохранение...</div>}
            </div>
            <div className={styles.cropperContainer}>
                <ReactCrop
                    crop={crop}
                    onChange={setCrop}
                    onComplete={setCompletedCrop}
                    aspect={5 / 7}
                    ruleOfThirds
                >
                    {objectUrl && (
                        <img
                            src={objectUrl}
                            alt={`Crop ${currentIndex + 1}`}
                            onLoad={onImageLoad}
                            onError={(e) => console.error('Ошибка загрузки изображения', e)}
                            style={{ maxWidth: '100%', maxHeight: '60vh' }}
                        />
                    )}
                </ReactCrop>
            </div>
            <div className={styles.cropperActions}>
                <button onClick={onCancel} disabled={isProcessing}>Отменить</button>
                {currentIndex > 0 && (
                    <button onClick={onPrevious} disabled={isProcessing}>Назад</button>
                )}
                {currentIndex < files.length - 1 ? (
                    <button onClick={handleNextWithSave} disabled={isProcessing}>Далее</button>
                ) : (
                    <button onClick={handleFinishWithSave} disabled={isProcessing}>Завершить</button>
                )}
            </div>
        </div>
    );
};

export default ImageCropper;
