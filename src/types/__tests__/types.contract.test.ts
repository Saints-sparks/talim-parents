/**
 * Compile-time guard for the request bodies the parent app sends.
 *
 * The literals below are typed with the aliases in `../apiPayloads`, which are
 * read off the generated backend contract (`../api.d.ts`). `npm run typecheck`
 * fails here — not only this test — when a DTO gains a required field, drops a
 * field or changes an enum and the copy is refreshed with `npm run types:api`.
 * The `@ts-expect-error` lines prove the guard is live: they must keep failing
 * to compile for the reason stated, or `tsc` reports the directive as unused.
 *
 * Left hand-typed because the generated body is too loose to compare:
 * `POST /auth/logout`, `POST /auth/refresh` and the `{}` bodies of
 * `PATCH /parents/me/default-child/:id`, `PATCH /notifications/read-all`,
 * `PUT /notifications/announcements/:id/read` and
 * `PATCH /chat/rooms/:roomId/participants/:userId/remove` (no fields to check),
 * and `POST /leave-requests` when sent as `FormData` with attachments.
 * `POST /auth/login` is typed, but every field of its DTO is optional.
 */
import { describe, expect, it } from 'vitest';
import type {
  AvatarPayload,
  ChangePasswordPayload,
  CreateLeaveRequestPayload,
  InitializePaymentPayload,
  LoginPayload,
  NotificationPreferencesPayload,
  ThemePayload,
  UpdateProfilePayload,
  WebPushSubscribePayload,
} from '../apiPayloads';
import { LEAVE_TYPES, type LeaveType } from '../../services/leaveRequest.services';

const initialize: InitializePaymentPayload = {
  studentId: '64b7f0f2a1b2c3d4e5f60718',
  feeAssignmentIds: ['64b7f0f2a1b2c3d4e5f60719'],
  providerName: 'paystack',
  paymentChannel: 'card',
};

const leave: CreateLeaveRequestPayload = {
  child: '64b7f0f2a1b2c3d4e5f60718',
  startDate: '2026-09-21T00:00:00.000Z',
  endDate: '2026-09-23T00:00:00.000Z',
  leaveType: 'Health Issue',
  term: '64b7f0f2a1b2c3d4e5f6071a',
  reason: 'Clinic appointment',
};

const changePassword: ChangePasswordPayload = {
  currentPassword: 'Old-Passw0rd!',
  newPassword: 'N3w-Passw0rd!',
  confirmPassword: 'N3w-Passw0rd!',
};

const preferences: NotificationPreferencesPayload = {
  webPushEnabled: true,
  quietHoursEnabled: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '06:00',
  timezone: 'Africa/Lagos',
};

const subscribe: WebPushSubscribePayload = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
  keys: { p256dh: 'p256dh-key', auth: 'auth-secret' },
  userAgent: 'vitest',
};

const profile: UpdateProfilePayload = { fullName: 'Amaka Okafor', avatar: 'https://res.cloudinary.com/talim/a.png' };
const avatar: AvatarPayload = { avatarUrl: 'https://res.cloudinary.com/talim/a.png' };
const theme: ThemePayload = { theme: 'dark' };
const login: LoginPayload = { email: 'parent@school.edu', password: 'Passw0rd!' };

// @ts-expect-error `providerName` must be one of the DTO's providers.
const badProvider: InitializePaymentPayload = { ...initialize, providerName: 'flutterwave' };
// @ts-expect-error `term` is required by CreateLeaveRequestDto.
const noTerm: CreateLeaveRequestPayload = { child: leave.child, startDate: leave.startDate, endDate: leave.endDate, leaveType: leave.leaveType };
// @ts-expect-error forbidNonWhitelisted: an extra field is a 400, so it must not compile.
const extraField: ChangePasswordPayload = { ...changePassword, logoutEverywhere: true };
// @ts-expect-error `avatarUrl` is the field name the avatar route reads.
const wrongAvatarKey: AvatarPayload = { avatar: 'https://example.com/a.png' };

describe('request payloads match the backend contract', () => {
  it('builds a representative body for each priority write endpoint', () => {
    expect(initialize.feeAssignmentIds).toHaveLength(1);
    expect(leave.leaveType).toBe('Health Issue');
    expect(changePassword.confirmPassword).toBe(changePassword.newPassword);
    expect(preferences.timezone).toBe('Africa/Lagos');
    expect(subscribe.keys.auth).toBeTruthy();
    expect([profile, avatar, theme, login].every(Boolean)).toBe(true);
    expect([badProvider, noTerm, extraField, wrongAvatarKey].every(Boolean)).toBe(true);
  });

  it('keeps the leave-type picker in step with the DTO enum', () => {
    // If the DTO gains a type, `Exclude` is non-empty and this assignment stops compiling.
    const missing: Exclude<LeaveType, (typeof LEAVE_TYPES)[number]> extends never ? true : false = true;
    expect(missing).toBe(true);
    expect(LEAVE_TYPES).toContain('Emergency');
  });
});
