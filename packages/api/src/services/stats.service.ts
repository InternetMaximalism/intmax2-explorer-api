import { FIRESTORE_DOCUMENT_STATS, Stats, type StatsData } from "@intmax2-explorer-api/shared";
import { getTotalBlockBuilders } from "../lib/indexer";
import { getTVL } from "../lib/tvl";

export const getStats = async () => {
  const statsInstance = Stats.getInstance(FIRESTORE_DOCUMENT_STATS.summary);

  const [tvl, totalBlockBuilderCount, latestStatsData] = await Promise.all([
    getTVL(),
    getTotalBlockBuilders(),
    statsInstance.getLatestStats(),
  ]);
  const statsData: StatsData = {
    ...initialStatsData,
    ...((latestStatsData as StatsData) || {}),
  };

  return {
    ...statsData,
    tvl,
    totalBlockBuilderCount,
  };
};

const initialStatsData = {
  latestBlockNumber: 0,
  totalTransactionCount: 0,
  totalL1WalletCount: 0,
  totalL2WalletCount: 0,
};
