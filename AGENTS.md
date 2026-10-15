<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<
## Deployment review scope

- The user confirmed on 2026-10-13 that the production server does not currently use the Light (نور) feature. Exclude all Light-related behavior, routes, balances, top-ups, and callbacks from deployment bug reviews. Do not report them again as bugs unless the user explicitly brings Light back into scope.
- Persian/Arabic OTP digits being removed by the input handler is a known deferred bug. Track it as HF12 in `../../ByeMoney/HOTFIXES.md`; do not fix it or present it as a newly discovered deployment blocker unless the user requests reconsideration.!-- END:nextjs-agent-rules -->

## اسناد مشترک

راهنمای فنی در `docs/Technical-Guide.md` و راهنمای مشترک در `../../ByeMoney/docs/README.md` است. کارهای باز اتصال فقط در `../../ByeMoney/TASKS.md` و باگ‌های سایت فعلی برای محمد فقط در `../../ByeMoney/HOTFIXES.md` ثبت شوند. سند تسک مستقل برای شاخه نسازید. پس از اتمام، ردیف انجام‌شده حذف و فقط خلاصهٔ شاهد آزمون و پذیرشِ باقی‌مانده حفظ شود؛ پرامپت‌ها و شرح اجرای قدیمی بازتولید نشوند.
