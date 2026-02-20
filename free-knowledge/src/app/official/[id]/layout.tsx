import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const bioguideId = params.id;

  // Fetch member name for the title (lightweight call)
  try {
    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/civics/member/${bioguideId}`, {
      next: { revalidate: 1800 }, // 30 min
    });
    if (res.ok) {
      const data = await res.json();
      const name = data.member?.name ?? bioguideId;
      const title = data.member?.chamber === 'senate'
        ? `Sen. ${name}`
        : `Rep. ${name}`;
      return {
        title: `${title} — free-civics`,
        description: `Voting record, campaign finance, and legislative history for ${name}`,
        openGraph: {
          title: `${title} — free-civics`,
          description: `Voting record, campaign finance, and legislative history for ${name}`,
        },
      };
    }
  } catch {
    // Fallback to generic
  }

  return {
    title: `Official Profile — free-civics`,
    description: 'Voting record, campaign finance, and legislative history',
  };
}

export default function OfficialLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
