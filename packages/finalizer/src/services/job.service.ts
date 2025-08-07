import { finalizePendingBlocks } from "./block.service";
import { finalizeRelayedWithdrawals } from "./withdrawal.service";

export const performJob = async (): Promise<void> => {
  await Promise.all([finalizePendingBlocks(), finalizeRelayedWithdrawals()]);
};
