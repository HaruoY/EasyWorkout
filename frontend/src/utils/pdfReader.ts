/**
 * Estrazione testo da un PDF caricato dall'utente, interamente lato browser.
 * Il file non viene mai inviato al backend: PDF.js lo elabora in memoria nel client.
 */
import * as pdfjsLib from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export interface PdfPageText {
  pageNumber: number;
  text: string;
}

export async function extractTextFromPdf(file: File): Promise<PdfPageText[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pages: PdfPageText[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    // Ricostruisce le righe basandosi sulla posizione verticale (Y) di ciascun frammento di testo,
    // perché PDF.js restituisce frammenti sparsi, non righe già unite.
    const items = content.items as Array<{ str: string; transform: number[] }>;
    const lineMap = new Map<number, string[]>();

    items.forEach((item) => {
      const y = Math.round(item.transform[5]);
      if (!lineMap.has(y)) lineMap.set(y, []);
      lineMap.get(y)!.push(item.str);
    });

    // Ordina le righe dall'alto verso il basso (Y decrescente nel sistema di coordinate PDF)
    const sortedY = Array.from(lineMap.keys()).sort((a, b) => b - a);
    const text = sortedY.map((y) => lineMap.get(y)!.join(' ')).join('\n');

    pages.push({ pageNumber: pageNum, text });
  }

  return pages;
}

export async function renderPdfPageToCanvas(
  file: File,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  scale = 1.3
): Promise<void> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale });

  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const context = canvas.getContext('2d')!;

  await page.render({ canvasContext: context, viewport }).promise;
}

export async function getPdfPageCount(file: File): Promise<number> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  return pdf.numPages;
}
