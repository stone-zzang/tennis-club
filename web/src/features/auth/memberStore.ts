import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { Member } from './api';

interface MemberState {
  currentMember: Member | null;
  setMember: (member: Member) => void;
  clearMember: () => void;
}

export const useMemberStore = create(
  persist<MemberState>(
    (set) => ({
      currentMember: null,
      setMember: (member) => set({ currentMember: member }),
      clearMember: () => set({ currentMember: null })
    }),
    {
      name: 'tennis-member-store'
    }
  )
);
