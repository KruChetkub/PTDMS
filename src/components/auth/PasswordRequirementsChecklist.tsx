import { CheckCircle2, Circle } from 'lucide-react';
import {
  getPasswordRequirementState,
  passwordRequirementDefinitions,
} from '../../features/auth/passwordPolicy';

type PasswordRequirementsChecklistProps = {
  password: string;
  confirmPassword?: string;
};

export function PasswordRequirementsChecklist({
  password,
  confirmPassword,
}: PasswordRequirementsChecklistProps) {
  const requirementState = getPasswordRequirementState(password);
  const confirmationMatches = Boolean(confirmPassword) && password === confirmPassword;

  return (
    <div className="space-y-2" aria-live="polite">
      <p className="text-sm font-medium text-slate-700">รหัสผ่านต้องประกอบด้วย</p>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {passwordRequirementDefinitions.map((requirement) => {
          const satisfied = requirementState[requirement.key];
          return (
            <li
              key={requirement.key}
              className={`flex items-center gap-2 text-xs ${satisfied ? 'text-emerald-700' : 'text-slate-500'}`}
            >
              {satisfied ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              ) : (
                <Circle className="h-4 w-4 shrink-0" aria-hidden="true" />
              )}
              <span>{requirement.label}</span>
            </li>
          );
        })}
        {confirmPassword !== undefined ? (
          <li className={`flex items-center gap-2 text-xs ${confirmationMatches ? 'text-emerald-700' : 'text-slate-500'}`}>
            {confirmationMatches ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <Circle className="h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            <span>รหัสผ่านทั้งสองช่องตรงกัน</span>
          </li>
        ) : null}
      </ul>
    </div>
  );
}

