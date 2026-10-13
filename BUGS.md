# Known deferred bugs

## OTP input removes Persian and Arabic digits

- Recorded: 2026-10-13.
- Status: Deferred by the user for later review; no fix requested.
- Location: `src/components/auth/AuthForm.jsx`, OTP input `onChange` handler.
- Reproduction: Enter or paste `۱۲۳۴۵۶` or `١٢٣٤٥٦`; the `/\D/g` filter removes all digits before submission normalization can run.
- Effect: Users entering Persian or Arabic OTP digits cannot complete login with that input.
- Future fix: Normalize digits before filtering non-digit characters.

## Review scope exclusion

The production server does not currently use Light (نور). All Light-related issues are excluded from deployment bug reports until the user explicitly changes this scope.
