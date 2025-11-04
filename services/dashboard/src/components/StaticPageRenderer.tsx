import React from 'react';

export type StaticSection = {
  heading: string;
  body: string;
};

export type StaticContent = {
  title: string;
  updatedAt?: string;
  sections: StaticSection[];
};

type Props = {
  content: StaticContent;
};

export function StaticPageRenderer({ content }: Props) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">{content.title}</h1>
      {content.updatedAt ? (
        <p className="mt-1 text-xs text-gray-500">Last updated: {content.updatedAt}</p>
      ) : null}

      <div className="mt-8 space-y-8">
        {content.sections.map((section, index) => (
          <section key={index}>
            <h2 className="text-xl font-semibold">{section.heading}</h2>
            <p className="mt-2 text-sm leading-6 text-gray-700 whitespace-pre-line">
              {section.body}
            </p>
          </section>
        ))}
      </div>
    </div>
  );
}


