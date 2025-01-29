import { FIRESTORE_DOCUMENT_STATS, Stats, type StatsData } from "@intmax2-explorer-api/shared";
import { getTotalBlockBuilders } from "../lib/indexer";
import { getTVL } from "../lib/tvl";

export const getStats = async () => {
  const statsInstance = Stats.getInstance(FIRESTORE_DOCUMENT_STATS.summary);

  const [tvl, totalBlockBuilderCount, statsData] = await Promise.all([
    getTVL(),
    getTotalBlockBuilders(),
    statsInstance.getLatestStats(),
  ]);

  return {
    ...((statsData as StatsData) ?? initialStatsData),
    tvl,
    totalBlockBuilderCount,
  };
};

const initialStatsData = {
  latestBlockNumber: 0,
  totalTransactionCount: 0,
  totalWalletCount: 0,
};
