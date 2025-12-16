import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface WikimediaPage {
  pageid: number;
  title: string;
  imageinfo?: Array<{
    url: string;
    thumburl?: string;
    width: number;
    height: number;
    extmetadata?: {
      ImageDescription?: { value: string };
      Artist?: { value: string };
      License?: { value: string };
      DateTimeOriginal?: { value: string };
    };
  }>;
}

// Helper to strip HTML tags from metadata
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

interface WikimediaResponse {
  query?: {
    pages?: Record<string, WikimediaPage>;
  };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { keywords, limit = 3, mediaFilter = 'all', qualityFilter = 'all' } = await request.json();
    console.log('Wikimedia search for:', keywords, 'mediaFilter:', mediaFilter, 'qualityFilter:', qualityFilter);

    if (!keywords || typeof keywords !== 'string') {
      return NextResponse.json({ error: 'Keywords are required' }, { status: 400 });
    }

    // Media filter category suffixes for Wikimedia Commons
    const filterCategories: Record<string, string> = {
      paintings: 'painting',
      engravings: 'engraving',
      maps: 'map',
      pre1900: '19th century OR 18th century OR 17th century',
    };

    // Clean up search query (replace commas with spaces for single combined search)
    const searchQuery = keywords.replace(/,/g, ' ').trim();
    console.log('Search query:', searchQuery);

    // Quality filter categories
    const qualityCategories: Record<string, string> = {
      valued: 'incategory:"Valued images"',
      featured: 'incategory:"Featured pictures"',
    };

    // Helper to search Wikimedia using CirrusSearch
    const searchWikimedia = async (query: string) => {
      // Build CirrusSearch query with filters
      let fullQuery = query;

      // Add optional media type filter
      if (mediaFilter !== 'all' && filterCategories[mediaFilter]) {
        fullQuery += ` ${filterCategories[mediaFilter]}`;
      }

      // Add optional quality filter
      if (qualityFilter !== 'all' && qualityCategories[qualityFilter]) {
        fullQuery += ` ${qualityCategories[qualityFilter]}`;
      }

      // Add filetype filter to get only images
      fullQuery += ' filetype:bitmap'; // bitmap = jpg, png, gif, etc.

      console.log('CirrusSearch query:', fullQuery);

      const searchUrl = new URL('https://commons.wikimedia.org/w/api.php');
      searchUrl.searchParams.set('action', 'query');
      searchUrl.searchParams.set('generator', 'search');
      searchUrl.searchParams.set('gsrnamespace', '6'); // File namespace
      searchUrl.searchParams.set('gsrsearch', fullQuery);
      searchUrl.searchParams.set('gsrlimit', '30'); // Fetch more
      searchUrl.searchParams.set('gsrsort', 'relevance'); // Sort by relevance
      searchUrl.searchParams.set('prop', 'imageinfo');
      searchUrl.searchParams.set('iiprop', 'url|extmetadata|size');
      searchUrl.searchParams.set('iiurlwidth', '400');
      searchUrl.searchParams.set('format', 'json');
      searchUrl.searchParams.set('origin', '*');

      const response = await fetch(searchUrl.toString(), {
        headers: {
          'User-Agent': 'HistoryMaker/1.0 (https://historymaker.app)',
        },
      });

      if (!response.ok) return [];

      const data: WikimediaResponse = await response.json();
      if (!data.query?.pages) return [];

      return Object.values(data.query.pages)
        .filter((page) => {
          const info = page.imageinfo?.[0];
          if (!info) return false;
          // Basic size filter - not too strict
          if (info.width < 200 || info.height < 150) return false;
          const url = info.url.toLowerCase();
          // Only filter out non-image formats
          if (url.endsWith('.svg') || url.endsWith('.pdf') || url.endsWith('.ogg') || url.endsWith('.webm')) return false;
          return true;
        })
        // Sort by image size (larger = usually better quality)
        .sort((a, b) => {
          const aSize = (a.imageinfo?.[0]?.width || 0) * (a.imageinfo?.[0]?.height || 0);
          const bSize = (b.imageinfo?.[0]?.width || 0) * (b.imageinfo?.[0]?.height || 0);
          return bSize - aSize;
        })
        .map((page) => {
          const info = page.imageinfo![0];
          const meta = info.extmetadata || {};
          return {
            url: info.url,
            title: page.title.replace('File:', ''),
            thumb: info.thumburl || info.url,
            license: meta.License?.value || '',
            description: stripHtml(meta.ImageDescription?.value || '').slice(0, 200),
            artist: stripHtml(meta.Artist?.value || ''),
            date: stripHtml(meta.DateTimeOriginal?.value || '').split(/date QS:/i)[0].trim().slice(0, 50),
            width: info.width,
            height: info.height,
          };
        });
    };

    // Single search with combined query
    const images = await searchWikimedia(searchQuery);
    console.log('Returning', images.length, 'images for:', searchQuery);
    return NextResponse.json({ images: images.slice(0, limit) });
  } catch (error) {
    console.error('Wikimedia search error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to search Wikimedia' },
      { status: 500 }
    );
  }
}
