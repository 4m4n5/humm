import { useNominationsStore } from '@/lib/stores/nominationsStore';

/**
 * Returns the partner's first name from their profile, falling back to a
 * lowercase default when unavailable (pre-link, loading, etc.).
 */
export function usePartnerName(fallback = 'partner'): string {
  return useNominationsStore((s) => {
    const raw = s.partnerProfile?.displayName;
    if (!raw) return fallback;
    const first = raw.split(' ')[0];
    return first || fallback;
  });
}
