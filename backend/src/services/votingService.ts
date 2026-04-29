export interface VoteRecord {
  groupId: string;
  cycle: number;
  voter: string;
  candidate: string;
  timestamp: number;
}

export interface VoteTally {
  candidate: string;
  votes: number;
}

export class VotingService {
  /** votes[groupId][cycle][voter] = candidate */
  private votes: Map<string, Map<number, Map<string, string>>> = new Map();

  private cycleKey(groupId: string, cycle: number) {
    return `${groupId}:${cycle}`;
  }

  castVote(groupId: string, cycle: number, voter: string, candidate: string): VoteRecord {
    if (!this.votes.has(groupId)) this.votes.set(groupId, new Map());
    const byCycle = this.votes.get(groupId)!;
    if (!byCycle.has(cycle)) byCycle.set(cycle, new Map());
    const byVoter = byCycle.get(cycle)!;

    if (byVoter.has(voter)) {
      throw new Error('Member has already voted this cycle');
    }

    byVoter.set(voter, candidate);
    return { groupId, cycle, voter, candidate, timestamp: Date.now() };
  }

  getTally(groupId: string, cycle: number): VoteTally[] {
    const byVoter = this.votes.get(groupId)?.get(cycle);
    if (!byVoter) return [];

    const counts = new Map<string, number>();
    for (const candidate of byVoter.values()) {
      counts.set(candidate, (counts.get(candidate) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([candidate, votes]) => ({ candidate, votes }))
      .sort((a, b) => b.votes - a.votes);
  }

  getWinner(groupId: string, cycle: number): string | null {
    const tally = this.getTally(groupId, cycle);
    return tally.length > 0 ? tally[0].candidate : null;
  }

  hasVoted(groupId: string, cycle: number, voter: string): boolean {
    return this.votes.get(groupId)?.get(cycle)?.has(voter) ?? false;
  }

  getVoteCount(groupId: string, cycle: number): number {
    return this.votes.get(groupId)?.get(cycle)?.size ?? 0;
  }
}

export const votingService = new VotingService();
