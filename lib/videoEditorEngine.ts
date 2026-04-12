
// lib/mse/VideoEditorEngine.ts
export interface VideoTrack {
  id: string;
  buffer: ArrayBuffer;
  duration: number;
  codecString: string;
  mimeType: string;
  initSegment: ArrayBuffer | null;
  mediaSegments: ArrayBuffer[];
  frameRate: number;
  resolution: { width: number; height: number };
}

export interface Effect {
  type: 'trim' | 'crop' | 'speed' | 'volume' | 'filter' | 'transition' | 'overlay' | 'text';
  startTime: number;
  endTime: number;
  params: Record<string, any>;
}

export interface EditOperation {
  type: 'cut' | 'copy' | 'paste' | 'delete' | 'insert' | 'replace' | 'split' | 'merge';
  trackId: string;
  startTime: number;
  endTime?: number;
  targetTime?: number;
  data?: any;
}

export class MSEVideoEditorEngine {
  private mediaSource: MediaSource | null = null;
  private sourceBuffers: Map<string, SourceBuffer> = new Map();
  private tracks: Map<string, VideoTrack> = new Map();
  private effects: Map<string, Effect[]> = new Map();
  private editHistory: EditOperation[] = [];
  private redoStack: EditOperation[] = [];
  private timeRanges: Map<string, TimeRanges> = new Map();
  private audioContext: AudioContext | null = null;
  private audioSourceNodes: Map<string, AudioBufferSourceNode> = new Map();
  private canvasContext: CanvasRenderingContext2D | null = null;
  private videoElement: HTMLVideoElement;
  
  // Advanced features
  private frameBuffers: Map<string, ImageData[]> = new Map();
  private transitionEffects: Map<string, (frame1: ImageData, frame2: ImageData, progress: number) => ImageData> = new Map();
  private webGLContext: WebGL2RenderingContext | null = null;
  private webGLPrograms: Map<string, WebGLProgram> = new Map();

  constructor(videoElement: HTMLVideoElement) {
    this.videoElement = videoElement;
    this.initializeTransitionEffects();
  }

  // Initialize MediaSource with advanced capabilities
  async initializeMediaSource(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.mediaSource = new MediaSource();
      this.videoElement.src = URL.createObjectURL(this.mediaSource);
      
      this.mediaSource.addEventListener('sourceopen', async () => {
        try {
          // Set duration hint for better seeking
          this.mediaSource!.duration = 0;
          resolve();
        } catch (error) {
          reject(error);
        }
      });

      this.mediaSource.addEventListener('sourceended', () => {
        console.log('MediaSource ended');
      });

      this.mediaSource.addEventListener('sourceclose', () => {
        console.log('MediaSource closed');
      });
    });
  }

  // Add track with proper initialization segment handling
  async addTrack(track: VideoTrack): Promise<void> {
    if (!this.mediaSource || this.mediaSource.readyState !== 'open') {
      throw new Error('MediaSource not ready');
    }

    // Create SourceBuffer if it doesn't exist for this MIME type
    if (!this.sourceBuffers.has(track.mimeType)) {
      const sourceBuffer = this.mediaSource.addSourceBuffer(track.mimeType);
      
      // Enable sequence mode for concatenation
      sourceBuffer.mode = 'sequence';
      
      // Track buffered ranges
      sourceBuffer.addEventListener('updateend', () => {
        this.timeRanges.set(track.id, sourceBuffer.buffered);
        this.updateDuration();
      });

      sourceBuffer.addEventListener('error', (e) => {
        console.error('SourceBuffer error:', e);
      });

      this.sourceBuffers.set(track.mimeType, sourceBuffer);
    }

    const sourceBuffer = this.sourceBuffers.get(track.mimeType)!;
    
    // Append initialization segment first
    if (track.initSegment) {
      await this.appendBufferSafely(sourceBuffer, track.initSegment);
    }

    // Append all media segments
    for (const segment of track.mediaSegments) {
      await this.appendBufferSafely(sourceBuffer, segment);
    }

    this.tracks.set(track.id, track);
  }

  // Safe buffer append with queue management
  private async appendBufferSafely(sourceBuffer: SourceBuffer, buffer: ArrayBuffer): Promise<void> {
    return new Promise((resolve, reject) => {
      const appendNext = () => {
        if (sourceBuffer.updating) {
          sourceBuffer.addEventListener('updateend', appendNext, { once: true });
          return;
        }

        try {
          sourceBuffer.appendBuffer(buffer);
          sourceBuffer.addEventListener('updateend', () => resolve(), { once: true });
          sourceBuffer.addEventListener('error', (e) => reject(e), { once: true });
        } catch (error) {
          reject(error);
        }
      };

      appendNext();
    });
  }

  // TRIM OPERATION - Remove unwanted sections using remove() method
  async trim(trackId: string, startTime: number, endTime: number): Promise<void> {
    const sourceBuffer = this.getSourceBufferForTrack(trackId);
    if (!sourceBuffer) throw new Error('Track not found');

    // Use MSE's built-in remove() method
    return new Promise((resolve, reject) => {
      if (sourceBuffer.updating) {
        sourceBuffer.addEventListener('updateend', () => {
          this.performTrim(sourceBuffer, startTime, endTime, resolve, reject);
        }, { once: true });
      } else {
        this.performTrim(sourceBuffer, startTime, endTime, resolve, reject);
      }
    });
  }

  private performTrim(
    sourceBuffer: SourceBuffer,
    startTime: number,
    endTime: number,
    resolve: () => void,
    reject: (error: any) => void
  ): void {
    try {
      // Remove from start to end
      sourceBuffer.remove(startTime, endTime);
      
      sourceBuffer.addEventListener('updateend', () => {
        this.addToHistory({
          type: 'cut',
          trackId: Array.from(this.tracks.keys())[0],
          startTime,
          endTime
        });
        resolve();
      }, { once: true });

      sourceBuffer.addEventListener('error', reject, { once: true });
    } catch (error) {
      reject(error);
    }
  }

  // SPLIT OPERATION - Split track at timestamp
  async splitTrack(trackId: string, splitTime: number): Promise<{ left: string; right: string }> {
    const track = this.tracks.get(trackId);
    if (!track) throw new Error('Track not found');

    const sourceBuffer = this.getSourceBufferForTrack(trackId);
    if (!sourceBuffer) throw new Error('SourceBuffer not found');

    // Get buffered ranges
    const buffered = sourceBuffer.buffered;
    let targetRange: { start: number; end: number } | null = null;

    for (let i = 0; i < buffered.length; i++) {
      if (splitTime >= buffered.start(i) && splitTime <= buffered.end(i)) {
        targetRange = { start: buffered.start(i), end: buffered.end(i) };
        break;
      }
    }

    if (!targetRange) throw new Error('Split point not within buffered range');

    // Create two new tracks
    const leftTrackId = `${trackId}-left-${Date.now()}`;
    const rightTrackId = `${trackId}-right-${Date.now()}`;

    // Remove the second half from current buffer
    await new Promise((resolve, reject) => {
      sourceBuffer.remove(splitTime, targetRange!.end);
      sourceBuffer.addEventListener('updateend', resolve, { once: true });
      sourceBuffer.addEventListener('error', reject, { once: true });
    });

    // Create new tracks
    const leftTrack: VideoTrack = {
      ...track,
      id: leftTrackId,
      duration: splitTime - targetRange.start
    };

    const rightTrack: VideoTrack = {
      ...track,
      id: rightTrackId,
      duration: targetRange.end - splitTime
    };

    this.tracks.set(leftTrackId, leftTrack);
    this.tracks.set(rightTrackId, rightTrack);

    this.addToHistory({
      type: 'split',
      trackId,
      startTime: splitTime
    });

    return { left: leftTrackId, right: rightTrackId };
  }

  // MERGE OPERATION - Concatenate multiple tracks
  async mergeTracks(trackIds: string[]): Promise<string> {
    const mergedTrackId = `merged-${Date.now()}`;
    const firstTrack = this.tracks.get(trackIds[0]);
    if (!firstTrack) throw new Error('No tracks to merge');

    // Create new source buffer for merged track
    const mergedBuffer = this.mediaSource!.addSourceBuffer(firstTrack.mimeType);
    mergedBuffer.mode = 'sequence';

    let totalDuration = 0;
    
    // Append all track segments in sequence
    for (const trackId of trackIds) {
      const track = this.tracks.get(trackId);
      if (!track) continue;

      const sourceBuffer = this.sourceBuffers.get(track.mimeType);
      if (!sourceBuffer) continue;

      // Extract buffered data using MediaSource's buffered property
      const buffered = sourceBuffer.buffered;
      
      for (let i = 0; i < buffered.length; i++) {
        // Create a new segment by reading the buffer
        const segment = await this.extractSegment(trackId, buffered.start(i), buffered.end(i));
        await this.appendBufferSafely(mergedBuffer, segment);
      }

      totalDuration += track.duration;
    }

    const mergedTrack: VideoTrack = {
      id: mergedTrackId,
      buffer: new ArrayBuffer(0), // Will be populated
      duration: totalDuration,
      codecString: firstTrack.codecString,
      mimeType: firstTrack.mimeType,
      initSegment: firstTrack.initSegment,
      mediaSegments: [],
      frameRate: firstTrack.frameRate,
      resolution: firstTrack.resolution
    };

    this.tracks.set(mergedTrackId, mergedTrack);
    this.sourceBuffers.set(firstTrack.mimeType, mergedBuffer);

    this.addToHistory({
      type: 'merge',
      trackId: mergedTrackId,
      startTime: 0,
      data: { trackIds }
    });

    return mergedTrackId;
  }

  // EXTRACT SEGMENT - Get specific time range as buffer
  private async extractSegment(trackId: string, startTime: number, endTime: number): Promise<ArrayBuffer> {
    const track = this.tracks.get(trackId);
    if (!track) throw new Error('Track not found');

    // In production, you'd use Streams API to read the exact segment
    // For demo, return a slice of the buffer
    const bytesPerSecond = track.buffer.byteLength / track.duration;
    const startByte = Math.floor(startTime * bytesPerSecond);
    const endByte = Math.floor(endTime * bytesPerSecond);
    
    return track.buffer.slice(startByte, endByte);
  }

  // SPEED CONTROL - Change playback rate using timestampOffset manipulation
  async changeSpeed(trackId: string, speedFactor: number): Promise<void> {
    const sourceBuffer = this.getSourceBufferForTrack(trackId);
    if (!sourceBuffer) throw new Error('Track not found');

    // Adjust timestampOffset to change effective playback speed
    const currentOffset = sourceBuffer.timestampOffset;
    const buffered = sourceBuffer.buffered;
    
    if (buffered.length > 0) {
      // Re-append segments with modified timestamps
      for (let i = 0; i < buffered.length; i++) {
        const segment = await this.extractSegment(trackId, buffered.start(i), buffered.end(i));
        
        // Calculate new timestamp offset for speed change
        const newOffset = currentOffset * (1 / speedFactor);
        sourceBuffer.timestampOffset = newOffset;
        
        // Remove and re-append with new timestamps
        await new Promise((resolve) => {
          sourceBuffer.remove(buffered.start(i), buffered.end(i));
          sourceBuffer.addEventListener('updateend', async () => {
            await this.appendBufferSafely(sourceBuffer, segment);
            resolve(null);
          }, { once: true });
        });
      }
    }

    this.addEffect(trackId, {
      type: 'speed',
      startTime: 0,
      endTime: Infinity,
      params: { factor: speedFactor }
    });
  }

  // ADVANCED: Frame-accurate editing with Canvas + MSE
  async enableFrameAccurateEditing(trackId: string): Promise<void> {
    const track = this.tracks.get(trackId);
    if (!track) throw new Error('Track not found');

    // Create offscreen canvas for frame extraction
    const canvas = new OffscreenCanvas(track.resolution.width, track.resolution.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    this.canvasContext = ctx as any;

    // Create temporary video element for frame extraction
    const tempVideo = document.createElement('video');
    tempVideo.src = URL.createObjectURL(new Blob([track.buffer]));
    
    await new Promise((resolve) => {
      tempVideo.addEventListener('loadedmetadata', resolve);
    });

    // Extract frames at frame rate intervals
    const frameInterval = 1 / track.frameRate;
    const frames: ImageData[] = [];
    
    for (let time = 0; time < track.duration; time += frameInterval) {
      tempVideo.currentTime = time;
      
      await new Promise((resolve) => {
        tempVideo.addEventListener('seeked', () => {
          ctx.drawImage(tempVideo, 0, 0);
          frames.push(ctx.getImageData(0, 0, track.resolution.width, track.resolution.height));
          resolve(null);
        }, { once: true });
      });
    }

    this.frameBuffers.set(trackId, frames);
  }

  // Apply visual filter effect using WebGL for real-time processing
  async applyFilter(trackId: string, filterType: string, params: any): Promise<void> {
    if (!this.webGLContext) {
      this.initializeWebGL();
    }

    const frames = this.frameBuffers.get(trackId);
    if (!frames) {
      await this.enableFrameAccurateEditing(trackId);
    }

    const processedFrames = await this.processFramesWithWebGL(trackId, filterType, params);
    
    // Reconstruct video from processed frames
    await this.reconstructVideoFromFrames(trackId, processedFrames);
    
    this.addEffect(trackId, {
      type: 'filter',
      startTime: 0,
      endTime: Infinity,
      params: { filterType, ...params }
    });
  }

  // Initialize WebGL for GPU-accelerated effects
  private initializeWebGL(): void {
    const canvas = document.createElement('canvas');
    this.webGLContext = canvas.getContext('webgl2');
    
    if (!this.webGLContext) {
      throw new Error('WebGL2 not supported');
    }

    // Compile shader programs for different effects
    this.compileShaderPrograms();
  }

  private compileShaderPrograms(): void {
    if (!this.webGLContext) return;

    const gl = this.webGLContext;

    // Grayscale shader
    const grayscaleProgram = this.createShaderProgram(
      gl,
      this.getVertexShader(),
      this.getGrayscaleFragmentShader()
    );
    this.webGLPrograms.set('grayscale', grayscaleProgram);

    // Sepia shader
    const sepiaProgram = this.createShaderProgram(
      gl,
      this.getVertexShader(),
      this.getSepiaFragmentShader()
    );
    this.webGLPrograms.set('sepia', sepiaProgram);

    // Blur shader
    const blurProgram = this.createShaderProgram(
      gl,
      this.getVertexShader(),
      this.getBlurFragmentShader()
    );
    this.webGLPrograms.set('blur', blurProgram);

    // Chroma key (green screen) shader
    const chromaKeyProgram = this.createShaderProgram(
      gl,
      this.getVertexShader(),
      this.getChromaKeyFragmentShader()
    );
    this.webGLPrograms.set('chromaKey', chromaKeyProgram);
  }

  private getVertexShader(): string {
    return `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      varying vec2 v_texCoord;
      
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = a_texCoord;
      }
    `;
  }

  private getGrayscaleFragmentShader(): string {
    return `
      precision mediump float;
      varying vec2 v_texCoord;
      uniform sampler2D u_image;
      
      void main() {
        vec4 color = texture2D(u_image, v_texCoord);
        float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
        gl_FragColor = vec4(vec3(gray), color.a);
      }
    `;
  }

  private getSepiaFragmentShader(): string {
    return `
      precision mediump float;
      varying vec2 v_texCoord;
      uniform sampler2D u_image;
      
      void main() {
        vec4 color = texture2D(u_image, v_texCoord);
        vec3 sepia;
        sepia.r = dot(color.rgb, vec3(0.393, 0.769, 0.189));
        sepia.g = dot(color.rgb, vec3(0.349, 0.686, 0.168));
        sepia.b = dot(color.rgb, vec3(0.272, 0.534, 0.131));
        gl_FragColor = vec4(sepia, color.a);
      }
    `;
  }

  private getBlurFragmentShader(): string {
    return `
      precision mediump float;
      varying vec2 v_texCoord;
      uniform sampler2D u_image;
      uniform vec2 u_resolution;
      
      void main() {
        vec2 texelSize = 1.0 / u_resolution;
        vec4 color = vec4(0.0);
        
        for (int x = -2; x <= 2; x++) {
          for (int y = -2; y <= 2; y++) {
            vec2 offset = vec2(float(x), float(y)) * texelSize;
            color += texture2D(u_image, v_texCoord + offset);
          }
        }
        
        gl_FragColor = color / 25.0;
      }
    `;
  }

  private getChromaKeyFragmentShader(): string {
    return `
      precision mediump float;
      varying vec2 v_texCoord;
      uniform sampler2D u_image;
      uniform vec3 u_keyColor;
      uniform float u_threshold;
      
      void main() {
        vec4 color = texture2D(u_image, v_texCoord);
        float diff = length(color.rgb - u_keyColor);
        
        if (diff < u_threshold) {
          discard;
        } else {
          gl_FragColor = color;
        }
      }
    `;
  }

  private createShaderProgram(gl: WebGL2RenderingContext, vertexSource: string, fragmentSource: string): WebGLProgram {
    const vertexShader = this.compileShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = this.compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    
    const program = gl.createProgram()!;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error('Failed to link shader program');
    }
    
    return program;
  }

  private compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error('Failed to compile shader');
    }
    
    return shader;
  }

  private async processFramesWithWebGL(
    trackId: string,
    filterType: string,
    params: any
  ): Promise<ImageData[]> {
    const frames = this.frameBuffers.get(trackId);
    if (!frames || !this.webGLContext) return [];

    const gl = this.webGLContext;
    const program = this.webGLPrograms.get(filterType);
    if (!program) return frames;

    const track = this.tracks.get(trackId)!;
    const processedFrames: ImageData[] = [];

    // Set up WebGL resources
    gl.useProgram(program);
    
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 1, -1, -1, 1,
      -1, 1, 1, -1, 1, 1
    ]), gl.STATIC_DRAW);

    const texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      0, 1, 1, 1, 0, 0,
      0, 0, 1, 1, 1, 0
    ]), gl.STATIC_DRAW);

    // Process each frame
    for (const frame of frames) {
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, frame);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      
      // Set uniforms based on filter type
      if (filterType === 'blur') {
        const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
        gl.uniform2f(resolutionLocation, track.resolution.width, track.resolution.height);
      } else if (filterType === 'chromaKey') {
        const keyColorLocation = gl.getUniformLocation(program, 'u_keyColor');
        gl.uniform3f(keyColorLocation, params.keyColor.r, params.keyColor.g, params.keyColor.b);
        
        const thresholdLocation = gl.getUniformLocation(program, 'u_threshold');
        gl.uniform1f(thresholdLocation, params.threshold);
      }
      
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      
      // Read back processed frame
      const pixels = new Uint8Array(track.resolution.width * track.resolution.height * 4);
      gl.readPixels(0, 0, track.resolution.width, track.resolution.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      
      processedFrames.push(new ImageData(
        new Uint8ClampedArray(pixels),
        track.resolution.width,
        track.resolution.height
      ));
      
      gl.deleteTexture(texture);
    }

    return processedFrames;
  }

  private async reconstructVideoFromFrames(trackId: string, frames: ImageData[]): Promise<void> {
    const track = this.tracks.get(trackId);
    if (!track) return;

    // Use MediaStream Recording API to create new video from frames
    const canvas = document.createElement('canvas');
    canvas.width = track.resolution.width;
    canvas.height = track.resolution.height;
    const ctx = canvas.getContext('2d')!;

    const stream = canvas.captureStream(track.frameRate);
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 8000000
    });

    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
    
    const recordingComplete = new Promise<Blob>((resolve) => {
      mediaRecorder.onstop = () => resolve(new Blob(chunks));
    });

    mediaRecorder.start();

    // Draw frames at correct timing
    const frameInterval = 1000 / track.frameRate;
    for (const frame of frames) {
      ctx.putImageData(frame, 0, 0);
      await new Promise(resolve => setTimeout(resolve, frameInterval));
    }

    mediaRecorder.stop();
    const videoBlob = await recordingComplete;
    const buffer = await videoBlob.arrayBuffer();

    // Replace track buffer with processed version
    track.buffer = buffer;
    
    // Re-add to MediaSource
    await this.replaceTrackBuffer(trackId, buffer);
  }

  private async replaceTrackBuffer(trackId: string, newBuffer: ArrayBuffer): Promise<void> {
    const sourceBuffer = this.getSourceBufferForTrack(trackId);
    if (!sourceBuffer) return;

    // Clear existing buffer
    const buffered = sourceBuffer.buffered;
    for (let i = 0; i < buffered.length; i++) {
      await new Promise((resolve) => {
        sourceBuffer.remove(buffered.start(i), buffered.end(i));
        sourceBuffer.addEventListener('updateend', resolve, { once: true });
      });
    }

    // Append new buffer
    await this.appendBufferSafely(sourceBuffer, newBuffer);
  }

  // TRANSITIONS - Cross-fade, wipe, slide effects
  initializeTransitionEffects(): void {
    // Cross-fade transition
    this.transitionEffects.set('crossfade', (frame1, frame2, progress) => {
      const result = new ImageData(frame1.width, frame1.height);
      for (let i = 0; i < frame1.data.length; i += 4) {
        result.data[i] = frame1.data[i] * (1 - progress) + frame2.data[i] * progress;
        result.data[i + 1] = frame1.data[i + 1] * (1 - progress) + frame2.data[i + 1] * progress;
        result.data[i + 2] = frame1.data[i + 2] * (1 - progress) + frame2.data[i + 2] * progress;
        result.data[i + 3] = 255;
      }
      return result;
    });

    // Wipe transition
    this.transitionEffects.set('wipe', (frame1, frame2, progress) => {
      const result = new ImageData(frame1.width, frame1.height);
      const threshold = Math.floor(frame1.width * progress);
      
      for (let y = 0; y < frame1.height; y++) {
        for (let x = 0; x < frame1.width; x++) {
          const idx = (y * frame1.width + x) * 4;
          if (x < threshold) {
            result.data[idx] = frame1.data[idx];
            result.data[idx + 1] = frame1.data[idx + 1];
            result.data[idx + 2] = frame1.data[idx + 2];
          } else {
            result.data[idx] = frame2.data[idx];
            result.data[idx + 1] = frame2.data[idx + 1];
            result.data[idx + 2] = frame2.data[idx + 2];
          }
          result.data[idx + 3] = 255;
        }
      }
      return result;
    });
  }

  async applyTransition(
    fromTrackId: string,
    toTrackId: string,
    transitionType: string,
    duration: number
  ): Promise<void> {
    const fromFrames = this.frameBuffers.get(fromTrackId);
    const toFrames = this.frameBuffers.get(toTrackId);
    
    if (!fromFrames || !toFrames) {
      throw new Error('Frames not extracted for tracks');
    }

    const transitionEffect = this.transitionEffects.get(transitionType);
    if (!transitionEffect) {
      throw new Error(`Unknown transition type: ${transitionType}`);
    }

    const track = this.tracks.get(fromTrackId)!;
    const frameRate = track.frameRate;
    const transitionFrames = Math.floor(duration * frameRate);
    const resultFrames: ImageData[] = [];

    for (let i = 0; i < transitionFrames; i++) {
      const progress = i / transitionFrames;
      const frameIndex = Math.min(i, fromFrames.length - 1);
      const toFrameIndex = Math.min(i, toFrames.length - 1);
      
      const transitionFrame = transitionEffect(
        fromFrames[frameIndex],
        toFrames[toFrameIndex],
        progress
      );
      resultFrames.push(transitionFrame);
    }

    // Add remaining frames from the second track
    resultFrames.push(...toFrames.slice(transitionFrames));

    // Create merged track with transition
    const mergedTrackId = await this.mergeTracks([fromTrackId, toTrackId]);
    await this.reconstructVideoFromFrames(mergedTrackId, resultFrames);
  }

  // ADVANCED: Real-time audio processing with Web Audio API
  async initializeAudioProcessing(trackId: string): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }

    const track = this.tracks.get(trackId);
    if (!track) throw new Error('Track not found');

    // Decode audio from video buffer
    const audioBuffer = await this.audioContext.decodeAudioData(track.buffer.slice(0));
    
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    
    // Create audio processing chain
    const gainNode = this.audioContext.createGain();
    const filterNode = this.audioContext.createBiquadFilter();
    const compressor = this.audioContext.createDynamicsCompressor();
    
    source.connect(filterNode);
    filterNode.connect(gainNode);
    gainNode.connect(compressor);
    compressor.connect(this.audioContext.destination);
    
    this.audioSourceNodes.set(trackId, source);
  }

  async applyAudioEffect(
    trackId: string,
    effectType: 'gain' | 'filter' | 'compression' | 'reverb',
    params: any
  ): Promise<void> {
    if (!this.audioContext) {
      await this.initializeAudioProcessing(trackId);
    }

    const source = this.audioSourceNodes.get(trackId);
    if (!source) return;

    // Apply effect based on type
    switch (effectType) {
      case 'gain':
        const gainNode = this.audioContext!.createGain();
        gainNode.gain.value = params.value;
        // Reconnect chain...
        break;
        
      case 'filter':
        const filter = this.audioContext!.createBiquadFilter();
        filter.type = params.type;
        filter.frequency.value = params.frequency;
        filter.Q.value = params.q || 1;
        break;
        
      case 'compression':
        const compressor = this.audioContext!.createDynamicsCompressor();
        compressor.threshold.value = params.threshold;
        compressor.ratio.value = params.ratio;
        break;
    }
  }

  // Utility methods
  private getSourceBufferForTrack(trackId: string): SourceBuffer | null {
    const track = this.tracks.get(trackId);
    if (!track) return null;
    return this.sourceBuffers.get(track.mimeType) || null;
  }

  private updateDuration(): void {
    if (!this.mediaSource) return;
    
    let maxDuration = 0;
    for (const ranges of this.timeRanges.values()) {
      if (ranges.length > 0) {
        maxDuration = Math.max(maxDuration, ranges.end(ranges.length - 1));
      }
    }
    
    if (maxDuration > 0) {
      this.mediaSource.duration = maxDuration;
    }
  }

  private addToHistory(operation: EditOperation): void {
    this.editHistory.push(operation);
    this.redoStack = []; // Clear redo stack on new operation
  }

  private addEffect(trackId: string, effect: Effect): void {
    const trackEffects = this.effects.get(trackId) || [];
    trackEffects.push(effect);
    this.effects.set(trackId, trackEffects);
  }

  // UNDO/REDO functionality
  async undo(): Promise<void> {
    const operation = this.editHistory.pop();
    if (!operation) return;

    this.redoStack.push(operation);
    
    // Reverse the operation
    switch (operation.type) {
      case 'cut':
        // Restore cut content (would need to store removed data)
        break;
      case 'split':
        await this.mergeTracks([operation.trackId]);
        break;
      case 'merge':
        const trackIds = operation.data?.trackIds || [];
        // Re-split at original points
        break;
    }
  }

  async redo(): Promise<void> {
    const operation = this.redoStack.pop();
    if (!operation) return;

    // Re-apply the operation
    switch (operation.type) {
      case 'cut':
        await this.trim(operation.trackId, operation.startTime, operation.endTime!);
        break;
      case 'split':
        await this.splitTrack(operation.trackId, operation.startTime);
        break;
      case 'merge':
        await this.mergeTracks(operation.data?.trackIds || []);
        break;
    }
  }

  // Export final video
  async exportVideo(options: {
    format: 'mp4' | 'webm';
    quality: number;
    resolution?: { width: number; height: number };
  }): Promise<Blob> {
    if (!this.mediaSource || this.mediaSource.readyState !== 'open') {
      throw new Error('MediaSource not ready');
    }

    // End the stream to finalize
    this.mediaSource.endOfStream();

    // Use MediaRecorder to capture the final output
    const stream = (this.videoElement as any).captureStream();
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: options.format === 'webm' ? 'video/webm;codecs=vp9' : 'video/mp4',
      videoBitsPerSecond: options.quality * 1000000
    });

    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
    
    return new Promise((resolve) => {
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { 
          type: options.format === 'webm' ? 'video/webm' : 'video/mp4' 
        });
        resolve(blob);
      };

      mediaRecorder.start();
      this.videoElement.play();
      
      // Stop recording when video ends
      this.videoElement.addEventListener('ended', () => {
        mediaRecorder.stop();
      }, { once: true });
    });
  }

  // Cleanup
  destroy(): void {
    if (this.audioContext) {
      this.audioContext.close();
    }
    
    if (this.mediaSource) {
      if (this.mediaSource.readyState === 'open') {
        this.mediaSource.endOfStream();
      }
      URL.revokeObjectURL(this.videoElement.src);
    }
    
    this.sourceBuffers.clear();
    this.tracks.clear();
    this.effects.clear();
    this.frameBuffers.clear();
    this.audioSourceNodes.clear();
  }
}
