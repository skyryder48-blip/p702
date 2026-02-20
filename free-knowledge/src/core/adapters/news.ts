// News article aggregation adapter
// Supports NewsAPI.org (free tier: 100 req/day, 1-month lookback)

export interface NewsArticle {
  title: string;
  description: string;
  source: string;
  url: string;
  publishedAt: string;
  imageUrl?: string;
}

export class NewsAdapter {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: { apiKey?: string }) {
    this.apiKey = config.apiKey ?? '';
    this.baseUrl = 'https://newsapi.org/v2';
  }

  async getArticlesAbout(name: string, limit: number = 5): Promise<NewsArticle[]> {
    if (!this.apiKey) {
      return [];
    }

    try {
      const params = new URLSearchParams({
        q: `"${name}"`,
        language: 'en',
        sortBy: 'publishedAt',
        pageSize: limit.toString(),
        apiKey: this.apiKey,
      });

      const res = await fetch(`${this.baseUrl}/everything?${params}`, {
        headers: { 'Accept': 'application/json' },
      });

      if (!res.ok) return [];

      const data = await res.json();

      return (data.articles ?? []).map((a: any) => ({
        title: a.title ?? '',
        description: a.description ?? '',
        source: a.source?.name ?? '',
        url: a.url ?? '',
        publishedAt: a.publishedAt ?? '',
        imageUrl: a.urlToImage ?? undefined,
      }));
    } catch {
      return [];
    }
  }
}
