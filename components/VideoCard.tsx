
'use client';

import Image from 'next/image';
import { Play, Eye, Calendar, Download } from 'lucide-react';
import { Video } from '@/types';

interface VideoCardProps {
  video: Video;
}

export function VideoCard({ video }: VideoCardProps) {
  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent opening video link
    e.stopPropagation(); // Stop event bubbling

    try {
      const response = await fetch(`/api/youtube/download?url=${encodeURIComponent(video.url)}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Download failed');
      }

      // Create blob from response
      const blob = await response.blob();
      
      // Create download link
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      
      // Extract filename from Content-Disposition header or use video title
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `${video.title}.mp4`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Download failed:', error);
      alert(error instanceof Error ? error.message : 'Failed to download video');
    }
  };

  return (
    <a
      href={video.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
    >
      <div className="relative aspect-video">
        {video.thumbnail ? (
          <Image
            src={video.thumbnail}
            alt={video.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
            <Play className="w-12 h-12 text-gray-400" />
          </div>
        )}
        {video.duration && (
          <span className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/75 text-white text-xs rounded">
            {video.duration}
          </span>
        )}
        
        {/* Download button overlay */}
        <button
          onClick={handleDownload}
          className="absolute top-2 right-2 p-2 bg-black/75 hover:bg-blue-600 rounded-full transition-colors opacity-0 group-hover:opacity-100"
          title="Download video"
        >
          <Download className="w-4 h-4 text-white" />
        </button>
      </div>
      
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {video.title}
        </h3>
        
        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            <span>{video.viewCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>{video.publishedAt}</span>
          </div>
        </div>
      </div>
    </a>
  );
}
