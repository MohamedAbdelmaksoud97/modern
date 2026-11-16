# تسليم ربط WhatsApp / WAHA

آخر تحديث: 16 نوفمبر 2026، بتوقيت القاهرة.

## ابدأ من هنا

المستخدم طلب تجهيز WhatsApp بالكامل بتكلفة صفر، ثم طلب توثيق ما تم ليستكمل في جلسة جديدة. **WAHA منشور بالفعل على Render، ومربوط بموقع Vercel، وتخزين الجلسة يعمل في PostgreSQL. المتبقي الأساسي هو تثبيت وتشغيل Google Apps Script كل 10 دقائق، ثم مسح QR من واجهة الموقع والتحقق من رسالة فعلية.**

لم يتم ربط هاتف، ولم تُرسل رسائل WhatsApp فعلية. نجاح استخراج QR واختبارات الكود لا يثبت وصول رسالة إلى هاتف.

## أماكن العمل والروابط

الفولدر القديم `F:\newproject\modern` نُقل. استخدم المسارات التالية:

| الجزء | المكان |
|---|---|
| جذر العمل | `F:\newproject\modern2` |
| الموقع الرئيسي Next.js | `F:\newproject\modern2\modern` |
| خدمة WAHA وExpress المستقلة | `F:\newproject\modern2\waha` |
| مستودع الموقع | [modern](https://github.com/MohamedAbdelmaksoud97/modern)، فرع `codex/modern-platform` |
| مستودع WAHA الخاص | [modern-waha](https://github.com/MohamedAbdelmaksoud97/modern-waha)، فرع `codex/waha-render` |
| موقع الإنتاج | [Modern](https://modern-alpha-rose.vercel.app/) |
| WAHA المنشور | [modern-waha](https://modern-waha.onrender.com/healthz) |
| لوحة خدمة Render | [modern-waha على Render](https://dashboard.render.com/web/srv-dbtfvsbbc2fs73f3ecrg) |

آخر commit وظيفي للموقع عند إعداد التسليم: `bc89fdb`، ويشمل تخزين الجلسات وإصلاح إعادة بدء الربط. آخر commit منشور لخدمة WAHA: `46711afd3e4b20b61db14488218864eac953b143`. قد توجد commits توثيق أحدث؛ افحص Git قبل التعديل.

## ما تم بالفعل

### خدمة Render

- أنشئ مستودع GitHub مستقل **خاص**، ورُفع الكود وربطته إضافة Render بالحساب بنجاح.
- الخدمة `modern-waha` على خطة **Free**، في `frankfurt`، بنسخة واحدة وDocker runtime، والنشر التلقائي مفعّل لفرع `codex/waha-render`.
- Workspace: `tea-d300e1n5r7bs73at5n50`. Service: `srv-dbtfvsbbc2fs73f3ecrg`.
- الخدمة تستخدم WAHA الحقيقي من الصورة المثبتة في `waha/Dockerfile`، وليست محاكاة Express لواتساب. المحرك `NOWEB` لتقليل استهلاك الذاكرة.
- `waha/src/start.mjs` يشغّل عملية WAHA الداخلية على منفذ `3001` ويشرف عليها وينهي الخدمة إذا خرجت العملية، مع تمرير إشارات الإغلاق.
- Express على منفذ Render الخارجي `3000`. `GET /healthz` يعيد فقط `{ "ok": true }`، و`/api/*` يمرر الطلبات إلى WAHA الداخلي بعد فحص `X-Api-Key`.
- اختُبر مسار health من الإنترنت: HTTP 200. طلب API بلا مفتاح: HTTP 401.
- ملف `render.yaml` يحدد `healthCheckPath: /healthz`، لكن إضافة إنشاء الخدمة لم تطبق هذا الحقل؛ آخر قراءة للخدمة الفعلية أظهرت `healthCheckPath` فارغًا، وبالتالي فحص Render الافتراضي TCP. مسار `/healthz` نفسه يعمل ويصلح لطلب Google الدوري. يمكن ضبط health check من لوحة Render إذا توفرت أدواتها، دون إنشاء خدمة أخرى.
- Dashboard وSwagger وتنزيل الوسائط معطّلة. أضيفت قيم خاصة منفصلة لكلمات مرور Dashboard/Swagger لمنع توليدها وطباعتها تلقائيًا عند التشغيل؛ البوابة الخارجية تمرر `/api/*` فقط.

### PostgreSQL على Supabase الموجود

- اختير تخزين WAHA الأصلي في PostgreSQL، دون قرص Render مدفوع أو قاعدة Render جديدة.
- المستخدم المنفصل `modern_waha` يملك قاعدتي `waha_modern` و`waha_modern_default` على نفس خادم PostgreSQL الموجود.
- لهذا المستخدم `LOGIN` و`CREATEDB`، لأن دورة عمل WAHA الأصلية تنشئ وتحذف قواعد جلساتها. ليس superuser، ولا يملك دور `modern_app` أو صلاحية استخدام schema المكتب `modern`. الحد 24 اتصالًا.
- أزيلت صلاحيات `PUBLIC` على القاعدتين. اختبار كتابة بيانات مؤقتة، إغلاق الاتصال، وقراءتها باتصال مستقل نجح، مع إزالة جدول الاختبار.
- بعد تشغيل WAHA فعليًا ظهرت جداول `session_config` و`session_worker` وغيرها في `waha_modern`، وجدول `auth` في `waha_modern_default`.
- الاتصال يستخدم Supabase **session pooler على 5432**؛ تم التحقق فعليًا من دعم الاتصال بالقواعد الإضافية بالمستخدم الخاص. حافظ على `WAHA_NAMESPACE=modern` و`WAHA_SESSION_NAMESPACE=modern` واسم الجلسة `default`.
- الصورة تتضمن شهادة `certs/supabase-ca.crt`، وpatch محروسًا يغيّر تحقق TLS في WAHA إلى `rejectUnauthorized: true`، مع `NODE_EXTRA_CA_CERTS` و`PGSSLMODE=verify-full`.
- `scripts/enforce-postgres-tls.mjs` يفشل أثناء البناء إذا تغير النمط المتوقع في النسخة المثبتة. عنوان التخزين الحالي يستخدم SSL؛ حافظ عليه ولا تستخدم `sslmode=disable`.
- سكربت الإدارة القابل لإعادة التشغيل موجود في الموقع: `scripts/setup-waha-storage.mjs`، عبر `npm run whatsapp:storage:setup`. لا توجد حاجة لإعادة إنشاء المستخدم أو القواعد لاستكمال الجدولة.

### موقع Vercel

- تسجيل الدخول الصحيح الحالي: `mahmoudhoarra2000-6432`، وفريق `go2-0d14`، ومعرّفه `team_fSMsAUxL4X7WOcArU6zUG0YB`.
- مشروع الموقع `modern`، ومعرّفه `prj_ae3KlZZ4ajNmF6ob4s4Egm7dvEEv`.
- أول تسجيل دخول تم بحساب آخر لا يملك Modern (`mohamedhoarra-8566` / `mohamed-bbc2`)، ثم صححه المستخدم. تحقق من الحساب والفريق قبل أي تعديل جديد.
- أضيفت إعدادات **Production** إلى المشروع الفعلي: `WAHA_URL=https://modern-waha.onrender.com`، و`WAHA_SESSION=default`، والمفاتيح المتطابقة `WAHA_API_KEY` و`WAHA_WEBHOOK_SECRET` و`CRON_SECRET`.
- أعيد نشر الموقع، وتحقق أن نشر الإنتاج وصل `READY` وأن عنوان الموقع الأصلي ما زال يعمل. أحدث قراءة لحالة النشر تحفظ في الملف الخاص `.local/whatsapp/vercel-rollout.json`؛ أعد فحص الرابط الأصلي عند الاستكمال لأن commits التوثيق قد تولد نشرًا أحدث.
- فُعّلت الإشعارات العامة في `modern.notification_settings`، مع الحفاظ على القوالب والأحداث وتفضيلات العملاء وقواعد رؤية المشروع. قائمة الرسائل كانت فارغة عند التفعيل.
- `/api/cron/notifications` بدون المفتاح يعيد 401؛ بالمفتاح الصحيح أعاد 200 و`status=not_connected` و`processed=0`، وهي النتيجة المتوقعة قبل مسح QR.
- `/api/webhooks/waha` يرفض الطلب غير الموقع بـ401. وصلت أحداث حالة حقيقية من WAHA، وسُجّلت في `modern.waha_webhook_events` و`modern.waha_sessions`؛ التحقق وجد 12 حدثًا وحالة `SCAN_QR_CODE` وقت الفحص. الأعداد والحالة تتغير مع التشغيل.

### مسار QR وإصلاح انتهاء الصلاحية

- استخدم نفس `createWahaClient` في `modern/lib/server/whatsapp.ts` للاتصال بالخدمة المنشورة: إنشاء جلسة `default` نجح، ثم `STARTING` ثم `SCAN_QR_CODE`، ثم استخراج صورة PNG حقيقية بنجاح.
- تحقق هذا مرة أخرى بعد إعادة نشر خدمة Render؛ أعادت WAHA تحميل الجلسة الموجودة من PostgreSQL بدل فقد إعدادها. لم تُختبر استعادة جلسة هاتف مقترن لأن الهاتف لم يُربط بعد.
- QR غير الممسوح تنتهي صلاحيته وقد تصبح الجلسة `FAILED`. على WAHA المنشور، `start` وحده لم يستعد منها، بينما `restart` نجح وأنتج QR جديدًا.
- أُصلح `sessionAction("start")` ليستخدم `restart` تلقائيًا فقط إذا كانت الحالة الحالية `FAILED`. اختبار regression فشل قبل التعديل ونجح بعده. الإصلاح منشور في الموقع ومرفوع إلى GitHub.
- للاستخدام من الموقع: حساب مدير، إدارة واتساب، **بدء الربط** ثم **رمز الربط**، ثم مسح الرمز من الأجهزة المرتبطة على هاتف المكتب. اطلب رمزًا جديدًا من الواجهة بدل الاعتماد على صورة QR قديمة محفوظة أثناء الفحص.

## المتبقي: Google Apps Script

**لم يُنشأ أو يُفعّل trigger فعلي في حساب Google حتى الآن.** المتوفر كود جاهز ومختبر فقط:

- `waha/google-apps-script/Code.gs`
- `waha/google-apps-script/appsscript.json`
- الإعدادات الخاصة الجاهزة محليًا في الموقع: `.local/whatsapp/google-script-properties.json` و`.local/whatsapp/google-setup.gs`. افتحها داخل بيئة العمل فقط عند استخدامها، دون طباعة قيم الأسرار في المحادثة.

الكود يقرأ Script Properties:

| المفتاح | الغرض |
|---|---|
| `WAHA_HEALTH_URL` | `https://modern-waha.onrender.com/healthz` |
| `MODERN_CRON_URL` | `https://modern-alpha-rose.vercel.app/api/cron/notifications` |
| `CRON_SECRET` | المفتاح الخاص المتطابق مع Vercel؛ يؤخذ من الملفات الخاصة |

`keepWahaAlive` يطلب health أولًا، ثم يشغّل قائمة الإشعارات عبر طلب منفصل للموقع يحمل `Authorization: Bearer ...`. المفتاح لا يُرسل إلى مسار health. إعادة التوجيه معطلة حتى لا ينتقل المفتاح لجهة أخرى. نتيجة `not_connected` مقبولة قبل ربط الهاتف؛ `not_configured` تعتبر خطأ إعداد.

`installKeepAlive` ينفذ فحصًا أوليًا ثم ينشئ trigger كل 10 دقائق إذا لم يوجد trigger لنفس الدالة؛ إعادة تشغيله لا تضيف نسخة مكررة. Manifest يستخدم `Africa/Cairo` وV8 والصلاحيات الخاصة بالطلبات الخارجية وإدارة triggers.

### خطوات الاستكمال ومعيار النجاح

1. افحص توفر أدوات Computer Use/المتصفح في الجلسة الجديدة. المستخدم طلب التحكم عبر Computer Use، وأكد تفعيلها وأعاد توصيلها، لكن هذه الجلسة لم تستلم أي أداة للتحكم في Chrome؛ لم تُنفذ أي خطوات Google عبر UI. المهارة متاحة، أما أدوات التشغيل فكانت غائبة. لا تعاود مطالبة المستخدم بإرسال كلمات مرور أو مفاتيح.
2. إذا أصبحت الأدوات متاحة: افتح Apps Script بحساب المستخدم، أنشئ مشروعًا، ضع الكود والـmanifest وScript Properties الخاصة. اترك موافقات تسجيل الدخول وGoogle الأمنية للمستخدم عندما تتطلب ذلك.
3. شغّل `installKeepAlive` مرة واحدة وتحقق من وجود trigger كل 10 دقائق.
4. تحقق من تنفيذ فوري ناجح ثم تنفيذ مجدول ناجح داخل صفحة Executions. لا تعتبر وجود الكود وحده تفعيلًا للجدولة.
5. بعد مسح QR من الواجهة: يجب أن تصل حالة WAHA إلى `WORKING` في الموقع، ثم يتحقق المستخدم من وصول رسالة اختبار مصرح بها وتحديث حالة التسليم. لم يُحدد رقم لاختبار الإرسال في هذه الجلسة.

المستخدم وافق مبدئيًا على الإكمال بالطريقة المتاحة، ثم طلب هذا التسليم لبدء جلسة جديدة. لم يبدأ تسجيل دخول Google أو إعداد clasp أو إنشاء مشروع Google عبر CLI. يمكن مناقشة البديل الرسمي إذا ظلت Computer Use غير متاحة، مع إبقاء موافقات الحساب للمستخدم.

## الملفات الخاصة ومراعاة الأسرار

هذه الملفات متجاهلة في Git؛ تحتوي أسرارًا أو بيانات تحقق خاصة، ويكفي الرجوع إليها محليًا عند الحاجة:

- `modern/.env.local`: اتصال قاعدة البيانات المحلي، وأضيف إليه Vercel OIDC عبر CLI.
- `modern/deployment/waha.env`: مفاتيح WAHA/webhook/cron وعنوان التخزين الخاص.
- `modern/.local/whatsapp/vercel.env`: مجموعة إعدادات الموقع المتطابقة.
- `modern/.local/whatsapp/render.env`: إعدادات Render المحضرة سابقًا؛ كلمات مرور Dashboard/Swagger الإضافية موجودة في `waha/.local/render-extra.env` وفي Render الفعلي.
- `modern/.local/whatsapp/service-plan.json`: ملخص نشر محلي؛ يجب مطابقته بحالة Render/Vercel الفعلية عند الاستكمال.
- `modern/.local/whatsapp/check-live.mjs` و`live-routes.json` و`live-qr.png`: آثار تحقق محلية. صورة QR قديمة وتتغير صلاحيتها.
- `modern/.local/bootstrap.json`: بيانات bootstrap قديمة؛ محاولة تسجيل دخول واحدة بها أعادت 401. لا تكرر استخدامها أو تغيّر حساب المدير بغرض الاختبار.

فُحصت ملفات Git المرحّلة مقابل قيم الأسرار الخاصة قبل رفع المستودعين. لا تضع ملفات `.env` أو Script Properties أو cookies أو مفاتيح API في Git أو ملفات التسليم. عند قراءة logs، أخف كلمات المرور وعناوين الاتصال والمفاتيح، بما فيها القيم التي قد تولدها WAHA تلقائيًا.

## الاختبارات والأدلة

- `waha`: `npm test` — **5 ناجحة**؛ health، حماية API، تمرير POST وQR binary، تعطل upstream، وجدولة Google بدون تكرار وتسريب مفتاح الطلب.
- `modern`: `npm run test:whatsapp` — **12 ناجحة، واختبار integration واحد متجاوز** لأنه يحتاج تفعيلًا صريحًا وبيئة اختبار مناسبة. لا تفعّله على الإنتاج عشوائيًا.
- `modern`: `npm test` — **9 ناجحة**، بما فيها اختبارات PostgreSQL/RLS والصلاحيات.
- `modern`: `npm run typecheck` و`npm run lint` — نجحا بعد إصلاح الجلسة.
- صورة Docker بُنيت ونُشرت بنجاح على Render، وحدث نشر ثانٍ لإعدادات البيئة؛ انتهى كلاهما بحالة live. هذا يتجاوز قيد عدم وجود Docker محلي.
- المراجعة المستقلة لم تجد مشاكل مهمة في بوابة WAHA أو الإصلاح الصغير في عميل الموقع.
- إعادة تشغيل تطبيق الموقع على Vercel نجحت، واختبارات cron/webhook من الإنترنت نجحت كما سبق. لم يتم اختبار واجهة المدير بصريًا في هذه الجلسة لغياب أدوات التحكم.

## حدود التكلفة والاستضافة

القيد الصريح للمستخدم **صفر تكلفة**. أُنشئت خدمة Render بخطة Free فقط، ولم تُنشأ أقراص أو قواعد بيانات أو Cron Jobs مدفوعة.

Render Free يسكن بعد الخمول ويمكنه إعادة التشغيل، وله 750 ساعة مجانية مشتركة لكل workspace شهريًا. توجد خدمتان أخريان نشطتان مجانيتان (`gofitness` و`gosystem`) وقت الفحص، لذلك استمرار WAHA طوال الشهر ليس مضمونًا حتى بعد إضافة طلب Google كل 10 دقائق. لم تُعدّل أو توقف الخدمات الأخرى. اطلب قرار المستخدم قبل أي تغيير عليها أو ترقية مدفوعة.

Vercel الآن يدعم Docker وDaemons؛ الوصف السابق أنه لا يشغّل Docker كان مطلقًا أكثر من اللازم وتم تصحيحه. Container Runtime يسكن بعد 5 دقائق بلا طلبات، وDaemons حاليًا لا تستقبل inbound HTTP/TCP ولها حصة Hobby غير كافية لشهر متصل؛ لهذا استُخدمت خدمة Render منفصلة مع الموقع على Vercel.

مراجع عند الحاجة: [Render Free](https://render.com/docs/free)، [Vercel Container Runtime](https://vercel.com/docs/functions/runtimes/container)، [Vercel Daemon limits](https://vercel.com/docs/daemons/limits)، [WAHA PostgreSQL](https://waha.devlike.pro/docs/how-to/storages/)، [Google everyMinutes](https://developers.google.com/apps-script/reference/script/clock-trigger-builder).

## سياق الواجهة السابق

الشغل السابق على UI موجود بالفعل في المستودع: Tajawal للعربي وRoboto للإنجليزي حتى داخل الواجهة العربية، شعار الموقع في تبويب المتصفح، أيقونة Instagram أوضح، وزر WhatsApp يمين الواجهة العربية. لا تعِد تنفيذ ذلك عند استكمال الربط. commit `7426862` يوثق آخر إصلاح للخطوط وأيقونة Instagram قبل عمل التخزين.

## بداية مقترحة للجلسة الجديدة

> اقرأ `F:\newproject\modern2\modern\docs\WHATSAPP-HANDOFF.md`، ثم أكمل Google Apps Script كل 10 دقائق والتحقق من جاهزية WhatsApp بعد مسح QR. WAHA وRender وVercel وPostgreSQL جاهزون بالفعل. حافظ على شرط صفر تكلفة، وابدأ بالتحقق من توفر Computer Use.
