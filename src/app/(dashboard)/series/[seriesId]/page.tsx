'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function SeriesPage() {
  const router = useRouter();
  const params = useParams();
  const seriesId = params.seriesId as string;

  useEffect(() => {
    router.replace(`/series/${seriesId}/planner`);
  }, [router, seriesId]);

  return null;
}
