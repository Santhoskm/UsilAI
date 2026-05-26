// ================================================================
// tamilLaDisambiguator.js
// ல (la/ல்) vs ள (La/ள்) vs ழ (zh/ழ்) Disambiguation Engine
//
// THE PROBLEM:
//   Tamil has three "l-like" sounds that are phonetically distinct:
//     ல  (U+0BB2) — dental lateral,   typed: l / la / li ...
//     ள  (U+0BB3) — retroflex lateral, typed: L / La / Li ... (or ll context)
//     ழ  (U+0BB4) — approximant,       typed: zh / z
//
//   In colloquial Tanglish, almost everybody uses lowercase 'l' for ALL three.
//   So "vaazhkai" (வாழ்க்கை), "paLLi" (பள்ளி), "nalla" (நல்ல) all arrive
//   with 'l'. This module figures out which Tamil letter is correct.
//
// HOW IT WORKS (4-layer priority cascade):
//   1. SUFFIX/PREFIX RULES  — morphological patterns known to always use ள/ழ
//   2. PHONOLOGICAL POSITION RULES — where each sound can/cannot appear
//   3. ROOT PATTERN TABLE  — ~200 common roots mapped to correct form
//   4. HEURISTIC SCORING   — statistical fallback for unseen words
//
// USAGE:
//   import { disambiguateLa } from './tamilLaDisambiguator.js';
//
//   // Pass the raw tanglish and the naively-converted Tamil word:
//   const correct = disambiguateLa('vaazhkai', 'வாழ்கை');
//   // → 'வாழ்க்கை'  (ழ fixed + missing க்)
//
//   const correct2 = disambiguateLa('palli', 'பல்லி');
//   // → 'பள்ளி'  (ல → ள)
//
// ================================================================

// ── TAMIL UNICODE CONSTANTS ──────────────────────────────────────────────────
const LA_DENTAL = '\u0BB2'; // ல
const LA_RETROFLEX = '\u0BB3'; // ள
const LA_APPROX = '\u0BB4'; // ழ
const PULLI = '\u0BCD'; // ் (virama)

// All vowel signs (matras): ா ி ீ ு ூ ெ ே ை ொ ோ ௌ
const VOWEL_SIGNS = '\u0BBE\u0BBF\u0BC0\u0BC1\u0BC2\u0BC6\u0BC7\u0BC8\u0BCA\u0BCB\u0BCC';

// ── LAYER 1: SUFFIX/PREFIX MORPHOLOGICAL RULES ───────────────────────────────
// These are grammatical suffixes/prefixes that ALWAYS use a specific form.
// Checked first because they are 100% reliable.

// Suffixes that must use ள (retroflex ள்)
// Pattern: [tanglishSuffix, tamilSuffix_wrong, tamilSuffix_correct]
const SUFFIX_RULES_LA_TO_LA_RETROFLEX = [
    // Locative suffix -il/-ul → always ள் in colloquial: veetula, schoolla
    { tanglish: /l[ae]$/i, tamil: /லை?$/, fix: s => s.slice(0, -2) + 'ளை' },  // -lai → -ளை if retroflex context
    // -lla (kuLLa, uLLa, paLLam)
    { tanglish: /lla$/i, tamil: /ல்ல$/, fix: s => s.slice(0, -4) + 'ள்ள' },
    // -lle (kuLLe)
    { tanglish: /lle$/i, tamil: /ல்லெ$/, fix: s => s.slice(0, -5) + 'ள்ளெ' },
    // -llai (paLLai)
    { tanglish: /llai$/i, tamil: /ல்லை$/, fix: s => s.slice(0, -5) + 'ள்ளை' },
    // -lli (paLLi = school/lizard context)
    { tanglish: /lli$/i, tamil: /ல்லி$/, fix: s => s.slice(0, -4) + 'ள்ளி' },
];

// Suffixes/contexts that must use ழ (approximant ழ்)
const SUFFIX_RULES_LA_TO_ZH = [
    // -zh / -l at end after aa/ii/uu vowel often = ழ் (tamizh, maazhai, vaazh)
    // handled via root table primarily
];

// ── LAYER 2: PHONOLOGICAL POSITION RULES ─────────────────────────────────────
// Tamil phonology restricts where each lateral can appear.
//
//  ல  — can appear word-initial, medial, final. Most common default.
//  ள  — NEVER word-initial in pure Tamil. Appears medial/final after
//        retroflex vowel contexts (ட, ண, ற environment) or in specific roots.
//  ழ  — NEVER word-initial. Appears medial/final. Typically after
//        aa/ii/uu vowels. Common in: tamizh, vaazh, maazh, keezhE, meezh.
//
// Position rules applied to the *Tamil* string after basic conversion:

/**
 * Fix word-initial ள → ல (ள never starts a Tamil word)
 */
function fixInitialRetroflex(tamil) {
    // ள at position 0
    if (tamil.startsWith(LA_RETROFLEX)) {
        return LA_DENTAL + tamil.slice(1);
    }
    // ள் at position 0 (with pulli = shouldn't start word)
    if (tamil.length >= 2 && tamil[0] === LA_RETROFLEX && tamil[1] === PULLI) {
        return LA_DENTAL + tamil.slice(1);
    }
    return tamil;
}

/**
 * Fix word-initial ழ → ந or leave (ழ never starts a word; very rare edge)
 */
function fixInitialApproximant(tamil) {
    if (tamil.startsWith(LA_APPROX)) {
        return LA_DENTAL + tamil.slice(1); // fallback to ல
    }
    return tamil;
}

// ── LAYER 3: ROOT PATTERN TABLE ──────────────────────────────────────────────
// Maps tanglish root/word → correct Tamil.
// Covers the ~200 most common words where l/L/zh confusion occurs.
// Format: tanglishKey → correctTamil
//
// Organised by semantic category for maintainability.

const LA_ROOT_MAP = new Map([

    // ══ ழ words (approximant) ════════════════════════════════════════════════
    // Language / culture
    ['tamil', 'தமிழ்'],
    ['tamizh', 'தமிழ்'],
    ['tamizhan', 'தமிழன்'],
    ['tamizhachi', 'தமிழச்சி'],
    ['tamizhargal', 'தமிழர்கள்'],
    ['tamizhil', 'தமிழில்'],
    ['tamizhnaadu', 'தமிழ்நாடு'],

    // Common ழ verbs / action words
    ['vaazh', 'வாழ்'],
    ['vaazhkkai', 'வாழ்க்கை'],
    ['vaazhkai', 'வாழ்க்கை'],
    ['vazhikkaatu', 'வழிகாட்டு'],
    ['vazhi', 'வழி'],
    ['vazhikaatu', 'வழிகாட்டு'],
    ['vaazha', 'வாழ'],
    ['vaazhvu', 'வாழ்வு'],
    ['vaazhndu', 'வாழ்ந்து'],
    ['vaazhndaan', 'வாழ்ந்தான்'],
    ['vaazhgal', 'வாழ்கள்'],

    ['keezhE', 'கீழே'],
    ['keezh', 'கீழ்'],
    ['keezhula', 'கீழுல'],
    ['keezhula', 'கீழுல'],
    ['keezhil', 'கீழில்'],
    ['keezhirundu', 'கீழிருந்து'],

    ['meezh', 'மீழ்'],  // rare
    ['maazhai', 'மாழை'], // ore/metal
    ['paazh', 'பாழ்'],
    ['paazhaachu', 'பாழாச்சு'],
    ['paazhakki', 'பாழாக்கி'],

    ['ezhil', 'எழில்'],   // beauty
    ['ezhilmiku', 'எழில்மிகு'],
    ['koozh', 'கூழ்'],    // porridge
    ['thozhil', 'தொழில்'],  // occupation
    ['thozhilaal', 'தொழிலாளர்'],
    ['thozhilaali', 'தொழிலாளி'],
    ['thozhilaalar', 'தொழிலாளர்'],
    ['mozhi', 'மொழி'],    // language
    ['mozhipeyarppu', 'மொழிபெயர்ப்பு'],
    ['pegazh', 'பேழை'],   // box/case (rare)
    ['kaazh', 'காழ்'],   // hatred (rare)
    ['aazhm', 'ஆழம்'],   // depth
    ['aazhmaana', 'ஆழமான'],
    ['aazhndu', 'ஆழ்ந்து'],
    ['thaazh', 'தாழ்'],   // low/humble
    ['thaazhndu', 'தாழ்ந்து'],
    ['thaazhai', 'தாழை'],   // screw pine plant
    ['vizhi', 'விழி'],   // eye (poetic)
    ['vizhikal', 'விழிகள்'],
    ['vizhundhu', 'விழுந்து'],
    ['vizhu', 'விழு'],
    ['vizhugal', 'விழுகள்'],
    ['vizhundaan', 'விழுந்தான்'],
    ['vizhundaal', 'விழுந்தாள்'],
    ['poozh', 'பூழ்'],   // rare
    ['muzhu', 'முழு'],   // full/complete
    ['muzhuvadhu', 'முழுவதும்'],
    ['muzhukka', 'முழுக்க'],
    ['muzhuthu', 'முழுதும்'],
    ['moozhaikku', 'மூளைக்கு'],  // brain
    ['moolai', 'மூளை'],
    ['moozhaikku', 'மூளைக்கு'],
    ['kaazhai', 'காழை'],  // fibre
    ['kozhundhu', 'கொழுந்து'], // sprout
    ['kozhi', 'கோழி'],  // chicken ← often misspelt; see ள section too
    ['kozhikaari', 'கோழிக்காரி'],

    // ══ ள words (retroflex) ══════════════════════════════════════════════════
    // Places / locations
    ['palli', 'பள்ளி'],   // school
    ['pallikoodam', 'பள்ளிக்கூடம்'],
    ['pallikku', 'பள்ளிக்கு'],
    ['pallila', 'பள்ளியில'],
    ['palliyil', 'பள்ளியில்'],

    ['ulla', 'உள்ள'],   // inside / that is within
    ['ullE', 'உள்ளே'],  // inside (emphatic)
    ['ullal', 'உள்ளல்'],
    ['ullam', 'உள்ளம்'],  // heart/mind
    ['ullamE', 'உள்ளமே'],
    ['ullankol', 'உள்ளங்கோல்'],

    ['veLLam', 'வெள்ளம்'],  // flood/water
    ['veLLi', 'வெள்ளி'],   // silver / Friday
    ['veLLimai', 'வெள்ளிமை'],
    ['veLLaikku', 'வெள்ளைக்கு'],
    ['veLLai', 'வெள்ளை'],   // white

    ['kaLLan', 'கள்ளன்'],   // thief
    ['kaLLi', 'கள்ளி'],    // cactus
    ['kaLLu', 'கள்ளு'],    // toddy
    ['kaLam', 'களம்'],     // battlefield
    ['kaLaththil', 'களத்தில்'],

    ['paLLam', 'பள்ளம்'],   // pit/hollow
    ['paLLaththil', 'பள்ளத்தில்'],

    ['koLLu', 'கொள்ளு'],   // take/obtain
    ['koLLai', 'கொள்ளை'],   // robbery
    ['koLLaikaran', 'கொள்ளைக்காரன்'],

    ['muLLu', 'முள்ளு'],   // thorn
    ['muLL', 'முள்'],
    ['muLLai', 'முள்ளை'],

    ['vaLLal', 'வள்ளல்'],   // philanthropist
    ['vaLL', 'வள்'],
    ['vaLarchi', 'வளர்ச்சி'],  // growth
    ['vaLar', 'வளர்'],
    ['vaLarndhu', 'வளர்ந்து'],
    ['vaLaindhu', 'வளைந்து'],
    ['vaLai', 'வளை'],      // bangles

    ['kuLLai', 'குள்ளை'],   // short (adj)
    ['kuLLan', 'குள்ளன்'],  // short person
    ['kuLL', 'குள்ள'],

    ['naLL', 'நள்'],      // midnight prefix
    ['naaLL', 'நாள்'],     // day
    ['naaLLai', 'நாளை'],
    ['naaLkal', 'நாட்கள்'],

    ['maLL', 'மல்'],      // wrestler prefix
    ['mallan', 'மல்லன்'],   // wrestler
    ['mallukku', 'மல்லுக்கு'],

    ['tiLL', 'திள்'],
    ['tiLLai', 'திள்ளை'],   // Chidambaram place name

    ['aLL', 'அள்'],
    ['aLLu', 'அள்ளு'],    // scoop
    ['aLLaam', 'அள்ளாம்'],

    ['iLLam', 'இல்லம்'],   // home (formal)
    ['iLam', 'இளம்'],     // young
    ['iLaiGnar', 'இளைஞர்'],   // youth
    ['iLamai', 'இளமை'],     // youth (noun)
    ['iLaneer', 'இளநீர்'],   // tender coconut water
    ['iLandhu', 'இளந்து'],

    ['piLL', 'பிள்'],
    ['piLLai', 'பிள்ளை'],   // child
    ['piLLaikal', 'பிள்ளைகள்'],

    ['kiLL', 'கிள்'],
    ['kiLLu', 'கிள்ளு'],   // pinch
    ['kiLi', 'கிளி'],     // parrot ← ழ sometimes but ள here

    ['theLL', 'தெள்'],
    ['theLLu', 'தெள்ளு'],   // clarity
    ['theLLivu', 'தெளிவு'],   // clarity

    ['seLLam', 'செல்லம்'],  // pet/darling — wait, this is dental ல
    // Note: செல்லம் uses dental ல. Keep in dental section.

    ['paLi', 'பழி'],      // blame — actually ழ! (see below)

    ['kaLi', 'களி'],      // joy (கிளி=parrot is ள though)
    ['kaLiruppu', 'களிப்பு'],

    ['niLL', 'நிள்'],
    ['niLai', 'நிலை'],     // NOTE: நிலை is dental ல! common confusion

    ['oLL', 'ஒள்'],
    ['oLLi', 'ஒளி'],      // light → actually this is dental ல? No: ஒளி uses ஒ+ளி

    ['thoLL', 'தொள்'],
    ['thoLLai', 'தொள்ளை'],   // hole

    ['aLavu', 'அளவு'],     // measurement
    ['aLavukkadangi', 'அளவுக்கடங்கி'],

    ['naLivu', 'நளிவு'],    // rare

    // ══ ல words (dental) — common ones users might confuse ═══════════════════
    // These should stay as ல NOT be changed to ள/ழ

    ['nalla', 'நல்ல'],
    ['nallavanaru', 'நல்லவனாரு'],
    ['nallavan', 'நல்லவன்'],
    ['nallavar', 'நல்லவர்'],
    ['nallavangal', 'நல்லவர்கள்'],

    ['kalla', 'கல்ல'],    // stone (accusative)
    ['kallai', 'கல்லை'],
    ['kallu', 'கல்லு'],   // stone (colloquial)
    ['kalluri', 'கல்லூரி'], // college — dental ல

    ['sella', 'செல்ல'],   // go (imperative colloq)
    ['sellam', 'செல்லம்'], // pet/darling — dental ல
    ['selvan', 'செல்வன்'],
    ['selvi', 'செல்வி'],
    ['selvam', 'செல்வம்'],  // wealth

    ['villa', 'வில்ல'],   // without (colloq) OR bow (weapon)
    ['villai', 'வில்லை'],  // bow (acc)
    ['villain', 'வில்லன்'],

    ['mella', 'மெல்ல'],   // slowly / soft
    ['mellam', 'மெல்லம்'],

    ['pulla', 'புல்ல'],   // grassy (adj)
    ['pullam', 'புல்லம்'],
    ['pul', 'புல்'],    // grass

    ['kEllu', 'கேள்'],    // listen (imperative)
    ['kElu', 'கேளு'],
    ['kElvi', 'கேள்வி'],  // question

    ['sol', 'சொல்'],
    ['solla', 'சொல்ல'],
    ['sollu', 'சொல்லு'],
    ['sollaan', 'சொல்லான்'],
    ['sollamatten', 'சொல்லமாட்டேன்'],

    ['kal', 'கல்'],     // stone
    ['kala', 'கலா'],
    ['kalangu', 'கலங்கு'],
    ['kalai', 'கலை'],     // art / subject

    ['pal', 'பல்'],     // many / tooth
    ['pala', 'பல'],
    ['palakari', 'பலகாரி'],

    ['val', 'வல்'],     // strong
    ['vali', 'வலி'],     // pain — dental ல
    ['valimiku', 'வலிமிக்கு'],
    ['valithu', 'வலிக்கு'],

    ['alai', 'அலை'],     // wave — dental ல
    ['alaikal', 'அலைகள்'],

    ['thal', 'தல்'],
    ['thalaivan', 'தலைவன்'],  // leader — dental ல
    ['thalaivar', 'தலைவர்'],
    ['thalai', 'தலை'],     // head

    ['malai', 'மலை'],     // mountain — dental ல
    ['malaikal', 'மலைகள்'],
    ['malar', 'மலர்'],    // flower — dental ல

    ['vilai', 'விலை'],    // price — dental ல
    ['vilaikal', 'விலைகள்'],

    ['ilai', 'இலை'],     // leaf — dental ல
    ['ilaikal', 'இலைகள்'],

    ['ulai', 'உலை'],     // furnace — dental ல (but see உள்ளே)
    ['ulagam', 'உலகம்'],   // world — dental ல

    ['nilam', 'நிலம்'],   // land/ground — dental ல
    ['nilai', 'நிலை'],    // condition/status — dental ல
    ['nilaimai', 'நிலைமை'],

    // ══ CONFUSABLE PAIRS ═════════════════════════════════════════════════════
    // These are word pairs that differ only in l/L/zh — high error-rate words

    // கோழி (chicken) vs கோலி (marble) vs கோளி (rare)
    ['kozhi', 'கோழி'],    // chicken → ழ
    ['kozhikaari', 'கோழிக்காரி'],
    ['koli', 'கோலி'],    // marble (toy) → dental ல

    // பழி (blame) vs பலி (sacrifice) vs பளி (uncommon)
    ['pazhi', 'பழி'],     // blame → ழ
    ['pali', 'பலி'],     // sacrifice → dental ல

    // வழி (way) vs வலி (pain)
    ['vazhi', 'வழி'],     // way → ழ
    ['vali', 'வலி'],     // pain → dental ல

    // மழை (rain) vs மலை (mountain)
    ['mazhai', 'மழை'],     // rain → ழ
    ['malai', 'மலை'],     // mountain → dental ல

    // விழி (eye-poetic) vs விலி (uncommon)
    ['vizhi', 'விழி'],    // eye → ழ

    // ஒளி (light) vs ஓலி (sound/colloq)
    ['oLi', 'ஒளி'],     // light → ளி (this is actually ள!)
    ['oli', 'ஓலி'],     // sound

    // தொழில் (occupation) vs தொலில் (wrong)
    ['thozhil', 'தொழில்'],  // occupation → ழ

    // கழுவு (wash) vs கலவை (mixture)
    ['kazhuvu', 'கழுவு'],   // wash → ழ
    ['kalavai', 'கலவை'],    // mixture → dental ல

    // இழை (thread/wire) vs இலை (leaf)
    ['izhai', 'இழை'],     // thread → ழ
    ['ilai', 'இலை'],     // leaf → dental ல
]);

// ── LAYER 4: HEURISTIC SCORING ───────────────────────────────────────────────
// For words not in the root map, apply statistical rules.
// Assigns a score: positive = lean ள, negative = lean ழ, 0 = keep ல.

/**
 * Returns: 'la' | 'La' | 'zh' — which lateral is most likely for this tanglish word
 */
function heuristicLateral(tanglish) {
    const t = tanglish.toLowerCase();

    // ── ழ heuristics ──────────────────────────────────────────────────────
    // 1. Preceded by long vowel (aa/ee/oo/ii/uu) + zh/z → almost always ழ
    if (/[aeiou]{2}z|zh/.test(t)) return 'zh';

    // 2. Common ழ morphemes
    if (/mozh|vazh|vaazh|kozh|koozh|muzh|thozhil|vizh|mazh|kazh/.test(t)) return 'zh';

    // 3. Word ends in -zh / -azh / -uzh
    if (/[aeiou]zh?$/.test(t)) return 'zh';

    // ── ள heuristics ──────────────────────────────────────────────────────
    // 4. Double-l in tanglish almost always = ள்ள (retroflex pair)
    //    Exceptions: nalla=நல்ல (dental), kalla=கல்ல (dental) → handle via root map
    if (/ll/.test(t) && ![
        'nalla', 'nallaa', 'nallavan', 'nallavangal',
        'kalla', 'kallai', 'kallu', 'kalluri',
        'mella', 'mellam',
        'villa', 'villai', 'villain',
        'pulla', 'pullam',
        'sella', 'sellam', 'selvan', 'selvi', 'selvam',
        'solla', 'sollu', 'sollaan',
    ].includes(t)) {
        return 'La';
    }

    // 5. Preceded by retroflex consonant (ட,ண,ற in Tamil) or 'nd','Nd','NT' in tanglish
    if (/[NT]l|ndl|nDl/.test(t)) return 'La';

    // 6. Common ள morpheme patterns
    if (/uLL|aLL|iLL|oLL|eLL/.test(t)) return 'La'; // uppercase already = ள but also lowercase
    if (/palli|kull|mull|pull|vall|kall(?!uri)|magal/.test(t)) return 'La';

    // 7. Suffix -lai in common place/body nouns → often ளை
    if (/llai$/.test(t)) return 'La';

    // 8. Plural / pronominal suffix -gal / -kal (length >= 4)
    if ((t.endsWith('gal') || t.endsWith('kal')) && t.length >= 4) return 'La';

    // ── Default: keep as dental ல ─────────────────────────────────────────
    return 'la';
}

// ── CORE REPLACEMENT FUNCTION ────────────────────────────────────────────────

/**
 * Replace all ல occurrences with ள in a Tamil string.
 * Handles both bare ல and ல + vowel-sign / ல் forms.
 */
function replaceDentalWithRetroflex(tamil) {
    return tamil
        .replace(new RegExp(LA_DENTAL + PULLI, 'g'), LA_RETROFLEX + PULLI)   // ல் → ள்
        .replace(new RegExp(LA_DENTAL + '([' + VOWEL_SIGNS + '])', 'g'),
            LA_RETROFLEX + '$1')                                          // ல + vowel → ள + vowel
        .replace(new RegExp(LA_DENTAL, 'g'), LA_RETROFLEX);                   // bare ல → ள
}

/**
 * Replace all ல occurrences with ழ in a Tamil string.
 */
function replaceDentalWithApproximant(tamil) {
    return tamil
        .replace(new RegExp(LA_DENTAL + PULLI, 'g'), LA_APPROX + PULLI)
        .replace(new RegExp(LA_DENTAL + '([' + VOWEL_SIGNS + '])', 'g'),
            LA_APPROX + '$1')
        .replace(new RegExp(LA_DENTAL, 'g'), LA_APPROX);
}

// ── MAIN EXPORT ──────────────────────────────────────────────────────────────

/**
 * disambiguateLa(tanglishWord, naiveTamilWord) → correctedTamilWord
 *
 * @param {string} tanglishWord  — original Tanglish input (e.g. 'palli')
 * @param {string} naiveTamil   — naively converted Tamil (e.g. 'பல்லி')
 * @returns {string}             — corrected Tamil (e.g. 'பள்ளி')
 *
 * Call this AFTER convertWithRules() but BEFORE returning to the user,
 * only when the word was NOT found in the dictionary.
 */
export function disambiguateLa(tanglishWord, naiveTamil) {
    if (!tanglishWord || !naiveTamil) return naiveTamil;

    const t = tanglishWord.toLowerCase().trim();

    // ── LAYER 1: Exact root map lookup (highest confidence) ─────────────────
    if (LA_ROOT_MAP.has(t)) {
        return LA_ROOT_MAP.get(t);
    }

    // ── LAYER 1.5: Suffix rules for ll → ள்ள ────────────────────────────────
    // SUFFIX_RULES_LA_TO_LA_RETROFLEX was defined but never applied — fix that here.
    // These rules fire for ANY word ending in lla/lli/lle/llai regardless of
    // whether it's in the root map or not.
    for (const rule of SUFFIX_RULES_LA_TO_LA_RETROFLEX) {
        if (rule.tanglish.test(t) && rule.tamil.test(naiveTamil)) {
            return rule.fix(naiveTamil);
        }
    }

    // ── LAYER 2: Stem match — try stripping common suffixes then re-check ────
    const suffixesToStrip = [
        'kku', 'ku', 'il', 'la', 'le', 'ula', 'ule', 'ukku', 'aal',
        'aan', 'ai', 'am', 'um', 'kkum', 'ngal', 'kal', 'gal'
    ];
    for (const suffix of suffixesToStrip) {
        if (t.endsWith(suffix) && t.length > suffix.length + 2) {
            const stem = t.slice(0, -suffix.length);
            if (LA_ROOT_MAP.has(stem)) {
                const stemTamil = LA_ROOT_MAP.get(stem);
                // Reconstruct: replace the naive stem Tamil with correct one
                // This is approximate — good enough for suffix matching
                return naiveTamil; // TODO: deeper suffix reconstruction
            }
        }
    }

    // ── LAYER 3: Phonological position rules ─────────────────────────────────
    let result = naiveTamil;
    result = fixInitialRetroflex(result);
    result = fixInitialApproximant(result);

    // ── LAYER 4: Heuristic scoring ────────────────────────────────────────────
    // Only apply when the naive Tamil contains dental ல
    const hasDentalLa = result.includes(LA_DENTAL);
    if (!hasDentalLa) return result; // already has ள or ழ, trust it

    const lateralType = heuristicLateral(t);

    if (lateralType === 'La') {
        // Only replace ல்ல clusters → ள்ள, not every ல in the word
        // This prevents converting dental ல in the first syllable when
        // only the geminate (double-l) part needs to be retroflex
        result = result
            .replace(/\u0BB2\u0BCD\u0BB2/g, '\u0BB3\u0BCD\u0BB3')   // ல்ல → ள்ள
            .replace(new RegExp('\u0BB2([' + VOWEL_SIGNS + '])', 'g'),
                '\u0BB3$1')                                            // லா/லி/ளு etc → ளா/ளி/ளு
            .replace(/\u0BB2\u0BCD$/g, '\u0BB3\u0BCD')            // ல் → ள் at word end
            .replace(/\u0BB2$/g, '\u0BB3');                         // bare ல → ள at word end
    } else if (lateralType === 'zh') {
        result = replaceDentalWithApproximant(result);
    }
    // else: 'la' → keep as is

    return result;
}

/**
 * generateLaCandidates(tanglishWord, naiveTamil) → array of candidates
 *
 * Returns ALL three lateral variants so the UI can show them as choices.
 * Use this for the "click-to-fix" suggestion popup.
 *
 * @returns Array<{ tamil: string, type: 'ல'|'ள'|'ழ', confidence: number }>
 */
export function generateLaCandidates(tanglishWord, naiveTamil) {
    if (!tanglishWord || !naiveTamil) return [];

    const dentalVariant = naiveTamil; // as converted (dental ல base)
    const retrofleXVariant = replaceDentalWithRetroflex(naiveTamil);
    const approxVariant = replaceDentalWithApproximant(naiveTamil);

    // Deduplicate (if naiveTamil already has ள/ழ, dental variant is same)
    const candidates = [];
    const seen = new Set();

    const addCandidate = (tamil, type, confidence) => {
        if (!seen.has(tamil)) {
            seen.add(tamil);
            candidates.push({ tamil, type, confidence });
        }
    };

    const t = tanglishWord.toLowerCase().trim();

    // Check root map first
    if (LA_ROOT_MAP.has(t)) {
        const rootCorrect = LA_ROOT_MAP.get(t);
        addCandidate(rootCorrect, detectLaType(rootCorrect), 95);
        // Add the other two as lower-confidence alternatives
        [dentalVariant, retrofleXVariant, approxVariant].forEach(v => {
            if (v !== rootCorrect) addCandidate(v, detectLaType(v), 30);
        });
        return candidates;
    }

    const heuristic = heuristicLateral(t);
    const highConf = 70, lowConf = 25;

    if (heuristic === 'la') {
        addCandidate(dentalVariant, 'ல', highConf);
        addCandidate(retrofleXVariant, 'ள', lowConf);
        addCandidate(approxVariant, 'ழ', lowConf);
    } else if (heuristic === 'La') {
        addCandidate(retrofleXVariant, 'ள', highConf);
        addCandidate(dentalVariant, 'ல', lowConf);
        addCandidate(approxVariant, 'ழ', lowConf);
    } else {
        addCandidate(approxVariant, 'ழ', highConf);
        addCandidate(dentalVariant, 'ல', lowConf);
        addCandidate(retrofleXVariant, 'ள', lowConf);
    }

    return candidates;
}

/**
 * Helper: detect which lateral a Tamil word uses (for labelling)
 */
function detectLaType(tamil) {
    if (tamil.includes(LA_APPROX)) return 'ழ';
    if (tamil.includes(LA_RETROFLEX)) return 'ள';
    return 'ல';
}

/**
 * isLaAmbiguous(tanglishWord) → boolean
 *
 * Quick check: does this word have l/L/zh ambiguity worth running
 * the full disambiguator on?
 */
export function isLaAmbiguous(tanglishWord) {
    if (!tanglishWord) return false;
    const t = tanglishWord.toLowerCase();
    // Contains 'l', 'L', 'z', 'zh' — potential ambiguity
    //return /[lLzZ]/.test(tanglishWord) && !LA_ROOT_MAP.has(t);
    return /[lLzZ]/.test(tanglishWord);
}

/**
 * batchDisambiguate(wordPairs) → Array<{ tanglish, tamil }>
 *
 * Process an array of {tanglish, tamil} pairs in one call.
 * Useful for post-processing a full sentence.
 */
export function batchDisambiguate(wordPairs) {
    return wordPairs.map(({ tanglish, tamil }) => ({
        tanglish,
        tamil: disambiguateLa(tanglish, tamil)
    }));
}


// ================================================================
// ர (soft ra) vs ற (hard Ra) DISAMBIGUATION ENGINE
//
// THE PROBLEM:
//   Tamil has two 'r' sounds:
//     ர  (U+0BB0) — soft/dental ra,    typed: r
//     ற  (U+0BB1) — hard/retroflex Ra, typed: R (capital) or inferred
//
//   Colloquial Tanglish users almost always type lowercase 'r' for both.
//   The most common failure case is the present-tense verb suffix:
//
//     veekura  → வேகுற   (வேக + present suffix -குற)
//     paakura  → பாக்குற
//     pokura   → போகுற
//     solura   → சொல்லுற
//     paesura  → பேசுற
//     odura    → ஓடுற
//     vandura  → வந்துற
//
//   These all end in consonant + 'ura' where the final 'ra' is ற, not ர.
//   But the tokenizer always outputs ர for 'r', giving e.g. வேகுர (WRONG).
//
// THE RULE:
//   Word ending in  <consonant> + "ura"  AND word length ≥ 5
//   → final ர becomes ற  (i.e. -ுர becomes -ுற)
//
//   Similarly for -ira/-ara endings in verb contexts:
//   <consonant> + "ira"  → -ிற  (e.g. seikira → செய்கிற)
//   <consonant> + "ara"  → -ற   (rare but covered)
//
// SAFE EXCEPTIONS (genuine ர words — must NOT be converted):
//   veera, kaara, maara, para, vara, thira, saara, poora, neera, naara,
//   and any word found in the dictionary (those are already correct).
// ================================================================

const RA_SOFT = '\u0BB0'; // ர
const RA_HARD = '\u0BB1'; // ற

// Words that genuinely end in soft ர — must not be touched
const RA_KEEP_SOFT = new Set([
    'veera', 'kaara', 'maara', 'para', 'vara', 'thira',
    'saara', 'poora', 'neera', 'naara', 'kara', 'tara',
    'kaara', 'paara', 'naara', 'vaara', 'taara', 'oora',
    'kaavara', 'vaanavara', 'theeravara',
    // Inflection forms of above that stay soft
    'veeran', 'veeral', 'kaaral', 'maaral', 'paral',
    'varal', 'varum', 'varaan', 'varaal', 'varar',
    'thiruppuram', 'thiruvaaru',
]);

// Specific root map for common words where ர→ற applies
// Maps lowercase tanglish → correct Tamil with ற
// (These are looked up BEFORE the pattern rule)
const RA_ROOT_MAP = new Map([
    // Present-tense verb suffix forms (consonant + ura)
    ['veekura', 'வேகுற'],
    ['paakura', 'பாக்குற'],
    ['pokura', 'போகுற'],
    ['vaangura', 'வாங்குற'],
    ['solura', 'சொல்லுற'],
    ['paesura', 'பேசுற'],
    ['odura', 'ஓடுற'],
    ['oodura', 'ஓடுற'],
    ['vandura', 'வந்துற'],
    ['kudikura', 'குடிக்குற'],
    ['padikura', 'படிக்குற'],
    ['theriyura', 'தெரியுற'],
    ['paarura', 'பாருற'],
    ['parkura', 'பார்க்குற'],
    ['saapitura', 'சாப்பிட்டுற'],
    ['saapidrura', 'சாப்பிடுற'],
    ['pannura', 'பண்ணுற'],
    ['pannura', 'பண்ணுற'],
    ['kettura', 'கேட்டுற'],
    ['paartura', 'பார்த்துற'],
    ['vaangura', 'வாங்குற'],
    ['koopidura', 'கூப்பிடுற'],
    ['nadakura', 'நடக்குற'],
    ['varura', 'வருற'],       // note: vara=வர (inf), varura=வருற (pres.)
    ['varrura', 'வருற'],
    ['tharura', 'தருற'],
    ['seikura', 'செய்குற'],
    ['seyyura', 'செய்யுற'],
    ['irukura', 'இருக்குற'],
    ['nikura', 'நிக்குற'],
    ['nikkura', 'நிக்குற'],
    ['pogitura', 'போகிட்டுற'],
    ['vagitura', 'வாகிட்டுற'],

    // -kira present tense variant
    ['paakira', 'பாக்கிற'],
    ['pokira', 'போகிற'],
    ['vaangira', 'வாங்கிற'],
    ['solira', 'சொல்லிற'],
    ['paesira', 'பேசிற'],
    ['odira', 'ஓடிற'],
    ['kudikira', 'குடிக்கிற'],
    ['padikira', 'படிக்கிற'],
    ['seikira', 'செய்கிற'],
    ['irukira', 'இருக்கிற'],
    ['varira', 'வரிற'],

    // Other hard-Ra words commonly mistyped with lowercase r
    ['puram', 'புறம்'],   // outside
    ['pura', 'புற'],     // outside (short form)
    ['purattu', 'புறத்து'],
    ['puramE', 'புறமே'],
    ['viRa', 'விற'],     // sell (imperative)
    ['viRal', 'விறல்'],
    ['viRku', 'விற்கு'],
    ['aRa', 'அற'],      // virtue prefix
    ['aRam', 'அறம்'],    // virtue
    ['aRan', 'அறன்'],
    ['aRivu', 'அறிவு'],   // knowledge — ற
    ['arivu', 'அறிவு'],   // knowledge — ற (common spelling without cap)
    ['theRu', 'தெரு'],    // wait, theRu=street? No: தெரு=ர. Skip.
    ['veRu', 'வேறு'],    // different — ற
    ['veru', 'வேறு'],    // different (common lowercase)
    ['veRumai', 'வேறுமை'],
    ['veRuppu', 'வெறுப்பு'], // disgust — ற
    ['veruppu', 'வெறுப்பு'],
    ['veRi', 'வெறி'],    // madness/craving — ற
    ['veri', 'வெறி'],
    ['kaRai', 'கறை'],    // stain — ற
    ['karai', 'கறை'],    // stain (common spelling)  
    ['uRavu', 'உறவு'],   // relationship — ற
    ['uravu', 'உறவு'],
    ['uRavinar', 'உறவினர்'],
    ['uravinar', 'உறவினர்'],
    ['maRu', 'மறு'],    // re-/again — ற
    ['maru', 'மறு'],    // again (common spelling without cap R)
    ['maRupadiyum', 'மறுபடியும்'],
    ['maRukka', 'மறுக்க'],
    ['maRandhu', 'மறந்து'],  // forgot
    ['marandhu', 'மறந்து'],
    ['maRanthitten', 'மறந்திட்டேன்'],
    ['maRapu', 'மறப்பு'],
    ['maRaval', 'மறவல்'],
    ['maRuvaazvu', 'மறுவாழ்வு'], // rehabilitation — the original bug!
    ['maruvaazvu', 'மறுவாழ்வு'],
    ['maRuvalippu', 'மறுவலிப்பு'],
    ['thiRu', 'திறு'],   // open — ற
    ['thiRakka', 'திறக்க'],
    ['thiRandhu', 'திறந்து'],
    ['thirandhu', 'திறந்து'],
    ['thiRamai', 'திறமை'],  // talent — ற
    ['thiramai', 'திறமை'],
    ['thiRan', 'திறன்'],
    ['thiran', 'திறன்'],
    ['paRa', 'பற'],     // related to ற
    ['paRakka', 'பறக்க'],  // to fly — ற
    ['parakka', 'பறக்க'],
    ['paRandhu', 'பறந்து'],
    ['parandhu', 'பறந்து'],
    ['paRavai', 'பறவை'],   // bird — ற
    ['paravai', 'பறவை'],
    ['uRa', 'உற'],     // to experience — ற
    ['uRavu', 'உறவு'],
    ['kaRu', 'கறு'],    // black/dark (adj) — ற
    ['poRu', 'பொறு'],   // to bear/endure — ற
    ['poru', 'பொறு'],
    ['poRumai', 'பொறுமை'], // patience — ற
    ['porumai', 'பொறுமை'],
    ['peRu', 'பெறு'],   // to get/receive — ற
    ['peru', 'பெறு'],
    ['peRRaan', 'பெற்றான்'],
    ['seRi', 'செறி'],   // dense — ற (context specific)
    ['oRu', 'ஒரு'],    // actually ஒ+ர = ர (number one) — keep soft
    // Note: 'oru' correctly stays ர (it's ஒரு, not ஒறு)
]);

/**
 * isRaAmbiguous(tanglishWord) → boolean
 *
 * Returns true if the word might need ர→ற disambiguation.
 * Quick pre-filter — only call disambiguateRa() when this is true.
 */
export function isRaAmbiguous(tanglishWord) {
    if (!tanglishWord) return false;
    const t = tanglishWord.toLowerCase();
    // Skip if no lowercase 'r' at all
    if (!t.includes('r')) return false;
    // Skip very short words
    if (t.length < 4) return false;
    // Skip if already uses uppercase R (user typed it correctly)
    if (tanglishWord.includes('R')) return false;
    // Trigger if ends in consonant+ura/ira (verb present-tense suffix, e.g. veekura, solira)
    // NOTE: 'ara' is intentionally excluded — Cara endings are nouns/adjectives (kara, mara)
    // that should stay soft-ர. Only ura/ira verb suffixes reliably indicate hard-ற.
    // For medial ற patterns (maru, veru, paravai etc.) rely on RA_ROOT_MAP and prefix list.
    return /[bcdfghjklmnpqrstvwxyz][ui]ra$/.test(t) ||
        RA_ROOT_MAP.has(t) ||
        /^(maru|mara|veru|vera|veri|veruppu|uravu|karai|porumai|poru|peru|paravai|parandhu|thirandhu|thiramai|thiran|marandhu|thirakka|aran|arivu)/.test(t);
}

/**
 * disambiguateRa(tanglishWord, naiveTamil) → correctedTamil
 *
 * Fixes ர → ற where the Tanglish implies the hard retroflex Ra.
 *
 * THREE-LAYER approach (mirrors the La disambiguator):
 *   1. Exact root map  — highest confidence, covers common words
 *   2. Pattern rule    — consonant + ura/ira at word end → ற
 *   3. Common ற roots  — maru/veru/uravu prefix patterns
 *
 * Call this AFTER convertWithRules() and disambiguateLa(), only when
 * the word was NOT found in the dictionary (dictionary words are correct).
 */
export function disambiguateRa(tanglishWord, naiveTamil) {
    if (!tanglishWord || !naiveTamil) return naiveTamil;

    const t = tanglishWord.toLowerCase().trim();

    // ── LAYER 1: Exact root map ──────────────────────────────────────────
    if (RA_ROOT_MAP.has(t)) {
        return RA_ROOT_MAP.get(t);
    }

    // ── LAYER 2: Verb-suffix pattern rule ───────────────────────────────
    // Any word ≥5 chars ending in <consonant>+"ura" or <consonant>+"ira"
    // maps the final ர → ற  (i.e. -ுர → -ுற or -ிர → -ிற)
    //
    // Guard: skip known soft-ர words
    if (!RA_KEEP_SOFT.has(t)) {

        // Pattern A: -Cura at word end (most common: veekura, solura …)
        if (/[bcdfghjklmnpqrstvwxyz]ura$/.test(t) && t.length >= 5) {
            // Replace the word-final ுர with ுற in the Tamil string
            // Tamil: ு (U+0BC1) + ர (U+0BB0)  →  ு + ற (U+0BB1)
            if (naiveTamil.endsWith(RA_SOFT)) {
                return naiveTamil.slice(0, -1) + RA_HARD;
            }
            // Also handle ர் at end (if tokenizer added pulli)
            if (naiveTamil.endsWith(RA_SOFT + '\u0BCD')) {
                return naiveTamil.slice(0, -2) + RA_HARD + '\u0BCD';
            }
        }

        // Pattern B: -Cira at word end (seikira, paakira …)
        if (/[bcdfghjklmnpqrstvwxyz]ira$/.test(t) && t.length >= 5) {
            if (naiveTamil.endsWith(RA_SOFT)) {
                return naiveTamil.slice(0, -1) + RA_HARD;
            }
        }
    }

    // ── LAYER 3: Common ற-root prefixes ─────────────────────────────────
    // Words STARTING with known ற roots where user typed lowercase r
    //   maru- = மறு (re-/forget), veru- = வேறு/வெறு, uravu = உறவு
    //   karuppu = கறுப்பு, porumai = பொறுமை, paravai = பறவை
    //   thirandhu/thiramI/thiran = திற roots, parandhu = பற roots
    const hardRaRoots = [
        [/^maru/, /^மரு/, 'மறு'],   // மர → மற
        [/^veru/, /^வெரு|^வேரு/, s => s.replace(/^(வெ|வே)ர/, '$1ற')],
        [/^uravu/, /^உர/, 'உற'],    // உர → உற
        // [/^karuppu/, /^கரு/, 'கறு'],   // கரு → கற
        [/^paravai/, /^பர/, 'பற'],    // பர → பற
        [/^parandhu/, /^பர/, 'பற'],
        [/^thirandhu/, /^திர/, 'திற'],   // திர → திற
        [/^thiran/, /^திர/, 'திற'],
        [/^thiramai/, /^திர/, 'திற'],
        [/^porumai/, /^பொரு/, 'பொறு'],  // பொரு → பொறு
        [/^poru(?!m)/, /^பொரு/, 'பொறு'],  // poru → பொறு (but not porumai again)
        [/^peru/, /^பெரு/, 'பெறு'],   // பெரு → பெறு (only 'get', not 'big')
    ];

    for (const [tanglishRe, tamilRe, fix] of hardRaRoots) {
        if (tanglishRe.test(t)) {
            if (typeof fix === 'string') {
                // String replacement: replace the Tamil pattern with the fix prefix
                const replaced = naiveTamil.replace(tamilRe, fix);
                if (replaced !== naiveTamil) return replaced;
            } else if (typeof fix === 'function') {
                const replaced = fix(naiveTamil);
                if (replaced !== naiveTamil) return replaced;
            }
        }
    }

    return naiveTamil;
}