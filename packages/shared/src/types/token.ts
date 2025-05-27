// token
export enum TokenEnumType {
  NATIVE,
  ERC20,
  ERC721,
  ERC1155,
}

export interface TokenInfo {
  tokenType: TokenEnumType;
  tokenIndex: number;
  contractAddress: string;
}
