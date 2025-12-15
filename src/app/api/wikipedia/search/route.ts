import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query } = await request.json();

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // Search Wikipedia API
    const searchUrl = new URL('https://en.wikipedia.org/w/api.php');
    searchUrl.searchParams.set('action', 'query');
    searchUrl.searchParams.set('list', 'search');
    searchUrl.searchParams.set('srsearch', query);
    searchUrl.searchParams.set('srlimit', '10');
    searchUrl.searchParams.set('format', 'json');
    searchUrl.searchParams.set('origin', '*');

    const searchResponse = await fetch(searchUrl.toString());
    if (!searchResponse.ok) {
      throw new Error('Failed to search Wikipedia');
    }

    const searchData = await searchResponse.json();
    const searchResults = searchData.query?.search || [];

    // Get extracts for each result
    if (searchResults.length === 0) {
      return NextResponse.json({ articles: [] });
    }

    const pageIds = searchResults.map((r: { pageid: number }) => r.pageid).join('|');
    const extractUrl = new URL('https://en.wikipedia.org/w/api.php');
    extractUrl.searchParams.set('action', 'query');
    extractUrl.searchParams.set('pageids', pageIds);
    extractUrl.searchParams.set('prop', 'extracts');
    extractUrl.searchParams.set('exintro', '1');
    extractUrl.searchParams.set('explaintext', '1');
    extractUrl.searchParams.set('exsentences', '3');
    extractUrl.searchParams.set('format', 'json');
    extractUrl.searchParams.set('origin', '*');

    const extractResponse = await fetch(extractUrl.toString());
    if (!extractResponse.ok) {
      throw new Error('Failed to get extracts');
    }

    const extractData = await extractResponse.json();
    const pages = extractData.query?.pages || {};

    const articles = searchResults.map((result: { pageid: number; title: string }) => ({
      pageid: result.pageid,
      title: result.title,
      extract: pages[result.pageid]?.extract || '',
    }));

    return NextResponse.json({ articles });
  } catch (error) {
    console.error('Wikipedia search error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to search Wikipedia' },
      { status: 500 }
    );
  }
}
