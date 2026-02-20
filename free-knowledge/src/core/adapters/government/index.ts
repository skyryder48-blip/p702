// Shared types and base class for government data adapters

export interface AdapterConfig {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

// Simple circuit breaker — stops calling an API after consecutive failures
const circuitBreakers = new Map<string, { failures: number; openUntil: number }>();

function getCircuitState(key: string): 'closed' | 'open' {
  const state = circuitBreakers.get(key);
  if (!state) return 'closed';
  if (Date.now() > state.openUntil) {
    circuitBreakers.delete(key);
    return 'closed';
  }
  return state.failures >= 3 ? 'open' : 'closed';
}

function recordFailure(key: string) {
  const state = circuitBreakers.get(key) ?? { failures: 0, openUntil: 0 };
  state.failures++;
  if (state.failures >= 3) {
    state.openUntil = Date.now() + 60_000; // Open for 60 seconds
  }
  circuitBreakers.set(key, state);
}

function recordSuccess(key: string) {
  circuitBreakers.delete(key);
}

export abstract class BaseAdapter {
  protected apiKey: string;
  protected baseUrl: string;
  protected timeout: number;
  protected maxRetries: number;

  constructor(config: AdapterConfig) {
    this.apiKey = config.apiKey ?? '';
    this.baseUrl = config.baseUrl ?? '';
    this.timeout = config.timeout ?? 10000;
    this.maxRetries = config.maxRetries ?? 3;
  }

  protected async fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
    const circuitKey = new URL(url).hostname;

    if (getCircuitState(circuitKey) === 'open') {
      throw new Error(`Circuit breaker open for ${circuitKey} — too many recent failures`);
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
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

        clearTimeout(timer);

        if (res.status === 429) {
          // Rate limited — back off and retry
          const retryAfter = parseInt(res.headers.get('Retry-After') ?? '2', 10);
          await sleep(retryAfter * 1000);
          continue;
        }

        if (res.status >= 500 && attempt < this.maxRetries - 1) {
          // Server error — exponential backoff
          await sleep(Math.pow(2, attempt) * 1000);
          continue;
        }

        if (!res.ok) {
          recordFailure(circuitKey);
          throw new Error(`HTTP ${res.status}: ${res.statusText} — ${url}`);
        }

        recordSuccess(circuitKey);
        return (await res.json()) as T;
      } catch (error: any) {
        clearTimeout(timer);
        lastError = error;

        if (error.name === 'AbortError') {
          // Timeout — retry with backoff
          if (attempt < this.maxRetries - 1) {
            await sleep(Math.pow(2, attempt) * 1000);
            continue;
          }
        }

        if (attempt >= this.maxRetries - 1) {
          recordFailure(circuitKey);
          throw lastError;
        }

        await sleep(Math.pow(2, attempt) * 1000);
      }
    }

    recordFailure(circuitKey);
    throw lastError ?? new Error(`Failed after ${this.maxRetries} attempts`);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
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
