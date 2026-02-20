// Scorecard Engine — metrics dashboard
// Generates raw numeric scores with contextual benchmarks
// No letter grades — just data and context

export interface MetricDimension {
  id: string;
  label: string;
  description: string;
  value: number;
  benchmark: number;
  unit: string;
  context: string;
}

export interface Scorecard {
  bioguideId: string;
  name: string;
  chamber: 'house' | 'senate';
  dimensions: MetricDimension[];
  generatedAt: string;
}

interface MemberData {
  bioguideId: string;
  name: string;
  chamber: 'house' | 'senate';
  sponsoredCount: number;
  cosponsoredCount: number;
  votesWithParty?: number;
  votesAgainstParty?: number;
  missedVotes?: number;
  totalVotes?: number;
  billsEnacted?: number;
  committeeMemberships?: number;
}

// Chamber averages (approximate, updated periodically)
const CHAMBER_BENCHMARKS = {
  house: {
    sponsored: 12,
    cosponsored: 300,
    participationRate: 95,
    bipartisanRate: 15,
    billsEnacted: 2,
    committees: 2,
  },
  senate: {
    sponsored: 15,
    cosponsored: 200,
    participationRate: 96,
    bipartisanRate: 20,
    billsEnacted: 3,
    committees: 3,
  },
};

export class ScorecardEngine {
  generate(data: MemberData): Scorecard {
    const benchmarks = CHAMBER_BENCHMARKS[data.chamber];
    const totalVotes = data.totalVotes ?? 0;
    const missedVotes = data.missedVotes ?? 0;
    const participationRate = totalVotes > 0 ? ((totalVotes - missedVotes) / totalVotes) * 100 : 0;

    const votesWithParty = data.votesWithParty ?? 0;
    const votesAgainst = data.votesAgainstParty ?? 0;
    const bipartisanRate = (votesWithParty + votesAgainst) > 0
      ? (votesAgainst / (votesWithParty + votesAgainst)) * 100
      : 0;

    const dimensions: MetricDimension[] = [
      {
        id: 'legislative_activity',
        label: 'Legislative Activity',
        description: 'Bills sponsored this Congress',
        value: data.sponsoredCount,
        benchmark: benchmarks.sponsored,
        unit: 'bills',
        context: `The average ${data.chamber} member sponsors ${benchmarks.sponsored} bills per Congress.`,
      },
      {
        id: 'collaboration',
        label: 'Collaboration',
        description: 'Bills cosponsored this Congress',
        value: data.cosponsoredCount,
        benchmark: benchmarks.cosponsored,
        unit: 'bills',
        context: `The average ${data.chamber} member cosponsors ${benchmarks.cosponsored} bills per Congress.`,
      },
      {
        id: 'participation',
        label: 'Vote Participation',
        description: 'Percentage of roll call votes attended',
        value: Math.round(participationRate * 10) / 10,
        benchmark: benchmarks.participationRate,
        unit: '%',
        context: `The average ${data.chamber} member participates in ${benchmarks.participationRate}% of votes.`,
      },
      {
        id: 'bipartisan',
        label: 'Cross-Party Voting',
        description: 'Percentage of votes against party line',
        value: Math.round(bipartisanRate * 10) / 10,
        benchmark: benchmarks.bipartisanRate,
        unit: '%',
        context: `The average ${data.chamber} member votes against their party ${benchmarks.bipartisanRate}% of the time.`,
      },
      {
        id: 'effectiveness',
        label: 'Legislative Effectiveness',
        description: 'Sponsored bills signed into law',
        value: data.billsEnacted ?? 0,
        benchmark: benchmarks.billsEnacted,
        unit: 'laws',
        context: `The average ${data.chamber} member gets ${benchmarks.billsEnacted} bills enacted per Congress.`,
      },
      {
        id: 'committee_engagement',
        label: 'Committee Engagement',
        description: 'Committee and subcommittee memberships',
        value: data.committeeMemberships ?? 0,
        benchmark: benchmarks.committees,
        unit: 'committees',
        context: `The average ${data.chamber} member serves on ${benchmarks.committees} committees.`,
      },
    ];

    return {
      bioguideId: data.bioguideId,
      name: data.name,
      chamber: data.chamber,
      dimensions,
      generatedAt: new Date().toISOString(),
    };
  }
}
