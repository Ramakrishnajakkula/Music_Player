import { Song, SearchResult, AudioQuality } from '../types';

const BASE_URL = 'https://saavn.sumit.co';

// Helper to normalize image URLs (both "link" and "url" fields exist depending on endpoint)
export function getBestImage(images: { quality: string; link?: string; url?: string }[]): string {
  if (!images || images.length === 0) return '';
  const high = images.find((i) => i.quality === '500x500');
  const mid = images.find((i) => i.quality === '150x150');
  const chosen = high || mid || images[images.length - 1];
  return chosen.link || chosen.url || '';
}

// Helper to get best download url based on quality preference
export function getBestAudioUrl(
  urls: { quality: string; link?: string; url?: string }[],
  quality: AudioQuality = 'high'
): string {
  if (!urls || urls.length === 0) return '';
  const qualityMap: Record<AudioQuality, string[]> = {
    high:   ['320kbps', '160kbps', '96kbps', '48kbps', '12kbps'],
    medium: ['160kbps', '96kbps', '320kbps', '48kbps', '12kbps'],
    low:    ['96kbps',  '48kbps', '12kbps',  '160kbps', '320kbps'],
  };
  for (const q of qualityMap[quality]) {
    const found = urls.find((u) => u.quality === q);
    if (found) return found.link || found.url || '';
  }
  return urls[urls.length - 1]?.link || urls[urls.length - 1]?.url || '';
}

export function getArtistNames(song: Song): string {
  if (song.primaryArtists) return song.primaryArtists;
  if (song.artists?.primary?.length) {
    return song.artists.primary.map((a) => a.name).join(', ');
  }
  return 'Unknown Artist';
}

export function getDurationSeconds(duration: number | string): number {
  return typeof duration === 'string' ? parseInt(duration, 10) : duration;
}

async function fetchSaavn<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export async function searchSongs(query: string, page = 1, limit = 20): Promise<SearchResult> {
  const data = await fetchSaavn<any>(
    `/api/search/songs?query=${encodeURIComponent(query)}&page=${page}&limit=${limit}`
  );
  // saavn.sumit.co → { status, data: { results, total, start } }
  const results: Song[] = data?.data?.results ?? data?.results ?? [];
  const total: number = data?.data?.total ?? data?.total ?? results.length;
  return { results, total, start: (page - 1) * limit + 1 };
}

export async function getTopSongs(query = 'trending hindi 2024'): Promise<Song[]> {
  const result = await searchSongs(query, 1, 30);
  return result.results;
}

export async function getSongById(id: string): Promise<Song | null> {
  try {
    const data = await fetchSaavn<any>(`/api/songs/${id}`);
    const songs: Song[] = data?.data ?? [];
    return songs[0] ?? null;
  } catch {
    return null;
  }
}

export async function getSongSuggestions(id: string): Promise<Song[]> {
  try {
    const data = await fetchSaavn<any>(`/api/songs/${id}/suggestions`);
    return data?.data ?? [];
  } catch {
    return [];
  }
}


