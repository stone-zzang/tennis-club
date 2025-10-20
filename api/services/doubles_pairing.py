"""
Doubles pairing service for tournament bracket generation.

Handles:
1. Random pairing for preliminary rounds (no duplicate partners)
2. Rank-based pairing for tournament rounds (adjacent ranks team up)
"""

from __future__ import annotations

import random
from typing import List, Tuple
from collections import defaultdict

from api.db.models import Member


class DoublesPairingService:
  """Service for generating doubles pairs in tournaments."""

  @staticmethod
  def generate_preliminary_pairs(
    members: List[Member],
    matches_per_player: int = 3
  ) -> List[Tuple[Tuple[Member, Member], Tuple[Member, Member]]]:
    """
    Generate doubles pairs for preliminary rounds.

    Rules:
    - Each player should play exactly matches_per_player matches (default: 3)
    - No player should partner with the same person twice
    - Pairs are random but avoid duplicates
    - For 3 courts with 16 players: generates 12 matches total (3 matches * 4 players per court)

    Returns:
      List of matches, where each match is ((player1, player2), (player3, player4))
    """
    if len(members) < 4:
      raise ValueError("Need at least 4 players for doubles")

    # Track who has partnered with whom
    partner_history: defaultdict[str, set[str]] = defaultdict(set)
    # Track match count per player
    match_count: defaultdict[str, int] = defaultdict(int)

    matches: List[Tuple[Tuple[Member, Member], Tuple[Member, Member]]] = []
    max_attempts = 1000
    attempts = 0

    target_total_matches = (len(members) * matches_per_player) // 4

    while len(matches) < target_total_matches and attempts < max_attempts:
      attempts += 1

      # Get available players (haven't reached match limit)
      available = [m for m in members if match_count[m.id] < matches_per_player]

      if len(available) < 4:
        break

      # Shuffle and try to create a match
      random.shuffle(available)

      # Try different combinations
      success = False
      for i in range(0, len(available) - 3):
        p1 = available[i]
        for j in range(i + 1, len(available) - 2):
          p2 = available[j]

          # Check if p1 and p2 have partnered before
          if p2.id in partner_history[p1.id]:
            continue

          # Find opponents
          for k in range(j + 1, len(available) - 1):
            p3 = available[k]
            for l in range(k + 1, len(available)):
              p4 = available[l]

              # Check if p3 and p4 have partnered before
              if p4.id in partner_history[p3.id]:
                continue

              # Check no overlap between teams
              team_a = {p1.id, p2.id}
              team_b = {p3.id, p4.id}
              if team_a & team_b:
                continue

              # Valid match found
              matches.append(((p1, p2), (p3, p4)))

              # Update history
              partner_history[p1.id].add(p2.id)
              partner_history[p2.id].add(p1.id)
              partner_history[p3.id].add(p4.id)
              partner_history[p4.id].add(p3.id)

              # Update match counts
              for player in [p1, p2, p3, p4]:
                match_count[player.id] += 1

              success = True
              break
            if success:
              break
          if success:
            break
        if success:
          break

    return matches

  @staticmethod
  def generate_rank_based_pairs(
    group1_members: List[Member],
    group2_members: List[Member]
  ) -> List[Tuple[Tuple[Member, Member], Tuple[Member, Member]]]:
    """
    Generate rank-based doubles pairs for tournament rounds.

    Rules:
    - Group 1 rank 8 + rank 7 vs Group 2 rank 8 + rank 7
    - Group 1 rank 6 + rank 5 vs Group 2 rank 6 + rank 5
    - etc.

    Args:
      group1_members: Members from group 1, sorted by rank (worst to best)
      group2_members: Members from group 2, sorted by rank (worst to best)

    Returns:
      List of matches with adjacent rank pairings
    """
    if len(group1_members) != len(group2_members):
      raise ValueError("Both groups must have the same number of members")

    if len(group1_members) % 2 != 0:
      raise ValueError("Number of members in each group must be even")

    matches: List[Tuple[Tuple[Member, Member], Tuple[Member, Member]]] = []

    # Pair adjacent ranks: [8,7], [6,5], [4,3], [2,1]
    for i in range(0, len(group1_members), 2):
      # Team from group 1: lower rank + higher rank
      team1 = (group1_members[i], group1_members[i + 1])
      # Team from group 2: lower rank + higher rank
      team2 = (group2_members[i], group2_members[i + 1])

      matches.append((team1, team2))

    return matches

  @staticmethod
  def distribute_to_groups(members: List[Member], num_groups: int) -> List[List[Member]]:
    """
    Distribute members into groups using round-robin.

    Args:
      members: List of members (order preserved)
      num_groups: Number of groups to create

    Returns:
      List of groups, each containing members
    """
    groups: List[List[Member]] = [[] for _ in range(num_groups)]

    for idx, member in enumerate(members):
      group_idx = idx % num_groups
      groups[group_idx].append(member)

    return groups
