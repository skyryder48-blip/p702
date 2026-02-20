// Shared orchestrator factory for API routes
// Creates a single Orchestrator instance per serverless invocation.
// Safe because adapters are stateless (they only store config values).

import { Orchestrator } from '@/core/orchestrator';

let instance: Orchestrator | null = null;

export function getOrchestrator(): Orchestrator {
  if (!instance) {
    instance = new Orchestrator({
      congressApiKey: process.env.CONGRESS_API_KEY,
      fecApiKey: process.env.FEC_API_KEY,
      googleCivicApiKey: process.env.GOOGLE_CIVIC_API_KEY,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      newsApiKey: process.env.NEWS_API_KEY,
    });
  }
  return instance;
}
