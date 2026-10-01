import { Check, Circle } from 'lucide-react';
import { rulesFromPolicy } from '../../lib/passwordPolicy';
import type { PasswordPolicy } from '../../types/portal/school';

/**
 * The password checklist under a new-password field, built from the server's
 * policy. Each rule says whether it is met in words, not only by its icon,
 * and the list is live so screen readers hear it change.
 *
 * @param props - The password, the policy and the list's id.
 * @param props.password - What has been typed.
 * @param props.policy - The server's policy; the default while it loads.
 * @param props.id - The list's id, for the field's `aria-describedby`.
 * @returns The checklist.
 */
export function PasswordRules({ password, policy, id }: { password: string; policy?: PasswordPolicy | null; id: string }) {
  const rules = rulesFromPolicy(policy);
  return (
    <ul id={id} aria-live="polite" className="mt-2 flex flex-col gap-1.5 text-[13px]">
      {rules.map((rule) => {
        const met = rule.test(password);
        return (
          <li key={rule.id} className={`flex items-center gap-2 ${met ? 'text-green-700 dark:text-green-400' : 'text-gray-600 dark:text-slate-400'}`}>
            {met ? <Check className="h-4 w-4 shrink-0" aria-hidden="true" /> : <Circle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
            <span>
              {rule.label}
              <span className="sr-only">{met ? ' (done)' : ' (not yet)'}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
