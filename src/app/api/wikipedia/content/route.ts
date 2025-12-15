import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pageid } = await request.json();

    if (!pageid) {
      return NextResponse.json({ error: 'Page ID is required' }, { status: 400 });
    }

    // Get full article content from Wikipedia
    const contentUrl = new URL('https://en.wikipedia.org/w/api.php');
    contentUrl.searchParams.set('action', 'query');
    contentUrl.searchParams.set('pageids', String(pageid));
    contentUrl.searchParams.set('prop', 'extracts');
    contentUrl.searchParams.set('explaintext', '1');
    contentUrl.searchParams.set('format', 'json');
    contentUrl.searchParams.set('origin', '*');

    const response = await fetch(contentUrl.toString());
    if (!response.ok) {
      throw new Error('Failed to fetch Wikipedia content');
    }

    const data = await response.json();
    const pages = data.query?.pages || {};
    const page = pages[pageid];

    if (!page || page.missing) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    return NextResponse.json({
      title: page.title,
      content: page.extract || '',
    });
  } catch (error) {
    console.error('Wikipedia content error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch Wikipedia content' },
      { status: 500 }
    );
  }
}
