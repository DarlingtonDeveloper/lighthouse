/**
 * fetcher.ts
 * -----------
 * Resilient HTTP fetcher for the Lighthouse SA pipeline.
 * Returns an empty result on ANY failure so the pipeline never crashes.
 */

export async function fetchPage(
  url: string,
): Promise<{ html: string; headers: Record<string, string> }> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Lighthouse-SA-Agent/2.0)',
        Accept: 'text/html',
      },
      redirect: 'follow',
    });

    return {
      html: await response.text(),
      headers: Object.fromEntries(
        response.headers as unknown as Iterable<[string, string]>,
      ),
    };
  } catch (error) {
    console.error('fetchPage: failed to fetch', url, error);
    return { html: '', headers: {} };
  }
}
