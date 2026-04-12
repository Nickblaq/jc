
// app/components/AdvancedVideoEditor.tsx
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MSEVideoEditorEngine, VideoTrack } from "@/lib/videoEditorEngine";

interface TimelineClip {
  id: string;
  trackId: string;
  startTime: number;
  endTime: number;
  duration: number;
  thumbnail?: string;
}

export default function AdvancedVideoEditor() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const editorEngineRef = useRef<MSEVideoEditorEngine | null>(null);
  
  const [clips, setClips] = useState<TimelineClip[]>([]);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [effects, setEffects] = useState<string[]>([]);
  const [showExportDialog, setShowExportDialog] = useState(false);

  // Initialize editor engine
  useEffect(() => {
    if (videoRef.current && !editorEngineRef.current) {
      const engine = new MSEVideoEditorEngine(videoRef.current);
      editorEngineRef.current = engine;
      
      engine.initializeMediaSource().then(() => {
        console.log('MediaSource initialized');
      });
    }

    return () => {
      editorEngineRef.current?.destroy();
    };
  }, []);

  // Add video clip from API
  const addVideoClip = useCallback(async (url: string) => {
    setIsProcessing(true);
    
    try {
      const response = await fetch(url);
      const buffer = await response.arrayBuffer();
      
      const track: VideoTrack = {
        id: `track-${Date.now()}`,
        buffer,
        duration: 10, // Should be parsed from metadata
        codecString: 'avc1.42E01E, mp4a.40.2',
        mimeType: 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"',
        initSegment: null, // Extract from buffer in production
        mediaSegments: [buffer],
        frameRate: 30,
        resolution: { width: 1920, height: 1080 }
      };

      await editorEngineRef.current?.addTrack(track);
      
      const newClip: TimelineClip = {
        id: track.id,
        trackId: track.id,
        startTime: 0,
        endTime: track.duration,
        duration: track.duration
      };
      
      setClips(prev => [...prev, newClip]);
      setDuration(prev => Math.max(prev, track.duration));
    } catch (error) {
      console.error('Failed to add clip:', error);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Trim operation
  const handleTrim = useCallback(async (clipId: string, startTime: number, endTime: number) => {
    if (!editorEngineRef.current) return;
    
    setIsProcessing(true);
    try {
      await editorEngineRef.current.trim(clipId, startTime, endTime);
      
      setClips(prev => prev.map(clip => 
        clip.id === clipId 
          ? { ...clip, startTime, endTime, duration: endTime - startTime }
          : clip
      ));
    } catch (error) {
      console.error('Trim failed:', error);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Split operation
  const handleSplit = useCallback(async (clipId: string, splitTime: number) => {
    if (!editorEngineRef.current) return;
    
    setIsProcessing(true);
    try {
      const { left, right } = await editorEngineRef.current.splitTrack(clipId, splitTime);
      
      setClips(prev => {
        const clip = prev.find(c => c.id === clipId);
        if (!clip) return prev;
        
        const leftClip: TimelineClip = {
          id: left,
          trackId: left,
          startTime: clip.startTime,
          endTime: splitTime,
          duration: splitTime - clip.startTime
        };
        
        const rightClip: TimelineClip = {
          id: right,
          trackId: right,
          startTime: splitTime,
          endTime: clip.endTime,
          duration: clip.endTime - splitTime
        };
        
        return [...prev.filter(c => c.id !== clipId), leftClip, rightClip];
      });
    } catch (error) {
      console.error('Split failed:', error);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Speed control
  const handleSpeedChange = useCallback(async (clipId: string, speed: number) => {
    if (!editorEngineRef.current) return;
    
    setIsProcessing(true);
    try {
      await editorEngineRef.current.changeSpeed(clipId, speed);
      
      setClips(prev => prev.map(clip =>
        clip.id === clipId
          ? { ...clip, duration: clip.duration / speed }
          : clip
      ));
    } catch (error) {
      console.error('Speed change failed:', error);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Apply visual filter
  const handleApplyFilter = useCallback(async (clipId: string, filterType: string) => {
    if (!editorEngineRef.current) return;
    
    setIsProcessing(true);
    try {
      await editorEngineRef.current.applyFilter(clipId, filterType, {});
      setEffects(prev => [...prev, `${filterType}-${clipId}`]);
    } catch (error) {
      console.error('Filter application failed:', error);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Export video
  const handleExport = useCallback(async (format: 'mp4' | 'webm', quality: number) => {
    if (!editorEngineRef.current) return;
    
    setIsProcessing(true);
    try {
      const blob = await editorEngineRef.current.exportVideo({ format, quality });
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `edited-video.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      
      setShowExportDialog(false);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Video Preview */}
      <div className="bg-black p-4">
        <video
          ref={videoRef}
          className="max-w-full mx-auto max-h-[60vh]"
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onDurationChange={(e) => setDuration(e.currentTarget.duration)}
        />
      </div>

      {/* Playback Controls */}
      <div className="flex items-center gap-4 p-4 bg-gray-800">
        <button
          onClick={() => {
            if (videoRef.current?.paused) {
              videoRef.current?.play();
              setIsPlaying(true);
            } else {
              videoRef.current?.pause();
              setIsPlaying(false);
            }
          }}
          className="px-6 py-2 bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        
        <div className="flex-1">
          <input
            type="range"
            min={0}
            max={duration}
            value={currentTime}
            onChange={(e) => {
              const time = parseFloat(e.target.value);
              if (videoRef.current) videoRef.current.currentTime = time;
              setCurrentTime(time);
            }}
            className="w-full"
          />
        </div>
        
        <span className="text-sm">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      {/* Editing Tools */}
      <div className="grid grid-cols-4 gap-4 p-4 bg-gray-850">
        <div className="col-span-1 space-y-2">
          <h3 className="font-semibold mb-2">Editing Tools</h3>
          
          <button
            onClick={() => addVideoClip('/api/video/segment')}
            disabled={isProcessing}
            className="w-full px-4 py-2 bg-green-600 rounded hover:bg-green-700 disabled:opacity-50"
          >
            Add Clip
          </button>
          
          {selectedClipId && (
            <>
              <button
                onClick={() => {
                  const clip = clips.find(c => c.id === selectedClipId);
                  if (clip) handleTrim(selectedClipId, clip.startTime, currentTime);
                }}
                className="w-full px-4 py-2 bg-yellow-600 rounded hover:bg-yellow-700"
              >
                Trim Start
              </button>
              
              <button
                onClick={() => {
                  const clip = clips.find(c => c.id === selectedClipId);
                  if (clip) handleTrim(selectedClipId, currentTime, clip.endTime);
                }}
                className="w-full px-4 py-2 bg-yellow-600 rounded hover:bg-yellow-700"
              >
                Trim End
              </button>
              
              <button
                onClick={() => handleSplit(selectedClipId, currentTime)}
                className="w-full px-4 py-2 bg-purple-600 rounded hover:bg-purple-700"
              >
                Split at Playhead
              </button>
              
              <select
                onChange={(e) => handleSpeedChange(selectedClipId, parseFloat(e.target.value))}
                className="w-full px-4 py-2 bg-gray-700 rounded"
                defaultValue="1"
              >
                <option value="0.5">0.5x Speed</option>
                <option value="1">1x Speed (Normal)</option>
                <option value="1.5">1.5x Speed</option>
                <option value="2">2x Speed</option>
              </select>
              
              <select
                onChange={(e) => handleApplyFilter(selectedClipId, e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 rounded"
                defaultValue=""
              >
                <option value="" disabled>Apply Filter...</option>
                <option value="grayscale">Grayscale</option>
                <option value="sepia">Sepia</option>
                <option value="blur">Blur</option>
                <option value="chromaKey">Chroma Key</option>
              </select>
            </>
          )}
          
          <button
            onClick={() => editorEngineRef.current?.undo()}
            className="w-full px-4 py-2 bg-gray-600 rounded hover:bg-gray-700"
          >
            Undo
          </button>
          
          <button
            onClick={() => editorEngineRef.current?.redo()}
            className="w-full px-4 py-2 bg-gray-600 rounded hover:bg-gray-700"
          >
            Redo
          </button>
          
          <button
            onClick={() => setShowExportDialog(true)}
            className="w-full px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 mt-4"
          >
            Export Video
          </button>
        </div>

        {/* Timeline */}
        <div className="col-span-3 bg-gray-800 rounded-lg p-4">
          <div className="flex justify-between mb-2">
            <h3 className="font-semibold">Timeline</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
                className="px-3 py-1 bg-gray-700 rounded"
              >
                -
              </button>
              <span className="px-3 py-1">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom(z => Math.min(2, z + 0.25))}
                className="px-3 py-1 bg-gray-700 rounded"
              >
                +
              </button>
            </div>
          </div>
          
          <div
            ref={timelineRef}
            className="relative h-32 bg-gray-900 rounded-lg overflow-x-auto"
          >
            {/* Time markers */}
            <div className="absolute top-0 left-0 right-0 h-6 bg-gray-800 border-b border-gray-700">
              {/* Render time markers based on zoom */}
            </div>
            
            {/* Clips */}
            <div className="absolute top-6 left-0 right-0 bottom-0 p-2">
              {clips.map((clip) => (
                <div
                  key={clip.id}
                  onClick={() => setSelectedClipId(clip.id)}
                  className={`
                    absolute h-20 rounded cursor-pointer transition-all
                    ${selectedClipId === clip.id 
                      ? 'ring-2 ring-blue-500 bg-blue-900' 
                      : 'bg-blue-600 hover:bg-blue-700'}
                  `}
                  style={{
                    left: `${(clip.startTime / duration) * 100}%`,
                    width: `${((clip.endTime - clip.startTime) / duration) * 100 * zoom}%`,
                  }}
                >
                  <div className="p-2 text-xs truncate">
                    Clip {clip.id.slice(-4)}
                  </div>
                  <div className="absolute bottom-1 left-2 text-xs opacity-75">
                    {formatTime(clip.duration)}
                  </div>
                  
                  {/* Trim handles */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20"
                    onMouseDown={(e) => {
                      // Implement drag-to-trim
                    }}
                  />
                  <div
                    className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20"
                    onMouseDown={(e) => {
                      // Implement drag-to-trim
                    }}
                  />
                </div>
              ))}
            </div>
            
            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none"
              style={{ left: `${(currentTime / duration) * 100}%` }}
            >
              <div className="w-3 h-3 bg-red-500 rounded-full -ml-1 -mt-1" />
            </div>
          </div>
        </div>
      </div>

      {/* Export Dialog */}
      {showExportDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-gray-800 p-6 rounded-lg w-96">
            <h3 className="text-xl font-bold mb-4">Export Video</h3>
            
            <div className="space-y-4">
              <select
                className="w-full px-4 py-2 bg-gray-700 rounded"
                onChange={(e) => {
                  const [format, quality] = e.target.value.split(':');
                  handleExport(format as 'mp4' | 'webm', parseFloat(quality));
                }}
              >
                <option value="">Select quality...</option>
                <option value="mp4:5">MP4 - High Quality (5 Mbps)</option>
                <option value="mp4:2">MP4 - Medium Quality (2 Mbps)</option>
                <option value="webm:5">WebM - High Quality (5 Mbps)</option>
                <option value="webm:2">WebM - Medium Quality (2 Mbps)</option>
              </select>
              
              <button
                onClick={() => setShowExportDialog(false)}
                className="w-full px-4 py-2 bg-gray-600 rounded hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Processing Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-lg">Processing...</p>
          </div>
        </div>
      )}
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}
