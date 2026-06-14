import { useState } from 'react';
import { optimizeCloudinaryUrl, getCloudinaryBlurUrl } from '../../utils/cloudinary';
import { clsx } from 'clsx';

interface BlurImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  width?: number; // Target width for the high-res image
}

export function BlurImage({ src, alt, className, width = 800, ...props }: BlurImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  // Generate Cloudinary specific URLs
  const isCloudinary = src && src.includes('cloudinary.com');
  const blurUrl = isCloudinary ? getCloudinaryBlurUrl(src) : src;
  const highResUrl = isCloudinary ? optimizeCloudinaryUrl(src, width) : src;

  return (
    <div className={clsx('relative overflow-hidden bg-stone-100/50', className)}>
      {/* Blurred Placeholder */}
      {!isLoaded && blurUrl && (
        <img
          src={blurUrl}
          alt={alt}
          className="absolute inset-0 w-full h-full object-cover blur-md scale-110"
          {...props}
        />
      )}
      
      {/* High-Res Image */}
      {highResUrl && (
        <img
          src={highResUrl}
          alt={alt}
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          className={clsx(
            'relative w-full h-full object-cover transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0'
          )}
          {...props}
        />
      )}
    </div>
  );
}
