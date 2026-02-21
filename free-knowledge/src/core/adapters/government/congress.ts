// Congress.gov API adapter
// Docs: https://api.congress.gov/
// Endpoints: members, bills, votes, committees

import {
  BaseAdapter,
  AdapterConfig,
  MemberSummary,
  BillSummary,
  VoteRecord,
  CommitteeAssignment,
} from './index';
import {
  CongressMemberResponseSchema,
  CongressBillListSchema,
  CongressMemberListSchema,
  safeParseWith,
} from '../schemas';

interface CongressConfig extends AdapterConfig {
  congress?: number;
}

export class CongressAdapter extends BaseAdapter {
  private congress: number;

  constructor(config: CongressConfig) {
    super({ ...config, baseUrl: config.baseUrl ?? 'https://api.congress.gov/v3' });
    this.congress = config.congress ?? 119;
  }

  private url(path: string, params: Record<string, string> = {}): string {
    if (!this.apiKey) {
      throw new Error('CONGRESS_API_KEY is not set. Register at https://api.congress.gov/sign-up/');
    }
    const searchParams = new URLSearchParams({
      api_key: this.apiKey,
      format: 'json',
      ...params,
    });
    return `${this.baseUrl}${path}?${searchParams}`;
  }

  // --- Member Detail ---

  async getMember(bioguideId: string): Promise<MemberSummary & {
    birthYear?: string;
    terms: { chamber: string; congress: number; startYear: number }[];
    sponsoredCount: number;
    cosponsoredCount: number;
  }> {
    const raw = await this.fetchJSON<any>(this.url(`/member/${bioguideId}`));
    const data = safeParseWith(CongressMemberResponseSchema, raw, 'congress.member');
    const m = data.member;

    const terms = (m.terms ?? []).map((t: any) => ({
      chamber: t.chamber ?? '',
      congress: t.congress ?? 0,
      startYear: t.startYear ?? 0,
    }));

    const currentTerm = terms[terms.length - 1];

    return {
      bioguideId: m.bioguideId,
      name: m.directOrderName ?? `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim(),
      firstName: m.firstName ?? '',
      lastName: m.lastName ?? '',
      party: m.partyName ?? m.party ?? '',
      state: m.state ?? '',
      district: m.district?.toString(),
      chamber: currentTerm?.chamber?.toLowerCase() === 'senate' ? 'senate' : 'house',
      depiction: m.depiction?.imageUrl,
      officialUrl: m.officialWebsiteUrl,
      currentMember: m.currentMember ?? true,
      birthYear: m.birthYear,
      terms,
      sponsoredCount: m.sponsoredLegislation?.count ?? 0,
      cosponsoredCount: m.cosponsoredLegislation?.count ?? 0,
    };
  }

  // --- Members by State ---

  async getMembersByState(stateCode: string): Promise<MemberSummary[]> {
    const raw = await this.fetchJSON<any>(
      this.url('/member', {
        stateCode,
        currentMember: 'true',
        limit: '50',
      })
    );

    // Guard against schema being undefined (stale webpack cache)
    const data = CongressMemberListSchema
      ? safeParseWith(CongressMemberListSchema, raw, 'congress.memberList')
      : raw;

    return (data.members ?? []).map((m: any) => {
      const terms = m.terms ?? [];
      const currentTerm = terms[terms.length - 1];

      return {
        bioguideId: m.bioguideId,
        name: m.directOrderName ?? `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim(),
        firstName: m.firstName ?? '',
        lastName: m.lastName ?? '',
        party: m.partyName ?? m.party ?? '',
        state: m.state ?? stateCode,
        district: m.district?.toString(),
        chamber: currentTerm?.chamber?.toLowerCase() === 'senate' ? 'senate' : 'house',
        depiction: m.depiction?.imageUrl,
        officialUrl: m.officialWebsiteUrl,
        currentMember: m.currentMember ?? true,
      };
    });
  }

  // --- Sponsored Bills ---

  async getSponsoredBills(bioguideId: string, limit: number = 20): Promise<BillSummary[]> {
    const raw = await this.fetchJSON<any>(
      this.url(`/member/${bioguideId}/sponsored-legislation`, {
        limit: limit.toString(),
        sort: 'updateDate+desc',
      })
    );

    const data = safeParseWith(CongressBillListSchema, raw, 'congress.bills');

    return (data.sponsoredLegislation ?? []).map((b: any) => ({
      congress: b.congress ?? 0,
      type: b.type ?? '',
      number: b.number ?? 0,
      title: b.title ?? 'Untitled',
      introducedDate: b.introducedDate ?? '',
      latestAction: b.latestAction?.text ?? '',
      policyArea: b.policyArea?.name,
      url: b.url ?? `https://congress.gov/bill/${b.congress}th-congress/${(b.type ?? '').toLowerCase()}-bill/${b.number}`,
    }));
  }

  // --- Recent Chamber Votes ---

  async getRecentVotes(chamber: 'house' | 'senate', limit: number = 20): Promise<any[]> {
    const data = await this.fetchJSON<any>(
      this.url(`/${chamber === 'house' ? 'house' : 'senate'}-vote`, {
        congress: this.congress.toString(),
        limit: limit.toString(),
        sort: 'date+desc',
      })
    );
    return data.votes ?? [];
  }

  // --- Member Vote Positions ---
  // Congress.gov doesn't have a direct "votes by member" endpoint.
  // Fetch recent chamber votes, then check each vote detail in parallel batches.

  async getMemberVotes(
    bioguideId: string,
    chamber: 'house' | 'senate',
    limit: number = 20
  ): Promise<VoteRecord[]> {
    const recentVotes = await this.getRecentVotes(chamber, limit * 2);
    const results: VoteRecord[] = [];
    const BATCH_SIZE = 5;

    // Process votes in parallel batches of 5 instead of sequentially
    for (let i = 0; i < recentVotes.length && results.length < limit; i += BATCH_SIZE) {
      const batch = recentVotes.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.allSettled(
        batch.map(vote => this.fetchVoteDetail(vote, bioguideId, chamber))
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled' && result.value) {
          results.push(result.value);
          if (results.length >= limit) break;
        }
      }
    }

    return results;
  }

  private async fetchVoteDetail(
    vote: any,
    bioguideId: string,
    chamber: 'house' | 'senate'
  ): Promise<VoteRecord | null> {
    try {
      const voteUrl = vote.url ?? `${this.baseUrl}/${chamber}-vote/${this.congress}/${vote.rollNumber}`;
      const detail = await this.fetchJSON<any>(
        `${voteUrl}?api_key=${this.apiKey}&format=json`
      );

      const voteData = detail.vote ?? detail;
      const positions = voteData.positions ?? [];
      const memberPos = positions.find(
        (p: any) => p.member?.bioguideId === bioguideId
      );

      if (!memberPos) return null;

      return {
        date: voteData.date ?? vote.date,
        question: voteData.question ?? vote.question ?? '',
        result: voteData.result ?? vote.result ?? '',
        memberPosition: memberPos.votePosition ?? 'Not Voting',
        partyBreakdown: extractPartyBreakdown(positions),
        billNumber: voteData.bill?.number ? `${voteData.bill.type}${voteData.bill.number}` : undefined,
        url: vote.url,
      };
    } catch (error) {
      console.warn(`[Congress] Failed to fetch vote detail:`, error instanceof Error ? error.message : error);
      return null;
    }
  }

  // --- Committees ---
  // Try member detail first. If that lacks committee data, return empty
  // rather than making 250+ API calls to check every committee.

  async getMemberCommittees(bioguideId: string): Promise<CommitteeAssignment[]> {
    try {
      const data = await this.fetchJSON<any>(this.url(`/member/${bioguideId}`));
      const member = data.member;

      if (member.committees && Array.isArray(member.committees) && member.committees.length > 0) {
        return member.committees.map((c: any) => ({
          name: c.name ?? '',
          code: c.systemCode ?? c.code ?? '',
          role: c.role ?? 'Member',
          chamber: c.chamber ?? '',
          url: `https://congress.gov/committee/${c.systemCode ?? ''}`,
          subcommittees: c.subcommittees?.map((sc: any) => ({
            name: sc.name ?? '',
            role: sc.role ?? 'Member',
          })),
        }));
      }
    } catch (error) {
      console.warn(`[Congress] Failed to fetch committees for ${bioguideId}:`, error instanceof Error ? error.message : error);
    }

    // Return empty rather than making 250+ fallback API calls.
    // Committee data will be more reliably available via Phase 2 dedicated endpoint.
    return [];
  }
}

function extractPartyBreakdown(positions: any[]) {
  const breakdown = {
    democratic: { yea: 0, nay: 0, notVoting: 0 },
    republican: { yea: 0, nay: 0, notVoting: 0 },
  };

  for (const p of positions) {
    const party = (p.member?.partyName ?? '').toLowerCase();
    const vote = (p.votePosition ?? '').toLowerCase();
    const bucket = party.includes('democrat') ? 'democratic' : party.includes('republican') ? 'republican' : null;
    if (!bucket) continue;

    if (vote === 'yea' || vote === 'aye') breakdown[bucket].yea++;
    else if (vote === 'nay' || vote === 'no') breakdown[bucket].nay++;
    else breakdown[bucket].notVoting++;
  }

  return breakdown;
}
