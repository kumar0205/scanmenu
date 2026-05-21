import imageCompression from "browser-image-compression";
import toast from "react-hot-toast";

const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || import.meta.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dthochffz";

export async function uploadToCloudinary(
  file: File, 
  folder: string = "menuqr", 
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    // 1. Compress image client-side
    const compressedFile = await imageCompression(file, {
      maxSizeMB: 0.3,
      maxWidthOrHeight: 800,
      onProgress: (pct) => onProgress?.(Math.floor(pct * 0.5)), // 50% for compression
    });

    // 2. Upload to Cloudinary Unsigned
    const formData = new FormData();
    formData.append("file", compressedFile);
    formData.append("upload_preset", "scanmenu"); // Unsigned preset created by user
    formData.append("folder", folder);

    const xhr = new XMLHttpRequest();
    const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    
    return new Promise((resolve, reject) => {
      xhr.open("POST", url, true);
      
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          const percentComplete = 50 + Math.floor((e.loaded / e.total) * 50); // Second 50% for upload
          onProgress(percentComplete);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          resolve(response.secure_url);
        } else {
          console.error("Cloudinary upload failed", xhr.responseText);
          reject(new Error("Failed to upload image to Cloudinary"));
        }
      };

      xhr.onerror = () => reject(new Error("Network error during upload"));
      
      xhr.send(formData);
    });
  } catch (error) {
    console.error("Error in uploadToCloudinary:", error);
    toast.error("Image upload failed.");
    throw error;
  }
}

export function optimizeCloudinaryUrl(url: string, width: number = 800): string {
  if (!url || !url.includes("cloudinary.com")) return url;
  
  // Avoid double optimization if it's already optimized
  if (url.includes("w_") && url.includes("f_auto")) return url;
  
  const uploadIndex = url.indexOf("/upload/");
  if (uploadIndex === -1) return url;
  
  const beforeUpload = url.substring(0, uploadIndex + 8);
  const afterUpload = url.substring(uploadIndex + 8);
  
  return `${beforeUpload}w_${width},f_auto,q_auto/${afterUpload}`;
}

export function getCloudinaryBlurUrl(url: string): string {
  if (!url || !url.includes("cloudinary.com")) return url;
  
  // Avoid double optimization if it's already optimized
  if (url.includes("w_") && url.includes("e_blur")) return url;
  
  const uploadIndex = url.indexOf("/upload/");
  if (uploadIndex === -1) return url;
  
  const beforeUpload = url.substring(0, uploadIndex + 8);
  
  // If the url already has transformations (e.g. from optimizeCloudinaryUrl), we should ideally 
  // strip them or just append. But usually we pass the raw url here.
  let afterUpload = url.substring(uploadIndex + 8);
  // Strip existing simple transformations if present (e.g. w_800,f_auto,q_auto/)
  if (afterUpload.match(/^[a-z]_[^/]+\//)) {
    afterUpload = afterUpload.substring(afterUpload.indexOf("/") + 1);
  }
  
  return `${beforeUpload}w_50,e_blur:1000,q_10,f_auto/${afterUpload}`;
}
