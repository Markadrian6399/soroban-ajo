'use client';

import React, { useState, useEffect } from 'react';

interface Member {
  address: string;
  name?: string;
}

interface VoteTally {
  candidate: string;
  votes: number;
}

interface PayoutVotingProps {
  groupId: string;
  cycle: number;
  members: Member[];
  currentUser: string;
  apiUrl: string;
  /** Dispute window in seconds after voting closes */
  disputeWindowSeconds?: number;
}

export default function PayoutVoting({
  groupId,
  cycle,
  members,
  currentUser,
  apiUrl,
  disputeWindowSeconds = 3600,
}: PayoutVotingProps) {
  const [tally, setTally] = useState<VoteTally[]>([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>('');

  useEffect(() => {
    fetchTally();
    checkVoted();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, cycle]);

  async function fetchTally() {
    try {
      const res = await fetch(`${apiUrl}/voting/${groupId}/${cycle}/tally`);
      if (res.ok) setTally(await res.json());
    } catch {
      // non-fatal
    }
  }

  async function checkVoted() {
    try {
      const res = await fetch(
        `${apiUrl}/voting/${groupId}/${cycle}/voted?voter=${currentUser}`
      );
      if (res.ok) {
        const data = await res.json();
        setHasVoted(data.hasVoted);
      }
    } catch {
      // non-fatal
    }
  }

  async function handleVote() {
    if (!selected) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/voting/${groupId}/${cycle}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voter: currentUser, candidate: selected }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Vote failed');
      setHasVoted(true);
      await fetchTally();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  const totalVotes = tally.reduce((s, t) => s + t.votes, 0);
  const winner = tally[0];

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-1 text-base font-semibold text-gray-900 dark:text-white">
          Payout Vote — Cycle {cycle}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Vote for who should receive the payout this cycle. Results are transparent and on-chain.
        </p>
      </div>

      {/* Voting form */}
      {!hasVoted ? (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <p className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
            Select a member to receive the payout:
          </p>
          <div className="space-y-2">
            {members.map((m) => (
              <label
                key={m.address}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700"
              >
                <input
                  type="radio"
                  name="candidate"
                  value={m.address}
                  checked={selected === m.address}
                  onChange={() => setSelected(m.address)}
                  className="accent-blue-600"
                />
                <span className="text-sm text-gray-800 dark:text-gray-200">
                  {m.name ?? m.address.slice(0, 12) + '…'}
                </span>
              </label>
            ))}
          </div>

          {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}

          <button
            onClick={handleVote}
            disabled={!selected || loading}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Submitting…' : 'Cast Vote'}
          </button>
        </div>
      ) : (
        <p className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
          ✓ Your vote has been recorded.
        </p>
      )}

      {/* Live tally */}
      {tally.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
            Live Results ({totalVotes} vote{totalVotes !== 1 ? 's' : ''})
          </h4>
          <ul className="space-y-2">
            {tally.map((t) => {
              const pct = totalVotes > 0 ? Math.round((t.votes / totalVotes) * 100) : 0;
              const isWinner = t.candidate === winner?.candidate;
              return (
                <li key={t.candidate}>
                  <div className="mb-0.5 flex justify-between text-xs text-gray-600 dark:text-gray-400">
                    <span className={isWinner ? 'font-semibold text-blue-600 dark:text-blue-400' : ''}>
                      {t.candidate.slice(0, 12)}…{isWinner ? ' 🏆' : ''}
                    </span>
                    <span>{t.votes} ({pct}%)</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                      className={`h-full rounded-full transition-all ${isWinner ? 'bg-blue-500' : 'bg-gray-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
            Dispute window: {disputeWindowSeconds / 60} min after voting closes.
          </p>
        </div>
      )}
    </div>
  );
}
