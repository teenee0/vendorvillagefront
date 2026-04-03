import { Image } from 'antd';

/** Как у превью чека в онлайн-заказе: antd Image + встроенное полноэкранное превью */
const DEFAULT_PREVIEW = { mask: 'Просмотр' };

function mergePreview(preview) {
  if (preview === false) return false;
  if (preview && typeof preview === 'object') {
    return { ...DEFAULT_PREVIEW, ...preview };
  }
  return DEFAULT_PREVIEW;
}

/**
 * Обёртка над antd Image с тем же превью, что у чека в онлайн-заказе.
 * Для листания по галерее — оберните в PreviewableImage.PreviewGroup.
 */
function PreviewableImage({ preview = true, ...rest }) {
  return <Image preview={mergePreview(preview)} {...rest} />;
}

PreviewableImage.PreviewGroup = Image.PreviewGroup;

export default PreviewableImage;
