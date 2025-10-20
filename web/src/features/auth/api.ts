import { http } from '../../lib/api';

export interface CreateMemberPayload {
  readonly full_name: string;
  readonly email: string;
  readonly level: string;
  readonly role?: 'admin' | 'member';
}

export interface Member {
  readonly id: string;
  readonly full_name: string;
  readonly email: string;
  readonly level: string;
  readonly role: 'admin' | 'member';
  readonly joined_at?: string;
}

export async function createMember(payload: CreateMemberPayload): Promise<Member> {
  return http<Member>('/members', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}
