import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

import {
  generateBracket,
  getLeague,
  listLeagueApplications,
  listLeagueMatches,
  updateMatchScore,
  cancelApplication,
  checkPreliminaryStatus,
  generateFinalStage,
  updateMatch
} from '../api';
import type { League, LeagueMatch } from '../types';
import type { FinalStageMode, LeagueApplicationListItem, PreliminaryStatus } from '../api';
import { useMemberStore } from '../../auth/memberStore';

interface GroupedMatches {
  readonly key: string;
  readonly label: string;
  readonly matches: LeagueMatch[];
}

const formatDateTime = (value: string): string => {
  try {
    return new Intl.DateTimeFormat('ko-KR', {
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    }).format(new Date(value));
  } catch (err) {
    return value;
  }
};

export function LeagueDashboard(): JSX.Element {
  const { leagueId } = useParams();
  const { currentMember } = useMemberStore();
  const [league, setLeague] = useState<League | null>(null);
  const [matches, setMatches] = useState<LeagueMatch[]>([]);
  const [applications, setApplications] = useState<LeagueApplicationListItem[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [bracketStatus, setBracketStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [bracketError, setBracketError] = useState<string | null>(null);
  const [groupsInput, setGroupsInput] = useState<number>(1);
  const [courtsInput, setCourtsInput] = useState<number>(1);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [scoreInputs, setScoreInputs] = useState<Record<string, { score_a: string; score_b: string }>>({});
  const [submittingScores, setSubmittingScores] = useState<Record<string, boolean>>({});
  const [scoreErrors, setScoreErrors] = useState<Record<string, string>>({});
  const [preliminaryStatus, setPreliminaryStatus] = useState<PreliminaryStatus | null>(null);
  const [showFinalStageModal, setShowFinalStageModal] = useState<boolean>(false);
  const [finalStageMode, setFinalStageMode] = useState<FinalStageMode>('ranked_play');
  const [rankedMatchCount, setRankedMatchCount] = useState<number>(4);
  const [finalStageStatus, setFinalStageStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [finalStageError, setFinalStageError] = useState<string | null>(null);
  const [editingMatch, setEditingMatch] = useState<string | null>(null);
  const [matchEditInputs, setMatchEditInputs] = useState<Record<string, { scheduled_at: string; court: string }>>({});
  const [viewMode, setViewMode] = useState<'preliminary' | 'final'>('preliminary');

  const isAdmin = currentMember?.role === 'admin';

  useEffect(() => {
    if (!leagueId) return;
    let isMounted = true;

    async function loadLeague(): Promise<void> {
      setStatus('loading');
      setError(null);
      try {
        const [leagueResponse, applicants, scheduledMatches, prelimStatus] = await Promise.all([
          getLeague(leagueId!),
          listLeagueApplications(leagueId!),
          listLeagueMatches(leagueId!),
          checkPreliminaryStatus(leagueId!).catch(() => null)
        ]);
        if (!isMounted) return;
        setLeague(leagueResponse);
        setApplications(applicants);
        setMatches(scheduledMatches);
        setPreliminaryStatus(prelimStatus);
        setGroupsInput(leagueResponse.groups_count ?? 1);
        setCourtsInput(leagueResponse.courts_count ?? 1);
        setStatus('loaded');
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : '리그 정보를 불러오지 못했습니다');
        setStatus('error');
      }
    }

    void loadLeague();
    return () => {
      isMounted = false;
    };
  }, [leagueId]);

  useEffect(() => {
    if (matches.length === 0) {
      setSelectedGroup('all');
      return;
    }
    const firstGroup = matches.map((match) => `group-${match.group_number}`)[0];
    setSelectedGroup((prev) => (prev === 'all' ? firstGroup ?? 'all' : prev));
  }, [matches]);

  const preliminaryMatches = useMemo(() => {
    return matches.filter((match) => match.stage === 'preliminary');
  }, [matches]);

  const finalStageMatches = useMemo(() => {
    return matches.filter((match) => match.stage !== 'preliminary');
  }, [matches]);

  const hasFinalStageMatches = useMemo(() => finalStageMatches.length > 0, [finalStageMatches]);

  const finalStageLabel = useMemo(() => {
    if (!league?.final_stage_mode) return '본선';
    return league.final_stage_mode === 'elimination' ? '토너먼트' : '순위전';
  }, [league?.final_stage_mode]);

  const getMatchStageLabel = (match: LeagueMatch): string => {
    if (match.stage === 'elimination') {
      if (match.round === 2) return '8강';
      if (match.round === 3) return '4강';
      if (match.round === 4) return '결승';
      return '본선';
    }
    if (match.stage === 'ranked') {
      return '순위전';
    }
    return `그룹 ${match.group_number}`;
  };

  const groupedMatches: GroupedMatches[] = useMemo(() => {
    const matchesToGroup = viewMode === 'preliminary' ? preliminaryMatches : finalStageMatches;

    if (matchesToGroup.length === 0) {
      return [];
    }

    if (viewMode === 'final') {
      return [{
        key: 'final-stage',
        label: finalStageLabel,
        matches: [...matchesToGroup].sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
      }];
    }

    const collection = new Map<string, LeagueMatch[]>();
    matchesToGroup.forEach((match) => {
      const key = `group-${match.group_number}`;
      const list = collection.get(key) ?? [];
      list.push(match);
      collection.set(key, list);
    });
    return Array.from(collection.entries()).map(([key, entries]) => ({
      key,
      label: `그룹 ${key.split('-')[1]}`,
      matches: entries.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
    }));
  }, [preliminaryMatches, finalStageMatches, viewMode, finalStageLabel]);

  const matchesToDisplay = useMemo(() => {
    const targetMatches = hasFinalStageMatches && viewMode === 'final' ? finalStageMatches : preliminaryMatches;
    if (viewMode === 'final') {
      return targetMatches.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
    }
    if (selectedGroup === 'all') {
      return targetMatches;
    }
    return targetMatches.filter((match) => `group-${match.group_number}` === selectedGroup);
  }, [selectedGroup, hasFinalStageMatches, viewMode, preliminaryMatches, finalStageMatches]);

  useEffect(() => {
    if (hasFinalStageMatches && viewMode === 'preliminary') {
      setViewMode('final');
    }
  }, [hasFinalStageMatches, viewMode]);

  const nextMatch = useMemo(() => {
    if (matches.length === 0) return null;
    return [...matches].sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0];
  }, [matches]);

  const handleGenerateBracket = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!leagueId || !currentMember) return;
    setBracketStatus('submitting');
    setBracketError(null);
    try {
      const generatedMatches = await generateBracket(leagueId!, {
        admin_id: currentMember.id,
        groups_count: groupsInput,
        courts_count: courtsInput
      });
      const refreshedLeague = await getLeague(leagueId!);
      setMatches(generatedMatches);
      setLeague(refreshedLeague);
      setBracketStatus('success');
    } catch (err) {
      setBracketError(err instanceof Error ? err.message : '대진표 생성에 실패했습니다.');
      setBracketStatus('error');
    }
  };

  const handleScoreSubmit = async (matchId: string) => {
    const scores = scoreInputs[matchId];
    if (!scores || !leagueId) return;

    const scoreA = parseInt(scores.score_a, 10);
    const scoreB = parseInt(scores.score_b, 10);

    if (isNaN(scoreA) || isNaN(scoreB) || scoreA < 0 || scoreB < 0) {
      setScoreErrors({ ...scoreErrors, [matchId]: '유효한 점수를 입력하세요' });
      return;
    }

    setSubmittingScores({ ...submittingScores, [matchId]: true });
    setScoreErrors({ ...scoreErrors, [matchId]: '' });

    try {
      await updateMatchScore(matchId, { score_a: scoreA, score_b: scoreB });
      const [updatedMatches, prelimStatus] = await Promise.all([
        listLeagueMatches(leagueId!),
        checkPreliminaryStatus(leagueId!).catch(() => null)
      ]);
      setMatches(updatedMatches);
      setPreliminaryStatus(prelimStatus);
      setScoreInputs({ ...scoreInputs, [matchId]: { score_a: '', score_b: '' } });
      setSubmittingScores({ ...submittingScores, [matchId]: false });
    } catch (err) {
      setScoreErrors({
        ...scoreErrors,
        [matchId]: err instanceof Error ? err.message : '점수 제출에 실패했습니다'
      });
      setSubmittingScores({ ...submittingScores, [matchId]: false });
    }
  };

  const handleCancelApplication = async (memberId: string) => {
    if (!leagueId || !window.confirm('참가 신청을 취소하시겠습니까?')) return;

    try {
      await cancelApplication(leagueId!, memberId);
      const applicants = await listLeagueApplications(leagueId!);
      setApplications(applicants);
    } catch (err) {
      alert(err instanceof Error ? err.message : '참가 취소에 실패했습니다');
    }
  };

  const handleGenerateFinalStage = async () => {
    if (!leagueId || !currentMember) return;
    setFinalStageStatus('submitting');
    setFinalStageError(null);

    try {
      await generateFinalStage(leagueId!, {
        admin_id: currentMember.id,
        mode: finalStageMode,
        courts_count: courtsInput,
        num_matches: finalStageMode === 'ranked_play' ? rankedMatchCount : undefined
      });
      const [refreshedLeague, updatedMatches, prelimStatus] = await Promise.all([
        getLeague(leagueId!),
        listLeagueMatches(leagueId!),
        checkPreliminaryStatus(leagueId!).catch(() => null)
      ]);
      setLeague(refreshedLeague);
      setMatches(updatedMatches);
      setPreliminaryStatus(prelimStatus);
      setFinalStageStatus('success');
      setShowFinalStageModal(false);
    } catch (err) {
      setFinalStageError(err instanceof Error ? err.message : '본선 생성에 실패했습니다');
      setFinalStageStatus('error');
    }
  };

  const handleStartEditMatch = (match: LeagueMatch) => {
    setEditingMatch(match.id);
    setMatchEditInputs({
      ...matchEditInputs,
      [match.id]: {
        scheduled_at: new Date(match.scheduled_at).toISOString().slice(0, 16),
        court: match.court
      }
    });
  };

  const handleSaveMatchEdit = async (matchId: string) => {
    if (!currentMember || !leagueId) return;
    const editInputs = matchEditInputs[matchId];
    if (!editInputs) return;

    try {
      await updateMatch(matchId, {
        admin_id: currentMember.id,
        scheduled_at: new Date(editInputs.scheduled_at).toISOString(),
        court: editInputs.court
      });
      const updatedMatches = await listLeagueMatches(leagueId!);
      setMatches(updatedMatches);
      setEditingMatch(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : '경기 수정에 실패했습니다');
    }
  };

  return (
    <section className="mx-auto min-h-screen max-w-2xl px-5 py-10 space-y-8">
      <header className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.3em] text-primary">Tennis Club League</p>
            <h1 className="text-3xl font-semibold text-slate-100">{league?.name ?? `League #${leagueId}`}</h1>
            <p className="text-sm text-slate-400">
              {league?.surface_type} 코트 • 최대 {league?.max_participants ?? 0}명 참가
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${matches.length > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
            {matches.length > 0 ? '진행 중' : '대진표 대기'}
          </span>
        </div>
        <div className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-4 sm:grid-cols-3">
          <div className="space-y-1">
            <p className="text-xs text-slate-400">참가자</p>
            <p className="text-lg font-semibold text-slate-100">{applications.length}명</p>
          </div>
         <div className="space-y-1">
           <p className="text-xs text-slate-400">그룹 / 코트</p>
           <p className="text-lg font-semibold text-slate-100">
              {(league?.groups_count ?? (groupedMatches.length || 1))} 그룹 · {(league?.courts_count ?? 1)} 코트
           </p>
         </div>
          <div className="space-y-1">
            <p className="text-xs text-slate-400">다음 경기</p>
            <p className="text-lg font-semibold text-slate-100">
              {nextMatch ? `${formatDateTime(nextMatch.scheduled_at)} · ${nextMatch.court}` : '대진표 생성 대기'}
            </p>
          </div>
        </div>
      </header>

      {isAdmin && !hasFinalStageMatches && (
        <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-200">대진표 관리</h2>
            {bracketStatus === 'success' && <span className="text-xs text-emerald-400">생성 완료</span>}
          </div>

          {preliminaryStatus && (
            <div className="rounded-xl bg-slate-950/50 border border-slate-800 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">예선 진행 상황</p>
                <span className={`text-xs font-medium ${preliminaryStatus.is_complete ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {preliminaryStatus.completed_matches} / {preliminaryStatus.total_matches} 완료
                </span>
              </div>
              {preliminaryStatus.is_complete && (
                <p className="text-xs text-emerald-400">✓ 예선이 완료되었습니다. 토너먼트를 생성할 수 있습니다.</p>
              )}
            </div>
          )}

          {!league?.bracket_generated_at && (
            <form className="grid gap-4 sm:grid-cols-3" onSubmit={handleGenerateBracket}>
              <label className="space-y-2 text-xs text-slate-400">
                그룹 수
                <input
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                  type="number"
                  min={1}
                  max={16}
                  value={groupsInput}
                  onChange={(event) => setGroupsInput(Number(event.target.value))}
                />
              </label>
              <label className="space-y-2 text-xs text-slate-400">
                코트 수
                <input
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                  type="number"
                  min={1}
                  max={16}
                  value={courtsInput}
                  onChange={(event) => setCourtsInput(Number(event.target.value))}
                />
              </label>
              <div className="flex flex-col justify-end">
                <button
                  type="submit"
                  className="w-full rounded-xl bg-primary px-3 py-2 text-sm font-medium text-slate-950 disabled:opacity-60"
                  disabled={bracketStatus === 'submitting'}
                >
                  {bracketStatus === 'submitting' ? '생성 중...' : '예선 대진표 생성'}
                </button>
              </div>
            </form>
          )}
          {bracketError && <p className="text-xs text-red-400">{bracketError}</p>}

          {preliminaryStatus?.is_complete && !hasFinalStageMatches && (
            <div className="pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowFinalStageModal(true)}
                className="w-full rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                본선 생성
              </button>
            </div>
          )}
        </section>
      )}

      {isAdmin && hasFinalStageMatches && (
        <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-200">본선 관리</h2>
            <span className="text-xs text-emerald-400">{finalStageLabel} 진행 중</span>
          </div>
          <div className="rounded-xl bg-slate-950/50 border border-slate-800 p-4 space-y-2">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-xs text-slate-400">예선 경기</p>
                <p className="text-lg font-semibold text-slate-100">{preliminaryMatches.length}경기</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">본선 경기</p>
                <p className="text-lg font-semibold text-emerald-400">{finalStageMatches.length}경기</p>
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-400">
            본선이 생성되었습니다. 각 경기의 수정 버튼을 통해 경기 일정과 코트를 변경할 수 있습니다.
          </p>
        </section>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">경기 일정</h2>
        </div>

        {hasFinalStageMatches && (
          <div className="flex gap-2 border-b border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('final')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === 'final'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {finalStageLabel} ({finalStageMatches.length})
            </button>
            <button
              type="button"
              onClick={() => setViewMode('preliminary')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === 'preliminary'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              예선 ({preliminaryMatches.length})
            </button>
          </div>
        )}

        {groupedMatches.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setSelectedGroup('all')}
              className={`rounded-full px-3 py-1 text-xs ${selectedGroup === 'all' ? 'bg-primary/20 text-primary' : 'bg-slate-800 text-slate-300'}`}
            >
              전체
            </button>
            {groupedMatches.map((group) => (
              <button
                key={group.key}
                type="button"
                onClick={() => setSelectedGroup(group.key)}
                className={`rounded-full px-3 py-1 text-xs ${selectedGroup === group.key ? 'bg-primary text-slate-950' : 'bg-slate-800 text-slate-300'}`}
              >
                {group.label}
              </button>
            ))}
          </div>
        )}

        {matchesToDisplay.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/50 p-6 text-center text-sm text-slate-400">
            아직 생성된 경기가 없습니다. 참가 인원을 채우거나 관리자가 대진표를 생성해주세요.
          </div>
        ) : (
          <ul className="grid gap-4">
            {matchesToDisplay.map((match) => (
              <li key={match.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-inner space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1 flex-1">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{getMatchStageLabel(match)}</p>
                    <p className="text-lg font-semibold text-slate-100">
                      {match.player_a} vs {match.player_b}
                    </p>
                    {editingMatch === match.id ? (
                      <div className="flex gap-2 items-center">
                        <input
                          type="datetime-local"
                          value={matchEditInputs[match.id]?.scheduled_at ?? ''}
                          onChange={(e) => setMatchEditInputs({
                            ...matchEditInputs,
                            [match.id]: { ...matchEditInputs[match.id], scheduled_at: e.target.value, court: matchEditInputs[match.id]?.court ?? '' }
                          })}
                          className="text-xs rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
                        />
                        <input
                          type="text"
                          value={matchEditInputs[match.id]?.court ?? ''}
                          onChange={(e) => setMatchEditInputs({
                            ...matchEditInputs,
                            [match.id]: { ...matchEditInputs[match.id], court: e.target.value, scheduled_at: matchEditInputs[match.id]?.scheduled_at ?? '' }
                          })}
                          className="text-xs rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100 w-24"
                          placeholder="코트"
                        />
                        <button
                          onClick={() => handleSaveMatchEdit(match.id)}
                          className="text-xs bg-emerald-600 text-white px-2 py-1 rounded"
                        >
                          저장
                        </button>
                        <button
                          onClick={() => setEditingMatch(null)}
                          className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded"
                        >
                          취소
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-slate-400">{formatDateTime(match.scheduled_at)} · {match.court}</p>
                        {isAdmin && (
                          <button
                            onClick={() => handleStartEditMatch(match)}
                            className="text-xs text-primary hover:text-primary/80"
                          >
                            수정
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                      match.status === 'completed'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : match.status === 'in_progress'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-slate-700 text-slate-300 border border-slate-700'
                    }`}>
                      {match.status === 'completed' ? '완료' : match.status === 'in_progress' ? '진행중' : '예정'}
                    </span>
                    <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
                      Round {match.round}
                    </span>
                  </div>
                </div>

                {match.status === 'completed' && match.score_a !== null && match.score_b !== null && (
                  <div className="rounded-xl bg-slate-950/50 border border-slate-800 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-300">{match.player_a}</span>
                        <span className="text-lg font-bold text-slate-100">{match.score_a}</span>
                      </div>
                      <span className="text-xs text-slate-500">vs</span>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-slate-100">{match.score_b}</span>
                        <span className="text-sm text-slate-300">{match.player_b}</span>
                      </div>
                    </div>
                    {match.winner && (
                      <p className="mt-2 text-center text-xs text-emerald-400">
                        승자: {match.winner}
                      </p>
                    )}
                  </div>
                )}

                {match.status !== 'completed' && (
                  <div className="rounded-xl bg-slate-950/50 border border-slate-800 p-3 space-y-2">
                    <p className="text-xs text-slate-400 font-medium">경기 점수 입력</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 space-y-1">
                        <label className="text-xs text-slate-500">{match.player_a}</label>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={scoreInputs[match.id]?.score_a ?? ''}
                          onChange={(e) => setScoreInputs({
                            ...scoreInputs,
                            [match.id]: { ...scoreInputs[match.id], score_a: e.target.value, score_b: scoreInputs[match.id]?.score_b ?? '' }
                          })}
                          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                        />
                      </div>
                      <span className="text-slate-600 mt-5">:</span>
                      <div className="flex-1 space-y-1">
                        <label className="text-xs text-slate-500">{match.player_b}</label>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={scoreInputs[match.id]?.score_b ?? ''}
                          onChange={(e) => setScoreInputs({
                            ...scoreInputs,
                            [match.id]: { ...scoreInputs[match.id], score_b: e.target.value, score_a: scoreInputs[match.id]?.score_a ?? '' }
                          })}
                          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleScoreSubmit(match.id)}
                        disabled={submittingScores[match.id]}
                        className="mt-5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-50"
                      >
                        {submittingScores[match.id] ? '저장 중...' : '저장'}
                      </button>
                    </div>
                    {scoreErrors[match.id] && (
                      <p className="text-xs text-red-400">{scoreErrors[match.id]}</p>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">참가 인원</h2>
          <span className="text-xs text-slate-500">{applications.length}명</span>
        </div>
        {applications.length === 0 ? (
          <p className="text-sm text-slate-400">아직 참가 신청자가 없습니다.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {applications.map((application) => (
              <div
                key={application.id}
                className="rounded-full border border-slate-800 bg-slate-900/80 px-4 py-2 text-xs text-slate-200 flex items-center gap-2"
              >
                <span>{application.member?.full_name ?? '알 수 없음'} · {application.member?.level ?? '레벨 미지정'}</span>
                {(currentMember?.id === application.member?.id || isAdmin) && !league?.bracket_generated_at && (
                  <button
                    onClick={() => application.member && handleCancelApplication(application.member.id)}
                    className="text-red-400 hover:text-red-300 ml-1"
                    title="참가 취소"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {showFinalStageModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-100">본선 생성</h3>
              <button
                onClick={() => setShowFinalStageModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs text-slate-400">모드 선택</p>
                <div className="space-y-2">
                  <label className={`block rounded-xl border ${finalStageMode === 'ranked_play' ? 'border-primary bg-primary/10' : 'border-slate-700 bg-slate-950'} px-4 py-3 transition` }>
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="final-stage-mode"
                        value="ranked_play"
                        checked={finalStageMode === 'ranked_play'}
                        onChange={() => setFinalStageMode('ranked_play')}
                        className="mt-1"
                      />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-100">순위전</p>
                        <p className="text-xs text-slate-400">예선 순위에 따라 동일 순위끼리 복식 대결을 진행합니다.</p>
                      </div>
                    </div>
                  </label>
                  <label className={`block rounded-xl border ${finalStageMode === 'elimination' ? 'border-primary bg-primary/10' : 'border-slate-700 bg-slate-950'} px-4 py-3 transition` }>
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="final-stage-mode"
                        value="elimination"
                        checked={finalStageMode === 'elimination'}
                        onChange={() => setFinalStageMode('elimination')}
                        className="mt-1"
                      />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-100">토너먼트</p>
                        <p className="text-xs text-slate-400">8강부터 결승까지 단판 승부로 우승 팀을 결정합니다.</p>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {finalStageMode === 'ranked_play' && (
                <label className="space-y-2 block">
                  <span className="text-xs text-slate-400">경기 수 선택</span>
                  <select
                    value={rankedMatchCount}
                    onChange={(e) => setRankedMatchCount(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                  >
                    <option value={1}>1경기 (1위+2위 맞대결)</option>
                    <option value={2}>2경기 (1-2위 & 3-4위)</option>
                    <option value={4}>4경기 (상위 8명 순위전)</option>
                  </select>
                </label>
              )}

              <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-xs text-slate-400 space-y-1">
                {finalStageMode === 'ranked_play' ? (
                  <>
                    <p>• 각 그룹의 동일 순위끼리 팀을 구성합니다.</p>
                    <p>• 예: 1조 1위+2위 vs 2조 1위+2위.</p>
                  </>
                ) : (
                  <>
                    <p>• 상위 16명이 8개 팀을 구성해 8강부터 시작합니다.</p>
                    <p>• 경기 결과는 자동으로 다음 라운드에 반영됩니다.</p>
                  </>
                )}
                <p>• 코트 수: {courtsInput}개</p>
              </div>
            </div>
            {finalStageError && (
              <p className="text-xs text-red-400">{finalStageError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setShowFinalStageModal(false)}
                className="flex-1 rounded-xl bg-slate-800 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
              >
                취소
              </button>
              <button
                onClick={handleGenerateFinalStage}
                disabled={finalStageStatus === 'submitting'}
                className="flex-1 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {finalStageStatus === 'submitting' ? '생성 중...' : '생성'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
