
'use client';

import { useState, useCallback } from 'react';
import { ChannelInfo, Video, SortType } from '@/lib/youtube/types';

interface SearchState {
  channel: ChannelInfo | null;
  videos: Video[];
  isLoading: boolean;
  error: string | null;
}

export function useSearch() {
  const [state, setState] = useState<SearchState>({
    channel: null,
    videos: [],
    isLoading: false,
    error: null,
  });
  const [sortType, setSortType] = useState<SortType>('popular');

  const searchChannel = useCallback(async (query: string) => {
    if (!query.trim()) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // Search for channel
      const channelRes = await fetch(`/api/youtube/channel?q=${encodeURIComponent(query)}`);
      if (!channelRes.ok) throw new Error('Channel not found');
      const channel = await channelRes.json();
      
      // Get videos with current sort
      const videosRes = await fetch(`/api/youtube/channel/${channel.id}/videos?sort=${sortType}`);
      if (!videosRes.ok) throw new Error('Failed to fetch videos');
      const videos = await videosRes.json();
      
      setState({
        channel,
        videos,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      setState({
        channel: null,
        videos: [],
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to search channel',
      });
    }
  }, [sortType]);

  const changeSort = useCallback(async (newSort: SortType) => {
    setSortType(newSort);
    
    if (state.channel) {
      setState(prev => ({ ...prev, isLoading: true }));
      
      try {
        const videosRes = await fetch(`/api/youtube/channel/${state.channel!.id}/videos?sort=${newSort}`);
        if (!videosRes.ok) throw new Error('Failed to fetch videos');
        const videos = await videosRes.json();
        
        setState(prev => ({
          ...prev,
          videos,
          isLoading: false,
        }));
      } catch (error) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to change sort',
        }));
      }
    }
  }, [state.channel]);

  return {
    ...state,
    sortType,
    searchChannel,
    changeSort,
  };
}
