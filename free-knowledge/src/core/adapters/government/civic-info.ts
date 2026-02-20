// Google Civic Information API — zip code → representatives
// Docs: https://developers.google.com/civic-information

import { BaseAdapter, AdapterConfig, RepresentativeInfo, ZipLookupResult } from './index';
import { CivicInfoResponseSchema, safeParseWith } from '../schemas';

export class CivicInfoAdapter extends BaseAdapter {
  constructor(config: AdapterConfig) {
    super({ ...config, baseUrl: config.baseUrl ?? 'https://www.googleapis.com/civicinfo/v2' });
  }

  async lookupByZip(zipCode: string): Promise<ZipLookupResult> {
    const url = `${this.baseUrl}/representatives?key=${this.apiKey}&address=${zipCode}&levels=country&roles=legislatorUpperBody&roles=legislatorLowerBody`;

    const raw = await this.fetchJSON<any>(url);
    const data = safeParseWith(CivicInfoResponseSchema, raw, 'civicInfo.representatives');

    const officials: RepresentativeInfo[] = [];
    const offices = data.offices ?? [];
    const rawOfficials = data.officials ?? [];

    for (const office of offices) {
      const indices = office.officialIndices ?? [];
      for (const idx of indices) {
        const official = rawOfficials[idx];
        if (!official) continue;

        // Extract bioguide ID from photo URL if available
        // Congress photos often follow: https://bioguide.congress.gov/bioguide/photo/X/X000123.jpg
        const bioguideId = extractBioguideFromPhoto(official.photoUrl);

        const chamber = office.name?.toLowerCase().includes('senator')
          ? 'senate'
          : office.name?.toLowerCase().includes('representative')
          ? 'house'
          : 'unknown';

        officials.push({
          name: official.name ?? '',
          title: office.name ?? '',
          party: official.party ?? '',
          chamber,
          photoUrl: official.photoUrl,
          bioguideId: bioguideId ?? undefined,
          phones: official.phones ?? [],
          urls: official.urls ?? [],
          channels: (official.channels ?? []).map((ch: any) => ({
            type: ch.type,
            id: ch.id,
          })),
        });
      }
    }

    // Extract state from normalized address
    const normalizedAddress = data.normalizedInput;
    const state = normalizedAddress?.state ?? '';
    const city = normalizedAddress?.city ?? '';

    return {
      zipCode,
      state,
      city,
      officials,
    };
  }
}

function extractBioguideFromPhoto(photoUrl?: string): string | null {
  if (!photoUrl) return null;
  // Pattern: /photo/X/X000123.jpg
  const match = photoUrl.match(/\/([A-Z]\d{6})\./);
  return match ? match[1] : null;
}
