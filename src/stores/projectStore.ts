import { create } from 'zustand';
import { Project, Video, Script, Audio, Visual, VideoClip, MusicTrack } from '@/types';

interface ProjectState {
  currentProject: Project | null;
  currentVideo: Video | null;
  videos: Video[];
  script: Script | null;
  audio: Audio | null;
  visuals: Visual[];
  videoClips: VideoClip[];
  musicTracks: MusicTrack[];

  // Actions
  setCurrentProject: (project: Project | null) => void;
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
  currentProject: null,
  currentVideo: null,
  videos: [],
  script: null,
  audio: null,
  visuals: [],
  videoClips: [],
  musicTracks: [],
};

export const useProjectStore = create<ProjectState>((set) => ({
  ...initialState,

  setCurrentProject: (project) => set({ currentProject: project }),
  setCurrentVideo: (video) => set({ currentVideo: video }),
  setVideos: (videos) => set({ videos }),
  setScript: (script) => set({ script }),
  setAudio: (audio) => set({ audio }),
  setVisuals: (visuals) => set({ visuals }),
  setVideoClips: (clips) => set({ videoClips: clips }),
  setMusicTracks: (tracks) => set({ musicTracks: tracks }),
  reset: () => set(initialState),
}));
