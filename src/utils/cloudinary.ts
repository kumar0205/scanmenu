import imageCompression from "browser-image-compression";
import toast from "react-hot-toast";
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/config';

function validateImageFile(file: File) {
  const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
  if (!allowedTypes.has(file.type)) {
    throw new Error("Please upload a JPG, PNG, WebP, or GIF image.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Image must be 5MB or smaller.");
  }
}

export async function uploadToCloudinary(
  file: File, 
  folder: string = "menuqr", 
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    validateImageFile(file);

    // 1. Compress image client-side
    const compressedFile = await imageCompression(file, {
      maxSizeMB: 0.3,
      maxWidthOrHeight: 800,
      onProgress: (pct) => onProgress?.(Math.floor(pct * 0.5)), // 50% for compression
    });

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "dthochffz";
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "ml_default";

    // 2. Upload to Cloudinary using unsigned upload preset
    const formData = new FormData();
    formData.append("file", compressedFile);
    formData.append("upload_preset", uploadPreset);
    formData.append("folder", `scanmenu/${folder}`);

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
          const response = JSON.parse(xhr.responseText) as { secure_url?: string };
          if (!response.secure_url) {
            reject(new Error("Cloudinary did not return an image URL"));
            return;
          }
          resolve(response.secure_url);
        } else {
          reject(new Error("Failed to upload image to Cloudinary"));
        }
      };

      xhr.onerror = () => reject(new Error("Network error during upload"));
      
      xhr.send(formData);
    });
  } catch (error) {
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

export async function uploadAudioToCloudinary(
  file: File,
  folder: string = "notifications",
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    const allowedTypes = new Set([
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/ogg",
      "audio/x-m4a",
      "audio/m4a",
      "audio/aac",
      "audio/flac"
    ]);
    
    if (!allowedTypes.has(file.type) && !file.type.startsWith("audio/")) {
      throw new Error("Please upload a valid audio file (MP3, WAV, OGG, M4A, etc.).");
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      throw new Error("Audio file must be 10MB or smaller.");
    }

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "dthochffz";
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "ml_default";

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);
    formData.append("folder", `scanmenu/${folder}`);

    const xhr = new XMLHttpRequest();
    // Use the video upload endpoint for audio files
    const url = `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`;
    
    return new Promise((resolve, reject) => {
      xhr.open("POST", url, true);
      
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          const percentComplete = Math.floor((e.loaded / e.total) * 100);
          onProgress(percentComplete);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText) as { secure_url?: string };
          if (!response.secure_url) {
            reject(new Error("Cloudinary did not return a secure URL"));
            return;
          }
          resolve(response.secure_url);
        } else {
          reject(new Error("Failed to upload audio to Cloudinary"));
        }
      };

      xhr.onerror = () => reject(new Error("Network error during upload"));
      
      xhr.send(formData);
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Audio upload failed.";
    toast.error(msg);
    throw error;
  }
}

export async function uploadAudioToFirebase(
  file: File,
  restaurantId: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    const allowedTypes = new Set([
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/ogg",
      "audio/x-m4a",
      "audio/m4a",
      "audio/aac",
      "audio/flac"
    ]);
    
    if (!allowedTypes.has(file.type) && !file.type.startsWith("audio/")) {
      throw new Error("Please upload a valid audio file (MP3, WAV, OGG, M4A, etc.).");
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      throw new Error("Audio file must be 10MB or smaller.");
    }

    const fileRef = ref(storage, `restaurants/${restaurantId}/notifications/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(fileRef, file);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          onProgress?.(progress);
        },
        (error) => {
          console.error("Firebase Storage upload error:", error);
          reject(error);
        },
        async () => {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadUrl);
        }
      );
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Audio upload failed.";
    toast.error(msg);
    throw error;
  }
}
