import { NextRequest, NextResponse } from 'next/server';
import { testR2Connection } from '@/lib/api/r2';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint, bucketName, accessKey, secretKey } = body;

    if (!endpoint || !bucketName || !accessKey || !secretKey) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const success = await testR2Connection({
      endpoint,
      bucketName,
      accessKey,
      secretKey,
    });

    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'Connection failed' },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
