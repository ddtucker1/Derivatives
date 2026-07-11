import { createWorker } from 'tesseract.js'

export async function extractTextFromImage(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const worker = await createWorker('eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text' && typeof m.progress === 'number') {
        onProgress?.(Math.round(m.progress * 100))
      }
    },
  })

  try {
    const {
      data: { text },
    } = await worker.recognize(file)
    return text
  } finally {
    await worker.terminate()
  }
}
