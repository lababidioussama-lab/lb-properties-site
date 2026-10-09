/**
 * A small PDF writer for drafts the staff prepare (contracts, forms, reports).
 *
 * Plain A4 pages in Helvetica, written by hand so it runs inside the Worker
 * with no library. It sets Latin text only: Arabic and other scripts cannot be
 * drawn with the built-in fonts, so such characters are replaced with "?" and
 * the draft says so. Every page carries a "draft" footer.
 */

// Helvetica advance widths for characters 32..126, in thousandths of the font size.
const W = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];

const widthOf = (s: string, size: number, bold: boolean) => {
  let w = 0;
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); w += c >= 32 && c <= 126 ? W[c - 32] : 556; }
  return (w / 1000) * size * (bold ? 1.07 : 1);
};

/** Text the built-in fonts can draw. Returns the cleaned text and whether anything had to be dropped. */
export function latin(text: string): { text: string; lost: boolean } {
  let lost = false;
  const out = text
    .replace(/[‘’‚]/g, "'").replace(/[“”„]/g, '"').replace(/[–—−]/g, "-")
    .replace(/[•●▪]/g, "-").replace(/…/g, "...").replace(/[   ]/g, " ").replace(/\t/g, "    ")
    .replace(/[^\n\x20-\x7E\xA1-\xFF]/g, () => { lost = true; return "?"; });
  return { text: out, lost };
}

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

interface Row { text: string; bold: boolean; size: number; gap: number }

export function makePdf(title: string, body: string, footer: string): { bytes: Uint8Array<ArrayBuffer>; lost: boolean } {
  const PW = 595, PH = 842, M = 58, MAXW = PW - 2 * M;
  const t = latin(title), b = latin(body), f = latin(footer);
  const rows: Row[] = [{ text: t.text.slice(0, 90), bold: true, size: 15, gap: 26 }];

  for (const raw of b.text.split("\n")) {
    const line = raw.replace(/\s+$/, "");
    if (!line.trim()) { rows.push({ text: "", bold: false, size: 10.5, gap: 8 }); continue; }
    // A short line in capitals, or one that ends with a colon, is a heading.
    const heading = line.length <= 70 && ((/[A-Z]/.test(line) && line === line.toUpperCase()) || /^(ADDENDUM|SCHEDULE|ANNEX|PART|SECTION)\b/i.test(line.trim()));
    const size = heading ? 11.5 : 10.5;
    const indent = /^\s+/.exec(line)?.[0].length ?? 0;
    const pad = " ".repeat(Math.min(indent, 8));
    let cur = "";
    for (const word of line.trim().split(/\s+/)) {
      const next = cur ? `${cur} ${word}` : word;
      if (widthOf(pad + next, size, heading) > MAXW && cur) { rows.push({ text: pad + cur, bold: heading, size, gap: 15 }); cur = word; }
      else cur = next;
    }
    rows.push({ text: pad + cur, bold: heading, size, gap: heading ? 17 : 15 });
  }

  // lay the rows out on pages
  const pages: string[] = [];
  let y = PH - M, ops = "";
  const flush = () => { pages.push(ops); ops = ""; y = PH - M; };
  for (const r of rows) {
    if (y - r.gap < M + 26) flush();
    y -= r.gap;
    if (r.text) ops += `BT /${r.bold ? "F2" : "F1"} ${r.size} Tf ${M} ${y.toFixed(1)} Td (${esc(r.text)}) Tj ET\n`;
  }
  flush();

  const objs: string[] = [];
  const add = (s: string) => { objs.push(s); return objs.length; };
  add("<< /Type /Catalog /Pages 2 0 R >>");
  add("");                                                                  // pages, filled in below
  add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  const kids: number[] = [];
  pages.forEach((content, i) => {
    const foot = `${f.text} - page ${i + 1} of ${pages.length}`;
    const stream = `${content}0.45 g\nBT /F1 8 Tf ${M} 34 Td (${esc(foot)}) Tj ET\n0.8 G 0.5 w ${M} 46 m ${PW - M} 46 l S\n`;
    const c = add(`<< /Length ${stream.length} >>\nstream\n${stream}endstream`);
    kids.push(add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${c} 0 R >>`));
  });
  objs[1] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(" ")}] /Count ${kids.length} >>`;

  let out = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;

  // every character is below 256 by now, so one character is one byte
  const bytes = new Uint8Array(new ArrayBuffer(out.length));
  for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 0xff;
  return { bytes, lost: t.lost || b.lost };
}
