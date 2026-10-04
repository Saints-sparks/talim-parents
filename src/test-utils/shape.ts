/**
 * Runtime shape checks for API answers, for the live contract test
 * (`src/__live__/contract.live.test.ts`).
 *
 * TypeScript types vanish at runtime, so a screen typed against the generated
 * contract can still receive something else from a running API. A {@link Rule}
 * describes what a screen reads; {@link checkShape} lists every place an answer
 * breaks it. Extra fields are allowed: the API keeps older fields alongside.
 *
 * `shape<T>()` only accepts keys of `T`, so a rule cannot drift from the type
 * it describes without `tsc` noticing.
 */

/** A primitive the answer must hold, or `unknown` for "present, any value". */
export type Primitive = 'string' | 'number' | 'boolean' | 'unknown';

/** What one value must look like. */
export type Rule =
  | Primitive
  | { kind: 'nullable'; rule: Rule }
  | { kind: 'optional'; rule: Rule }
  | { kind: 'array'; rule: Rule }
  | { kind: 'oneOf'; values: readonly (string | number | boolean | null)[] }
  | { kind: 'object'; fields: Record<string, Rule> };

/**
 * The value may be `null`.
 *
 * @param rule - What it must be otherwise.
 * @returns The rule.
 */
export const nullable = (rule: Rule): Rule => ({ kind: 'nullable', rule });

/**
 * The key may be missing (or `undefined`).
 *
 * @param rule - What it must be when present.
 * @returns The rule.
 */
export const optional = (rule: Rule): Rule => ({ kind: 'optional', rule });

/**
 * An array whose every item follows `rule`.
 *
 * @param rule - The item rule.
 * @returns The rule.
 */
export const arrayOf = (rule: Rule): Rule => ({ kind: 'array', rule });

/**
 * One of a fixed set of values (an enum).
 *
 * @param values - The allowed values.
 * @returns The rule.
 */
export const oneOf = (...values: (string | number | boolean | null)[]): Rule => ({ kind: 'oneOf', values });

/**
 * An object with these fields, each checked by its rule. Only keys of `T`
 * are accepted, so the rule follows the type.
 *
 * @param fields - A rule per field.
 * @returns The rule.
 */
export function shape<T>(fields: { [K in keyof T]?: Rule }): Rule {
  return { kind: 'object', fields: fields as Record<string, Rule> };
}

/**
 * The JSON type of a value, for messages.
 *
 * @param value - Any value.
 * @returns e.g. `null`, `array`, `string`.
 */
function typeName(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

/**
 * Every place `value` breaks `rule`.
 *
 * @param value - The answer (or part of it).
 * @param rule - What it must look like.
 * @param path - Where `value` sits, for messages (`$.lessons[0].colourKey`).
 * @returns One message per problem; empty when the value fits.
 */
export function checkShape(value: unknown, rule: Rule, path = '$'): string[] {
  if (typeof rule === 'string') {
    if (rule === 'unknown') return value === undefined ? [`${path}: missing`] : [];
    if (rule === 'number' && typeof value === 'number' && Number.isFinite(value)) return [];
    if (rule !== 'number' && typeof value === rule) return [];
    return [`${path}: expected ${rule}, got ${typeName(value)}${value === undefined ? ' (missing)' : ''}`];
  }
  switch (rule.kind) {
    case 'nullable':
      return value === null ? [] : checkShape(value, rule.rule, path);
    case 'optional':
      return value === undefined ? [] : checkShape(value, rule.rule, path);
    case 'oneOf':
      return rule.values.includes(value as string) ? [] : [`${path}: expected one of ${rule.values.map(String).join(' | ')}, got ${JSON.stringify(value)}`];
    case 'array':
      if (!Array.isArray(value)) return [`${path}: expected array, got ${typeName(value)}`];
      return value.flatMap((item, index) => checkShape(item, rule.rule, `${path}[${index}]`));
    case 'object': {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) return [`${path}: expected object, got ${typeName(value)}`];
      const record = value as Record<string, unknown>;
      return Object.entries(rule.fields).flatMap(([key, fieldRule]) => checkShape(record[key], fieldRule, `${path}.${key}`));
    }
  }
}
