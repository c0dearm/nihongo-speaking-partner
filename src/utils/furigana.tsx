import React from 'react';

/**
 * Renders Japanese text with Furigana Ruby annotations if furiganaEnabled is true.
 * Supports both bracket notation (e.g. 漢字(かんじ)) and HTML <ruby> tags.
 * When furiganaEnabled is false, strips annotations and displays pure text.
 */
export function renderFurigana(text: string | undefined, furiganaEnabled: boolean): React.ReactNode {
  if (!text) return null;

  const regex = /([一-龯々〆ヵヶぁ-んァ-ンa-zA-Z0-9]+?)[(（]([ぁ-んァ-ンa-zA-Z0-9]+)[)）]/g;

  if (!furiganaEnabled) {
    let clean = text.replace(/<ruby>(.*?)<rt>.*?<\/rt><\/ruby>/gi, '$1');
    clean = clean.replace(regex, '$1');
    return clean;
  }

  if (text.includes('<ruby>')) {
    return <span dangerouslySetInnerHTML={{ __html: text }} />;
  }

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    parts.push(
      <ruby key={match.index} className="mx-0.5 inline-flex flex-col items-center leading-normal">
        {match[1]}
        <rt className="text-[0.72em] text-indigo-300 font-normal select-none -mt-1">{match[2]}</rt>
      </ruby>
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}
