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
      const member = data.member;
      const name = member?.name ?? bioguideId;
      const chamber = member?.chamber === 'senate' ? 'Senator' : 'Representative';
      const title = `${name} — ${chamber} from ${member?.state ?? ''}`;
      const description = `Voting record, legislation, campaign finance, and committee assignments for ${name} (${member?.party ?? ''}, ${member?.state ?? ''}).`;
      return {
        title: `${title} | free-civics`,
        description,
        openGraph: {
          title,
          description,
          type: 'profile',
          ...(member?.depiction ? { images: [{ url: member.depiction }] } : {}),
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
