// Shared types and base class for government data adapters

export interface AdapterConfig {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
}

export abstract class BaseAdapter {
  protected apiKey: string;
  protected baseUrl: string;
  protected timeout: number;

  constructor(config: AdapterConfig) {
    this.apiKey = config.apiKey ?? '';
    this.baseUrl = config.baseUrl ?? '';
    this.timeout = config.timeout ?? 10000;
  }

  protected async fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(url, {
        ...init,
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          ...init?.headers,
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText} — ${url}`);
      }

      return (await res.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  }
}

// Shared types across adapters

export interface MemberSummary {
  bioguideId: string;
  name: string;
  firstName: string;
  lastName: string;
  party: string;
  state: string;
  district?: string;
  chamber: 'house' | 'senate';
  depiction?: string;
  officialUrl?: string;
  currentMember: boolean;
}

export interface BillSummary {
  congress: number;
  type: string;
  number: number;
  title: string;
  introducedDate: string;
  latestAction: string;
  policyArea?: string;
  url: string;
}

export interface VoteRecord {
  date: string;
  question: string;
  result: string;
  memberPosition: 'Yea' | 'Nay' | 'Not Voting' | 'Present';
  partyBreakdown: {
    democratic: { yea: number; nay: number; notVoting: number };
    republican: { yea: number; nay: number; notVoting: number };
  };
  billNumber?: string;
  url?: string;
}

export interface CommitteeAssignment {
  name: string;
  code: string;
  role: 'Chair' | 'Ranking Member' | 'Member';
  chamber: string;
  url: string;
  subcommittees?: { name: string; role: string }[];
}

export interface FinanceSummary {
  candidateId: string;
  name: string;
  party: string;
  office: string;
  cycle: number;
  totalReceipts: number;
  totalDisbursements: number;
  cashOnHand: number;
  individualContributions: number;
  pacContributions: number;
  lastReportDate?: string;
  fecUrl: string;
}

export interface ContributorRecord {
  name: string;
  employer?: string;
  amount: number;
  date: string;
}

export interface RepresentativeInfo {
  name: string;
  title: string;
  party: string;
  chamber: string;
  photoUrl?: string;
  bioguideId?: string;
  phones: string[];
  urls: string[];
  channels: { type: string; id: string }[];
}

export interface ZipLookupResult {
  zipCode: string;
  state: string;
  city?: string;
  officials: RepresentativeInfo[];
}
