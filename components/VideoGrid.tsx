
import { Video } from '@/types';
import VideoCard from './compnents/VideoCard';

interface VideoGridProps {
  videos: Video[];
  channelName?: string;
}

export default function VideoGrid({ videos, channelName }: VideoGridProps) {
  if (videos.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">No videos found</p>
      </div>
    );
  }

  return (
    <div>
      {channelName && (
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
          Top Videos from {channelName}
        </h2>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>
    </div>
  );
}
