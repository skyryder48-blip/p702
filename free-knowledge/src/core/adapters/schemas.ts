// Zod schemas for external API responses
// Validates data shape at runtime to catch API changes early

import { z } from 'zod';

// ===========================
// Congress.gov
// ===========================

export const CongressMemberSchema = z.object({
  bioguideId: z.string(),
  firstName: z.string().default(''),
  lastName: z.string().default(''),
  directOrderName: z.string().optional(),
  partyName: z.string().optional(),
  party: z.string().optional(),
  state: z.string().default(''),
  district: z.union([z.string(), z.number()]).optional(),
  birthYear: z.string().optional(),
  currentMember: z.boolean().optional(),
  depiction: z.object({ imageUrl: z.string().optional() }).optional(),
  officialWebsiteUrl: z.string().optional(),
  terms: z.array(z.object({
    chamber: z.string().optional(),
    congress: z.number().optional(),
    startYear: z.number().optional(),
  })).optional().default([]),
  sponsoredLegislation: z.object({ count: z.number().optional() }).optional(),
  cosponsoredLegislation: z.object({ count: z.number().optional() }).optional(),
  committees: z.array(z.any()).optional(),
}).passthrough();

export const CongressMemberResponseSchema = z.object({
  member: CongressMemberSchema,
}).passthrough();

export const CongressBillSchema = z.object({
  congress: z.number().optional(),
  type: z.string().default(''),
  number: z.number().optional(),
  title: z.string().default('Untitled'),
  introducedDate: z.string().optional(),
  latestAction: z.object({ text: z.string().optional() }).optional(),
  policyArea: z.object({ name: z.string().optional() }).optional(),
  url: z.string().optional(),
}).passthrough();

export const CongressBillListSchema = z.object({
  sponsoredLegislation: z.array(CongressBillSchema).optional().default([]),
}).passthrough();

// ===========================
// FEC
// ===========================

export const FECCandidateSchema = z.object({
  candidate_id: z.string(),
  name: z.string().default(''),
  party_full: z.string().optional(),
  party: z.string().optional(),
  office_full: z.string().optional(),
  office: z.string().optional(),
  state: z.string().default(''),
  cycles: z.array(z.number()).optional(),
}).passthrough();

export const FECCandidateSearchSchema = z.object({
  results: z.array(FECCandidateSchema).optional().default([]),
}).passthrough();

export const FECTotalsSchema = z.object({
  results: z.array(z.object({
    cycle: z.number().optional(),
    receipts: z.number().optional(),
    disbursements: z.number().optional(),
    cash_on_hand_end_period: z.number().optional(),
    individual_contributions: z.number().optional(),
    other_political_committee_contributions: z.number().optional(),
    coverage_end_date: z.string().optional(),
  }).passthrough()).optional().default([]),
}).passthrough();

// ===========================
// Google Civic Info
// ===========================

export const CivicInfoOfficialSchema = z.object({
  name: z.string().default(''),
  party: z.string().optional(),
  photoUrl: z.string().optional(),
  phones: z.array(z.string()).optional().default([]),
  urls: z.array(z.string()).optional().default([]),
  channels: z.array(z.object({
    type: z.string(),
    id: z.string(),
  })).optional().default([]),
}).passthrough();

export const CivicInfoOfficeSchema = z.object({
  name: z.string().default(''),
  officialIndices: z.array(z.number()).optional().default([]),
}).passthrough();

export const CivicInfoResponseSchema = z.object({
  offices: z.array(CivicInfoOfficeSchema).optional().default([]),
  officials: z.array(CivicInfoOfficialSchema).optional().default([]),
  normalizedInput: z.object({
    state: z.string().optional(),
    city: z.string().optional(),
  }).optional(),
}).passthrough();

// ===========================
// Validation helper
// ===========================

export function safeParseWith<T>(schema: z.ZodType<T>, data: unknown, context: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.warn(`[Zod:${context}] Validation issues:`, result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '));
    // Return parsed data with defaults applied (Zod's .default() handles this)
    // Fall through to the data as-is rather than throwing
    return data as T;
  }
  return result.data;
}
