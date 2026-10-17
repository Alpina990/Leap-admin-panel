export function availableBalanceTiyin(revenueTiyin, withdrawnTotalUzs) {
  return (BigInt(revenueTiyin) - BigInt(withdrawnTotalUzs) * 100n).toString();
}
