import {
  Block,
  type BlockPaginationValidationType,
  type HashValidationType,
  NotFoundError,
} from "@intmax2-explorer-api/shared";
import { getBlockValidityProof } from "../lib/validityProver";

export const listBlocks = async (blockPaginationOptions: BlockPaginationValidationType) => {
  const block = Block.getInstance();
  return block.listBlocks(blockPaginationOptions);
};

export const getBlock = async ({ hash }: HashValidationType) => {
  const blockInstance = Block.getInstance();
  const block = await blockInstance.getBlockByBlockHash(hash);
  if (!block) {
    throw new NotFoundError(`Block with hash ${hash} not found`);
  }
  const blockValidityProof = await getBlockValidityProof(block?.blockNumber);
  return {
    ...block,
    blockValidityProof,
  };
};

export const getBlockByBlockNumber = async (blockNumber: number) => {
  const block = Block.getInstance();
  return block.getBlockByBlockNumber(blockNumber);
};
