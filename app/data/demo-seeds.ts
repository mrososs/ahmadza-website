import type { Category, ContentItem, ContentSection } from '~/types/content'
import { demoNotice, family, history, language, learning, lessons, occasions, society, studies, summaries, talks, thought, values } from '~/data/demo-shared'

// Generic placeholder material so every directory looks populated for client review.
// Every record is labelled demo content in its body and on its detail page; none is a claim about the site owner.

interface Seed {
  slug: string
  title: string
  excerpt: string
  date: string
  categories: Category[]
  body: string
  point: string
  pointHeading?: string
  featured?: boolean
}

const stamp = (date: string) => `${date}T09:00:00.000Z`

function common(prefix: string, seed: Seed) {
  return {
    id: `${prefix}-${seed.slug}`,
    slug: seed.slug,
    title: seed.title,
    excerpt: seed.excerpt,
    status: 'published' as const,
    publishedAt: stamp(seed.date),
    updatedAt: stamp(seed.date),
    categories: seed.categories,
    featured: seed.featured ?? false,
  }
}

const readingSections = (seed: Seed): ContentSection[] => [
  { id: 'intro', paragraphs: [demoNotice, seed.body] },
  { id: 'point', heading: seed.pointHeading ?? 'فكرة للتأمل', paragraphs: [seed.point] },
]

const article = (seed: Seed, readingMinutes: number): ContentItem => ({ ...common('article', seed), type: 'article', readingMinutes, sections: readingSections(seed) })
const benefit = (seed: Seed, readingMinutes: number): ContentItem => ({ ...common('benefit', seed), type: 'benefit', readingMinutes, sections: [{ id: 'main', paragraphs: [demoNotice, seed.body, seed.point] }] })
const sermon = (seed: Seed, readingMinutes: number): ContentItem => ({
  ...common('sermon', seed),
  type: 'sermon',
  readingMinutes,
  sections: [
    { id: 'first', heading: 'الخطبة الأولى', paragraphs: [demoNotice, seed.body] },
    { id: 'second', heading: 'الخطبة الثانية', paragraphs: [seed.point] },
  ],
})
const audio = (seed: Seed, durationSeconds: number): ContentItem => ({
  ...common('audio', seed),
  type: 'audio',
  durationSeconds,
  sections: [{ id: 'summary', heading: 'ملخص التسجيل', paragraphs: [demoNotice, seed.body] }],
})
const video = (seed: Seed, durationSeconds: number): ContentItem => ({
  ...common('video', seed),
  type: 'video',
  durationSeconds,
  sections: [{ id: 'summary', paragraphs: [demoNotice, seed.body] }],
})
const book = (seed: Seed, publicationYear: number, pageCount: number): ContentItem => ({
  ...common('book', seed),
  type: 'book',
  authorLabel: 'بيانات المؤلف قيد التزويد',
  publicationYear,
  pageCount,
  downloadAllowed: false,
  sections: [{ id: 'description', heading: 'عن هذا النموذج', paragraphs: [demoNotice, seed.body] }],
})

export const seededDemoContent: readonly ContentItem[] = [
  // Articles (9 more than the hand-written three)
  article({ slug: 'note-taking-habits', title: 'عادات التدوين التي تصنع الفهم', excerpt: 'مادة تجريبية عن تحويل الهوامش المبعثرة إلى دفتر معرفة يمكن الرجوع إليه.', date: '2026-10-10', categories: [learning], body: 'التدوين الجيد ليس نسخًا للنص، بل حوارٌ مختصر معه: ما الذي فهمته، وما الذي أستغربه، وما الذي أريد التحقق منه لاحقًا؟', point: 'اجعل لكل ملاحظة تاريخًا ومصدرًا وسؤالًا، فهكذا تعود إليها بعد أسابيع وهي ما زالت تتكلم.' }, 6),
  article({ slug: 'clarity-in-arabic-writing', title: 'وضوح العبارة في الكتابة العربية', excerpt: 'نموذج تجريبي عن الجملة القصيرة، والفعل الصريح، وترتيب الفكرة قبل زخرف الأسلوب.', date: '2026-09-30', categories: [language], body: 'تحتمل العربية الجملة الطويلة المتينة، لكن القارئ يحتاج إلى مواضع للتنفس. يبدأ الوضوح من معرفة ما نريد قوله قبل البحث عن كيف نقوله.', point: 'اقرأ فقرتك بصوت مسموع؛ فكل موضع تتعثر عنده هو موضع يحتاج إلى إعادة صياغة.' }, 5),
  article({ slug: 'verify-before-quoting', title: 'التحقق من المصدر قبل الاقتباس', excerpt: 'مادة تجريبية تشرح خطوات بسيطة للتثبت من النص ونسبته قبل نشره.', date: '2026-09-15', categories: [thought], body: 'سرعة النشر لا تُغني عن بطء التحقق. فالاقتباس الذي ينتقل بلا مصدر يكبر مع كل ناقل، ويصعب تصحيحه بعد ذلك.', point: 'ابحث عن أقدم موضع للنص، وقارن بين طبعتين، ودوّن رقم الصفحة أو الدقيقة في كل اقتباس.' }, 6),
  article({ slug: 'family-reading-circle', title: 'حلقة القراءة داخل الأسرة', excerpt: 'تجربة تجريبية لتخصيص وقت أسبوعي قصير تقرأ فيه الأسرة معًا وتتحاور.', date: '2026-09-02', categories: [family, values], body: 'يكفي ربع ساعة منتظمة ليصبح الكتاب موضوع حديث مشترك. وليس المطلوب إنهاء فصل كامل، بل ترك سؤال معلّق يعود إليه الجميع.', point: 'دع الأصغر يختار الفقرة أحيانًا؛ فالمشاركة تصنع الحب أكثر مما يصنعه التلقين.' }, 4),
  article({ slug: 'what-history-teaches', title: 'ما الذي نتعلمه من قراءة التاريخ؟', excerpt: 'نص تجريبي عن الفرق بين سرد الأحداث وفهم أسبابها وسياقاتها.', date: '2026-08-17', categories: [history, thought], body: 'قراءة التاريخ ليست جمعًا للتواريخ، بل تدريب على رؤية الأسباب المتعددة وتجنّب التفسير الواحد المريح.', point: 'اسأل دائمًا: من كتب هذا؟ ولمن؟ وماذا أغفل؟' }, 7),
  article({ slug: 'ethics-of-disagreement', title: 'أدب الاختلاف وحدوده', excerpt: 'مادة تجريبية عن الاختلاف المشروع وكيف يبقى الود قائمًا مع تباين الرأي.', date: '2026-07-28', categories: [values, society], body: 'الاختلاف في الرأي طبيعة بشرية، والمحكّ هو كيف نتعامل معه: بإنصاف في نقل قول المخالف، وهدوء في الرد، وإقرار بما عنده من صواب.', point: 'قبل أن تردّ، أعد صياغة رأي مخالفك بعبارة يرضاها هو؛ فإن لم تستطع فلم تفهمه بعد.' }, 6),
  article({ slug: 'libraries-as-memory', title: 'المكتبات ذاكرة المجتمع', excerpt: 'نموذج تجريبي عن دور المكتبات في حفظ المعرفة وإتاحتها للأجيال.', date: '2026-07-05', categories: [society, history], body: 'تحفظ المكتبة ما يعجز الأفراد عن حمله وحدهم. وكل كتاب مصون هو جسر بين جيل مضى وجيل يأتي.', point: 'من أراد أن يخدم المعرفة فليبدأ بترتيب ما عنده وإتاحته لمن حوله.' }, 5),
  article({ slug: 'brevity-and-completeness', title: 'بين الإيجاز والإحاطة في عرض العلم', excerpt: 'مادة تجريبية تقارن بين المختصر السريع والشرح المبسوط ومتى يناسب كلٌّ منهما.', date: '2026-06-20', categories: [language, thought], body: 'المختصر يفتح الباب والمبسوط يدخل البيت. ولكل قارئ مرحلة يحتاج فيها إلى أحدهما أكثر من الآخر.', point: 'ابدأ بالمختصر لتأخذ الخريطة، ثم انتقل إلى المبسوط لتعرف التضاريس.' }, 5),
  article({ slug: 'protecting-attention', title: 'حفظ الانتباه في زمن الشاشات', excerpt: 'نص تجريبي عن عادات عملية تحمي وقت القراءة العميقة من التشتت.', date: '2026-05-25', categories: [society, learning], body: 'الانتباه موردٌ محدود، وكل إشعار يقتطع منه. القراءة العميقة تحتاج إلى مساحة خالية من المقاطعات.', point: 'اجعل لهاتفك غرفة أخرى أثناء القراءة، وسترى الفرق في أسبوع واحد.' }, 4),

  // Sermons (9 more than the hand-written two)
  sermon({ slug: 'kindness-to-parents', title: 'بر الوالدين وحسن الصحبة', excerpt: 'خطبة تجريبية عن الإحسان إلى الوالدين ومعاني الوفاء في الأسرة.', date: '2026-10-16', categories: [family, values], featured: true, body: 'الحمد لله حمدًا كثيرًا، أما بعد: فإن أقرب الناس إلينا أحقهم بحسن صحبتنا. ويظهر البر في الكلمة الطيبة، والصبر عند الكِبر، والحرص على الزيارة والسؤال.', point: 'نوصي أنفسنا بتفقد من كبرت أعمارهم من أهلنا، وبأن نجعل لهم نصيبًا ثابتًا من أوقاتنا.' }, 8),
  sermon({ slug: 'guarding-the-tongue', title: 'حفظ اللسان وصدق الحديث', excerpt: 'خطبة تجريبية عن أثر الكلمة في العلاقات وأهمية الصدق.', date: '2026-09-18', categories: [values], body: 'الكلمة أمانة، وربّ كلمة تبني جسرًا وأخرى تهدم بيتًا. ومن عوّد لسانه الصدق سهل عليه أن يثبت في المواقف الصعبة.', point: 'فلنتعاهد على أن نقول خيرًا أو نصمت، وأن نتثبت قبل أن ننقل.' }, 7),
  sermon({ slug: 'cooperation-for-good', title: 'التعاون على الخير في المجتمع', excerpt: 'نص تجريبي عن العمل الجماعي ومبادرات الإصلاح بين الناس.', date: '2026-09-04', categories: [society], body: 'المجتمع القوي تبنيه مبادرات صغيرة كثيرة: جارٌ يتفقد جاره، ومتطوعٌ يعلّم، وصاحب خبرة يشارك علمه بلا منّة.', point: 'اسأل نفسك هذا الأسبوع: أي مبادرة صغيرة أستطيع أن أبدأها حيث أنا؟' }, 6),
  sermon({ slug: 'gratitude-and-contentment', title: 'شكر النعمة والقناعة', excerpt: 'خطبة تجريبية عن رضا النفس وشكر ما بين اليدين.', date: '2026-08-21', categories: [values], body: 'يرى كثيرون ما ينقصهم ويغفلون عما عندهم. والشكر عادة تُدرَّب، تبدأ بالالتفات إلى التفاصيل اليومية البسيطة.', point: 'دوّن كل مساء ثلاث نعم لم تنتبه لها في الصباح.' }, 6),
  sermon({ slug: 'welcoming-a-new-year', title: 'استقبال عام جديد بالعزيمة والمراجعة', excerpt: 'خطبة تجريبية للمناسبات تدعو إلى مراجعة ما مضى والتخطيط لما يأتي.', date: '2026-07-24', categories: [occasions], body: 'بين عامٍ يُطوى وعامٍ يُفتح تقف النفس لحظة محاسبة هادئة: ما الذي أنجزته؟ وما الذي أجّلته؟ وما الذي ينبغي أن أتركه؟', point: 'اكتب ثلاثة أهداف واقعية، واجعل لكل هدف خطوة تبدأ بها هذا الأسبوع.' }, 7),
  sermon({ slug: 'mercy-towards-the-young', title: 'رحمة الكبير بالصغير', excerpt: 'نص تجريبي عن الرفق بالأطفال وأثر المعاملة في تكوين الشخصية.', date: '2026-07-10', categories: [family, society], body: 'الطفل يتعلم من معاملتنا أكثر مما يتعلم من أقوالنا. والرفق في التوجيه لا يعني التفريط، بل يعني أن تصل النصيحة إلى القلب.', point: 'خصّص لكل ابن وقتًا خاصًا به في الأسبوع، ولو كان قصيرًا.' }, 6),
  sermon({ slug: 'honesty-in-dealings', title: 'الصدق في المعاملات', excerpt: 'خطبة تجريبية عن الأمانة في البيع والعمل والوعود.', date: '2026-06-05', categories: [values, society], body: 'الصدق في المعاملة رأس مال لا يظهر في الدفاتر، لكنه يظهر في ثقة الناس. ومن أخلف وعده مرة نقص ثقتهم به أكثر مما يتخيل.', point: 'لا تعد بما لا تستطيع، وإذا وعدت فاجعل وعدك مكتوبًا في ذاكرتك.' }, 6),
  sermon({ slug: 'road-etiquette', title: 'حقوق الطريق وآداب المرور', excerpt: 'نص تجريبي عن احترام الأنظمة ومراعاة حقوق الآخرين في الطريق.', date: '2026-05-15', categories: [society], body: 'الطريق مساحة مشتركة، ومن احترم قواعدها حفظ نفسه وغيره. وليست السرعة دليل مهارة، بل ربما كانت أول أسباب الحوادث.', point: 'اجعل من الهدوء عادة في قيادتك، فلن يضيع منك شيء مهم بدقيقة تأخير.' }, 5),
  sermon({ slug: 'patience-in-hardship', title: 'التواصي بالصبر في الشدائد', excerpt: 'خطبة تجريبية عن الثبات والتعاون وقت الأزمات.', date: '2026-04-24', categories: [values], body: 'الشدة تكشف معادن الناس، وتُظهر قيمة من يقف بجانبك بلا ضجيج. والصبر ليس سكوتًا، بل عمل هادئ وثبات على الطريق.', point: 'إذا ضاق بك أمر فاستعن بصديق صادق، وقسّم الهمّ إلى خطوات صغيرة.' }, 6),

  // Books (4 more than the hand-written two)
  book({ slug: 'introduction-to-research-skills', title: 'مدخل إلى مهارات البحث', excerpt: 'كتاب تجريبي لعرض صفحة كتاب في مجال الدراسات، من غير ملف مرفق.', date: '2026-02-10', categories: [studies, learning], featured: true, body: 'يعرض هذا السجل التجريبي كيف تُقدَّم بيانات الكتاب: العنوان والوصف وعدد الصفحات وسنة النشر، مع بيان صادق بعدم توفر ملف PDF.', point: '' }, 2025, 142),
  book({ slug: 'a-short-guide-to-student-manners', title: 'مختصر في آداب طالب العلم', excerpt: 'نموذج كتاب مختصر لاختبار قوائم الكتب والتصنيف.', date: '2025-11-05', categories: [summaries], body: 'سجل تجريبي يوضح شكل المختصرات في المكتبة وطريقة عرض بياناتها ووصفها القصير.', point: '' }, 2024, 96),
  book({ slug: 'readings-in-language-and-rhetoric', title: 'قراءات في اللغة والبيان', excerpt: 'كتاب تجريبي يختبر العناوين الطويلة وعرض التصنيفات اللغوية.', date: '2025-08-14', categories: [language, studies], body: 'نموذج لكتاب في اللغة والبيان، يُستخدم هنا لمعاينة تخطيط الصفحة قبل إضافة الإصدارات الحقيقية.', point: '' }, 2025, 210),
  book({ slug: 'lives-and-lessons', title: 'سيَر وعِبر', excerpt: 'نموذج كتاب في التاريخ والسيَر لمعاينة صفحات الكتب المتعددة.', date: '2025-03-22', categories: [history], body: 'سجل تجريبي لكتاب في السيَر والعبر، من دون ادعاء بوجود إصدار أو ملف قراءة.', point: '' }, 2023, 168),

  // Audio (7 more than the hand-written two)
  audio({ slug: 'research-skills-part-1', title: 'مدخل إلى مهارات البحث – الحلقة 1', excerpt: 'تسجيل تجريبي: تحديد موضوع البحث وصياغة السؤال الرئيس.', date: '2026-10-12', categories: [lessons], featured: true, body: 'تتناول هذه الحلقة التجريبية كيف يتحول الاهتمام العام إلى سؤال بحثي محدد يمكن الإجابة عنه.', point: '' }, 2460),
  audio({ slug: 'research-skills-part-2', title: 'مدخل إلى مهارات البحث – الحلقة 2', excerpt: 'تسجيل تجريبي: البحث عن المصادر وترتيب الأولويات.', date: '2026-10-05', categories: [lessons], body: 'حلقة تجريبية عن أنواع المصادر، وكيف نفرّق بين الأصيل والمنقول والمشتق.', point: '' }, 2310),
  audio({ slug: 'research-skills-part-3', title: 'مدخل إلى مهارات البحث – الحلقة 3', excerpt: 'تسجيل تجريبي: تدوين الملاحظات وتنظيم الاقتباسات.', date: '2026-09-28', categories: [lessons], body: 'حلقة تجريبية عن طرق تدوين الملاحظات، وربط كل اقتباس بمصدره ورقم صفحته.', point: '' }, 2180),
  audio({ slug: 'research-skills-part-4', title: 'مدخل إلى مهارات البحث – الحلقة 4', excerpt: 'تسجيل تجريبي: كتابة المسودة الأولى ومراجعتها.', date: '2026-09-21', categories: [lessons], body: 'حلقة تجريبية عن الانتقال من الملاحظات إلى مسودة مقروءة، ثم إلى نسخة أنضج.', point: '' }, 2390),
  audio({ slug: 'reading-in-a-fast-age', title: 'محاضرة: القراءة في زمن السرعة', excerpt: 'محاضرة عامة تجريبية عن حفظ وقت القراءة العميقة.', date: '2026-08-02', categories: [talks], body: 'تعرض هذه المحاضرة التجريبية عادات عملية تعين على القراءة المتأنية وسط الانشغال.', point: '' }, 3240),
  audio({ slug: 'calm-parenting', title: 'محاضرة: التربية الهادئة', excerpt: 'محاضرة تجريبية عن الحزم الرفيق وبناء الثقة داخل الأسرة.', date: '2026-06-14', categories: [talks, lessons], body: 'تدور هذه المحاضرة التجريبية حول الجمع بين وضوح القواعد ودفء العلاقة.', point: '' }, 2950),
  audio({ slug: 'manners-of-dialogue', title: 'درس: آداب الحوار', excerpt: 'درس تجريبي قصير عن الإصغاء وحسن عرض الرأي.', date: '2026-03-30', categories: [lessons], body: 'درس تجريبي يختبر عرض مدة التسجيل ووصفه المختصر في صفحات الصوتيات.', point: '' }, 1560),

  // Benefits (6 more than the hand-written two)
  benefit({ slug: 'write-the-idea-in-your-words', title: 'اكتب الفكرة بكلماتك', excerpt: 'بعد كل قراءة، لخّص الفكرة في جملتين دون العودة إلى النص.', date: '2026-10-20', categories: [learning], featured: true, body: 'إعادة الصياغة تكشف ما فهمته فعلًا وما ظننت أنك فهمته.', point: 'فإن عجزت عن التلخيص فعُد إلى الموضع الذي غمض عليك.' }, 1),
  benefit({ slug: 'start-with-five-minutes', title: 'ابدأ بخمس دقائق', excerpt: 'العادة تبدأ صغيرة؛ وخمس دقائق يوميًا تتحول مع الأيام إلى كتاب كامل.', date: '2026-10-08', categories: [learning], body: 'لا تنتظر وقتًا طويلًا فارغًا، فلن يأتي. ابدأ بما تستطيع اليوم.', point: 'المهم أن يكون لك موعد ثابت لا أن يكون طويلًا.' }, 1),
  benefit({ slug: 'review-before-sleep', title: 'راجع قبل أن تنام', excerpt: 'مراجعة قصيرة مساءً تثبّت ما قرأته أكثر من ساعة قراءة إضافية.', date: '2026-08-26', categories: [learning], body: 'الدماغ يرتب ما تعلمه أثناء النوم، فامنحه مادة مرتبة.', point: 'اقرأ ملاحظاتك السريعة آخر النهار ثم أغلق الدفتر.' }, 1),
  benefit({ slug: 'ask-what-is-the-evidence', title: 'اسأل: ما الدليل؟', excerpt: 'سؤال بسيط يحميك من كثير من الأخطاء عند قراءة الأخبار والمنقولات.', date: '2026-07-19', categories: [thought], body: 'الدليل لا يعني التشكيك في كل شيء، بل التعوّد على طلب ما يدعم الدعوى.', point: 'اجعله عادة هادئة لا هجومًا على أحد.' }, 1),
  benefit({ slug: 'read-aloud-to-edit', title: 'اقرأ بصوت منخفض لتحسّن كتابتك', excerpt: 'الأذن تلتقط ما تفوّته العين: التكرار، والجمل الطويلة، والكلمات الثقيلة.', date: '2026-06-09', categories: [language], body: 'قراءة النص بصوت مسموع تكشف مواضع التعثر بسرعة.', point: 'ضع علامة عند كل موضع تتعثر فيه ثم أعد صياغته.' }, 1),
  benefit({ slug: 'organise-by-topic', title: 'رتّب مكتبتك بالموضوع', excerpt: 'ترتيب الكتب بحسب الموضوع يسهّل الوصول ويكشف الثغرات.', date: '2026-04-11', categories: [learning], body: 'حين تجتمع كتب الموضوع الواحد تظهر لك العلاقات بينها، وتعرف ما ينقصك.', point: 'ابدأ برفّ واحد، ثم عمّم ما تعلمته على بقية الرفوف.' }, 1),

  // Videos (2 more than the hand-written two)
  video({ slug: 'reading-a-book-cover-to-index', title: 'كيف نقرأ كتابًا من الغلاف إلى الفهرس؟', excerpt: 'فيديو تجريبي بلا رابط YouTube؛ يعرض بطاقة المرئيات وحالة عدم توفر المشاهدة.', date: '2026-09-27', categories: [learning], body: 'وصف تجريبي لخطوات تصفح الكتاب قبل قراءته: الغلاف والمقدمة والفهرس والخاتمة.', point: '' }, 1260),
  video({ slug: 'writing-a-good-summary', title: 'خطوات كتابة ملخص جيد', excerpt: 'فيديو تجريبي ثالث لاختبار شبكة المرئيات في الصفحة الرئيسة.', date: '2026-05-30', categories: [language, learning], body: 'وصف تجريبي لطريقة تحويل صفحات طويلة إلى ملخص واضح من دون فقدان المعنى.', point: '' }, 840),
  video({ slug: 'focus-while-reading', title: 'أسرار التركيز أثناء القراءة', excerpt: 'فيديو تجريبي عن تهيئة المكان والوقت لقراءة هادئة بلا مقاطعات.', date: '2026-07-22', categories: [learning], body: 'وصف تجريبي لعادات صغيرة تحفظ الانتباه: مكان ثابت، وموعد قصير، وهدف واضح لكل جلسة.', point: '' }, 920),
  video({ slug: 'citing-sources-in-a-short-paper', title: 'كيف نوثّق المصادر في بحث قصير؟', excerpt: 'فيديو تجريبي يعرض طريقة بسيطة لتوثيق الاقتباسات وترتيب المراجع.', date: '2026-06-26', categories: [thought, studies], body: 'وصف تجريبي لخطوات توثيق المصدر وقت الاقتباس بدل تأجيله إلى آخر البحث.', point: '' }, 1140),
  video({ slug: 'ten-minute-weekly-review', title: 'مراجعة أسبوعية في عشر دقائق', excerpt: 'فيديو تجريبي قصير عن مراجعة ما قُرئ وكُتب خلال الأسبوع.', date: '2026-04-18', categories: [learning], body: 'وصف تجريبي لطريقة سريعة لمراجعة الملاحظات وتحديد ما يستحق العودة إليه.', point: '' }, 610),
  video({ slug: 'open-talk-on-reading-and-society', title: 'حوار مفتوح حول القراءة والمجتمع', excerpt: 'فيديو تجريبي طويل لاختبار بطاقات المحاضرات والحوارات.', date: '2026-02-20', categories: [society, talks], body: 'وصف تجريبي لحوار مفتوح يتناول أثر القراءة في الأسرة والمجتمع.', point: '' }, 2420),
]
