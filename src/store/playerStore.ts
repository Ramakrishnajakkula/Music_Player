import { create } from 'zustand';
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Song, RepeatMode, AudioQuality } from '../types';
import { getBestAudioUrl, getDurationSeconds } from '../api/saavn';

const QUEUE_STORAGE_KEY = '@music_player_queue';
const CURRENT_INDEX_KEY = '@music_player_index';
const QUALITY_STORAGE_KEY = '@music_player_quality';

interface PlayerState {
  // Queue
  queue: Song[];
  currentIndex: number;
  // Song playing outside the queue (removed while playing)
  standaloneSong: Song | null;

  // Playback
  isPlaying: boolean;
  isLoading: boolean;
  positionMs: number;
  durationMs: number;
  repeatMode: RepeatMode;
  isShuffle: boolean;
  shuffleOrder: number[];

  // Audio quality
  quality: AudioQuality;

  // Audio player (not serialized)
  player: AudioPlayer | null;

  // Actions
  loadAndPlay: (song: Song, queue?: Song[], index?: number) => Promise<void>;
  togglePlay: () => Promise<void>;
  seekTo: (ms: number) => Promise<void>;
  skipNext: () => Promise<void>;
  skipPrev: () => Promise<void>;
  setRepeatMode: (mode: RepeatMode) => void;
  toggleShuffle: () => void;
  setQuality: (q: AudioQuality) => Promise<void>;
  addToQueue: (song: Song) => void;
  removeFromQueue: (index: number, keepPlaying?: boolean) => void;
  reorderQueue: (from: number, to: number) => void;
  clearQueue: () => void;
  playFromQueue: (index: number) => Promise<void>;
  persistQueue: () => Promise<void>;
  hydrate: () => Promise<void>;
}

// ─── Setup audio mode ───────────────────────────────────────────────────────
// shouldPlayInBackground is the correct expo-audio property (not staysActiveInBackground from expo-av)
setAudioModeAsync({
  playsInSilentMode: true,
  shouldPlayInBackground: true,
  interruptionMode: 'duckOthers',
  allowsRecording: false,
  shouldRouteThroughEarpiece: false,
}).catch(() => {});

// ─── Store ────────────────────────────────────────────────────────────────────
export const usePlayerStore = create<PlayerState>((set, get) => ({
  queue: [],
  currentIndex: -1,
  standaloneSong: null,
  isPlaying: false,
  isLoading: false,
  positionMs: 0,
  durationMs: 0,
  repeatMode: 'off',
  isShuffle: false,
  shuffleOrder: [],
  quality: 'high',
  player: null,

  // ── Load & play a song ───────────────────────────────────────────────────
  loadAndPlay: async (song, queue, index) => {
    const state = get();

    // Stop & destroy previous player immediately to prevent overlap
    if (state.player) {
      try { state.player.pause(); } catch {}
      try { state.player.remove(); } catch {}
    }
    // Clear player from state right away so nothing else can trigger it
    set({ player: null, isPlaying: false, standaloneSong: null });

    let newQueue = state.queue;
    let newIndex = state.currentIndex;
    if (queue !== undefined && index !== undefined) {
      newQueue = queue;
      newIndex = index;
    } else {
      const existingIdx = newQueue.findIndex((s) => s.id === song.id);
      if (existingIdx >= 0) {
        newIndex = existingIdx;
      } else {
        newQueue = [...newQueue, song];
        newIndex = newQueue.length - 1;
      }
    }

    set({ isLoading: true, positionMs: 0, durationMs: 0, queue: newQueue, currentIndex: newIndex, player: null });

    const url = getBestAudioUrl(song.downloadUrl, get().quality);
    if (!url) { set({ isLoading: false }); return; }

    try {
      const player = createAudioPlayer({ uri: url });

      const subscription = player.addListener('playbackStatusUpdate', (status: any) => {
        const posMs = (status.currentTime ?? 0) * 1000;
        const durMs = status.duration
          ? status.duration * 1000
          : getDurationSeconds(song.duration) * 1000;
        // NOTE: Do NOT set isPlaying here — it causes race conditions with togglePlay.
        // isPlaying is managed exclusively by loadAndPlay, togglePlay, skipNext/Prev.
        set({
          positionMs: posMs,
          durationMs: durMs,
          isLoading: !(status.isLoaded ?? true),
        });
        if (status.didJustFinish) {
          subscription.remove();
          get().skipNext();
        }
      });

      player.play();
      set({ player, isPlaying: true, isLoading: false });
      get().persistQueue();
    } catch (e) {
      console.error('Failed to load audio', e);
      set({ isLoading: false });
    }
  },

  // ── Toggle play / pause ──────────────────────────────────────────────────
  togglePlay: async () => {
    const { player, isPlaying } = get();
    if (!player) return;
    // Update state FIRST so UI responds instantly (no 5-6s delay)
    const next = !isPlaying;
    set({ isPlaying: next });
    try {
      if (next) { player.play(); } else { player.pause(); }
    } catch (e) {
      // Revert if the call fails
      set({ isPlaying: isPlaying });
    }
  },

  // ── Seek ─────────────────────────────────────────────────────────────────
  seekTo: async (ms) => {
    const { player } = get();
    if (!player) return;
    player.seekTo(ms / 1000); // expo-audio uses seconds
    set({ positionMs: ms });
  },

  // ── Skip next ────────────────────────────────────────────────────────────
  skipNext: async () => {
    const { queue, currentIndex, repeatMode, isShuffle, shuffleOrder } = get();
    if (queue.length === 0) return;

    if (repeatMode === 'one') {
      // Restart same song
      const song = queue[currentIndex];
      await get().loadAndPlay(song, queue, currentIndex);
      return;
    }

    let nextIndex: number;
    if (isShuffle && shuffleOrder.length > 0) {
      const pos = shuffleOrder.indexOf(currentIndex);
      const nextPos = (pos + 1) % shuffleOrder.length;
      nextIndex = shuffleOrder[nextPos];
    } else {
      nextIndex = currentIndex + 1;
      if (nextIndex >= queue.length) {
        if (repeatMode === 'all') {
          nextIndex = 0;
        } else {
          return; // End of queue
        }
      }
    }

    await get().loadAndPlay(queue[nextIndex], queue, nextIndex);
  },

  // ── Skip prev ────────────────────────────────────────────────────────────
  skipPrev: async () => {
    const { queue, currentIndex, positionMs } = get();
    if (queue.length === 0) return;

    // If more than 3s played, restart current
    if (positionMs > 3000) {
      await get().seekTo(0);
      return;
    }

    const prevIndex = currentIndex - 1 < 0 ? queue.length - 1 : currentIndex - 1;
    await get().loadAndPlay(queue[prevIndex], queue, prevIndex);
  },

  // ── Quality ───────────────────────────────────────────────────────────────
  setQuality: async (q) => {
    const { queue, currentIndex, standaloneSong, positionMs } = get();
    set({ quality: q });
    try { await AsyncStorage.setItem(QUALITY_STORAGE_KEY, q); } catch {}
    // Reload current song (from queue or standalone) with new quality
    const currentSong = standaloneSong ?? (currentIndex >= 0 ? queue[currentIndex] : null);
    if (currentSong) {
      if (standaloneSong) {
        await get().loadAndPlay(standaloneSong, [], -1);
      } else {
        await get().loadAndPlay(queue[currentIndex], queue, currentIndex);
      }
      setTimeout(() => {
        if (positionMs > 1000) get().seekTo(positionMs);
      }, 1500);
    }
  },

  // ── Repeat & Shuffle ─────────────────────────────────────────────────────
  setRepeatMode: (mode) => set({ repeatMode: mode }),

  toggleShuffle: () => {
    const { isShuffle, queue, currentIndex } = get();
    if (!isShuffle) {
      // Generate shuffle order excluding current
      const indices = queue.map((_, i) => i).filter((i) => i !== currentIndex);
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      set({ isShuffle: true, shuffleOrder: [currentIndex, ...indices] });
    } else {
      set({ isShuffle: false, shuffleOrder: [] });
    }
  },

  // ── Queue management ─────────────────────────────────────────────────────
  addToQueue: (song) => {
    const { queue, standaloneSong } = get();
    if (queue.find((s) => s.id === song.id)) return; // Avoid duplicates
    const newQueue = [...queue, song];
    const extras: Partial<PlayerState> = { queue: newQueue };
    // If we're re-adding the standalone song, re-attach currentIndex to it
    if (standaloneSong?.id === song.id) {
      extras.standaloneSong = null;
      extras.currentIndex = newQueue.length - 1;
    }
    set(extras);
    get().persistQueue();
  },

  removeFromQueue: (index, keepPlaying = false) => {
    const { queue, currentIndex } = get();
    const removedSong = queue[index];
    const newQueue = queue.filter((_, i) => i !== index);
    // Removing the currently playing song → keep it playing as standalone
    if (index === currentIndex) {
      set({ queue: newQueue, currentIndex: -1, standaloneSong: removedSong });
    } else {
      let newIndex = currentIndex;
      if (index < currentIndex) newIndex--;
      set({ queue: newQueue, currentIndex: newIndex });
    }
    get().persistQueue();
  },

  reorderQueue: (from, to) => {
    const { queue, currentIndex } = get();
    const newQueue = [...queue];
    const [item] = newQueue.splice(from, 1);
    newQueue.splice(to, 0, item);
    // Recalculate currentIndex
    let newIndex = currentIndex;
    if (from === currentIndex) newIndex = to;
    else if (from < currentIndex && to >= currentIndex) newIndex--;
    else if (from > currentIndex && to <= currentIndex) newIndex++;
    set({ queue: newQueue, currentIndex: newIndex });
    get().persistQueue();
  },

  clearQueue: () => {
    const { player } = get();
    if (player) { try { player.remove(); } catch {} }
    set({ queue: [], currentIndex: -1, player: null, isPlaying: false });
    get().persistQueue();
  },

  playFromQueue: async (index) => {
    const { queue } = get();
    if (index < 0 || index >= queue.length) return;
    await get().loadAndPlay(queue[index], queue, index);
  },

  // ── Persistence ──────────────────────────────────────────────────────────
  persistQueue: async () => {
    const { queue, currentIndex } = get();
    try {
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
      await AsyncStorage.setItem(CURRENT_INDEX_KEY, String(currentIndex));
    } catch (e) {
      console.warn('Failed to persist queue', e);
    }
  },

  hydrate: async () => {
    try {
      const [queueStr, indexStr, qualityStr] = await Promise.all([
        AsyncStorage.getItem(QUEUE_STORAGE_KEY),
        AsyncStorage.getItem(CURRENT_INDEX_KEY),
        AsyncStorage.getItem(QUALITY_STORAGE_KEY),
      ]);
      if (queueStr) {
        const queue: Song[] = JSON.parse(queueStr);
        const index = indexStr ? parseInt(indexStr, 10) : -1;
        set({ queue, currentIndex: index });
      }
      if (qualityStr && ['high', 'medium', 'low'].includes(qualityStr)) {
        set({ quality: qualityStr as AudioQuality });
      }
    } catch (e) {
      console.warn('Failed to hydrate queue', e);
    }
  },
}));
