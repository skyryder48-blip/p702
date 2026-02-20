// Wikipedia biographical data adapter
// Uses the MediaWiki API to fetch article summaries

export interface WikipediaBio {
  title: string;
  summary: string;
  thumbnail?: string;
  pageUrl: string;
  extract: string;
}

export class WikipediaAdapter {
  private baseUrl = 'https://en.wikipedia.org/api/rest_v1';

  async getBiography(name: string): Promise<WikipediaBio | null> {
    // Wikipedia titles use underscores
    const title = name.replace(/\s+/g, '_');

    try {
      const res = await fetch(`${this.baseUrl}/page/summary/${encodeURIComponent(title)}`, {
        headers: { 'Accept': 'application/json' },
      });

      if (!res.ok) {
        // Try with disambiguation — some politicians need "(politician)" suffix
        return this.tryWithDisambiguation(name);
      }

      const data = await res.json();

      if (data.type === 'disambiguation') {
        return this.tryWithDisambiguation(name);
      }

      return {
        title: data.title,
        summary: data.extract ?? '',
        thumbnail: data.thumbnail?.source,
        pageUrl: data.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${title}`,
        extract: data.extract ?? '',
      };
    } catch {
      return null;
    }
  }

  private async tryWithDisambiguation(name: string): Promise<WikipediaBio | null> {
    const suffixes = ['(politician)', '(American politician)', '(U.S. politician)'];
    for (const suffix of suffixes) {
      const title = `${name} ${suffix}`.replace(/\s+/g, '_');
      try {
        const res = await fetch(`${this.baseUrl}/page/summary/${encodeURIComponent(title)}`, {
          headers: { 'Accept': 'application/json' },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.type !== 'disambiguation') {
            return {
              title: data.title,
              summary: data.extract ?? '',
              thumbnail: data.thumbnail?.source,
              pageUrl: data.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${title}`,
              extract: data.extract ?? '',
            };
          }
        }
      } catch {
        continue;
      }
    }
    return null;
  }
}
