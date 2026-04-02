import imageCompression from 'browser-image-compression';

export const compressVehicleImage = async (file: File): Promise<File> => {
  const options = {
    maxSizeMB: 0.2,          // Force the file to be under 200KB (was 0.5)
    maxWidthOrHeight: 1024,  // Max dimension 1024px (was 1280)
    useWebWorker: true,
    initialQuality: 0.7      // Set initial quality to 70%
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
