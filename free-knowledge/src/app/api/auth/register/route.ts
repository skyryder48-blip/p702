// ============================================================
// free-civics — User Registration Endpoint
// POST /api/auth/register
// Creates a new user with email/password credentials
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/core/auth/rate-limit';

// Per-IP registration rate limit (stricter than general API limits)
const registrationLimits = new Map<string, { count: number; windowStart: number }>();

function checkRegistrationLimit(ip: string): boolean {
  const now = Date.now();
  const entry = registrationLimits.get(ip);
  if (!entry || now - entry.windowStart > 3_600_000) {
    registrationLimits.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= 5) return false; // 5 registrations per IP per hour
  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit registration attempts
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded?.split(',')[0]?.trim() ?? 'unknown';
    if (!checkRegistrationLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many registration attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': '3600' } }
      );
    }

    const body = await request.json();
    const { email, password, name } = body;

    // --- Validation ---

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Password strength — minimum 12 characters
    if (password.length < 12) {
      return NextResponse.json(
        { error: 'Password must be at least 12 characters' },
        { status: 400 }
      );
    }

    // Name length check
    if (name && name.length > 100) {
      return NextResponse.json(
        { error: 'Name must be 100 characters or less' },
        { status: 400 }
      );
    }

    // --- Check for existing user ---

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // --- Create user ---

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        name: name?.trim() || null,
        hashedPassword,
        tier: 'free',
      },
      select: {
        id: true,
        email: true,
        name: true,
        tier: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          tier: user.tier,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[Register] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create account. Please try again.' },
      { status: 500 }
    );
  }
}
