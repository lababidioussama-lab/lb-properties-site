import { Fragment, type ReactNode } from "react";

/**
 * Turns `[[marked]]` spans inside a translated string into <em> elements.
 *
 * The alternative — putting JSX in the dictionaries — would make the copy
 * untranslatable by anyone who is not also editing React, and would break
 * the flat string-to-string parity check between en and ar. A delimiter
 * survives translation: the Arabic translator moves the brackets to
 * whichever word carries the emphasis in Arabic, which is rarely the word
 * in the same position as the English one.
 *
 * `[[` is used rather than `*` because the copy already contains single
 * brackets (the deliberate `[Add real client quotes]` placeholders) and
 * asterisks appear in prose often enough to be a hazard.
 */
const PATTERN = /\[\[(.+?)\]\]/g;

export function emphasize(text: string): ReactNode {
  // Fast path: the overwhelming majority of strings carry no marker, and
  // this runs on every heading on every render.
  if (!text.includes("[[")) return text;

  const parts: ReactNode[] = [];
  let cursor = 0;

  for (const match of text.matchAll(PATTERN)) {
    const start = match.index;
    if (start > cursor) parts.push(text.slice(cursor, start));
    parts.push(<em key={start}>{match[1]}</em>);
    cursor = start + match[0].length;
  }

  if (cursor < text.length) parts.push(text.slice(cursor));

  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>{part}</Fragment>
      ))}
    </>
  );
}

/** Strips the markers, for places that need the plain string (title, alt, aria). */
export function plain(text: string): string {
  return text.replace(PATTERN, "$1");
}
