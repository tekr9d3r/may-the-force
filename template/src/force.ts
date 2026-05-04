export function calculateForce(fid: number, followers: number): number {
  const fidPower = Math.max(1, Math.floor(1_000_000 / fid));
  const followerPower = Math.floor(Math.log10(followers + 10) * 200);
  return fidPower + followerPower;
}

export function formatForce(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}
