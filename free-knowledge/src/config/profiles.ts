// Vertical configuration definitions
// Defines which data sources and display sections are active per profile type

export interface ProfileConfig {
  id: string;
  label: string;
  description: string;
  dataSources: string[];
  sections: string[];
  features: string[];
}

export const PROFILE_CONFIGS: Record<string, ProfileConfig> = {
  federal: {
    id: 'federal',
    label: 'Federal Official',
    description: 'U.S. Congress members — Representatives and Senators',
    dataSources: ['congress', 'fec', 'wikipedia', 'wikidata', 'news'],
    sections: ['overview', 'legislation', 'finance', 'votes', 'committees', 'metrics'],
    features: [
      'profile.overview',
      'profile.legislation',
      'profile.finance',
      'profile.votes',
      'profile.committees',
      'profile.metrics',
      'profile.news',
      'profile.biography',
    ],
  },
  general: {
    id: 'general',
    label: 'General Profile',
    description: 'General biographical and contextual profile',
    dataSources: ['wikipedia', 'wikidata', 'news'],
    sections: ['overview', 'biography'],
    features: ['profile.overview', 'profile.biography'],
  },
};

export const ISSUE_CATEGORIES = [
  { id: 'healthcare', label: 'Healthcare', icon: '🏥' },
  { id: 'economy', label: 'Economy & Jobs', icon: '💼' },
  { id: 'education', label: 'Education', icon: '📚' },
  { id: 'environment', label: 'Environment & Climate', icon: '🌍' },
  { id: 'defense', label: 'Defense & Security', icon: '🛡️' },
  { id: 'immigration', label: 'Immigration', icon: '🗽' },
  { id: 'civil-rights', label: 'Civil Rights', icon: '⚖️' },
  { id: 'taxation', label: 'Taxation', icon: '📊' },
  { id: 'infrastructure', label: 'Infrastructure', icon: '🏗️' },
  { id: 'technology', label: 'Technology & Privacy', icon: '💻' },
  { id: 'agriculture', label: 'Agriculture', icon: '🌾' },
  { id: 'foreign-policy', label: 'Foreign Policy', icon: '🌐' },
] as const;

export type IssueCategoryId = (typeof ISSUE_CATEGORIES)[number]['id'];
