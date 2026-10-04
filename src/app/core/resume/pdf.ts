interface TextItemLike {
  str?: string;
  hasEOL?: boolean;
}

/** Joins pdf.js text items, keeping the line breaks the PDF marks with hasEOL. */
export function joinTextItems(items: TextItemLike[]): string {
  let out = '';
  for (const item of items) {
    if (typeof item.str !== 'string') continue;
    out += item.str;
    if (item.hasEOL) out += '\n';
    else if (item.str && !/\s$/.test(item.str)) out += ' ';
  }
  // Re-join words hyphenated across line ends: "develop-\nment" -> "development".
  return out.replace(/(\p{Ll})-\n(\p{Ll})/gu, '$1$2').replace(/ +\n/g, '\n');
}

let pdfjsPromise: Promise<typeof import('pdfjs-dist')> | undefined;

/** Loads pdf.js on first use (keeps it out of the initial bundle) and points it at its worker. */
function loadPdfJs() {
  pdfjsPromise ??= import('pdfjs-dist').then((pdfjs) => {
    // angular.json copies pdf.worker.min.mjs next to index.html; resolve it against <base href>
    // so it also works under the GitHub Pages sub-path.
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdf.worker.min.mjs', document.baseURI).toString();
    return pdfjs;
  });
  return pdfjsPromise;
}

export async function extractPdfText(data: ArrayBuffer): Promise<string> {
  const pdfjs = await loadPdfJs();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(data) }).promise;
  try {
    const pages: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      pages.push(joinTextItems(content.items as TextItemLike[]));
      page.cleanup();
    }
    return pages.join('\n');
  } finally {
    void doc.destroy();
  }
}

/** Reads a resume file: PDF via pdf.js, anything textual as-is. */
export async function readResumeFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf') || file.type === 'application/pdf') return extractPdfText(await file.arrayBuffer());
  if (/\.(txt|md|markdown)$/.test(name) || file.type.startsWith('text/')) return file.text();
  throw new Error(`${file.name}: upload a PDF, .txt or .md file.`);
}
