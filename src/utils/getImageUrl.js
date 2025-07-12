export const getImageUrl = (imagePath) => {
    if (!imagePath) return '';
    if (/^https?:\/\//i.test(imagePath)) return imagePath;
    if (imagePath.startsWith('/media/')) return `http://localhost:8000${imagePath}`;
    if (!imagePath.startsWith('/')) return `http://localhost:8000/media/${imagePath}`;
    return `http://localhost:8000${imagePath}`;
};