export interface SongImage {
  quality: string;
  link?: string;
  url?: string;
}

export interface DownloadUrl {
  quality: string;
  link?: string;
  url?: string;
}

export interface Album {
  id: string;
  name: string;
  url?: string;
}

export interface Artist {
  id: string;
  name: string;
}

export interface Song {
  id: string;
  name: string;
  duration: number | string;
  language?: string;
  album: Album;
  primaryArtists?: string;
  artists?: {
    primary?: Artist[];
  };
  image: SongImage[];
  downloadUrl: DownloadUrl[];
  url?: string;
  playCount?: string;
  year?: string;
}

export interface SearchResult {
  results: Song[];
  total: number;
  start: number;
}

export type RepeatMode = 'off' | 'all' | 'one';
export type AudioQuality = 'high' | 'medium' | 'low';
