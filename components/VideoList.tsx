

'use client';

import { SearchBar } from '@/components/SearchBar';
import { SortToggle } from '@/components/SortToggle';
import { VideoGrid } from '@/components/VideoGrid';
import { useSearch } from '@/hooks/useSearch';
import { AlertCircle, Youtube } from 'lucide-react';

export default function Home() {
  const {
    channel,
    videos,
    isLoading,
    error,
    sortType,
    searchChannel,
    changeSort,
  } = useSearch();

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <Youtube className="w-12 h-12 text-red-600" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            YouTube Channel Viewer
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Search any channel to see their most popular or latest videos
          </p>
        </div>

        {/* Search Section */}
        <div className="flex flex-col items-center gap-6 mb-12">
          <SearchBar onSearch={searchChannel} isLoading={isLoading} />
          
          {channel && (
            <div className="flex items-center gap-4 flex-wrap justify-center">
              {channel.avatar && (
                <img
                  src={channel.avatar}
                  alt={channel.name}
                  className="w-12 h-12 rounded-full"
                />
              )}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {channel.name}
                </h2>
                {channel.handle && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    @{channel.handle}
                  </p>
                )}
                {channel.subscriberCount && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {channel.subscriberCount} subscribers
                  </p>
                )}
              </div>
              <SortToggle
                sortType={sortType}
                onChange={changeSort}
                disabled={isLoading}
              />
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="max-w-md mx-auto mb-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Video Grid */}
        {videos.length > 0 && (
          <VideoGrid videos={videos} channelName={channel?.name} />
        )}

        {/* Initial State */}
        {!channel && !isLoading && !error && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              Try searching for a YouTube channel by name, handle, or ID
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
