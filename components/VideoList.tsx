'use client';
import Link from 'next/link';

interface Video {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  viewCount: string;
}

export default function VideoList({ videos }: { videos: Video[] }) {
  return (
    <div className="grid gap-4">
      {videos.map((video) => (
        <Link href={`/cut/${video.id}`} key={video.id}>
          <div className="flex gap-4 p-4 border rounded-lg hover:bg-gray-50">
            <img src={video.thumbnail} alt={video.title} className="w-40 h-72 object-cover rounded" />
            <div>
              <h2 className="font-semibold">{video.title}</h2>
              <p>Duration: {video.duration}</p>
              <p>Views: {video.viewCount}</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
