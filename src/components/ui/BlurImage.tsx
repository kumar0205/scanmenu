import { useState, useEffect } from 'react';
import { optimizeCloudinaryUrl, getCloudinaryBlurUrl } from '../../utils/cloudinary';
import { clsx } from 'clsx';

interface BlurImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  width?: number; // Target width for the high-res image
}

export function BlurImage({ src, alt, className, width = 800, ...props }: BlurImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);

  // Generate Cloudinary specific URLs
  const isCloudinary = src && src.includes('cloudinary.com');
  const blurUrl = isCloudinary ? getCloudinaryBlurUrl(src) : src;
  const highResUrl = isCloudinary ? optimizeCloudinaryUrl(src, width) : src;

  useEffect(() => {
    // Reset state if src changes
    setIsLoaded(false);
    
    const img = new Image();
    img.src = highResUrl;
    img.onload = () => {
      setCurrentSrc(highResUrl);
      setIsLoaded(true);
    };
  }, [src, highResUrl]);

  return (
    <div className={clsx('relative overflow-hidden', className)}>
      {/* Blurred Placeholder */}
      <img
        src={blurUrl}
        alt={alt}
        className={clsx(
          'absolute inset-0 w-full h-full object-cover blur-md scale-110 transition-opacity duration-300',
          isLoaded ? 'opacity-0' : 'opacity-100'
        )}
        {...props}
      />
      
      {/* High-Res Image */}
      <img
        src={currentSrc}
        alt={alt}
        className={clsx(
          'relative w-full h-full object-cover transition-opacity duration-500',
          isLoaded ? 'opacity-100' : 'opacity-0'
        )}
        {...props}
      />
    </div>
  );
}
