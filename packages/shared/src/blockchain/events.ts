import { type AbiEvent, parseAbiItem } from "abitype";
import type { PublicClient } from "viem";

export const depositedEvent = parseAbiItem(
  "event Deposited(uint256 indexed depositId, address indexed sender, bytes32 indexed recipientSaltHash, uint32 tokenIndex, uint256 amount, uint256 depositedAt)",
);

export const directWithdrawalSuccessedEvent = parseAbiItem(
  "event DirectWithdrawalSuccessed(bytes32 indexed withdrawalHash, address indexed recipient)",
);

export const withdrawalClaimableEvent = parseAbiItem(
  "event WithdrawalClaimable(bytes32 indexed withdrawalHash)",
);

export const claimedWithdrawalEvent = parseAbiItem(
  "event ClaimedWithdrawal(address indexed recipient, bytes32 indexed withdrawalHash)",
);

export const directWithdrawalQueuedEvent = parseAbiItem(
  "event DirectWithdrawalQueued(bytes32 indexed withdrawalHash, address indexed recipient, (address recipient, uint32 tokenIndex, uint256 amount, bytes32 nullifier) withdrawal)",
);

export const claimableWithdrawalQueuedEvent = parseAbiItem(
  "event ClaimableWithdrawalQueued(bytes32 indexed withdrawalHash, address indexed recipient, (address recipient, uint32 tokenIndex, uint256 amount, bytes32 nullifier) withdrawal)",
);

export const blockPostedEvent = parseAbiItem(
  "event BlockPosted(bytes32 indexed prevBlockHash, address indexed blockBuilder, uint256 blockNumber, bytes32 depositTreeRoot, bytes32 signatureHash)",
);

export const getEventLogs = async (
  client: PublicClient,
  address: `0x${string}`,
  event: AbiEvent,
  fromBlock: bigint,
  toBlock: bigint,
  args?: Record<string, unknown>,
) => {
  const logs = await client.getLogs({
    address,
    event,
    args,
    fromBlock,
    toBlock,
  });
  return logs;
};
