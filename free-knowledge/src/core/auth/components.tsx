'use client';

// Auth UI Components: <FeatureGate>, <TeaserList>, <AuthProvider>, upgrade prompts

import React, { createContext, useContext, type ReactNode } from 'react';
import { SessionProvider } from 'next-auth/react';
import { useCivicsAuth } from './use-civics-auth';

// ===========================
// AuthProvider — wraps NextAuth SessionProvider
// ===========================

export function AuthProvider({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}

// ===========================
// FeatureGate — conditionally renders based on tier access
// ===========================

interface FeatureGateProps {
  feature: string;
  children: ReactNode;
  fallback?: ReactNode;
  showUpgradePrompt?: boolean;
}

export function FeatureGate({ feature, children, fallback, showUpgradePrompt = true }: FeatureGateProps) {
  const { getGate } = useCivicsAuth();
  const gate = getGate(feature);

  if (gate.allowed) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  if (showUpgradePrompt && gate.behavior !== 'hidden') {
    return <UpgradePrompt feature={feature} />;
  }

  return null;
}

// ===========================
// TeaserList — shows limited items with upgrade prompt
// ===========================

interface TeaserListProps<T> {
  feature: string;
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  emptyMessage?: string;
}

export function TeaserList<T>({ feature, items, renderItem, emptyMessage }: TeaserListProps<T>) {
  const { applyLimit } = useCivicsAuth();
  const { items: visibleItems, limited, total } = applyLimit(feature, items);

  if (items.length === 0) {
    return <p className="text-muted">{emptyMessage ?? 'No data available.'}</p>;
  }

  return (
    <div>
      {visibleItems.map((item, i) => (
        <React.Fragment key={i}>{renderItem(item, i)}</React.Fragment>
      ))}
      {limited && (
        <div className="teaser-overlay">
          <p className="teaser-message">
            Showing {visibleItems.length} of {total} items.
          </p>
          <UpgradePrompt feature={feature} compact />
        </div>
      )}
    </div>
  );
}

// ===========================
// UpgradePrompt
// ===========================

interface UpgradePromptProps {
  feature: string;
  compact?: boolean;
}

export function UpgradePrompt({ feature, compact }: UpgradePromptProps) {
  if (compact) {
    return (
      <a href="/upgrade" className="upgrade-link">
        Upgrade to see all &rarr;
      </a>
    );
  }

  return (
    <div className="upgrade-prompt">
      <h3>Premium Feature</h3>
      <p>This content requires a premium subscription.</p>
      <a href="/upgrade" className="btn btn-primary">
        Learn More
      </a>
    </div>
  );
}
