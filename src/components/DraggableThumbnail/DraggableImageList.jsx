import React, { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { FaStar, FaTimes } from 'react-icons/fa';
import styles from './DraggableImageList.module.css';

const DraggableThumbnail = ({ image, index, moveImage, onSetMain, onRemove }) => {
  const ref = useRef(null);

  const [{ isDragging }, drag] = useDrag({
    type: 'IMAGE',
    item: { id: image.id, index },
    canDrag: !image.isMain,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: 'IMAGE',
    drop: (item) => {
      if (!image.isMain && item.index !== index) {
        moveImage(item.index, index);
      }
    },
  });

  if (!image.isMain) {
    drag(drop(ref));
  }

  return (
    <div
      ref={ref}
      className={styles.thumbnailContainer}
      style={{
        cursor: image.isMain ? 'default' : 'grab'
      }}
    >
      <img src={image.preview} className={styles.thumbnail} alt="Превью" />
      <span className={styles.orderBadge}>{index + 1}</span>
      {image.isMain && <span className={styles.mainImageBadge}>Главное</span>}
      <div className={styles.thumbnailActions}>
        {!image.isMain && (
          <button
            type="button"
            className={styles.thumbnailButton}
            onClick={() => onSetMain(image.id)}
            title="Сделать главной"
          >
            <FaStar />
          </button>
        )}
        <button
          type="button"
          className={styles.thumbnailButton}
          onClick={() => onRemove(image.id)}
          title="Удалить"
        >
          <FaTimes />
        </button>
      </div>
    </div>
  );
};

const DraggableImageList = ({ images, onImagesReorder, onSetMainImage, onRemoveImage }) => {
  const moveImage = (fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;
    const newImages = [...images];
    const [movedItem] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, movedItem);
    onImagesReorder(newImages);
  };

  return (
    <div className={styles.thumbnailsContainer}>
      {images.map((image, index) => (
        <DraggableThumbnail
          key={image.id}
          image={image}
          index={index}
          moveImage={moveImage}
          onSetMain={onSetMainImage}
          onRemove={onRemoveImage}
        />
      ))}
    </div>
  );
};

export default DraggableImageList;