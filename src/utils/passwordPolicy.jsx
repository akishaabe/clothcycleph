export const passwordRules = [
  {
    id: "length",
    label: "At least 8 characters",
    test: (value) => value.length >= 8,
  },
  {
    id: "uppercase",
    label: "One uppercase letter",
    test: (value) => /[A-Z]/.test(value),
  },
  {
    id: "lowercase",
    label: "One lowercase letter",
    test: (value) => /[a-z]/.test(value),
  },
  {
    id: "number",
    label: "One number",
    test: (value) => /\d/.test(value),
  },
  {
    id: "symbol",
    label: "One symbol",
    test: (value) => /[^A-Za-z0-9]/.test(value),
  },
];

export const isStrongPassword = (value) =>
  passwordRules.every((rule) => rule.test(value));

export function PasswordChecklist({ password, confirmPassword = null }) {
  return (
    <div className="mt-3 rounded-xl border border-[#e7ebe6] bg-[#f8faf6] p-3 text-sm">
      <div className="mb-2 font-semibold text-[#19221d]">Password must include:</div>
      <div className="grid gap-1 text-[#5f6f67]">
        {passwordRules.map((rule) => {
          const passed = rule.test(password || "");
          return (
            <div
              key={rule.id}
              className={passed ? "text-[#336158]" : "text-[#7a6b52]"}
            >
              {passed ? "✓" : "•"} {rule.label}
            </div>
          );
        })}
        {confirmPassword !== null && (
          <div
            className={
              password && confirmPassword && password === confirmPassword
                ? "text-[#336158]"
                : "text-[#7a6b52]"
            }
          >
            {password && confirmPassword && password === confirmPassword ? "✓" : "•"} Passwords match
          </div>
        )}
      </div>
    </div>
  );
}
