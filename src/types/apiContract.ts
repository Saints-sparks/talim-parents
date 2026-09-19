/**
 * Helper types over the backend's generated API contract.
 *
 * `./api.d.ts` is a COPY of `talimBE-V2/docs/api-types.d.ts`, which the
 * backend generates from its controllers and DTOs with `openapi-typescript`.
 * Never edit the copy by hand. To refresh it after a backend contract change:
 *
 *   npm run types:api     # copies ../talimBE-V2/docs/api-types.d.ts
 *                         # (set TALIM_BACKEND_PATH for another checkout)
 *
 * then run `npm run typecheck`: every payload that no longer matches its DTO
 * fails here instead of coming back as a 400 in production (the API runs
 * `whitelist + forbidNonWhitelisted`).
 */
import type { components, paths } from './api';

/** HTTP methods the contract describes. */
export type ApiMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

/** The operation object for `METHOD path`. */
type Operation<P extends keyof paths, M extends ApiMethod> = NonNullable<paths[P][M]>;

/** The declared `application/json` request body of `METHOD path`, or `never`. */
export type RequestBody<P extends keyof paths, M extends ApiMethod = 'post'> =
  Operation<P, M> extends { requestBody?: infer RB }
    ? [NonNullable<RB>] extends [{ content: { 'application/json': infer B } }]
      ? B
      : never
    : never;

/**
 * The declared `multipart/form-data` request body of `METHOD path`, for the
 * upload endpoints whose text fields are also accepted as JSON.
 */
export type FormBody<P extends keyof paths, M extends ApiMethod = 'post'> =
  Operation<P, M> extends { requestBody?: infer RB }
    ? [NonNullable<RB>] extends [{ content: { 'multipart/form-data': infer B } }]
      ? B
      : never
    : never;

/**
 * The `application/json` body of a documented response, `200` or `201` unless
 * `S` names another status. `never` where the backend documents no body.
 */
export type ResponseBody<
  P extends keyof paths,
  M extends ApiMethod = 'get',
  S extends number = 200 | 201,
> =
  Operation<P, M> extends { responses: infer R }
    ? {
        [K in keyof R & S]: R[K] extends { content: { 'application/json': infer B } } ? B : never;
      }[keyof R & S]
    : never;

/** The query string of `METHOD path`, or `never`. */
export type QueryParams<P extends keyof paths, M extends ApiMethod = 'get'> =
  Operation<P, M> extends { parameters: { query?: infer Q } } ? NonNullable<Q> : never;

/** A named DTO schema, e.g. `Schema<'InitializePaymentDto'>`. */
export type Schema<N extends keyof components['schemas']> = components['schemas'][N];
