// Issues Engine — issue-specific reports across 12 categories

import type { BillSummary, VoteRecord } from '@/core/adapters/government/index';
import type { ContributorRecord } from '@/core/adapters/government/index';
import { ISSUE_CATEGORIES, type IssueCategoryId } from '@/config/profiles';
import { LegislationEngine, type CategorizedBill } from '@/engines/legislation/index';

export interface IssueReport {
  issueId: IssueCategoryId;
  label: string;
  officialName: string;
  relatedBills: CategorizedBill[];
  relatedVotes: VoteRecord[];
  summary: {
    totalBills: number;
    totalVotes: number;
    yeaVotes: number;
    nayVotes: number;
  };
}

export class IssuesEngine {
  private legislation = new LegislationEngine();

  generateReport(
    officialName: string,
    issueId: IssueCategoryId,
    bills: BillSummary[],
    votes: VoteRecord[],
  ): IssueReport {
    const category = ISSUE_CATEGORIES.find(c => c.id === issueId);
    const categorizedBills = this.legislation.categorizeBills(bills);
    const relatedBills = this.legislation.filterByIssue(categorizedBills, issueId);

    // Filter votes by keyword matching (votes don't have policy areas)
    const relatedVotes = this.filterVotesByIssue(votes, issueId);

    return {
      issueId,
      label: category?.label ?? issueId,
      officialName,
      relatedBills,
      relatedVotes,
      summary: {
        totalBills: relatedBills.length,
        totalVotes: relatedVotes.length,
        yeaVotes: relatedVotes.filter(v => v.memberPosition === 'Yea').length,
        nayVotes: relatedVotes.filter(v => v.memberPosition === 'Nay').length,
      },
    };
  }

  generateAllReports(
    officialName: string,
    bills: BillSummary[],
    votes: VoteRecord[],
  ): IssueReport[] {
    return ISSUE_CATEGORIES.map(cat =>
      this.generateReport(officialName, cat.id, bills, votes)
    ).filter(r => r.summary.totalBills > 0 || r.summary.totalVotes > 0);
  }

  private filterVotesByIssue(votes: VoteRecord[], issueId: IssueCategoryId): VoteRecord[] {
    const keywords = ISSUE_KEYWORDS[issueId] ?? [];
    if (keywords.length === 0) return [];

    return votes.filter(v => {
      const text = `${v.question} ${v.billNumber ?? ''}`.toLowerCase();
      return keywords.some(kw => text.includes(kw));
    });
  }
}

const ISSUE_KEYWORDS: Record<IssueCategoryId, string[]> = {
  'healthcare': ['health', 'medicare', 'medicaid', 'hospital', 'drug', 'pharmaceutical'],
  'economy': ['economy', 'jobs', 'employment', 'labor', 'wage', 'business', 'commerce', 'trade'],
  'education': ['education', 'school', 'student', 'university', 'college', 'teacher'],
  'environment': ['climate', 'environment', 'energy', 'emission', 'pollution', 'conservation'],
  'defense': ['defense', 'military', 'armed forces', 'veteran', 'national security'],
  'immigration': ['immigration', 'border', 'visa', 'asylum', 'refugee', 'citizenship'],
  'civil-rights': ['civil rights', 'voting rights', 'discrimination', 'equality', 'justice'],
  'taxation': ['tax', 'revenue', 'irs', 'fiscal', 'budget', 'deficit'],
  'infrastructure': ['infrastructure', 'highway', 'bridge', 'broadband', 'transportation', 'water'],
  'technology': ['technology', 'privacy', 'cyber', 'data', 'artificial intelligence', 'internet'],
  'agriculture': ['farm', 'agriculture', 'food', 'crop', 'rural'],
  'foreign-policy': ['foreign', 'international', 'treaty', 'diplomatic', 'sanction', 'nato'],
};
