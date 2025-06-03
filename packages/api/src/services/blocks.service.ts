import {
  Block,
  BlockData,
  BlockDisplayType,
  type BlockPaginationValidationType,
  type HashValidationType,
  NotFoundError,
  fetchBlockValidityProof,
  formatValidityProof,
} from "@intmax2-explorer-api/shared";

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

const formatBlock = (block: BlockData) => {
  const { internalBlockType, nextAccountId, ...rest } = block;
  return {
    ...rest,
    blockType: BlockDisplayType[block.blockType],
  };
};

const formatBlockBulk = (blocks: BlockData[]) => {
  const result = new Array(blocks.length);
  for (let i = 0; i < blocks.length; i++) {
    result[i] = formatBlock(blocks[i]);
  }
  return result;
};
