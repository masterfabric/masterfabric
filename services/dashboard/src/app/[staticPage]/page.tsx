import React from 'react';
import pages from '@/data/pages.json';
import { StaticPageRenderer } from '@/components/StaticPageRenderer';

type Section = {
  heading: string;
  body: string;
};

type StaticPageConfig = {
  title: string;
  updatedAt?: string;
  sections: Section[];
};

type Params = {
  params: Promise<{
    staticPage: string;
  }>;
};

const validSlugs = new Set(['privacy', 'terms', 'support']);

export default async function StaticPage({ params }: Params) {
  const { staticPage: slug } = await params;

  if (!validSlugs.has(slug)) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-2xl font-semibold">Not found</h1>
        <p className="mt-2 text-sm text-gray-500">The page you are looking for does not exist.</p>
      </div>
    );
  }

  const pageConfig = (pages as Record<string, StaticPageConfig>)[slug];

  return <StaticPageRenderer content={pageConfig} />;
}

export function generateStaticParams() {
  return [
    { staticPage: 'privacy' },
    { staticPage: 'terms' },
    { staticPage: 'support' },
  ];
}


