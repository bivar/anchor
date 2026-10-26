/** Saves a file: the share sheet on phones (so it can go to Drive, Files, e-mail…), a download elsewhere. */
export async function saveFile(name: string, contents: string, type: string, title: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([contents], name, { type });
  const coarse = window.matchMedia?.('(pointer: coarse)').matches;
  if (coarse && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
      // Fall through to a plain download.
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'downloaded';
}

export function readFileText(file: File, maxBytes: number): Promise<string> {
  if (file.size > maxBytes) return Promise.reject(new RangeError('too large'));
  return file.text();
}
