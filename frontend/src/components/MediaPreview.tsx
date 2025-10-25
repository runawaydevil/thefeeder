import { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { estimateReadTime } from '../lib/themes';

interface Props {
  url: string;
  thumbnail?: string;
  title: string;
  summary: string;
}

export default function MediaPreview({ url, thumbnail, title, summary }: Props) {
  const [imageError, setImageError] = useState(false);
  const domain = new URL(url).hostname.replace('www.', '');

  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-card">
      {thumbnail && !imageError ? (
        <img
          src={thumbnail}
          alt={title}
          className="w-full h-48 object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="w-full h-48 bg-border flex items-center justify-center">
          <ImageIcon className="w-12 h-12 text-muted" />
        </div>
      )}
      
      <div className="p-3">
        <p className="text-sm text-muted truncate" title={domain}>
          {domain}
        </p>
        {summary && (
          <p className="text-xs text-muted mt-1">
            {estimateReadTime(summary)} de leitura
          </p>
        )}
      </div>
    </div>
  );
}



