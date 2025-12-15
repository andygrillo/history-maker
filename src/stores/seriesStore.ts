import { create } from 'zustand';
import { Series, Video, Script, Audio, Visual, VideoClip, MusicTrack } from '@/types';

interface SeriesState {
  currentSeries: Series | null;
  currentVideo: Video | null;
  videos: Video[];
  script: Script | null;
  audio: Audio | null;
  visuals: Visual[];
  videoClips: VideoClip[];
  musicTracks: MusicTrack[];

  // Actions
  setCurrentSeries: (series: Series | null) => void;
  setCurrentVideo: (video: Video | null) => void;
  setVideos: (videos: Video[]) => void;
  setScript: (script: Script | null) => void;
  setAudio: (audio: Audio | null) => void;
  setVisuals: (visuals: Visual[]) => void;
  setVideoClips: (clips: VideoClip[]) => void;
  setMusicTracks: (tracks: MusicTrack[]) => void;
  reset: () => void;
}

const initialState = {
  currentSeries: null,
  currentVideo: null,
  videos: [],
  script: null,
  audio: null,
  visuals: [],
  videoClips: [],
  musicTracks: [],
};

export const useSeriesStore = create<SeriesState>((set) => ({
  ...initialState,

  setCurrentSeries: (series) => set({ currentSeries: series }),
  setCurrentVideo: (video) => set({ currentVideo: video }),
  setVideos: (videos) => set({ videos }),
  setScript: (script) => set({ script }),
  setAudio: (audio) => set({ audio }),
  setVisuals: (visuals) => set({ visuals }),
  setVideoClips: (clips) => set({ videoClips: clips }),
  setMusicTracks: (tracks) => set({ musicTracks: tracks }),
  reset: () => set(initialState),
}));
