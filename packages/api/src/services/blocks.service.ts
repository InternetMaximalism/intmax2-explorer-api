import {
  Block,
  BlockData,
  BlockDisplayType,
  type BlockPaginationValidationType,
  type HashValidationType,
  INTERNAL_TO_DISPLAY_TYPE_MAP,
  NotFoundError,
} from "@intmax2-explorer-api/shared";
import { fetchBlockValidityProof, formatValidityProof } from "../lib/validityProver";

export const listBlocks = async (blockPaginationOptions: BlockPaginationValidationType) => {
  const block = Block.getInstance();
  const blocks = await block.listBlocks(blockPaginationOptions);
  return {
    ...blocks,
    items: formatBlockBulk(blocks.items),
  };
};

export const getBlock = async ({ hash }: HashValidationType) => {
  const blockInstance = Block.getInstance();
  const block = await blockInstance.getBlockByBlockHash(hash);
  if (!block) {
    throw new NotFoundError(`Block with hash ${hash} not found`);
  }
  return formatBlock(block);
};

export const getBlockValidityProof = async ({ hash }: HashValidationType) => {
  const block = await getBlock({ hash });
  const blockValidityProof = await fetchBlockValidityProof(block.blockNumber);
  return formatValidityProof(blockValidityProof);
};

export const getBlockByBlockNumber = async (blockNumber: number) => {
  const block = Block.getInstance();
  return block.getBlockByBlockNumber(blockNumber);
};

const determineBlockType = ({ transactionCount, blockType }: BlockData) => {
  if (transactionCount === 0) {
    return BlockDisplayType.NoTransaction;
  }
  return INTERNAL_TO_DISPLAY_TYPE_MAP[blockType];
};

const formatBlock = (block: BlockData) => {
  return {
    ...block,
    blockType: determineBlockType(block),
  };
};

const formatBlockBulk = (blocks: BlockData[]) => {
  const result = new Array(blocks.length);
  for (let i = 0; i < blocks.length; i++) {
    result[i] = formatBlock(blocks[i]);
  }
  return result;
};
