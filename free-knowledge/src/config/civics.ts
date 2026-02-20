// CivicsOrchestrator — top-level coordinator
// Re-exports Orchestrator with civics-specific configuration defaults

import { Orchestrator, OrchestratorConfig } from '@/core/orchestrator';
import type { OfficialProfile } from '@/core/orchestrator';
import { ISSUE_CATEGORIES, type IssueCategoryId } from './profiles';

export interface CivicsConfig {
  congressApiKey?: string;
  fecApiKey?: string;
  googleCivicApiKey?: string;
  anthropicApiKey?: string;
  gnewsApiKey?: string;
  newsApiKey?: string;
}

export class CivicsOrchestrator extends Orchestrator {
  constructor(config: CivicsConfig) {
    super({
      congressApiKey: config.congressApiKey,
      fecApiKey: config.fecApiKey,
      googleCivicApiKey: config.googleCivicApiKey,
      anthropicApiKey: config.anthropicApiKey,
      newsApiKey: config.newsApiKey ?? config.gnewsApiKey,
    });
  }

  async getOfficialProfile(name: string): Promise<OfficialProfile | null> {
    // This would require a name-to-bioguide lookup
    // For now, this is used by the legacy routes.ts — prefer bioguide-based lookups
    return null;
  }

  async compareOfficials(name1: string, name2: string) {
    // Placeholder for legacy routes.ts compatibility
    return { official1: name1, official2: name2, comparison: null };
  }

  async getIssueReports(officialName: string, issueIds: string[]) {
    // Placeholder for legacy routes.ts compatibility
    return issueIds.map(id => ({ issueId: id, official: officialName, report: null }));
  }

  getIssueCategories() {
    return ISSUE_CATEGORIES;
  }
}

export type { OfficialProfile, IssueCategoryId };
