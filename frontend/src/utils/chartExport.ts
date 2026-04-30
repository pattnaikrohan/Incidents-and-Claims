import { toBlob } from 'html-to-image';

export const copyChartToClipboard = async (elementId: string) => {
  const node = document.getElementById(elementId);
  if (!node) return;

  try {
    // Increase scale for high resolution
    const blob = await toBlob(node, {
      pixelRatio: 3,
      backgroundColor: 'var(--bg-surface)',
    });

    if (blob) {
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob,
        }),
      ]);
      return true;
    }
  } catch (error) {
    console.error('Failed to copy chart to clipboard:', error);
    return false;
  }
  return false;
};
