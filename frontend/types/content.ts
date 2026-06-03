export type ContentType = 'movie' | 'tv' | 'anime' | 'manga' | 'game' | 'book' | 'podcast';

export type Content = {
  id: string;
  content_type: ContentType;
  title: string;
  description: string;
  genres: string[];
  tags: string[];
  moods: string[];
  image_url?: string;
  banner_url?: string;
  release_year?: number;
  rating: number;
  popularity: number;
  source: string;
  external_id: string;
  external_url?: string;
};
