import imageCompression from 'browser-image-compression';

export const compressVehicleImage = async (file: File): Promise<File> => {
  const options = {
    maxSizeMB: 0.5,          // Force the file to be under 500KB
    maxWidthOrHeight: 1280,  // Max dimension 1280px (plenty for inspections)
    useWebWorker: true
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
