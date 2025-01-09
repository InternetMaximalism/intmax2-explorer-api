import { FIRESTORE_DOCUMENT_STATS, Stats, type StatsData } from "@intmax2-explorer-api/shared";
import { getTotalBlockBuilders } from "../lib/indexer";
import { getMarketCap } from "../lib/marketCap";

export const getStats = async () => {
  const statsInstance = Stats.getInstance(FIRESTORE_DOCUMENT_STATS.summary);

  const [marketCap, totalBlockBuilderCount, statsData] = await Promise.all([
    getMarketCap(),
    getTotalBlockBuilders(),
    statsInstance.getLatestStats(),
  ]);

  return {
    ...(statsData as StatsData),
    marketCap,
    totalBlockBuilderCount,
  };
};
