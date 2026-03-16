
/**
 * Safely opens a data URL in a new tab by converting it to a Blob URL first.
 * This avoids the "Not allowed to navigate top frame to data URL" security error.
 */
export const openDataURL = (dataURL: string) => {
  if (!dataURL.startsWith('data:')) {
    window.open(dataURL, '_blank');
    return;
  }

  try {
    const parts = dataURL.split(';base64,');
    if (parts.length !== 2) {
      // Fallback if not base64
      const win = window.open();
      if (win) {
        win.document.write(`<iframe src="${dataURL}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
      }
      return;
    }

    const contentType = parts[0].split(':')[1];
    const byteCharacters = atob(parts[1]);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: contentType });
    const blobUrl = URL.createObjectURL(blob);
    
    window.open(blobUrl, '_blank');
  } catch (error) {
    console.error('Error opening data URL:', error);
    // Fallback to iframe method if blob conversion fails
    const win = window.open();
    if (win) {
      win.document.write(`<iframe src="${dataURL}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
    }
  }
};
