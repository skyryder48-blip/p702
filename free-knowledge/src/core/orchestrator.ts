// Orchestrator — coordinates adapters into unified profiles
// Central point that combines data from multiple sources

import { CongressAdapter } from './adapters/government/congress';
import { CampaignFinanceAdapter } from './adapters/government/campaign-finance';
import { CivicInfoAdapter } from './adapters/government/civic-info';
import { WikipediaAdapter } from './adapters/wikipedia';
import { WikidataAdapter } from './adapters/wikidata';
import { NewsAdapter } from './adapters/news';
import { SynthesisEngine } from './synthesis/index';
import { profileCache, zipCache, financeCache } from './cache/index';
import { zipToState } from './adapters/government/zip-to-state';
import type { MemberSummary, BillSummary, ZipLookupResult, FinanceSummary, ContributorRecord, VoteRecord, CommitteeAssignment } from './adapters/government/index';
import type { WikipediaBio } from './adapters/wikipedia';
import type { WikidataFacts } from './adapters/wikidata';
import type { NewsArticle } from './adapters/news';

export interface OrchestratorConfig {
  congressApiKey?: string;
  fecApiKey?: string;
  googleCivicApiKey?: string;
  anthropicApiKey?: string;
  newsApiKey?: string;
}

export interface OfficialProfile {
  member: MemberSummary & {
    birthYear?: string;
    terms: { chamber: string; congress: number; startYear: number }[];
    sponsoredCount: number;
    cosponsoredCount: number;
  };
  bills: BillSummary[];
  finance?: {
    found: boolean;
    candidate?: FinanceSummary;
    topContributors?: ContributorRecord[];
  };
  biography?: WikipediaBio | null;
  wikidataFacts?: WikidataFacts | null;
  news?: NewsArticle[];
  votes?: VoteRecord[];
  committees?: CommitteeAssignment[];
}

export class Orchestrator {
  private congress: CongressAdapter;
  private finance: CampaignFinanceAdapter;
  private civicInfo: CivicInfoAdapter;
  private wikipedia: WikipediaAdapter;
  private wikidata: WikidataAdapter;
  private news: NewsAdapter;
  private synthesis: SynthesisEngine;

  constructor(config: OrchestratorConfig) {
    this.congress = new CongressAdapter({ apiKey: config.congressApiKey });
    this.finance = new CampaignFinanceAdapter({ apiKey: config.fecApiKey });
    this.civicInfo = new CivicInfoAdapter({ apiKey: config.googleCivicApiKey });
    this.wikipedia = new WikipediaAdapter();
    this.wikidata = new WikidataAdapter();
    this.news = new NewsAdapter({ apiKey: config.newsApiKey });
    this.synthesis = new SynthesisEngine({ apiKey: config.anthropicApiKey });
  }

  // --- Zip Code Lookup ---

  async lookupByZipCode(zipCode: string): Promise<ZipLookupResult> {
    const cached = zipCache.get(zipCode) as ZipLookupResult | null;
    if (cached) return cached;

    // Try Google Civic Info API first
    try {
      const result = await this.civicInfo.lookupByZip(zipCode);
      zipCache.set(zipCode, result);
      return result;
    } catch (civicError) {
      console.warn('[Orchestrator] Google Civic API failed, falling back to Congress.gov:', civicError instanceof Error ? civicError.message : civicError);
    }

    // Fallback: use Congress.gov API with zip-to-state mapping
    const state = zipToState(zipCode);
    if (!state) {
      throw new Error(`Unable to determine state for zip code ${zipCode}. Google Civic API is unavailable.`);
    }

    try {
      const members = await this.congress.getMembersByState(state);
      const officials = members.map(m => ({
        name: m.name,
        title: m.chamber === 'senate'
          ? `U.S. Senator — ${m.state}`
          : `U.S. Representative — ${m.state}${m.district ? ` District ${m.district}` : ''}`,
        party: m.party,
        chamber: m.chamber,
        photoUrl: m.depiction,
        bioguideId: m.bioguideId,
        phones: [],
        urls: m.officialUrl ? [m.officialUrl] : [],
        channels: [],
      }));

      const result: ZipLookupResult = {
        zipCode,
        state,
        officials,
      };

      zipCache.set(zipCode, result);
      return result;
    } catch (congressError) {
      throw new Error(
        `Zip code lookup failed. Google Civic API: unavailable. Congress.gov: ${congressError instanceof Error ? congressError.message : 'unavailable'}`
      );
    }
  }

  // --- Member Profile ---

  async getMemberProfile(bioguideId: string): Promise<{
    member: OfficialProfile['member'];
    bills: BillSummary[];
  }> {
    const cacheKey = `member:${bioguideId}`;
    const cached = profileCache.get(cacheKey) as { member: OfficialProfile['member']; bills: BillSummary[] } | null;
    if (cached) return cached;

    const [member, bills] = await Promise.all([
      this.congress.getMember(bioguideId),
      this.congress.getSponsoredBills(bioguideId),
    ]);

    const result = { member, bills };
    profileCache.set(cacheKey, result);
    return result;
  }

  // --- Finance Data ---

  async getMemberFinance(bioguideId: string, memberName: string): Promise<{
    found: boolean;
    candidate?: FinanceSummary;
    topContributors?: ContributorRecord[];
  }> {
    const cacheKey = `finance:${bioguideId}`;
    const cached = financeCache.get(cacheKey) as { found: boolean; candidate?: FinanceSummary; topContributors?: ContributorRecord[] } | null;
    if (cached) return cached;

    const candidateInfo = await this.finance.findCandidate(memberName);
    if (!candidateInfo) {
      const result = { found: false };
      financeCache.set(cacheKey, result);
      return result;
    }

    const [totals, contributors] = await Promise.all([
      this.finance.getFinanceTotals(candidateInfo.candidateId),
      this.finance.getTopContributors(candidateInfo.candidateId),
    ]);

    const result = {
      found: true,
      candidate: totals ?? undefined,
      topContributors: contributors,
    };

    financeCache.set(cacheKey, result);
    return result;
  }

  // --- Biography ---

  async getMemberBiography(name: string): Promise<{
    wikipedia: WikipediaBio | null;
    wikidata: WikidataFacts | null;
  }> {
    const [wikipedia, wikidata] = await Promise.all([
      this.wikipedia.getBiography(name),
      this.wikidata.getFactsByName(name),
    ]);
    return { wikipedia, wikidata };
  }

  // --- News ---

  async getMemberNews(name: string, limit: number = 5): Promise<NewsArticle[]> {
    return this.news.getArticlesAbout(name, limit);
  }

  // --- Votes ---

  async getMemberVotes(bioguideId: string, chamber: 'house' | 'senate', limit: number = 20): Promise<VoteRecord[]> {
    return this.congress.getMemberVotes(bioguideId, chamber, limit);
  }

  // --- Committees ---

  async getMemberCommittees(bioguideId: string): Promise<CommitteeAssignment[]> {
    return this.congress.getMemberCommittees(bioguideId);
  }

  // --- Full Profile (all data) ---

  async getFullProfile(bioguideId: string): Promise<OfficialProfile> {
    const { member, bills } = await this.getMemberProfile(bioguideId);

    // Fetch supplementary data in parallel
    const [finance, bio, news, votes, committees] = await Promise.allSettled([
      this.getMemberFinance(bioguideId, member.name),
      this.getMemberBiography(member.name),
      this.getMemberNews(member.name),
      this.getMemberVotes(bioguideId, member.chamber),
      this.getMemberCommittees(bioguideId),
    ]);

    return {
      member,
      bills,
      finance: finance.status === 'fulfilled' ? finance.value : undefined,
      biography: bio.status === 'fulfilled' ? bio.value.wikipedia : null,
      wikidataFacts: bio.status === 'fulfilled' ? bio.value.wikidata : null,
      news: news.status === 'fulfilled' ? news.value : [],
      votes: votes.status === 'fulfilled' ? votes.value : [],
      committees: committees.status === 'fulfilled' ? committees.value : [],
    };
  }
}
