// AI-powered text synthesis using Anthropic Claude
// Generates human-readable summaries from structured data

export interface SynthesisConfig {
  apiKey?: string;
  model?: string;
}

export class SynthesisEngine {
  private apiKey: string;
  private model: string;

  constructor(config: SynthesisConfig) {
    this.apiKey = config.apiKey ?? '';
    this.model = config.model ?? 'claude-haiku-4-5-20251001';
  }

  get isAvailable(): boolean {
    return !!this.apiKey;
  }

  async summarizeBill(bill: {
    title: string;
    latestAction: string;
    policyArea?: string;
  }): Promise<string> {
    if (!this.isAvailable) return bill.title;

    return this.generate(
      `Summarize this congressional bill in 1-2 plain-English sentences for a general audience. Be factual and neutral.

Title: ${bill.title}
Latest Action: ${bill.latestAction}
Policy Area: ${bill.policyArea ?? 'N/A'}`
    );
  }

  async generateBiographyContext(data: {
    name: string;
    party: string;
    state: string;
    chamber: string;
    wikipedia?: string;
    education?: string[];
    careerBefore?: string[];
  }): Promise<string> {
    if (!this.isAvailable) return data.wikipedia ?? '';

    return this.generate(
      `Write a brief, neutral 2-3 sentence biographical overview of this elected official for a civic information platform. Focus on facts, not opinions.

Name: ${data.name}
Party: ${data.party}
State: ${data.state}
Chamber: ${data.chamber}
Wikipedia excerpt: ${data.wikipedia ?? 'N/A'}
Education: ${data.education?.join(', ') ?? 'N/A'}
Career before Congress: ${data.careerBefore?.join(', ') ?? 'N/A'}`
    );
  }

  private async generate(prompt: string): Promise<string> {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 300,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!res.ok) return '';

      const data = await res.json();
      return data.content?.[0]?.text ?? '';
    } catch {
      return '';
    }
  }
}
