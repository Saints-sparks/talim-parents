/**
 * Request bodies the parent app sends, each taken from the backend contract.
 *
 * Every alias is `RequestBody<path, method>` off the generated `api.d.ts`, so
 * a service that builds one of these is compared by `tsc` with the DTO the API
 * validates against. When a DTO changes and `npm run types:api` is run, the
 * builders that no longer fit stop compiling instead of returning a 400.
 *
 * Endpoints whose generated body is too loose to help are left hand-typed in
 * their service and are listed in `types.contract.test.ts`.
 */
import type { FormBody, RequestBody } from './apiContract';

/** `POST /payments/parent/initialize` (`InitializePaymentDto`). */
export type InitializePaymentPayload = RequestBody<'/payments/parent/initialize', 'post'>;

/** `POST /leave-requests` (`CreateLeaveRequestDto`). */
export type CreateLeaveRequestPayload = RequestBody<'/leave-requests', 'post'>;

/** `PATCH /parent/settings/profile` (`UpdateParentProfileDto`). */
export type UpdateProfilePayload = RequestBody<'/parent/settings/profile', 'patch'>;

/** `PATCH /parent/settings/password` (`ChangePasswordDto`). */
export type ChangePasswordPayload = RequestBody<'/parent/settings/password', 'patch'>;

/** `POST /parent/settings/phone/send-otp` (`SendPhoneOtpDto`). */
export type SendPhoneOtpPayload = RequestBody<'/parent/settings/phone/send-otp', 'post'>;

/** `POST /parent/settings/phone/verify-otp` (`VerifyPhoneOtpDto`). */
export type VerifyPhoneOtpPayload = RequestBody<'/parent/settings/phone/verify-otp', 'post'>;

/** `PATCH /parent/settings/theme` (`UpdateThemePreferenceDto`). */
export type ThemePayload = RequestBody<'/parent/settings/theme', 'patch'>;

/**
 * `PUT /auth/profile/avatar`. The contract declares the multipart form; the
 * route also accepts the text field as JSON, which is how the app sends it
 * after hosting the image itself.
 */
export type AvatarPayload = Required<Pick<FormBody<'/auth/profile/avatar', 'put'>, 'avatarUrl'>>;

/** `PATCH /notifications/preferences` (`UpdateNotificationPreferenceDto`). */
export type NotificationPreferencesPayload = RequestBody<'/notifications/preferences', 'patch'>;

/** `POST /notifications/web-push/subscribe` (`CreateWebPushSubscriptionDto`). */
export type WebPushSubscribePayload = RequestBody<'/notifications/web-push/subscribe', 'post'>;

/** `DELETE /notifications/web-push/subscribe` (`DeleteWebPushSubscriptionDto`). */
export type WebPushUnsubscribePayload = RequestBody<'/notifications/web-push/subscribe', 'delete'>;

/** `POST /auth/login`. */
export type LoginPayload = RequestBody<'/auth/login', 'post'>;

/** `POST /auth/introspect`. */
export type IntrospectPayload = RequestBody<'/auth/introspect', 'post'>;

/** `PUT /auth/profile/update` (`UpdateProfileDto`). */
export type UpdateAccountProfilePayload = RequestBody<'/auth/profile/update', 'put'>;
