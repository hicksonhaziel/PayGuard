export type SolanaClientConfig = {
  cluster: "devnet" | "localnet";
  rpcUrl: string;
};

export const defaultSolanaClientConfig: SolanaClientConfig = {
  cluster: "devnet",
  rpcUrl: "https://api.devnet.solana.com"
};

