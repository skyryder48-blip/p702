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
    const data = await this.fetchJSON<any>(this.url(`/member/${bioguideId}`));
    const m = data.member;

    const terms = (m.terms ?? []).map((t: any) => ({
      chamber: t.chamber,
      congress: t.congress,
      startYear: t.startYear,
    }));

    const currentTerm = terms[terms.length - 1];

    return {
      bioguideId: m.bioguideId,
      name: m.directOrderName ?? `${m.firstName} ${m.lastName}`,
      firstName: m.firstName,
      lastName: m.lastName,
      party: m.partyName ?? m.party,
      state: m.state,
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

  // --- Sponsored Bills ---

  async getSponsoredBills(bioguideId: string, limit: number = 20): Promise<BillSummary[]> {
    const data = await this.fetchJSON<any>(
      this.url(`/member/${bioguideId}/sponsored-legislation`, {
        limit: limit.toString(),
        sort: 'updateDate+desc',
      })
    );

    return (data.sponsoredLegislation ?? []).map((b: any) => ({
      congress: b.congress,
      type: b.type,
      number: b.number,
      title: b.title,
      introducedDate: b.introducedDate,
      latestAction: b.latestAction?.text ?? '',
      policyArea: b.policyArea?.name,
      url: b.url ?? `https://congress.gov/bill/${b.congress}th-congress/${b.type.toLowerCase()}-bill/${b.number}`,
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
  // We fetch recent chamber votes, then check each vote detail for the member's position.

  async getMemberVotes(
    bioguideId: string,
    chamber: 'house' | 'senate',
    limit: number = 20
  ): Promise<VoteRecord[]> {
    const recentVotes = await this.getRecentVotes(chamber, limit * 2);
    const results: VoteRecord[] = [];

    for (const vote of recentVotes.slice(0, limit * 2)) {
      if (results.length >= limit) break;

      try {
        const voteUrl = vote.url ?? `${this.baseUrl}/${chamber === 'house' ? 'house' : 'senate'}-vote/${this.congress}/${vote.rollNumber}`;
        const detail = await this.fetchJSON<any>(
          `${voteUrl}?api_key=${this.apiKey}&format=json`
        );

        const voteData = detail.vote ?? detail;
        const positions = voteData.positions ?? [];
        const memberPos = positions.find(
          (p: any) => p.member?.bioguideId === bioguideId
        );

        if (memberPos) {
          results.push({
            date: voteData.date ?? vote.date,
            question: voteData.question ?? vote.question ?? '',
            result: voteData.result ?? vote.result ?? '',
            memberPosition: memberPos.votePosition ?? 'Not Voting',
            partyBreakdown: extractPartyBreakdown(positions),
            billNumber: voteData.bill?.number ? `${voteData.bill.type}${voteData.bill.number}` : undefined,
            url: vote.url,
          });
        }
      } catch {
        // Skip votes that fail to fetch detail
        continue;
      }
    }

    return results;
  }

  // --- Committees ---

  async getMemberCommittees(bioguideId: string): Promise<CommitteeAssignment[]> {
    // Try fetching from member detail first
    try {
      const data = await this.fetchJSON<any>(this.url(`/member/${bioguideId}`));
      const member = data.member;

      if (member.committees && Array.isArray(member.committees)) {
        return member.committees.map((c: any) => ({
          name: c.name,
          code: c.systemCode ?? c.code ?? '',
          role: c.role ?? 'Member',
          chamber: c.chamber ?? '',
          url: `https://congress.gov/committee/${c.systemCode ?? ''}`,
          subcommittees: c.subcommittees?.map((sc: any) => ({
            name: sc.name,
            role: sc.role ?? 'Member',
          })),
        }));
      }
    } catch {
      // Fall through to committee listing approach
    }

    // Fallback: Fetch all committees and filter for this member
    try {
      const data = await this.fetchJSON<any>(
        this.url('/committee', {
          congress: this.congress.toString(),
          limit: '250',
        })
      );

      const committees: CommitteeAssignment[] = [];
      for (const c of data.committees ?? []) {
        // Check if member is listed in committee membership
        try {
          const detailData = await this.fetchJSON<any>(
            this.url(`/committee/${c.systemCode}`, { congress: this.congress.toString() })
          );
          const members = detailData.committee?.members ?? [];
          const membership = members.find((m: any) => m.bioguideId === bioguideId);
          if (membership) {
            committees.push({
              name: c.name,
              code: c.systemCode,
              role: membership.role ?? 'Member',
              chamber: c.chamber ?? '',
              url: `https://congress.gov/committee/${c.systemCode}`,
            });
          }
        } catch {
          continue;
        }
      }
      return committees;
    } catch {
      return [];
    }
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
