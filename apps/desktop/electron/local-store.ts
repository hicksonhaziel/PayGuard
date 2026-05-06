import path from "node:path";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { app } from "electron";

export type StoredRecipient = {
  id: string;
  name: string;
  walletAddress: string;
  category: string;
  notes: string;
  trustedSince: string;
  createdAt: string;
  updatedAt: string;
};

export type StoredPaymentHistory = {
  id: string;
  recipientId: string | null;
  recipientName: string;
  senderWallet: string;
  recipientWallet: string;
  amount: string;
  token: string;
  route: "Direct Send" | "Guarded Payment" | "Block";
  verdict: "Safe" | "Review" | "Block";
  riskScore: number;
  txSignature: string;
  source: "manual" | "payguard" | "onchain-import";
  summary: string;
  paidAt: string;
  createdAt: string;
};

export type StoredOnchainImport = {
  id: string;
  walletAddress: string;
  recipientWallet: string;
  status: "pending" | "completed" | "failed";
  importedCount: number;
  lastSignature: string | null;
  startedAt: string;
  completedAt: string | null;
  error: string | null;
};

export type RecipientSummary = StoredRecipient & {
  averageAmount: string;
  lastPayment: string;
  payments: number;
};

let database: DatabaseSync | null = null;

export function getLocalStore() {
  if (!database) {
    const databasePath = path.join(app.getPath("userData"), "payguard.sqlite");
    database = new DatabaseSync(databasePath);
    initializeDatabase(database);
  }

  return database;
}

export function listRecipients(): RecipientSummary[] {
  const db = getLocalStore();

  return db
    .prepare(`
      SELECT
        r.id,
        r.name,
        r.wallet_address AS walletAddress,
        r.category,
        r.notes,
        r.trusted_since AS trustedSince,
        r.created_at AS createdAt,
        r.updated_at AS updatedAt,
        COUNT(h.id) AS payments,
        COALESCE(MAX(h.paid_at), '') AS lastPayment,
        COALESCE(AVG(CAST(h.amount AS REAL)), 0) AS averageAmountValue,
        COALESCE(MAX(h.token), 'USDC') AS averageAmountToken
      FROM recipients r
      LEFT JOIN payment_history h ON h.recipient_id = r.id
      GROUP BY r.id
      ORDER BY r.updated_at DESC
    `)
    .all()
    .map((row) => {
      const record = row as Record<string, unknown>;
      const averageAmountValue = Number(record.averageAmountValue ?? 0);

      return {
        id: String(record.id),
        name: String(record.name),
        walletAddress: String(record.walletAddress),
        category: String(record.category),
        notes: String(record.notes),
        trustedSince: String(record.trustedSince),
        createdAt: String(record.createdAt),
        updatedAt: String(record.updatedAt),
        averageAmount:
          averageAmountValue > 0
            ? `${averageAmountValue.toLocaleString(undefined, {
                maximumFractionDigits: 2,
                minimumFractionDigits: 2
              })} ${String(record.averageAmountToken)}`
            : "No payments yet",
        lastPayment: record.lastPayment
          ? formatDisplayDate(String(record.lastPayment))
          : "No payments yet",
        payments: Number(record.payments ?? 0)
      };
    });
}

export function addRecipient(input: {
  category?: string;
  name?: string;
  notes?: string;
  walletAddress: string;
}) {
  const db = getLocalStore();
  const now = new Date().toISOString();
  const recipient: StoredRecipient = {
    id: randomUUID(),
    name: input.name?.trim() || formatWalletLabel(input.walletAddress),
    walletAddress: input.walletAddress,
    category: input.category ?? "General",
    notes: input.notes ?? "",
    trustedSince: now,
    createdAt: now,
    updatedAt: now
  };

  db.prepare(`
    INSERT INTO recipients (
      id, name, wallet_address, category, notes, trusted_since, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    recipient.id,
    recipient.name,
    recipient.walletAddress,
    recipient.category,
    recipient.notes,
    recipient.trustedSince,
    recipient.createdAt,
    recipient.updatedAt
  );

  return recipient;
}

export function listPaymentHistory(): StoredPaymentHistory[] {
  const db = getLocalStore();

  return db
    .prepare(`
      SELECT
        id,
        recipient_id AS recipientId,
        recipient_name AS recipientName,
        sender_wallet AS senderWallet,
        recipient_wallet AS recipientWallet,
        amount,
        token,
        route,
        verdict,
        risk_score AS riskScore,
        tx_signature AS txSignature,
        source,
        summary,
        paid_at AS paidAt,
        created_at AS createdAt
      FROM payment_history
      ORDER BY paid_at DESC
      LIMIT 100
    `)
    .all()
    .map((row) => normalizePaymentHistory(row as Record<string, unknown>));
}

export function addPaymentHistory(input: {
  amount: string;
  recipientName: string;
  recipientWallet: string;
  riskScore: number;
  route: StoredPaymentHistory["route"];
  senderWallet?: string;
  source?: StoredPaymentHistory["source"];
  summary: string;
  token: string;
  txSignature?: string;
  verdict: StoredPaymentHistory["verdict"];
}) {
  const db = getLocalStore();
  const now = new Date().toISOString();
  const recipientId = findOrCreateRecipient(input.recipientName, input.recipientWallet);
  const history: StoredPaymentHistory = {
    id: randomUUID(),
    recipientId,
    recipientName: input.recipientName,
    senderWallet: input.senderWallet ?? "",
    recipientWallet: input.recipientWallet,
    amount: input.amount,
    token: input.token,
    route: input.route,
    verdict: input.verdict,
    riskScore: input.riskScore,
    txSignature: input.txSignature ?? `demo-${randomUUID()}`,
    source: input.source ?? "payguard",
    summary: input.summary,
    paidAt: now,
    createdAt: now
  };

  db.prepare(`
    INSERT INTO payment_history (
      id, recipient_id, recipient_name, sender_wallet, recipient_wallet, amount, token,
      route, verdict, risk_score, tx_signature, source, summary, paid_at, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    history.id,
    history.recipientId,
    history.recipientName,
    history.senderWallet,
    history.recipientWallet,
    history.amount,
    history.token,
    history.route,
    history.verdict,
    history.riskScore,
    history.txSignature,
    history.source,
    history.summary,
    history.paidAt,
    history.createdAt
  );

  return history;
}

export function listOnchainImports(): StoredOnchainImport[] {
  const db = getLocalStore();

  return db
    .prepare(`
      SELECT
        id,
        wallet_address AS walletAddress,
        recipient_wallet AS recipientWallet,
        status,
        imported_count AS importedCount,
        last_signature AS lastSignature,
        started_at AS startedAt,
        completed_at AS completedAt,
        error
      FROM onchain_imports
      ORDER BY started_at DESC
      LIMIT 50
    `)
    .all()
    .map((row) => {
      const record = row as Record<string, unknown>;

      return {
        id: String(record.id),
        walletAddress: String(record.walletAddress),
        recipientWallet: String(record.recipientWallet),
        status: record.status as StoredOnchainImport["status"],
        importedCount: Number(record.importedCount ?? 0),
        lastSignature: record.lastSignature ? String(record.lastSignature) : null,
        startedAt: String(record.startedAt),
        completedAt: record.completedAt ? String(record.completedAt) : null,
        error: record.error ? String(record.error) : null
      };
    });
}

function initializeDatabase(db: DatabaseSync) {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS recipients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      wallet_address TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL DEFAULT 'General',
      notes TEXT NOT NULL DEFAULT '',
      trusted_since TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payment_history (
      id TEXT PRIMARY KEY,
      recipient_id TEXT,
      recipient_name TEXT NOT NULL,
      sender_wallet TEXT NOT NULL DEFAULT '',
      recipient_wallet TEXT NOT NULL,
      amount TEXT NOT NULL,
      token TEXT NOT NULL,
      route TEXT NOT NULL,
      verdict TEXT NOT NULL,
      risk_score INTEGER NOT NULL,
      tx_signature TEXT NOT NULL UNIQUE,
      source TEXT NOT NULL,
      summary TEXT NOT NULL DEFAULT '',
      paid_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (recipient_id) REFERENCES recipients(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS onchain_imports (
      id TEXT PRIMARY KEY,
      wallet_address TEXT NOT NULL,
      recipient_wallet TEXT NOT NULL,
      status TEXT NOT NULL,
      imported_count INTEGER NOT NULL DEFAULT 0,
      last_signature TEXT,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      error TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_payment_history_recipient_id
      ON payment_history(recipient_id);
    CREATE INDEX IF NOT EXISTS idx_payment_history_paid_at
      ON payment_history(paid_at);
    CREATE INDEX IF NOT EXISTS idx_onchain_imports_wallet_recipient
      ON onchain_imports(wallet_address, recipient_wallet);
  `);

  cleanSeedRecipients(db);
}

function cleanSeedRecipients(db: DatabaseSync) {
  const seedWallets = [
    "7xK9mPZrLs8Qa4NdTz6Vu1JcBf3We9HyRkSMn2PaQ4pL",
    "9bN3pLQ7ws8Tq2VxCd44mAnpR7Zu2jVP9rwLK1nQp777",
    "6xVqL92mbRt8cJWzG9PKsH8xRUiYt2Gad34VZn7LQm12"
  ];

  for (const wallet of seedWallets) {
    db.prepare(`
      DELETE FROM recipients
      WHERE wallet_address = ?
        AND NOT EXISTS (
          SELECT 1 FROM payment_history WHERE payment_history.recipient_id = recipients.id
        )
    `).run(wallet);
  }
}

function findOrCreateRecipient(name: string, walletAddress: string) {
  const db = getLocalStore();
  const existing = db
    .prepare("SELECT id FROM recipients WHERE wallet_address = ?")
    .get(walletAddress) as { id: string } | undefined;

  if (existing?.id) {
    db.prepare("UPDATE recipients SET name = ?, updated_at = ? WHERE id = ?").run(
      name,
      new Date().toISOString(),
      existing.id
    );
    return existing.id;
  }

  return addRecipient({
    category: "PayGuard",
    name,
    walletAddress
  }).id;
}

function normalizePaymentHistory(record: Record<string, unknown>): StoredPaymentHistory {
  return {
    id: String(record.id),
    recipientId: record.recipientId ? String(record.recipientId) : null,
    recipientName: String(record.recipientName),
    senderWallet: String(record.senderWallet),
    recipientWallet: String(record.recipientWallet),
    amount: String(record.amount),
    token: String(record.token),
    route: record.route as StoredPaymentHistory["route"],
    verdict: record.verdict as StoredPaymentHistory["verdict"],
    riskScore: Number(record.riskScore),
    txSignature: String(record.txSignature),
    source: record.source as StoredPaymentHistory["source"],
    summary: String(record.summary),
    paidAt: String(record.paidAt),
    createdAt: String(record.createdAt)
  };
}

function formatDisplayDate(date: string) {
  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric"
  });
}

function formatWalletLabel(walletAddress: string) {
  if (walletAddress.length <= 14) {
    return walletAddress;
  }

  return `${walletAddress.slice(0, 6)}...${walletAddress.slice(-6)}`;
}
