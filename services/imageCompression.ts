export const compressImage = (file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      // If it's not an image (like a PDF), just return the base64 string
      if (!file.type.startsWith('image/')) {
        const result = event.target?.result as string;
        const base64Data = result.split(',')[1];
        resolve(base64Data);
        return;
      }

      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not found'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        
        // Always compress to JPEG for smaller payload
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const base64Data = dataUrl.split(',')[1];
        resolve(base64Data);
      };
      img.onerror = (err) => {
        // Fallback: if image parsing fails, just return the raw base64
        const result = event.target?.result as string;
        if (result) {
            const base64Data = result.split(',')[1];
            resolve(base64Data);
        } else {
            reject(err);
        }
      };
    };
    reader.onerror = (err) => reject(err);
  });
};
