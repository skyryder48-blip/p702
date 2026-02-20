// Compare Engine — side-by-side official comparison

import type { OfficialProfile } from '@/core/orchestrator';
import type { BillSummary } from '@/core/adapters/government/index';

export interface ComparisonResult {
  officials: [ComparedOfficial, ComparedOfficial];
  sharedBills: BillSummary[];
  votingAlignment?: number;
  fundingComparison: FundingComparison;
  legislativeFocusComparison: FocusComparison[];
}

interface ComparedOfficial {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  chamber: string;
  sponsoredCount: number;
  cosponsoredCount: number;
}

interface FundingComparison {
  official1: { totalReceipts: number; individualPct: number; pacPct: number };
  official2: { totalReceipts: number; individualPct: number; pacPct: number };
}

interface FocusComparison {
  issueId: string;
  label: string;
  official1BillCount: number;
  official2BillCount: number;
}

export class CompareEngine {
  compare(profile1: OfficialProfile, profile2: OfficialProfile): ComparisonResult {
    const officials: [ComparedOfficial, ComparedOfficial] = [
      this.extractComparedOfficial(profile1),
      this.extractComparedOfficial(profile2),
    ];

    const sharedBills = this.findSharedBills(profile1.bills, profile2.bills);
    const votingAlignment = this.calculateVotingAlignment(profile1, profile2);
    const fundingComparison = this.compareFunding(profile1, profile2);
    const legislativeFocusComparison = this.compareLegislativeFocus(profile1.bills, profile2.bills);

    return {
      officials,
      sharedBills,
      votingAlignment,
      fundingComparison,
      legislativeFocusComparison,
    };
  }

  private extractComparedOfficial(profile: OfficialProfile): ComparedOfficial {
    return {
      bioguideId: profile.member.bioguideId,
      name: profile.member.name,
      party: profile.member.party,
      state: profile.member.state,
      chamber: profile.member.chamber,
      sponsoredCount: profile.member.sponsoredCount,
      cosponsoredCount: profile.member.cosponsoredCount,
    };
  }

  private findSharedBills(bills1: BillSummary[], bills2: BillSummary[]): BillSummary[] {
    const ids2 = new Set(bills2.map(b => `${b.type}${b.number}`));
    return bills1.filter(b => ids2.has(`${b.type}${b.number}`));
  }

  private calculateVotingAlignment(p1: OfficialProfile, p2: OfficialProfile): number | undefined {
    if (!p1.votes?.length || !p2.votes?.length) return undefined;

    // Find votes both members participated in (by date + question)
    const voteMap1 = new Map(p1.votes.map(v => [`${v.date}:${v.question}`, v.memberPosition]));
    let shared = 0;
    let aligned = 0;

    for (const v2 of p2.votes) {
      const pos1 = voteMap1.get(`${v2.date}:${v2.question}`);
      if (pos1 && pos1 !== 'Not Voting' && v2.memberPosition !== 'Not Voting') {
        shared++;
        if (pos1 === v2.memberPosition) aligned++;
      }
    }

    return shared > 0 ? Math.round((aligned / shared) * 100) : undefined;
  }

  private compareFunding(p1: OfficialProfile, p2: OfficialProfile): FundingComparison {
    const extract = (p: OfficialProfile) => {
      const c = p.finance?.candidate;
      const total = c?.totalReceipts ?? 0;
      return {
        totalReceipts: total,
        individualPct: total > 0 ? Math.round(((c?.individualContributions ?? 0) / total) * 100) : 0,
        pacPct: total > 0 ? Math.round(((c?.pacContributions ?? 0) / total) * 100) : 0,
      };
    };
    return { official1: extract(p1), official2: extract(p2) };
  }

  private compareLegislativeFocus(bills1: BillSummary[], bills2: BillSummary[]): FocusComparison[] {
    const policyAreas = new Set<string>();
    for (const b of [...bills1, ...bills2]) {
      if (b.policyArea) policyAreas.add(b.policyArea);
    }

    return Array.from(policyAreas).map(area => ({
      issueId: area.toLowerCase().replace(/\s+/g, '-'),
      label: area,
      official1BillCount: bills1.filter(b => b.policyArea === area).length,
      official2BillCount: bills2.filter(b => b.policyArea === area).length,
    })).sort((a, b) => (b.official1BillCount + b.official2BillCount) - (a.official1BillCount + a.official2BillCount));
  }
}
