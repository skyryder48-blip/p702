// Legislation Engine — bill summarization and vote categorization

import type { BillSummary } from '@/core/adapters/government/index';
import { ISSUE_CATEGORIES, type IssueCategoryId } from '@/config/profiles';

export interface CategorizedBill extends BillSummary {
  categories: IssueCategoryId[];
  summary?: string;
}

// Policy area to issue category mapping
const POLICY_AREA_MAP: Record<string, IssueCategoryId[]> = {
  'Health': ['healthcare'],
  'Economics and Public Finance': ['economy', 'taxation'],
  'Education': ['education'],
  'Environmental Protection': ['environment'],
  'Energy': ['environment', 'infrastructure'],
  'Armed Forces and National Security': ['defense'],
  'Immigration': ['immigration'],
  'Civil Rights and Liberties, Minority Issues': ['civil-rights'],
  'Taxation': ['taxation'],
  'Transportation and Public Works': ['infrastructure'],
  'Science, Technology, Communications': ['technology'],
  'Agriculture and Food': ['agriculture'],
  'International Affairs': ['foreign-policy'],
  'Crime and Law Enforcement': ['civil-rights'],
  'Labor and Employment': ['economy'],
  'Housing and Community Development': ['economy', 'infrastructure'],
  'Social Welfare': ['healthcare', 'economy'],
  'Finance and Financial Sector': ['economy'],
  'Commerce': ['economy', 'technology'],
  'Government Operations and Politics': ['civil-rights'],
  'Native Americans': ['civil-rights'],
  'Public Lands and Natural Resources': ['environment'],
  'Water Resources Development': ['environment', 'infrastructure'],
  'Emergency Management': ['defense'],
};

export class LegislationEngine {
  categorizeBill(bill: BillSummary): CategorizedBill {
    const categories = this.inferCategories(bill);
    return { ...bill, categories };
  }

  categorizeBills(bills: BillSummary[]): CategorizedBill[] {
    return bills.map(b => this.categorizeBill(b));
  }

  filterByIssue(bills: CategorizedBill[], issueId: IssueCategoryId): CategorizedBill[] {
    return bills.filter(b => b.categories.includes(issueId));
  }

  getIssueSummary(bills: CategorizedBill[]): Record<IssueCategoryId, number> {
    const counts = {} as Record<IssueCategoryId, number>;
    for (const cat of ISSUE_CATEGORIES) {
      counts[cat.id] = bills.filter(b => b.categories.includes(cat.id)).length;
    }
    return counts;
  }

  private inferCategories(bill: BillSummary): IssueCategoryId[] {
    const categories = new Set<IssueCategoryId>();

    // From policy area
    if (bill.policyArea && POLICY_AREA_MAP[bill.policyArea]) {
      for (const cat of POLICY_AREA_MAP[bill.policyArea]) {
        categories.add(cat);
      }
    }

    // From title keywords
    const titleLower = bill.title.toLowerCase();
    const keywordMap: Record<string, IssueCategoryId> = {
      'health': 'healthcare', 'medicare': 'healthcare', 'medicaid': 'healthcare',
      'tax': 'taxation', 'revenue': 'taxation',
      'education': 'education', 'school': 'education', 'student': 'education',
      'climate': 'environment', 'energy': 'environment', 'emissions': 'environment',
      'defense': 'defense', 'military': 'defense', 'veterans': 'defense',
      'immigra': 'immigration', 'border': 'immigration', 'visa': 'immigration',
      'civil rights': 'civil-rights', 'voting rights': 'civil-rights',
      'infrastructure': 'infrastructure', 'highway': 'infrastructure', 'broadband': 'infrastructure',
      'technology': 'technology', 'privacy': 'technology', 'cyber': 'technology',
      'farm': 'agriculture', 'agriculture': 'agriculture',
      'foreign': 'foreign-policy', 'international': 'foreign-policy', 'treaty': 'foreign-policy',
    };

    for (const [keyword, category] of Object.entries(keywordMap)) {
      if (titleLower.includes(keyword)) {
        categories.add(category);
      }
    }

    return Array.from(categories);
  }
}
