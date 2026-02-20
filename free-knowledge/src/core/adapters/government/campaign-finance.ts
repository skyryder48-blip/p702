// FEC API adapter — contributions, PACs, expenditures, filings
// Docs: https://api.open.fec.gov/developers/

import {
  BaseAdapter,
  AdapterConfig,
  FinanceSummary,
  ContributorRecord,
} from './index';

export class CampaignFinanceAdapter extends BaseAdapter {
  constructor(config: AdapterConfig) {
    super({ ...config, baseUrl: config.baseUrl ?? 'https://api.open.fec.gov/v1' });
  }

  private url(path: string, params: Record<string, string> = {}): string {
    const searchParams = new URLSearchParams({
      api_key: this.apiKey,
      ...params,
    });
    return `${this.baseUrl}${path}?${searchParams}`;
  }

  // --- Find Candidate by Name ---

  async findCandidate(name: string, state?: string): Promise<{
    candidateId: string;
    name: string;
    party: string;
    office: string;
    state: string;
    cycles: number[];
  } | null> {
    const params: Record<string, string> = {
      q: name,
      sort: '-election_year',
      per_page: '5',
      is_active_candidate: 'true',
    };
    if (state) params.state = state;

    const data = await this.fetchJSON<any>(this.url('/candidates/search', params));
    const candidates = data.results ?? [];

    if (candidates.length === 0) return null;

    // Find best match — prefer exact name matches
    const nameLower = name.toLowerCase();
    const match = candidates.find(
      (c: any) => c.name?.toLowerCase().includes(nameLower) || nameLower.includes(c.name?.toLowerCase().split(',')[0])
    ) ?? candidates[0];

    return {
      candidateId: match.candidate_id,
      name: match.name,
      party: match.party_full ?? match.party,
      office: match.office_full ?? match.office,
      state: match.state,
      cycles: match.cycles ?? [],
    };
  }

  // --- Financial Totals ---

  async getFinanceTotals(candidateId: string, cycle?: number): Promise<FinanceSummary | null> {
    const params: Record<string, string> = {
      per_page: '1',
      sort: '-cycle',
    };
    if (cycle) params.cycle = cycle.toString();

    const data = await this.fetchJSON<any>(this.url(`/candidate/${candidateId}/totals`, params));
    const totals = data.results?.[0];

    if (!totals) return null;

    // Also fetch candidate info for display
    const candidateData = await this.fetchJSON<any>(this.url(`/candidate/${candidateId}`));
    const candidate = candidateData.results?.[0] ?? {};

    return {
      candidateId,
      name: candidate.name ?? '',
      party: candidate.party_full ?? candidate.party ?? '',
      office: candidate.office_full ?? candidate.office ?? '',
      cycle: totals.cycle,
      totalReceipts: totals.receipts ?? 0,
      totalDisbursements: totals.disbursements ?? 0,
      cashOnHand: totals.cash_on_hand_end_period ?? 0,
      individualContributions: totals.individual_contributions ?? 0,
      pacContributions: totals.other_political_committee_contributions ?? 0,
      lastReportDate: totals.coverage_end_date,
      fecUrl: `https://www.fec.gov/data/candidate/${candidateId}/`,
    };
  }

  // --- Top Contributors ---

  async getTopContributors(candidateId: string, limit: number = 20): Promise<ContributorRecord[]> {
    // Find committee ID for the candidate
    const cmteData = await this.fetchJSON<any>(
      this.url('/candidate/' + candidateId + '/committees', {
        per_page: '1',
        designation: 'P', // Principal campaign committee
      })
    );

    const committee = cmteData.results?.[0];
    if (!committee) return [];

    const schedAData = await this.fetchJSON<any>(
      this.url('/schedules/schedule_a', {
        committee_id: committee.committee_id,
        sort: '-contribution_receipt_amount',
        per_page: limit.toString(),
        is_individual: 'true',
      })
    );

    return (schedAData.results ?? []).map((c: any) => ({
      name: c.contributor_name ?? '',
      employer: c.contributor_employer ?? undefined,
      amount: c.contribution_receipt_amount ?? 0,
      date: c.contribution_receipt_date ?? '',
    }));
  }
}
