import imageCompression from 'browser-image-compression';

export const compressVehicleImage = async (file: File): Promise<File> => {
  const options = {
    maxSizeMB: 0.8,          // Limit to 0.8MB
    maxWidthOrHeight: 1280, // Max width/height
    useWebWorker: true,     // Use WebWorker for performance
    fileType: 'image/jpeg'  // Force JPEG for better compression
  };

  try {
    // console.log(`Original size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
    
    const compressedFile = await imageCompression(file, options);
    
    // console.log(`Compressed size: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);
    return compressedFile;
  } catch (error) {
    console.error("Compression Error:", error);
    return file; // Fallback to original file
  }
};
