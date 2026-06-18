import Sanscript from '@indic-transliteration/sanscript';
import { disambiguateLa, generateLaCandidates, isLaAmbiguous, disambiguateRa, isRaAmbiguous } from './tamilLaDisambiguator.js';
import { commonWords } from './tamilMapping.js';
import { tamilFrequencyList, FREQUENCY_LIST_SIZE } from './tamilFrequencyList.js';

// ================================================================
// PERFECT TAMIL CONVERSION ENGINE v2.0  (Backend-powered)
// Dictionary is loaded from the backend API at startup.
// Priority: 1. Learned → 2. Exact Dictionary → 3. Vallinam/Sandhi → 4. Rules → 5. Sanscript
// ================================================================

// Re-export la-disambiguation helper so TanglishEditor can show
// "Did you mean ல/ள/ழ?" inline popups for uncertain conversions.
export { generateLaCandidates };

// ============ DICTIONARY (populated from backend) ============
const exactDictionary = new Map();
const phoneticWordMap = new Map();

// Target words to bypass dictionary/database lookup to enforce rule-based forming
const _bypassDictionary = new Set([
    'unthan',
    'thirunthani',
    'cheythirunthanar',
    'untana',
    'untanar',
    'unt',
    'ana',
    'han'
]);

// Track loading state
let _dictionaryLoaded = false;
let _dictionaryLoadPromise = null;

/**
 * Load the full dictionary from the backend API.
 * Called once at startup. Safe to call multiple times (deduplicates).
 */
export async function loadDictionaryFromBackend() {
    if (_dictionaryLoaded) return;
    if (_dictionaryLoadPromise) return _dictionaryLoadPromise;

    _dictionaryLoadPromise = (async () => {
        try {
            console.log('[Engine] Loading dictionary from backend...');
            const response = await fetch('/api/usil/suggestions/dictionary');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();

            // Populate the exactDictionary Map + backendFrequencyMap
            // Backend now sends {tanglish: {t: tamil, f: frequency}}
            // Backward compat: also handles old {tanglish: tamilString} format
            let count = 0;
            for (const [key, value] of Object.entries(data)) {
                const lowerKey = key.toLowerCase();
                if (_bypassDictionary.has(lowerKey)) continue;
                let tamilValue, freq;
                if (typeof value === 'object' && value !== null && value.t) {
                    // New format: {t: tamil, f: frequency}
                    tamilValue = value.t;
                    freq = value.f || 0;
                } else {
                    // Old format: plain string
                    tamilValue = Array.isArray(value) ? value[0] : value;
                    freq = 0;
                }
                exactDictionary.set(lowerKey, tamilValue);
                // Store backend frequency so trie gets real frequency data
                _backendFrequency.set(lowerKey, freq);
                const existingFreq = _tamilWordFrequency.get(tamilValue) || 0;
                if (freq > existingFreq) {
                    _tamilWordFrequency.set(tamilValue, freq);
                }
                if (key.includes(' ')) {
                    exactDictionary.set(key.replace(/ /g, ''), tamilValue);
                    _backendFrequency.set(key.replace(/ /g, '').toLowerCase(), freq);
                }
                count++;
            }

            _dictionaryLoaded = true;
            console.log(`[Engine] Dictionary loaded: ${count} words from backend`);

            // Rebuild mappings and tries now that dictionary is populated
            buildFullWordMapping();
            buildSuggestionTrie();
            buildPhoneticIndex();
        } catch (err) {
            console.error('[Engine] Failed to load dictionary from backend:', err.message);
            console.warn('[Engine] Falling back to rule-based transliteration only');
        }
    })();

    return _dictionaryLoadPromise;
}

// Backend frequency data: tanglish → frequency from database
// Used when building the trie so popular words rank higher
const _backendFrequency = new Map();
const _tamilWordFrequency = new Map();

/**
 * preloadCommonChunks — now just triggers the backend dictionary load.
 * Kept for backward compatibility with components that call it.
 */
export function preloadCommonChunks() {
    loadDictionaryFromBackend();
}

// NOTE: Extra words previously defined here have been moved to tamilDictionary.json
// The dictionary JSON is now the single source of truth for all word mappings.

// ============ NORMALIZATION & FULL WORD MAPPING ============

// Build full word mapping from dictionary
const fullWordMapping = new Map();

function buildFullWordMapping() {
    // Seed with commonWords from tamilMapping.js (works even when backend is offline)
    for (const [tanglish, tamil] of Object.entries(commonWords)) {
        fullWordMapping.set(tanglish.toLowerCase(), tamil);
    }

    // Add all exact dictionary entries (backend words override commonWords if different)
    for (const [tanglish, tamil] of exactDictionary.entries()) {
        fullWordMapping.set(tanglish.toLowerCase(), tamil);
    }

    console.log(`✅ Built full word mapping with ${fullWordMapping.size} entries`);
}

// ============ TANGLISH SPELLING CORRECTION MAP ============
// Maps common shortened/informal Tanglish spellings to their canonical
// dictionary keys.  Users often drop vowels, shorten double consonants,
// or use phonetic shortcuts.  This map is checked BEFORE dictionary lookup
// so "naaliku" → "naalaikku" → நாளைக்கு etc.
//
// Organised by category for maintainability.

// Dedup builder — silently drops duplicate keys so the first entry always wins
function _buildSpellingMap(entries) {
    const seen = new Set();
    return new Map(entries.filter(([k]) => {
        if (seen.has(k)) return false;
        seen.add(k); return true;
    }));
}

const _tanglishSpellingMap = _buildSpellingMap([
    // ── TIME WORDS ───────────────────────────────────────────────────────
    ['naaliku', 'naalaikku'],
    ['naliku', 'naalaikku'],
    ['nalikku', 'naalaikku'],
    ['naleku', 'naalaikku'],
    ['nalekku', 'naalaikku'],    // already in dict
    ['naaleku', 'naalaikku'],
    ['naleiku', 'naalaikku'],
    ['naalaiku', 'naalaikku'],
    ['nalaku', 'naalaikku'],
    ['naalku', 'naalaikku'],
    ['nalei', 'naalai'],
    ['nalai', 'naalai'],
    ['nale', 'naalai'],
    ['naale', 'naalai'],
    ['naali', 'naalai'],
    ['nethu', 'nethu'],        // already in dict
    ['netha', 'nethu'],
    ['nethe', 'nethu'],        // already in dict
    ['neethu', 'nethu'],
    ['neku', 'nethu'],
    ['iniku', 'inniku'],       // already → inniku → இன்னிக்கு
    ['inikku', 'inniku'],
    ['innik', 'inniku'],
    ['iniki', 'inniki'],       // already in dict
    ['inaku', 'inniku'],
    ['innaku', 'inniku'],
    ['innaiku', 'innaiku'],      // already in dict

    // ── QUESTION WORDS ───────────────────────────────────────────────────
    ['ena', 'enna'],
    ['yena', 'enna'],
    ['ene', 'enna'],
    ['enaku', 'enakku'],       // already in dict
    ['unaku', 'unakku'],
    ['epaddi', 'eppadi'],
    ['epdi', 'eppadi'],       // already in dict
    ['yepdi', 'eppadi'],
    ['epidi', 'eppadi'],
    ['epo', 'eppo'],         // already in dict
    ['yepo', 'eppo'],
    ['enge', 'enge'],         // already in dict
    ['eng', 'enga'],
    ['evlo', 'evlo'],         // already in dict
    ['evalu', 'evvalo'],
    ['evalo', 'evvalo'],
    ['ethna', 'ethanai'],
    ['ethane', 'ethanai'],
    ['ethu', 'ethu'],         // already in dict

    // ── PRONOUNS / PERSON ────────────────────────────────────────────────
    ['nan', 'naan'],
    ['ni', 'nii'],
    ['ninga', 'neenga'],
    ['nenga', 'neenga'],
    ['ningal', 'neenga'],
    ['neegal', 'neenga'],
    ['aven', 'avan'],
    ['avl', 'aval'],
    ['avanga', 'avanga'],       // already in dict
    ['ivn', 'ivan'],
    ['ivl', 'ival'],
    ['namba', 'namma'],
    ['nambaku', 'nammakku'],

    // ── COMMON VERBS (shortened forms) ───────────────────────────────────
    ['poren', 'poren'],        // already in dict
    ['porn', 'poren'],
    ['porin', 'poren'],
    ['porein', 'poren'],
    ['varen', 'varen'],        // already in dict
    ['varn', 'varen'],
    ['varain', 'varen'],
    ['varien', 'varen'],
    ['panren', 'pannren'],      // already in dict
    ['paniren', 'panniren'],
    ['pannien', 'panniren'],
    ['sapren', 'saapren'],
    ['sapidren', 'saapidren'],
    ['sapitaen', 'saapitaen'],
    ['sapiten', 'saapitten'],
    ['sapitan', 'saapittan'],
    ['sapitten', 'saapitten'],
    ['saptu', 'saapitu'],
    ['sapadu', 'saapadu'],
    ['irukein', 'irukken'],
    ['irukin', 'irukken'],
    ['irukeen', 'irukken'],
    ['iruken', 'irukken'],
    ['irukan', 'irukkaan'],
    ['irukaan', 'irukkaan'],
    ['irukal', 'irukkaal'],
    ['irukaal', 'irukkaal'],
    ['irukum', 'irukku'],
    ['irukom', 'irukkom'],
    ['irukoom', 'irukkom'],
    ['irukeenga', 'irukkeenga'],
    ['irukinga', 'irukkeenga'],
    ['irukanga', 'irukkaanga'],
    ['podren', 'poren'],
    ['padikren', 'padikiren'],
    ['padikran', 'padikiran'],
    ['solren', 'solren'],       // already in dict
    ['solirin', 'solren'],
    ['paren', 'paakiren'],
    ['pakren', 'paakiren'],
    ['parkren', 'paakiren'],
    ['pakiren', 'paakiren'],
    ['kelkren', 'kelkiren'],
    ['keliren', 'kelkiren'],

    // ── VERB PAST TENSE shortened ────────────────────────────────────────
    ['ponen', 'poiten'],       // poiten = போய்ட்டேன்
    ['ponan', 'poitan'],
    ['vandhen', 'vandhen'],      // already in dict
    ['vandhein', 'vandhen'],
    ['vanden', 'vandhen'],
    ['vandhan', 'vandhan'],      // already in dict
    ['vandan', 'vandhan'],
    ['paten', 'paathen'],
    ['pathen', 'paathen'],      // already in dict
    ['pathan', 'paathan'],      // already in dict
    ['panninen', 'panninen'],     // already in dict
    ['paninen', 'panninen'],
    ['sonen', 'sonnen'],       // already in dict
    ['sonein', 'sonnen'],
    ['sonan', 'sonnan'],       // already in dict
    ['kelten', 'kelten'],       // already in dict
    ['keten', 'kelten'],

    // ── VERB FUTURE shortened ────────────────────────────────────────────
    ['poven', 'poven'],        // already in dict
    ['povin', 'poven'],
    ['varuven', 'varuven'],      // already in dict
    ['varuvin', 'varuven'],
    ['vareven', 'varuven'],
    ['solven', 'solven'],       // already in dict
    ['solvin', 'solven'],
    ['papen', 'paaphen'],
    ['paphen', 'paaphen'],      // already in dict
    ['seivin', 'seiven'],

    // ── COMMON NOUNS / PLACES shortened ──────────────────────────────────
    ['vidu', 'veedu'],
    ['vedu', 'veedu'],
    ['viduku', 'veetuku'],
    ['veduku', 'veetuku'],
    ['veeduku', 'veetuku'],
    ['viiduku', 'veetuku'],
    ['vidutuku', 'veetuku'],
    ['vetuku', 'veetuku'],      // already in dict
    ['vetukku', 'veetukku'],     // already in dict
    ['vidukku', 'veetukku'],
    ['veedukku', 'veetukku'],
    ['oruku', 'oorukku'],      // already in dict
    ['uruku', 'oorukku'],
    ['oorkku', 'oorukku'],
    ['oru', 'ooru'],         // already in dict
    ['uru', 'ooru'],
    ['kadai', 'kadai'],        // already in dict
    ['kade', 'kadai'],
    ['kadaiku', 'kadaikku'],
    ['kadeku', 'kadaikku'],
    ['skul', 'school'],
    ['skuluku', 'schoolukku'],
    ['skulku', 'schoolukku'],
    ['kolej', 'college'],
    ['kolejku', 'collegekku'],
    ['hosptl', 'hospital'],
    ['hosptalku', 'hospitalukku'],
    ['ofis', 'office'],
    ['ofisku', 'officekku'],

    // ── COMMON ADJECTIVES / ADVERBS ──────────────────────────────────────
    ['nala', 'nalla'],        // already in dict
    ['nalaa', 'nallaa'],       // already in dict
    ['romba', 'romba'],        // already in dict
    ['rompa', 'romba'],
    ['rombha', 'romba'],
    ['roma', 'romba'],
    ['peria', 'periya'],
    ['china', 'chinna'],
    ['cinna', 'chinna'],
    ['pudhu', 'pudhu'],        // already in dict
    ['pudu', 'pudhu'],
    ['puthia', 'pudhu'],
    ['pazhaia', 'pazhaiya'],

    // ── COMMON GREETINGS / PHRASES ───────────────────────────────────────
    ['vanakam', 'vanakkam'],     // already in dict
    ['vnkm', 'vanakkam'],
    ['vanakm', 'vanakkam'],
    ['nanri', 'nanri'],        // already in dict
    ['nandri', 'nandri'],       // already in dict
    ['thanks', 'nanri'],
    ['seri', 'seri'],         // already in dict
    ['sari', 'seri'],
    ['ceri', 'seri'],
    ['ok', 'ok'],           // already in dict

    // ── NEGATION / AFFIRMATION ───────────────────────────────────────────
    ['ila', 'illa'],         // already in dict
    ['ile', 'illai'],
    ['ilai', 'illai'],        // already in dict
    ['illay', 'illai'],
    ['aama', 'aama'],         // already in dict
    ['ama', 'aama'],
    ['venam', 'venam'],        // already in dict
    ['vena', 'venam'],
    ['venum', 'venum'],        // already in dict
    ['venu', 'venum'],
    ['vendum', 'vendum'],       // already in dict
    ['vendam', 'vendam'],       // already in dict
    ['matein', 'mudiyala'],
    ['mudiala', 'mudiyala'],

    // ── SUFFIXES shortened (common postpositions) ────────────────────────
    ['kita', 'kita'],         // already in dict → கிட்ட
    ['kuda', 'kita'],
    ['pathi', 'pathi'],        // already in dict → பத்தி
    ['pati', 'pathi'],
    ['mela', 'mela'],         // already in dict → மேல
    ['kela', 'kela'],         // already in dict → கீழ
    ['ula', 'ulla'],         // already in dict → உள்ள

    // ── FOOD WORDS ───────────────────────────────────────────────────────
    ['soru', 'soru'],         // already in dict
    ['tani', 'thanni'],
    ['tanir', 'thanneer'],
    ['taneer', 'thanneer'],
    ['pal', 'paal'],
    ['tair', 'thayir'],
    ['tayir', 'thayir'],
    ['sadam', 'sadam'],        // already in dict
    ['satam', 'sadam'],
    ['idli', 'idly'],         // already in dict
    ['dosai', 'dosa'],
    ['dose', 'dosa'],

    // ── RELATIONSHIP WORDS ───────────────────────────────────────────────
    ['ama', 'amma'],
    ['apa', 'appa'],
    ['anan', 'annan'],
    ['tambi', 'thambi'],
    ['aka', 'akka'],
    ['tangachi', 'thangachi'],
    ['tangaci', 'thangachi'],
    ['mama', 'mama'],         // already in dict
    ['mami', 'maami'],
    ['tata', 'thatha'],
    ['pati', 'paati'],

    // ── MISC COMMON WORDS ────────────────────────────────────────────────
    ['konjam', 'konjam'],       // already in dict
    ['konja', 'konjam'],
    ['koncham', 'konjam'],
    ['koncha', 'konjam'],
    ['super', 'super'],        // already in dict
    ['supr', 'super'],
    ['bayankara', 'bayankara'],    // already in dict
    ['baynkra', 'bayankara'],
    ['panam', 'panam'],
    ['neram', 'neram'],        // already in dict → நேரம்
    ['neeram', 'neram'],       // long-e spelling variant → same
    ['neramum', 'neramum'],    // neram + um inclusive particle
    ['neeramum', 'neramum'],       // already in dict
    ['pana', 'panam'],
    ['kasu', 'kaasu'],
    ['velai', 'velai'],        // already in dict
    ['vela', 'velai'],
    ['padippu', 'padippu'],      // already in dict
    ['padipu', 'padippu'],
    ['arivu', 'arivu'],        // already in dict
    ['arive', 'arivu'],
    ['tamil', 'tamil'],        // already in dict
    ['tamizh', 'tamizh'],       // already in dict
    ['tamiz', 'tamizh'],

    // ── BODY PARTS ───────────────────────────────────────────────────────
    ['talai', 'thalai'],
    ['tale', 'thalai'],
    ['kan', 'kannu'],
    ['katu', 'kaadhu'],
    ['muku', 'mooku'],
    ['moku', 'mooku'],
    ['kal', 'kaal'],

    // ── EMOTION WORDS ────────────────────────────────────────────────────
    ['sandosam', 'santhosham'],
    ['santosam', 'santhosham'],
    ['sandosham', 'santhosham'],
    ['kopam', 'kovam'],
    ['kobam', 'kovam'],
    ['bayam', 'bayam'],        // already in dict
    ['kadal', 'kadhal'],
    ['kathal', 'kadhal'],
    ['anbu', 'anbu'],         // already in dict
    ['kastam', 'kastam'],       // already in dict
    ['kasdam', 'kastam'],
    ['kashtam', 'kastam'],

    // ── LOCATION WORDS ───────────────────────────────────────────────────
    ['inga', 'inga'],
    ['inge', 'inge'],
    ['anga', 'anga'],
    ['ange', 'ange'],
    ['ingae', 'inga'],
    ['angae', 'anga'],

    // ── DEMONSTRATIVES ───────────────────────────────────────────────────
    ['inda', 'intha'],        // already in dict → இந்த
    ['inta', 'intha'],
    ['anda', 'antha'],        // already in dict → அந்த
    ['anta', 'antha'],
    ['eda', 'entha'],        // already in dict → எந்த
    ['enta', 'entha'],
    ['idu', 'ithu'],
    ['itu', 'ithu'],
    ['adu', 'adhu'],
    ['atu', 'adhu'],
]);

// ============ HARDCODED FALLBACK TAMIL MAP ============
// Direct Tanglish → Tamil for the most common words.
// Checked BEFORE the rule engine so common informal spellings always
// produce the correct Tamil even when the backend dictionary is offline.
// Both the informal spelling AND the canonical form are included.
const _fallbackTamilMap = new Map([
    // ── TIME ─────────────────────────────────────────────────────────────
    ['raghunath', 'ரகுநாத்'],
    ['raghunaath', 'ரகுநாத்'],
    ['ragunath', 'ரகுநாத்'],   // common alternate spelling
    ['raghu', 'ரகு'],
    ['oorula', 'ஊருல'],
    ['oorulae', 'ஊருலே'],
    ['ellorum', 'எல்லோரும்'],
    ['ellam', 'எல்லாம்'],
    ['ellaa', 'எல்லா'],
    ['villai', 'வில்லை'],
    ['kelvi', 'கேள்வி'],
    ['aagavey', 'ஆகவே'],
    ['alavey', 'அளவே'],
    ['naalaikku', 'நாளைக்கு'], ['naaliku', 'நாளைக்கு'],
    ['ennaku', 'எனக்கு'], ['unnaku', 'உனக்கு'],
    ['avangaku', 'அவங்களுக்கு'], ['nadu', 'நாடு'],
    ['naliku', 'நாளைக்கு'], ['nalikku', 'நாளைக்கு'],
    ['naleku', 'நாளைக்கு'], ['nalekku', 'நாளைக்கு'],
    ['naaleku', 'நாளைக்கு'], ['naleiku', 'நாளைக்கு'],
    ['naalaiku', 'நாளைக்கு'], ['nalaku', 'நாளைக்கு'],
    ['naalku', 'நாளைக்கு'],
    ['naalai', 'நாளை'], ['nalai', 'நாளை'],
    ['nalei', 'நாளை'], ['nale', 'நாளை'],
    ['naale', 'நாளை'], ['naali', 'நாளை'],
    ['nethu', 'நேத்து'], ['netha', 'நேத்து'],
    ['nethe', 'நேத்து'], ['neethu', 'நேத்து'],
    ['neku', 'நேத்து'],
    ['inniku', 'இன்னிக்கு'], ['iniku', 'இன்னிக்கு'],
    ['inikku', 'இன்னிக்கு'], ['innik', 'இன்னிக்கு'],
    ['inaku', 'இன்னிக்கு'], ['innaku', 'இன்னிக்கு'],
    ['inniki', 'இன்னிக்கு'], ['iniki', 'இன்னிக்கு'],
    ['innaiku', 'இன்னைக்கு'],
    // ── QUESTION WORDS ───────────────────────────────────────────────────
    ['enna', 'என்ன'], ['yenna', 'என்ன'],
    ['ena', 'என்ன'], ['ene', 'என்ன'],
    ['enakku', 'எனக்கு'], ['enaku', 'எனக்கு'], ['ennaku', 'எனக்கு'],
    ['unakku', 'உனக்கு'], ['unaku', 'உனக்கு'], ['unnaku', 'உனக்கு'],
    ['eppadi', 'எப்படி'], ['epaddi', 'எப்படி'],
    ['epdi', 'எப்படி'], ['yepdi', 'எப்படி'],
    ['epidi', 'எப்படி'], ['yeppadi', 'எப்படி'],
    ['eppo', 'எப்போ'], ['epo', 'எப்போ'],
    ['yepo', 'எப்போ'],
    ['enga', 'எங்க'], ['enge', 'எங்கே'],
    ['kitte', 'கிட்டே'],
    ['eng', 'எங்க'],
    ['evvalo', 'எவ்வளோ'], ['evalo', 'எவ்வளோ'],
    ['evlo', 'எவ்வளோ'], ['evalu', 'எவ்வளோ'],
    ['ethanai', 'எத்தனை'], ['ethna', 'எத்தனை'],
    ['ethane', 'எத்தனை'], ['ethu', 'எது'],
    ['keezhe', 'கீழே'], ['keezha', 'கீழே'], ['keezhil', 'கீழில்'],
    ['meele', 'மேலே'], ['meela', 'மேலே'], ['melae', 'மேலே'],
    // ── PRONOUNS ─────────────────────────────────────────────────────────
    ['naan', 'நான்'], ['nan', 'நான்'],
    ['nii', 'நீ'], ['ni', 'நீ'],
    ['neenga', 'நீங்க'], ['ninga', 'நீங்க'],
    ['nenga', 'நீங்க'], ['ningal', 'நீங்க'],
    ['avan', 'அவன்'], ['aven', 'அவன்'],
    ['aval', 'அவள்'], ['avl', 'அவள்'],
    ['avanga', 'அவங்க'],
    ['ivan', 'இவன்'], ['ivn', 'இவன்'],
    ['ivana', 'இவனா'], ['ivane', 'இவனே'], ['ivanda', 'இவனிடம்'],
    ['ivanu', 'இவனு'], ['ivanuku', 'இவனுக்கு'], ['ivanukku', 'இவனுக்கு'],
    ['ivanil', 'இவனில்'], ['ivanla', 'இவனில்'],
    ['ivankita', 'இவன்கிட்ட'], ['ivankitta', 'இவன்கிட்ட'],
    ['ival', 'இவள்'], ['ivl', 'இவள்'],
    ['ivala', 'இவளா'], ['ivale', 'இவளே'],
    ['namma', 'நம்ம'], ['namba', 'நம்ம'],
    ['nammakku', 'நம்மக்கு'], ['nambaku', 'நம்மக்கு'],
    // ── COMMON NOUNS (manam/mandham type — medial-n words) ───────────────
    ['manam', 'மனம்'], ['manasu', 'மனசு'], ['manase', 'மனசே'],
    ['manamu', 'மனமு'], ['maname', 'மனமே'], ['manamee', 'மனமே'],
    ['mandham', 'மண்டம்'], ['mandha', 'மண்ட'], ['mandhama', 'மண்டமா'],
    ['mandhi', 'மண்டி'], ['mandi', 'மண்டி'],
    ['sandai', 'சண்டை'], ['sandai', 'சண்டை'], ['sandaiku', 'சண்டைக்கு'],
    ['sandaipoda', 'சண்டை போட'],
    ['thandu', 'தண்டு'], ['thandai', 'தண்டை'],
    ['pandu', 'பண்டு'], ['pandi', 'பண்டி'],
    ['kandu', 'கண்டு'], ['kandhu', 'கண்டு'],
    // ── COMMON VERBS (present) ────────────────────────────────────────────
    ['poren', 'போறேன்'], ['porn', 'போறேன்'],
    ['porin', 'போறேன்'], ['porein', 'போறேன்'],
    ['poran', 'போறான்'], ['poraanga', 'போறாங்க'],
    ['varen', 'வாறேன்'], ['varn', 'வாறேன்'],
    ['varain', 'வாறேன்'], ['varien', 'வாறேன்'],
    ['varaanga', 'வாறாங்க'], ['varaan', 'வாறான்'],
    ['pannren', 'பண்றேன்'], ['panren', 'பண்றேன்'],
    ['panniren', 'பண்றேன்'], ['paniren', 'பண்றேன்'],
    ['saapren', 'சாப்றேன்'], ['sapren', 'சாப்றேன்'],
    ['saapitten', 'சாப்பிட்டேன்'], ['sapitten', 'சாப்பிட்டேன்'],
    ['saapittan', 'சாப்பிட்டான்'], ['sapitan', 'சாப்பிட்டான்'],
    ['saapitu', 'சாப்பிட்டு'], ['saptu', 'சாப்பிட்டு'],
    ['saapadu', 'சாப்பாடு'], ['sapadu', 'சாப்பாடு'],
    ['irukken', 'இருக்கேன்'], ['irukein', 'இருக்கேன்'],
    ['irukin', 'இருக்கேன்'], ['irukeen', 'இருக்கேன்'],
    ['iruken', 'இருக்கேன்'],
    ['irukkaan', 'இருக்கான்'], ['irukan', 'இருக்கான்'],
    ['irukaan', 'இருக்கான்'],
    ['irukkaal', 'இருக்காள்'], ['irukal', 'இருக்காள்'],
    ['irukaal', 'இருக்காள்'],
    ['irukku', 'இருக்கு'], ['irukum', 'இருக்கு'],
    ['irukkom', 'இருக்கோம்'], ['irukom', 'இருக்கோம்'],
    ['irukoom', 'இருக்கோம்'],
    ['irukkeenga', 'இருக்கீங்க'], ['irukeenga', 'இருக்கீங்க'],
    ['irukinga', 'இருக்கீங்க'],
    ['irukkaanga', 'இருக்காங்க'], ['irukanga', 'இருக்காங்க'],
    ['paakiren', 'பாக்கிறேன்'], ['paren', 'பாக்கிறேன்'],
    ['pakren', 'பாக்கிறேன்'], ['parkren', 'பாக்கிறேன்'],
    ['pakiren', 'பாக்கிறேன்'],
    ['kelkiren', 'கேக்கிறேன்'], ['kelkren', 'கேக்கிறேன்'],
    ['keliren', 'கேக்கிறேன்'],
    ['padikiren', 'படிக்கிறேன்'], ['padikren', 'படிக்கிறேன்'],
    ['padikiran', 'படிக்கிறான்'], ['padikran', 'படிக்கிறான்'],
    ['solren', 'சொல்றேன்'], ['solirin', 'சொல்றேன்'],
    // ── PAST TENSE ───────────────────────────────────────────────────────
    ['poiten', 'போய்ட்டேன்'], ['ponen', 'போய்ட்டேன்'],
    ['poitan', 'போய்ட்டான்'], ['ponan', 'போய்ட்டான்'],
    ['vandhen', 'வந்தேன்'], ['vanden', 'வந்தேன்'],
    ['vandhan', 'வந்தான்'], ['vandan', 'வந்தான்'],
    ['nandri', 'நன்றி'], ['nanda', 'நந்த'], ['nandhini', 'நந்தினி'], ['nandhan', 'நந்தன்'],
    ['vanda', 'வந்த'], ['vandhavan', 'வந்தவன்'], ['vandhavanga', 'வந்தவங்க'],
    ['paathen', 'பாத்தேன்'], ['paten', 'பாத்தேன்'],
    ['pathen', 'பாத்தேன்'],
    ['paathan', 'பாத்தான்'], ['pathan', 'பாத்தான்'],
    ['panninen', 'பண்ணினேன்'], ['paninen', 'பண்ணினேன்'],
    ['sonnen', 'சொன்னேன்'], ['sonen', 'சொன்னேன்'],
    ['sonnan', 'சொன்னான்'], ['sonan', 'சொன்னான்'],
    ['kelten', 'கேட்டேன்'], ['keten', 'கேட்டேன்'],
    // ── FUTURE ───────────────────────────────────────────────────────────
    ['poven', 'போவேன்'], ['povin', 'போவேன்'],
    ['varuven', 'வருவேன்'], ['varuvin', 'வருவேன்'],
    ['vareven', 'வருவேன்'],
    ['solven', 'சொல்வேன்'], ['solvin', 'சொல்வேன்'],
    ['seiven', 'செய்வேன்'], ['seivin', 'செய்வேன்'],
    // ── NEGATION / AFFIRMATION ───────────────────────────────────────────
    ['illai', 'இல்லை'], ['ile', 'இல்லை'],
    ['ilai', 'இல்லை'], ['illay', 'இல்லை'],
    ['illa', 'இல்ல'], ['ila', 'இல்ல'],
    ['aama', 'ஆமா'], ['ama', 'ஆமா'],
    ['venam', 'வேணாம்'], ['vena', 'வேணாம்'],
    ['venum', 'வேணும்'], ['venu', 'வேணும்'],
    ['vendum', 'வேண்டும்'],
    ['vendam', 'வேண்டாம்'],
    ['mudiyala', 'முடியல'], ['mudiala', 'முடியல'],
    ['matein', 'முடியல'],
    // ── NOUNS / PLACES ────────────────────────────────────────────────────
    ['veedu', 'வீடு'], ['vidu', 'வீடு'],
    ['vedu', 'வீடு'],
    ['veetuku', 'வீட்டுக்கு'], ['viduku', 'வீட்டுக்கு'],
    ['veeduku', 'வீட்டுக்கு'], ['veduku', 'வீட்டுக்கு'],
    ['veetukku', 'வீட்டுக்கு'], ['veedukku', 'வீட்டுக்கு'],
    ['vidukku', 'வீட்டுக்கு'],
    ['veetula', 'வீட்டுல'], ['veedula', 'வீட்டுல'], ['vedula', 'வீட்டுல'],
    ['veetule', 'வீட்டுலே'], ['veetulle', 'வீட்டுலே'],
    ['veetil', 'வீட்டில்'], ['veedil', 'வீட்டில்'],
    ['avankita', 'அவன்கிட்ட'], ['avankitta', 'அவன்கிட்ட'],
    ['avalakita', 'அவளிடம்'], ['avanakita', 'அவனிடம்'],
    ['avalkita', 'அவள்கிட்ட'], ['avalkitta', 'அவள்கிட்ட'],
    ['ivankita', 'இவன்கிட்ட'], ['ivankitta', 'இவன்கிட்ட'],
    ['ivalkita', 'இவள்கிட்ட'], ['ivalkitta', 'இவள்கிட்ட'],
    ['neengakku', 'நீங்களுக்கு'], ['ningakku', 'நீங்களுக்கு'],
    ['neengaku', 'நீங்களுக்கு'], ['ningaku', 'நீங்களுக்கு'],
    ['ooru', 'ஊரு'], ['oru', 'ஊரு'],
    ['oorukku', 'ஊருக்கு'], ['oruku', 'ஊருக்கு'],
    ['uruku', 'ஊருக்கு'],
    ['kadai', 'கடை'], ['kade', 'கடை'],
    ['kadaikku', 'கடைக்கு'], ['kadaiku', 'கடைக்கு'],
    ['kadeku', 'கடைக்கு'],
    // ── ADJECTIVES / ADVERBS ─────────────────────────────────────────────
    ['nalla', 'நல்ல'], ['nala', 'நல்ல'],
    ['nallaa', 'நல்லா'], ['nalaa', 'நல்லா'],
    ['romba', 'ரொம்ப'], ['rompa', 'ரொம்ப'],
    ['rombha', 'ரொம்ப'], ['roma', 'ரொம்ப'],
    ['periya', 'பெரிய'], ['peria', 'பெரிய'],
    ['chinna', 'சின்ன'], ['china', 'சின்ன'],
    ['pudhu', 'புது'], ['pudu', 'புது'],
    // ── GREETINGS ─────────────────────────────────────────────────────────
    ['vanakkam', 'வணக்கம்'], ['vanakam', 'வணக்கம்'],
    ['vanakm', 'வணக்கம்'], ['vnkm', 'வணக்கம்'],
    ['nanri', 'நன்றி'], ['nandri', 'நன்றி'],
    ['seri', 'சேரி'], ['sari', 'சேரி'],
    ['ceri', 'சேரி'],
    // ── LOCATION ─────────────────────────────────────────────────────────
    ['inga', 'இங்க'], ['inge', 'இங்கே'],
    ['anga', 'அங்க'], ['ange', 'அங்கே'],
    // ── DEMONSTRATIVES ───────────────────────────────────────────────────
    ['intha', 'இந்த'], ['inda', 'இந்த'],
    ['inta', 'இந்த'],
    ['antha', 'அந்த'], ['anda', 'அந்த'],
    ['anta', 'அந்த'],
    ['entha', 'எந்த'], ['eda', 'எந்த'],
    ['enta', 'எந்த'],
    ['ithu', 'இது'], ['idu', 'இது'],
    ['itu', 'இது'],
    ['adhu', 'அது'], ['adu', 'அது'],
    ['atu', 'அது'],
    // ── COMMON NOUNS ─────────────────────────────────────────────────────
    ['konjam', 'கொஞ்சம்'], ['konja', 'கொஞ்சம்'],
    ['koncham', 'கொஞ்சம்'], ['koncha', 'கொஞ்சம்'],
    ['panam', 'பணம்'], ['pana', 'பணம்'],
    ['kaasu', 'காசு'], ['kasu', 'காசு'],
    ['neram', 'நேரம்'], ['neeram', 'நேரம்'],
    ['neramum', 'நேரமும்'], ['neeramum', 'நேரமும்'],
    ['nerathula', 'நேரத்துல'], ['neerathula', 'நேரத்துல'],
    ['nerathu', 'நேரத்து'], ['neerathu', 'நேரத்து'],
    ['nerathukku', 'நேரத்துக்கு'], ['neerathukku', 'நேரத்துக்கு'],
    ['velai', 'வேலை'], ['vela', 'வேலை'],
    ['thanni', 'தண்ணி'], ['tani', 'தண்ணி'],
    ['thanneer', 'தண்ணீர்'], ['tanir', 'தண்ணீர்'],
    ['taneer', 'தண்ணீர்'],
    ['paal', 'பால்'], ['pal', 'பால்'],
    ['thayir', 'தயிர்'], ['tair', 'தயிர்'],
    ['tayir', 'தயிர்'],
    ['sadam', 'சாதம்'], ['satam', 'சாதம்'],
    ['santhosham', 'சந்தோஷம்'],
    ['kovam', 'கோபம்'], ['kopam', 'கோபம்'],
    ['kobam', 'கோபம்'], ['bayam', 'பயம்'],
    ['kadhal', 'காதல்'], ['kadal', 'காதல்'], ['kathal', 'காதல்'],
    ['anbu', 'அன்பு'],
    ['kastam', 'கஷ்டம்'], ['kasdam', 'கஷ்டம்'],
    ['kashtam', 'கஷ்டம்'],
    // ── BODY PARTS ───────────────────────────────────────────────────────
    ['thalai', 'தலை'], ['talai', 'தலை'],
    ['tale', 'தலை'],
    ['kannu', 'கண்ணு'], ['kan', 'கண்'],
    ['kaadhu', 'காது'], ['katu', 'காது'],
    ['mooku', 'மூக்கு'], ['muku', 'மூக்கு'],
    ['kaal', 'கால்'], ['kal', 'கால்'],
    // ── FAMILY ───────────────────────────────────────────────────────────
    ['amma', 'அம்மா'], ['apa', 'அப்பா'],
    ['appa', 'அப்பா'],
    ['annan', 'அண்ணன்'], ['anan', 'அண்ணன்'],
    ['thambi', 'தம்பி'], ['tambi', 'தம்பி'],
    ['akka', 'அக்கா'], ['aka', 'அக்கா'],
    ['thangachi', 'தங்கச்சி'], ['tangachi', 'தங்கச்சி'],
    ['maami', 'மாமி'], ['mami', 'மாமி'],
    ['thatha', 'தாத்தா'], ['tata', 'தாத்தா'],
    ['paati', 'பாட்டி'],
    // ── LANGUAGE ─────────────────────────────────────────────────────────
    ['tamil', 'தமிழ்'], ['tamizh', 'தமிழ்'],
    ['tamiz', 'தமிழ்'],
    // ── PERSON WORDS ─────────────────────────────────────────────────────
    ['oruthar', 'ஒருத்தர்'], ['orutharr', 'ஒருத்தர்'],
    ['oruththar', 'ஒருத்தர்'], ['oruththarr', 'ஒருத்தர்'],
    // ── NAMES ────────────────────────────────────────────────────────────
    // ['thilothama', 'திலோத்தம்மா'],
    // ── GEMINATION WORDS (Critical #2 — common doubled-consonant words) ──
    ['pakkam', 'பக்கம்'], ['pakkathula', 'பக்கத்துல'],
    ['vittai', 'வித்தை'], ['vittu', 'விட்டு'],
    ['kattai', 'கட்டை'], ['kattu', 'கட்டு'], ['kattam', 'கட்டம்'],
    ['pattam', 'பட்டம்'], ['pattu', 'பட்டு'], ['patti', 'பட்டி'],
    ['kottai', 'கொட்டை'], ['kottu', 'கொட்டு'],
    ['mattai', 'மட்டை'], ['mattam', 'மட்டம்'],
    ['settai', 'செட்டை'], ['sottu', 'சொட்டு'],
    ['thattai', 'தட்டை'], ['thattu', 'தட்டு'],
    ['vattam', 'வட்டம்'], ['vattu', 'வட்டு'],
    ['muttai', 'முட்டை'], ['muttu', 'முட்டு'],
    ['kottam', 'கொட்டம்'], ['kattam', 'கட்டம்'],
    ['pottai', 'பொட்டை'], ['pottu', 'பொட்டு'],
    ['sottai', 'சொட்டை'],
    ['rettai', 'ரெட்டை'],
    ['vettai', 'வேட்டை'], ['vettu', 'வெட்டு'],
    ['ottam', 'ஓட்டம்'], ['ottu', 'ஓட்டு'],
    ['ittam', 'இட்டம்'], ['ittu', 'இட்டு'],
]);

function normalizeInput(input) {
    if (!input) return input;

    let normalized = input.toLowerCase().trim();

    // ── STEP 0: Whole-word spelling correction ──────────────────────────
    // Check if the entire typed word matches a known misspelling
    if (_tanglishSpellingMap.has(normalized)) {
        normalized = _tanglishSpellingMap.get(normalized);
    }

    // ye + consonant cluster = colloquial எ (yedhu=எது, yellam=எல்லாம்)
    normalized = normalized.replace(/^ye(dh|th|ll|pp|lv|ng|tt|nn|nk|nj|zh|tr)/g, 'e$1');

    // Specific whole-word ye- colloquial normalization
    const yeWords = {
        'yenna': 'enna', 'yennanu': 'ennanu', 'yenga': 'enga', 'yenge': 'enge',
        'yeppadi': 'eppadi', 'yepdi': 'eppadi', 'yeppo': 'eppo',
        'yellam': 'ellam', 'yella': 'ella', 'yethanai': 'ethanai',
        'yevlo': 'evlo', 'yevvalo': 'evvalo',
    };
    if (yeWords[normalized]) normalized = yeWords[normalized];

    // NOTE: Do NOT strip trailing aa/ee/oo — these are valid long vowels that the
    // token engine must see intact (nee=நீ, veedu=வீடு, koodam=கூடம் etc.).
    // The old stripping lines were removed because they broke hundreds of words.

    // Common informal shortenings → canonical form for lookup
    const shortcuts = {
        // trailing -la (locative) variants
        'la': 'la', 'le': 'la',
        // -ku/-kku suffix
        'ku': 'ku', 'kku': 'kku',
        // spelling normalizations
        'ph': 'f',  // ph → f sound
        // double consonant simplifications for lookup
    };

    // Normalize: pandren/pannren → pannren (double-n before suffixes)
    normalized = normalized
        // saap variants → saapi
        .replace(/^saap([td])/, 'saapit$1')
        // paakirren → paakiren
        .replace(/rren$/, 'ren')
        .replace(/rran$/, 'ran')
        .replace(/rral$/, 'ral')
        // handle -inja variants: -inju / -inja / -icha all → check dict first
        // kaanom → kaanom (already in dict now)
        // therla → theriyala (expand short forms)
        .replace(/therla$/, 'theriyala')
        .replace(/purla$/, 'puriyala')
        .replace(/mudla$/, 'mudiyala')
        .replace(/varla$/, 'varala')
        .replace(/porla$/, 'porala')
        // -nga → -inga (common suffix drop)
        .replace(/^(po|va|so|pa|pe)nga$/, '$1inga');

    // Normalize final -ash to -aash for names (e.g. subash -> subaash -> சுபாஷ்)
    if (normalized.endsWith('ash') && normalized.length > 3) {
        normalized = normalized.replace(/ash$/, 'aash');
    }

    return normalized;
}

// ── SUFFIX-TO-TAMIL CONVERSION TABLE ───────────────────────────────────────
// Maps Tanglish suffix patterns to their Tamil equivalents.
// Used by checkCompoundWord() to produce  stem_tamil + suffix_tamil  output
// instead of returning only the stem.
const _suffixTamilMap = {
    // ── Case markers (vibhakti) ──────────────────────────────────────────
    'kku': 'க்கு',       // dative: veedukku → வீட்டுக்கு
    'ukku': 'உக்கு',      // dative (vowel stem): oorukku → ஊருக்கு
    'ku': 'கு',          // short dative
    'il': 'இல்',         // locative: veetil → வீட்டில்
    'la': 'ல',           // colloquial locative: veetila → வீட்டில
    'ala': 'ல',          // verb negation: varala → வரல, solala → சொல்ல
    'ella': 'இல்ல',      // negation: illai colloquial form
    'le': 'ல',           // colloquial locative: inge → இங்கே
    'ulla': 'உள்ள',        // inside: veetuulla → வீட்டுள்ள
    'ule': 'உள்ள',        // colloquial inside
    'odu': 'ஓடு',         // comitative/instrumental: avanodu → அவனோடு
    'oadu': 'ஓடு',         // comitative alt spelling
    'oda': 'ஓட',          // colloquial comitative: ennoda → என்னோட
    'aaga': 'ஆக',          // purposive: enakkaga → எனக்காக
    'aana': 'ஆன',          // adjectival: nallana → நல்லான
    'aanaa': 'ஆனா',         // conditional: vandhaanaa → வந்தானா
    'aanaal': 'ஆனால்',       // adversative: aanaaal → ஆனால்
    'kaaga': 'க்காக',       // purposive (geminated): enakkaga → எனக்காக
    'inaal': 'இனால்',       // causal
    'pola': 'போல',         // similative: avanpola → அவன் போல
    'maathiri': 'மாதிரி',    // similative (colloquial): ithmaathiri → இது மாதிரி
    'madhiri': 'மாதிரி',     // similative alt spelling
    'kita': 'கிட்ட',       // dative person: avankita → அவன்கிட்ட
    'kitta': 'கிட்ட',       // dative person: avankitta → அவன்கிட்ட
    'kittae': 'கிட்டே',      // emphatic dative
    'varai': 'வரை',         // terminative: ingavarai → இங்க வரை
    'vara': 'வர',          // terminative short
    'aal': 'ஆல்',         // instrumental: avanaal → அவனால்
    'ai': 'ஐ',           // accusative: avanaai → அவனை
    // ── Additional case markers / postpositions ──────────────────────────
    'irkku': 'இருக்கு',     // "there is for": avanurkku
    'irku': 'இர்கு',       // short form
    'ilirundhu': 'இலிருந்து', // ablative: veetilirundhu → வீட்டிலிருந்து
    'lerndhu': 'லிருந்து',    // colloquial ablative: veetlerndhu
    'lirundhu': 'லிருந்து',   // colloquial ablative
    'lendhu': 'லிருந்து',    // colloquial ablative
    'vitu': 'விடு',         // completive: pannivitu → பண்ணிவிடு
    'vittu': 'விட்டு',       // completive past: pannivittu → பண்ணிவிட்டு
    'uttu': 'உட்டு',        // colloquial completive: vandhuuttu → வந்துட்டு
    'udhu': 'உது',          // 3rd person neuter: varudhu → வருது
    'dhu': 'து',           // short 3rd neuter
    'thaan': 'தான்',         // emphatic: avanthaan → அவன்தான்
    'thaana': 'தானா',         // question emphatic
    'thane': 'தானே',         // tag question: illathane → இல்லதானே
    'um': 'உம்',          // inclusive: avalum → அவளும்
    'yum': 'யும்',         // inclusive (after vowel): naanum → நானும்
    'kum': 'கும்',         // inclusive dative
    'lam': 'லாம்',         // permissive: pokalaam → போகலாம்
    'laam': 'லாம்',         // permissive alt
    'num': 'னும்',         // conditional inclusive: avanumm
    'aadhu': 'ஆது',          // negative 3rd: varaadhu → வராது
    'aama': 'ஆம',           // question/agreement
    'aadha': 'ஆத',           // negative adjectival: varaadha → வராத
    'amal': 'ாமல்',         // negative conditional: varamal → வராமல்
    'aame': 'ாமே',          // despite: varaame → வராமே
    'ndhu': 'ந்து',         // perfect participial: vandhu → வந்து
    'ndhuttu': 'ந்துட்டு',    // colloquial perfect: vandhuttu → வந்துட்டு
    'ttuttu': 'ட்டுட்டு',    // colloquial double perfect
    'nga': 'ங்க',          // respectful plural: vaanga → வாங்க
    // 'la': 'ல',             // negation/locative: varala → வரல, veetila → வீட்டில  ← already exists, skip if present
    'e': 'ே',              // emphatic: ingae → இங்கே
    // 'thaan': 'தான்',       // emphatic: avanthaan → அவன்தான்  ← already exists? check
    'o': 'ஓ',            // respectful plural: vaanga → வாங்க
    'ngala': 'ங்களா',        // respectful question: vandheengala
    'ngale': 'ங்களே',        // respectful vocative
    'kal': 'கள்',          // plural: manithargal → மனிதர்கள்
    'gal': 'கள்',          // plural alt: aandugal → ஆண்டுகள்
    'athu': 'அது',          // demonstrative
    'idhu': 'இது',          // demonstrative
    // ── Colloquial verbal suffixes ────────────────────────────────────────
    'nu': 'னு',          // colloquial: ponu→போனு, sonnnu→சொன்னு
    'nnu': 'ன்னு',       // sonnnu → சொன்னு
    'nnnu': 'ன்னு',      // triple-n variant some users type
    // ── Irukku question paradigm ──────────────────────────────────────────
    'irukkaangala': 'இருக்காங்களா',
    'irukkingala': 'இருக்கிங்களா',
    'irukkaala': 'இருக்காளா',
    'irukkaanaa': 'இருக்கானா',
    // ── Progressive/Aspectual verb suffixes (-kittu/-kitte paradigm) ───────
    // Participles
    'kitte': 'கிட்டே',
    'kkitte': 'க்கிட்டே',
    'kitu': 'கிட்டு',
    'kkitu': 'க்கிட்டு',
    'kittu': 'கிட்டு',
    'kkittu': 'க்கிட்டு',
    'kite': 'கிட்டே',
    'kkite': 'க்கிட்டே',
    'kittae': 'கிட்டே',
    'kkittae': 'க்கிட்டே',
    // Conjugated forms for kittu
    'kitten': 'கிட்டேன்',
    'kkitten': 'க்கிட்டேன்',
    'kittein': 'கிட்டேன்',
    'kkittein': 'க்கிட்டேன்',
    'kittan': 'கிட்டான்',
    'kkittan': 'க்கிட்டான்',
    'kittal': 'கிட்டாள்',
    'kkittal': 'க்கிட்டாள்',
    'kittom': 'கிட்டோம்',
    'kkittom': 'க்கிட்டோம்',
    'kittinga': 'கிட்டீங்க',
    'kkittinga': 'க்கிட்டீங்க',
    'kittanga': 'கிட்டாங்க',
    'kkittanga': 'க்கிட்டாங்க',
    'kiten': 'கிட்டேன்',
    'kkiten': 'க்கிட்டேன்',
    'kitein': 'கிட்டேன்',
    'kkitein': 'க்கிட்டேன்',
    'kitan': 'கிட்டான்',
    'kkitan': 'க்கிட்டான்',
    'kital': 'கிட்டாள்',
    'kkital': 'க்கிட்டாள்',
    'kitom': 'கிட்டோம்',
    'kkitom': 'க்கிட்டோம்',
    'kitinga': 'கிட்டீங்க',
    'kkitinga': 'க்கிட்டீங்க',
    'kitanga': 'கிட்டாங்க',
    'kkitanga': 'க்கிட்டாங்க',
    // Progressive continuous (kittiru)
    'kittirukken': 'கிட்டிருக்கேன்',
    'kkittirukken': 'க்கிட்டிருக்கேன்',
    'kittirukkeen': 'கிட்டிருக்கேன்',
    'kkittirukkeen': 'க்கிட்டிருக்கேன்',
    'kittiruken': 'கிட்டிருக்கேன்',
    'kkittiruken': 'க்கிட்டிருக்கேன்',
    'kittirukkaan': 'கிட்டிருக்கான்',
    'kkittirukkaan': 'க்கிட்டிருக்கான்',
    'kittirukaal': 'கிட்டிருக்காள்',
    'kkittirukaal': 'க்கிட்டிருக்காள்',
    'kittirukkom': 'கிட்டிருக்கோம்',
    'kkittirukkom': 'க்கிட்டிருக்கோம்',
    'kittirukkeenga': 'கிட்டிருக்கீங்க',
    'kkittirukkeenga': 'க்கிட்டிருக்கீங்க',
    'kittirukkingala': 'கிட்டிருக்கீங்களா',
    'kkittirukkingala': 'க்கிட்டிருக்கீங்களா',
    'kittirukkaanga': 'கிட்டிருக்காங்க',
    'kkittirukkaanga': 'க்கிட்டிருக்காங்க',
    'kittirukku': 'கிட்டிருக்கு',
    'kkittirukku': 'க்கிட்டிருக்கு',
    'kittirukka': 'கிட்டிருக்க',
    'kkittirukka': 'க்கிட்டிருக்க',
    'kittiru': 'கிட்டிரு',
    'kkittiru': 'க்கிட்டிரு',
    // Continuous past (kittirundhu)
    'kittirundhen': 'கிட்டிருந்தேன்',
    'kkittirundhen': 'க்கிட்டிருந்தேன்',
    'kittirundhan': 'கிட்டிருந்தான்',
    'kkittirundhan': 'க்கிட்டிருந்தான்',
    'kittirundhaal': 'கிட்டிருந்தாள்',
    'kkittirundhaal': 'க்கிட்டிருந்தாள்',
    'kittirundhom': 'கிட்டிருந்தோம்',
    'kkittirundhom': 'க்கிட்டிருந்தோம்',
    'kittirundhaanga': 'கிட்டிருந்தாங்க',
    'kkittirundhaanga': 'க்கிட்டிருந்தாங்க',
    'kittirundhu': 'கிட்டிருந்து',
    'kkittirundhu': 'க்கிட்டிருந்து',
    // Short progressive forms (kitru / kittru)
    'kitruken': 'கிட்டுருக்கேன்',
    'kkitruken': 'க்கிட்டுருக்கேன்',
    'kitrukeen': 'கிட்டுருக்கேன்',
    'kkitrukeen': 'க்கிட்டுருக்கேன்',
    'kittruken': 'கிட்டுருக்கேன்',
    'kkittruken': 'க்கிட்டுருக்கேன்',
    'kittrukeen': 'கிட்டுருக்கேன்',
    'kkittrukeen': 'க்கிட்டுருக்கேன்',
    'kitrukan': 'கிட்டுருக்கான்',
    'kkitrukan': 'க்கிட்டுருக்கான்',
    'kitrukaan': 'கிட்டுருக்கான்',
    'kkitrukaan': 'க்கிட்டுருக்கான்',
    'kittrukan': 'கிட்டுருக்கான்',
    'kkittrukan': 'க்கிட்டுருக்கான்',
    'kittrukaan': 'கிட்டுருக்கான்',
    'kkittrukaan': 'க்கிட்டுருக்கான்',
    'kitrukaal': 'கிட்டுருக்காள்',
    'kkitrukaal': 'க்கிட்டுருக்காள்',
    'kitrukkaal': 'கிட்டுருக்காள்',
    'kkitrukkaal': 'க்கிட்டுருக்காள்',
    'kittrukaal': 'கிட்டுருக்காள்',
    'kkittrukaal': 'க்கிட்டுருக்காள்',
    'kittrukkaal': 'கிட்டுருக்காள்',
    'kkittrukkaal': 'க்கிட்டுருக்காள்',
    'kitrukom': 'கிட்டுருக்கோம்',
    'kkitrukom': 'க்கிட்டுருக்கோம்',
    'kittrukom': 'கிட்டுருக்கோம்',
    'kkittrukom': 'க்கிட்டுருக்கோம்',
    'kitrukinga': 'கிட்டுருக்கீங்க',
    'kkitrukinga': 'க்கிட்டுருக்கீங்க',
    'kitrukeenga': 'கிட்டுருக்கீங்க',
    'kkitrukeenga': 'க்கிட்டுருக்கீங்க',
    'kittrukinga': 'கிட்டுருக்கீங்க',
    'kkittrukinga': 'க்கிட்டுருக்கீங்க',
    'kittrukeenga': 'கிட்டுருக்கீங்க',
    'kkittrukeenga': 'க்கிட்டுருக்கீங்க',
    'kitrukanga': 'கிட்டுருக்காங்க',
    'kkitrukanga': 'க்கிட்டுருக்காங்க',
    'kitrukkaanga': 'கிட்டுருக்காங்க',
    'kkitrukkaanga': 'க்கிட்டுருக்காங்க',
    'kittrukanga': 'கிட்டுருக்காங்க',
    'kkittrukanga': 'க்கிட்டுருக்காங்க',
    'kittrukkaanga': 'கிட்டுருக்காங்க',
    'kkittrukkaanga': 'க்கிட்டுருக்காங்க',
    'kitruku': 'கிட்டுருக்கு',
    'kkitruku': 'க்கிட்டுருக்கு',
    'kittruku': 'கிட்டுருக்கு',
    'kkittruku': 'க்கிட்டுருக்கு',

};

// Ordered from longest to shortest so greedy match picks the best suffix first
const _compoundSuffixes = Object.keys(_suffixTamilMap)
    .sort((a, b) => b.length - a.length);

// ── STANDALONE VOWEL → VOWEL SIGN MAP ────────────────────────────────────
// Used by _joinStemSuffix to merge consonant+pulli stems with vowel-starting
// suffixes:  அவன் + உக்கு → அவனுக்கு  (not அவன்உக்கு)
const _standaloneVowelToSign = {
    '\u0B85': '',         // அ → inherent (just remove pulli, no sign needed)
    '\u0B86': '\u0BBE',  // ஆ → ா
    '\u0B87': '\u0BBF',  // இ → ி
    '\u0B88': '\u0BC0',  // ஈ → ீ
    '\u0B89': '\u0BC1',  // உ → ு
    '\u0B8A': '\u0BC2',  // ஊ → ூ
    '\u0B8E': '\u0BC6',  // எ → ெ
    '\u0B8F': '\u0BC7',  // ஏ → ே
    '\u0B90': '\u0BC8',  // ஐ → ை
    '\u0B92': '\u0BCA',  // ஒ → ொ
    '\u0B93': '\u0BCB',  // ஓ → ோ
    '\u0B94': '\u0BCC',  // ஔ → ௌ
};

// ── STEM + SUFFIX JOINER WITH SANDHI ─────────────────────────────────────
function _joinStemSuffix(stemTamil, suffixTamil) {
    if (!stemTamil || !suffixTamil) return stemTamil + suffixTamil;

    const PULLI = '\u0BCD'; // ்
    let last = stemTamil.slice(-1);
    let lastTwo = stemTamil.slice(-2);

    // Apply open-stem sandhi patterns for vowel-starting suffixes (உடம்படுமெய் & உக்குரல்)
    const suffixFirst = suffixTamil[0];
    const isVowelStarting = _standaloneVowelToSign[suffixFirst] !== undefined;

    if (isVowelStarting) {
        const yEndingVowels = [
            '\u0BBF', '\u0BC0', '\u0BC7', '\u0BC8', // vowel signs: ி, ீ, ே, ை
            '\u0B87', '\u0B88', '\u0B8F', '\u0B90'  // standalone vowels: இ, ஈ, ஏ, ஐ
        ];
        const vEndingVowels = [
            '\u0BBE', '\u0BC2', '\u0BC6', '\u0BCA', '\u0BCB', '\u0BCC', // vowel signs: ா, ூ, ெ, ொ, ோ, ௌ
            '\u0B85', '\u0B86', '\u0B89', '\u0B8A', '\u0B8E', '\u0B92', '\u0B93', '\u0B94' // standalone vowels: அ, ஆ, உ, ஊ, எ, ஒ, ஓ, ஔ
        ];

        if (yEndingVowels.includes(last)) {
            // Rule 1: Insert linking 'ய்'
            stemTamil = stemTamil + '\u0BAF\u0BCD';
        } else if (last === '\u0BC1') {
            // Rule 2: 'u'-deletion and optional retroflex/alveolar stop doubling (oblique stem formation)
            const base = stemTamil.slice(0, -1);
            const baseLastChar = base.slice(-1);
            const doubleableStops = ['\u0B9F', '\u0BB1']; // Only ட and ற double in oblique stems (e.g. வீடு->வீட்டு, ஆறு->ஆற்று)
            if (doubleableStops.includes(baseLastChar)) {
                stemTamil = base.slice(0, -1) + baseLastChar + PULLI + baseLastChar + PULLI;
            } else {
                stemTamil = base + PULLI;
            }
        } else if (vEndingVowels.includes(last)) {
            // Rule 3: Insert linking 'வ்'
            stemTamil = stemTamil + '\u0BB5\u0BCD';
        }

        // Re-evaluate last and lastTwo for the transformed stem
        last = stemTamil.slice(-1);
        lastTwo = stemTamil.slice(-2);
    }

    // Pattern A: stem ends in ு → double the consonant before it (only for ட/ற)
    if (last === '\u0BC1') {
        const base = stemTamil.slice(0, -1);
        const baseLastChar = base.slice(-1);
        const doubleableStops = ['\u0B9F', '\u0BB1'];
        if (doubleableStops.includes(baseLastChar)) {
            const doubled = base + PULLI + baseLastChar + '\u0BC1';
            return doubled + suffixTamil;
        }
        return stemTamil + suffixTamil;
    }

    // Pattern B: stem ends in sonorant pulli (except ம்) → insert linking உ before vallinam suffix
    const sonorantPullis = ['ல்', 'ன்', 'ர்', 'ள்', 'ண்', 'ழ்', 'ய்'];
    if (sonorantPullis.includes(lastTwo)) {
        const suffixFirst = suffixTamil[0];
        const vallinamStarts = ['\u0B95', '\u0B9A', '\u0B9F', '\u0BA4', '\u0BAA', '\u0BB1'];
        if (vallinamStarts.includes(suffixFirst)) {
            // Guard: plural suffix 'கள்' / 'கல்' does NOT take linking உ
            if (suffixTamil.startsWith('\u0B95\u0BB3\u0BCD') || suffixTamil.startsWith('\u0B95\u0BB2\u0BCD')) {
                return stemTamil + suffixTamil;
            }
            return stemTamil + '\u0BC1' + suffixTamil;
        }
        // Pattern B2: suffix starts with standalone Tamil vowel → merge
        // e.g. அவன் + உக்கு → அவனுக்கு, அவன் + ஓட → அவனோட
        // Remove pulli from stem, convert standalone vowel to vowel sign (matra)
        const vowelSignB = _standaloneVowelToSign[suffixFirst];
        if (vowelSignB !== undefined) {
            return stemTamil.slice(0, -1) + vowelSignB + suffixTamil.slice(1);
        }
        return stemTamil + suffixTamil;
    }

    // Pattern C: stem ends in ம் → locative/dative special form
    if (lastTwo === 'ம்') {
        if (suffixTamil === 'ல' || suffixTamil === 'இல்') {
            return stemTamil.slice(0, -2) + 'த்தில்';
        }
        if (suffixTamil === 'க்கு' || suffixTamil === 'கு') {
            return stemTamil.slice(0, -2) + 'த்திற்கு';
        }
        if (suffixTamil.startsWith('\u0B95\u0BB3\u0BCD') || suffixTamil.startsWith('\u0B95\u0BB2\u0BCD')) {
            return stemTamil.slice(0, -2) + '\u0B99\u0BCD' + suffixTamil; // ம் + கள் -> ங்கள்
        }
        return stemTamil + suffixTamil;
    }

    // Pattern D: any consonant+pulli + vowel-starting suffix → merge
    // Catch-all for non-sonorant pullis (க், ச், ட், த், ப், ற் etc.)
    if (last === PULLI) {
        const suffixFirstD = suffixTamil[0];
        const vowelSignD = _standaloneVowelToSign[suffixFirstD];
        if (vowelSignD !== undefined) {
            return stemTamil.slice(0, -1) + vowelSignD + suffixTamil.slice(1);
        }
    }

    return stemTamil + suffixTamil;
}

function checkCompoundWord(normalized, skipRuleFallback = false) {
    if (!normalized || normalized.length < 4) return null;

    // ── PASS 1: Suffix loop — peel up to 4 suffixes deep ────────────────
    // e.g. veedukkullaethan → veedu+kku+lla+ethan
    let remaining = normalized;
    let suffixTamilStack = [];
    let peeledSuffixes = [];
    let stemTamil = null;
    const MAX_DEPTH = 6;

    for (let depth = 0; depth < MAX_DEPTH; depth++) {
        let matched = false;
        for (const suffix of _compoundSuffixes) {
            if (!remaining.endsWith(suffix)) continue;
            const stem = remaining.slice(0, -suffix.length);
            if (stem.length < 2) continue;

            const suffixTamil = _suffixTamilMap[suffix];
            if (!suffixTamil) continue;

            // Check stem in all sources
            let foundStemTamil = fullWordMapping.get(stem)
                || _fallbackTamilMap.get(stem)
                || null;

            if (!foundStemTamil) {
                // Try stem alternates
                for (const alt of _generateStemAlternates(stem)) {
                    foundStemTamil = fullWordMapping.get(alt) || _fallbackTamilMap.get(alt);
                    if (foundStemTamil) break;
                }
            }

            if (foundStemTamil) {
                // Found the stem — join all accumulated suffixes
                let result = foundStemTamil;
                for (const sf of suffixTamilStack) result = _joinStemSuffix(result, sf);
                let finalResult = _joinStemSuffix(result, suffixTamil);
                finalResult = applyPostProcess(finalResult);
                finalResult = applyVallinamDoubling(finalResult);
                finalResult = applyPositionalNaFix(finalResult);
                return finalResult;
            }

            // Stem not found yet — peel this suffix and keep going deeper
            peeledSuffixes.push(suffix);
            suffixTamilStack.unshift(suffixTamil);
            remaining = stem;
            matched = true;
            break;
        }
        if (!matched) break;
    }

    // ── FALLBACK: If suffixes were peeled but no dictionary stem was found ──
    if (!skipRuleFallback && suffixTamilStack.length > 0 && remaining.length >= 2) {
        const _dictionaryOnlySuffixes = new Set(['ai', 'e', 'um', 'yum', 'nu', 'nnu', 'nnnu', 'dhu', 'udhu', 'aadhu']);
        const hasDictOnlySuffix = peeledSuffixes.some(s => _dictionaryOnlySuffixes.has(s));
        if (hasDictOnlySuffix) return null;

        // Transliterate the stem using the rule engine (skipping nested compound checks)
        const stemTamil = convertWithRules(remaining, true);
        if (stemTamil && /[\u0B80-\u0BFF]/.test(stemTamil)) {
            let result = stemTamil;
            for (const sf of suffixTamilStack) {
                result = _joinStemSuffix(result, sf);
            }
            let finalResult = result;
            finalResult = applyPostProcess(finalResult);
            finalResult = applyVallinamDoubling(finalResult);
            finalResult = applyPositionalNaFix(finalResult);
            return finalResult;
        }
    }

    // ── PASS 2: Try splitting into two known words (true compound) ──────
    // e.g. "rombakonjam" → "romba" + "konjam"
    // Both parts must be at least 4 characters to avoid false splitting on short words/abbreviations.
    for (let i = 4; i < normalized.length - 3; i++) {
        const left = normalized.slice(0, i);
        const right = normalized.slice(i);
        if (fullWordMapping.has(left) && fullWordMapping.has(right)) {
            return fullWordMapping.get(left) + fullWordMapping.get(right);
        }
    }

    return null;
}

// Generate plausible stem alternates for sandhi-modified stems.
// When users type "veetila", the stem is "veeti" but the dict has "veedu".
// Tamil sandhi often changes final -u to -i/-a before certain suffixes.
// function _generateStemAlternates(stem) {
//     const alts = new Set();
//     if (!stem || stem.length < 2) return alts;

//     // -i ending → try -u (veetila → veeti → veetu → veedu)
//     if (stem.endsWith('i')) {
//         alts.add(stem.slice(0, -1) + 'u');
//         alts.add(stem.slice(0, -1) + 'u'); // vidu → veedu
//     }
//     // -a ending → try -u, -am
//     if (stem.endsWith('a')) {
//         alts.add(stem.slice(0, -1) + 'u');
//         alts.add(stem + 'm'); // pana → panam
//     }
//     // -tt ending → try -du, -tu (vettu → veedu? unlikely but try)
//     if (stem.endsWith('tt')) {
//         alts.add(stem.slice(0, -2) + 'du');
//         alts.add(stem.slice(0, -2) + 'tu');
//     }
//     // doubled consonant → single (veettu → veetu → veedu)
//     const doubleMatch = stem.match(/(.+?)(.)\2$/);  // ends in cc
//     if (doubleMatch) {
//         alts.add(doubleMatch[1] + doubleMatch[2] + 'u');
//         alts.add(doubleMatch[1] + doubleMatch[2]);
//     }
//     // Try adding 'u' or 'am' to the stem directly
//     alts.add(stem + 'u');
//     alts.add(stem + 'am');
//     // Try removing trailing consonant cluster and adding -u
//     if (/[bcdfghjklmnpqrstvwxyz]$/.test(stem)) {
//         alts.add(stem + 'u');
//     }

//     return alts;
// }


function _generateStemAlternates(stem) {
    const alts = new Set();
    if (!stem || stem.length < 2) return alts;

    // -i ending → try -u  (veetila → veeti → veedu)
    if (stem.endsWith('i')) {
        alts.add(stem.slice(0, -1) + 'u');
    }
    // -a ending → try -u, -am, -ai  (kadha → kadhai type nouns)
    if (stem.endsWith('a')) {
        alts.add(stem.slice(0, -1) + 'u');
        alts.add(stem + 'm');
        alts.add(stem.slice(0, -1) + 'ai');  // ← NEW: kadha → kadhai
    }
    // -ai ending → try -a, -u  (kadhai → kadha, solai → sola)
    if (stem.endsWith('ai')) {                // ← NEW block
        alts.add(stem.slice(0, -2) + 'a');
        alts.add(stem.slice(0, -2) + 'u');
    }
    // -al ending → try -attu oblique  (sol → solli, kal → kalli type)
    if (stem.endsWith('al')) {                // ← NEW block
        alts.add(stem.slice(0, -2) + 'attu');
        alts.add(stem.slice(0, -2) + 'l');
    }
    // -tt ending → try -du, -tu
    if (stem.endsWith('tt')) {
        alts.add(stem.slice(0, -2) + 'du');
        alts.add(stem.slice(0, -2) + 'tu');
    }
    // doubled consonant → single  (veettu → veetu → veedu)
    const doubleMatch = stem.match(/(.+?)(.)\2$/);
    if (doubleMatch) {
        alts.add(doubleMatch[1] + doubleMatch[2] + 'u');
        alts.add(doubleMatch[1] + doubleMatch[2]);
    }
    // bare consonant-ending → add -u or -am
    if (/[bcdfghjklmnpqrstvwxyz]$/.test(stem)) {
        alts.add(stem + 'u');
        alts.add(stem + 'am');              // ← was missing for consonant-ending
    } else {
        alts.add(stem + 'u');
        alts.add(stem + 'am');
    }

    return alts;
}

// ============ TRIE DATA STRUCTURE FOR FAST SUGGESTIONS ============
// Trie provides O(L) lookup where L is prefix length, vs O(N) linear search
// This gives instant suggestions as user types

class TrieNode {
    constructor() {
        this.children = new Map();      // Character -> TrieNode
        this.isEnd = false;              // Marks end of a word
        this.tamilValue = null;          // Tamil translation if this is a word
        this.frequency = 0;              // Usage frequency for ranking
        this.word = null;                // Original tanglish word
    }
}

class Trie {
    constructor() {
        this.root = new TrieNode();
        this.size = 0;
    }

    // Insert a word into the trie
    insert(tanglishWord, tamilValue, frequency = 0) {
        if (!tanglishWord || !tamilValue) return false;

        let node = this.root;
        const lowerWord = tanglishWord.toLowerCase();

        for (const char of lowerWord) {
            if (!node.children.has(char)) {
                node.children.set(char, new TrieNode());
            }
            node = node.children.get(char);
        }

        if (!node.isEnd) {
            node.isEnd = true;
            node.tamilValue = tamilValue;
            node.word = lowerWord;
            node.frequency = frequency;
            this.size++;
            return true;
        }
        return false;
    }

    // Search for exact word
    search(tanglishWord) {
        if (!tanglishWord) return null;

        let node = this.root;
        const lowerWord = tanglishWord.toLowerCase();

        for (const char of lowerWord) {
            if (!node.children.has(char)) return null;
            node = node.children.get(char);
        }

        return node.isEnd ? { tamil: node.tamilValue, frequency: node.frequency } : null;
    }

    // Get all words that start with a given prefix
    getWordsWithPrefix(prefix, limit = 8) {
        if (!prefix) return [];

        let node = this.root;
        const lowerPrefix = prefix.toLowerCase();

        for (const char of lowerPrefix) {
            if (!node.children.has(char)) return [];
            node = node.children.get(char);
        }

        const results = [];
        this._collectWords(node, lowerPrefix, results);

        // Filter invalid Tamil word starts (kills னீ, றா, ளா etc.)
        const _badStart = /^[னறளா-ௌ]/;
        const _valid = results.filter(r => r.tamil && !_badStart.test(r.tamil));
        _valid.sort((a, b) => {
            if (a.word.length !== b.word.length) return a.word.length - b.word.length;
            return b.frequency - a.frequency;
        });

        return _valid.slice(0, limit);
    }

    _collectWords(node, prefix, results) {
        // BFS with hard cap — prevents UI jank on large tries (Bug 2 fix)
        const queue = [{ node, word: prefix }];
        while (queue.length > 0 && results.length < 50) {
            const { node: cur, word } = queue.shift();
            if (cur.isEnd) {
                results.push({
                    tanglish: word,
                    tamil: cur.tamilValue,
                    frequency: cur.frequency,
                    word: cur.word
                });
            }
            for (const [char, child] of cur.children) {
                if (results.length >= 50) break;
                queue.push({ node: child, word: word + char });
            }
        }
    }

    hasPrefix(prefix) {
        if (!prefix) return false;

        let node = this.root;
        const lowerPrefix = prefix.toLowerCase();

        for (const char of lowerPrefix) {
            if (!node.children.has(char)) return false;
            node = node.children.get(char);
        }
        return true;
    }

    getAutoComplete(prefix, limit = 5) {
        if (!prefix || prefix.length < 1) return [];
        return this.getWordsWithPrefix(prefix, limit);
    }
}

// Initialize Trie
const suggestionTrie = new Trie();

// ============ PHONETIC NORMALIZATION ============
// Collapses the many ways Tanglish users spell the same sound into one
// canonical form. Both the dictionary keys AND the user's typed prefix are
// run through this before being stored/queried in the phonetic trie, so
// "oorukula" (user) matches "oorukkulla" (dict) because both normalize to
// the same skeleton.
//
// Rules cover the most common Tamil Tanglish spelling variations:
//   Long vowels:  aa→a, ee/ii→i, oo/uu→u
//   Aspirates:    th→t, dh→d, kh→k, gh→g, ph→p, bh→b
//   Retroflex:    zh→z, Lh→l
//   Doubled cons: kk/pp/tt/nn/mm/ll/rr/ss → single
//   h-endings:    silent h at word end dropped
//   nh/ng:        ng→n (e.g. "inga"→"ina")  — keeps the nasal
//   Special:      ck→k, tch→ch, dj→j
//
// The result is intentionally lossy — we only want phonetically similar
// words to cluster together, not to reconstruct the original spelling.

export function phoneticNormalize(str) {
    if (!str) return '';
    let s = str.toLowerCase().trim();

    // Collapse word-final -ai, -e to -a (colloquial Tamil vowel shifts)
    s = s.replace(/ai$/, 'a');
    s = s.replace(/e$/, 'a');

    // ── 1. Long vowels → short ──────────────────────────────────────────
    s = s.replace(/aa/g, 'a');
    s = s.replace(/ee/g, 'i');
    s = s.replace(/ii/g, 'i');
    s = s.replace(/oo/g, 'u');
    s = s.replace(/uu/g, 'u');

    // ── 2. Aspirate / alternate spellings → plain consonant ─────────────
    s = s.replace(/th/g, 't');         // th → t  (both த and ட spellings)
    s = s.replace(/dh/g, 'd');         // dh → d
    s = s.replace(/kh/g, 'k');         // kh → k
    s = s.replace(/gh/g, 'g');         // gh → g
    s = s.replace(/ph/g, 'p');         // ph → p
    s = s.replace(/bh/g, 'b');         // bh → b
    s = s.replace(/sh/g, 's');         // sh → s  (ஷ/ஸ both → s)
    s = s.replace(/tch/g, 'ch');       // tch → ch

    // ── 3. Retroflex / special Tamil sounds ─────────────────────────────
    s = s.replace(/zh/g, 'z');         // zh (ழ) → z
    s = s.replace(/lh/g, 'l');         // Lh → l

    // ── 4. ck / ck clusters ─────────────────────────────────────────────
    s = s.replace(/ck/g, 'k');
    s = s.replace(/dj/g, 'j');

    // ── 5. Nasal clusters ───────────────────────────────────────────────
    // nk/ng/nj → n  (user often drops the velar: "inga"→"ina", "enga"→"ena")
    // s = s.replace(/ng/g, 'n');
    // s = s.replace(/nk/g, 'n');
    // s = s.replace(/nj/g, 'n');
    // s = s.replace(/nd/g, 'n');
    // s = s.replace(/nt/g, 'n');

    // ── 6. Doubled consonants → single ──────────────────────────────────
    s = s.replace(/(.)\1+/g, '$1');    // any doubled char → one

    // ── 7. Silent / trailing h ──────────────────────────────────────────
    s = s.replace(/h$/, '');           // trailing h (aah→aa→a after step 1)
    s = s.replace(/h/g, '');           // remaining h (mainly between vowels)

    // ── 8. y/w as semi-vowel variants ───────────────────────────────────
    // "yenna"→"enna", "waa"→"a" — only at word start to avoid over-merging
    s = s.replace(/^y([aeiou])/, '$1');
    s = s.replace(/^w/, 'v');          // w → v (rare but users do type it)

    // ── 9. c → k when not followed by e/i/h ─────────────────────────────
    // "ceri"→"seri" handled below; general c+non-front → k
    s = s.replace(/c([^eih])/g, 'k$1');
    s = s.replace(/^c([ei])/, 's$1'); // ce/ci → se/si  (ceri→seri)

    // ── 10. Final cleanup: collapse any new doubles created above ────────
    s = s.replace(/(.)\1+/g, '$1');

    // ── 11. Drop all vowels/semi-vowels after the first character ───────
    if (s.length > 1) {
        const first = s[0];
        const rest = s.slice(1).replace(/[aeiouy]/g, '');
        s = first + rest;
    }

    // Collapse any final doubles that might be adjacent now after vowel removal
    s = s.replace(/(.)\1+/g, '$1');

    return s;
}

// Phonetic trie: keyed on phoneticNormalize(tanglishKey)
// Stores  { tanglish: originalKey, tamil: value, frequency }  at each node
// so we can return the real tanglish word alongside the Tamil for display.
const phoneticTrie = new Trie();

// Build Trie from exactDictionary
function buildSuggestionTrie() {
    console.log('🔨 Building suggestion trie...');
    let count = 0;
    let startTime = Date.now();

    phoneticWordMap.clear();

    // Seed from _fallbackTamilMap first — always available, no backend needed.
    // Gives ~700 high-frequency colloquial words instantly at startup.
    for (const [tanglish, tamil] of _fallbackTamilMap.entries()) {
        suggestionTrie.insert(tanglish, tamil, 500);
        const pKey = phoneticNormalize(tanglish);
        if (pKey) {
            const existing = phoneticWordMap.get(pKey);
            if (!existing || 500 > existing.frequency) {
                phoneticWordMap.set(pKey, { tanglish, tamil, frequency: 500 });
            }
            if (pKey !== tanglish) phoneticTrie.insert(pKey, tamil, 500);
        }
        count++;
    }

    for (const [tanglish, tamil] of exactDictionary.entries()) {
        // Combine backend DB frequency + local user frequency for ranking
        const backendFreq = _backendFrequency.get(tanglish) || 0;
        const localFreq = typeof getWordFrequency === 'function' ? getWordFrequency(tamil) : 0;
        const freq = backendFreq + localFreq;
        suggestionTrie.insert(tanglish, tamil, freq);

        // ── Populate phoneticWordMap ──
        const pKey = phoneticNormalize(tanglish);
        if (pKey) {
            const existing = phoneticWordMap.get(pKey);
            if (!existing || freq > existing.frequency) {
                phoneticWordMap.set(pKey, { tanglish, tamil, frequency: freq });
            }
        }

        // ── Also insert under the phonetic-normalised key ──
        if (pKey && pKey !== tanglish) {
            phoneticTrie.insert(pKey, tamil, freq);
        }
        count++;

        if (count % 5000 === 0) {
            console.log(`   Added ${count} words to trie...`);
        }
    }

    const elapsed = Date.now() - startTime;
    console.log(`✅ Trie built with ${count} words in ${elapsed}ms`);
}

// Side-map: phoneticNormalized(tanglish) → original tanglish word
// Needed so fuzzy results show the real spelling, not the collapsed key.
const phoneticToOriginal = new Map();

function buildPhoneticIndex() {
    for (const [tanglish] of exactDictionary.entries()) {
        const key = phoneticNormalize(tanglish);
        // Keep the shortest / most common spelling for each phonetic key
        if (!phoneticToOriginal.has(key) || tanglish.length < phoneticToOriginal.get(key).length) {
            phoneticToOriginal.set(key, tanglish);
        }
    }
    console.log(`✅ Phonetic index built with ${phoneticToOriginal.size} phonetic keys`);
}

// Fast suggestion function using Trie

// Helper: returns true if a Tamil string contains broken tokenizer artifacts
// e.g. ்+standalone-vowel (வர்உ, வர்இய்) or ஒஒ (double standalone vowel)
function _isBrokenTamil(s) {
    if (!s) return true;
    // virama followed by standalone vowel
    if (/்[அ-ஔ]/.test(s)) return true;
    // two standalone vowels adjacent (ஒஒரு)
    if (/[அ-ஔ]{2}/.test(s)) return true;
    // consonant + standalone vowel (no virama between) e.g. நஅ
    if (/[க-ஹ][அ-ஔ]/.test(s)) return true;
    return false;
}

export function getTypingSuggestions(typedText, limit = 8) {
    if (!typedText || typedText.length < 1) return [];

    const lower = typedText.toLowerCase();
    const results = [];
    const seen = new Set();
    const seenKeys = new Set();

    // ── PASS -1: Learned corrections FIRST (user previously corrected this word) ──
    const learnedSuggestion = getLearnedSuggestion(lower);
    if (learnedSuggestion && learnedSuggestion.tamil && !_isBrokenTamil(learnedSuggestion.tamil)) {
        results.push({
            tanglish: learnedSuggestion.tanglish || lower,
            tamil: learnedSuggestion.tamil,
            type: '🎓 Learned',
            priority: -1,
            exact: true,
            frequency: 999
        });
        seen.add(learnedSuggestion.tamil);
        seenKeys.add(lower);
    }

    // ── PASS 0: Rule engine FIRST — always option 1 ──────────────────────
    if (typedText.length >= 2) {
        const ruleCandidates = beamSearchTransliterate(lower, 4, 3);
        ruleCandidates.forEach((cand) => {
            // Reject broken forms: virama+standalone-vowel mid-word (வர்இய், வ்அர், நஅன்)
            // Pattern 1: ் followed by standalone vowel (அ-ஔ) = virama+vowel hiatus
            // Pattern 2: consonant followed immediately by standalone vowel with no virama
            //            e.g. நஅ (na + a standalone) = tokenizer split error
            if (!_isBrokenTamil(cand) && !seen.has(cand)) {
                results.push({
                    tanglish: lower,
                    tamil: cand,
                    type: '\u{1F527} Rule',
                    priority: 0,
                    exact: false,
                    frequency: getWordFrequency(cand)
                });
                seen.add(cand);
                seenKeys.add(lower);
            }
        });
    }

    // ── PASS 1: Trie exact match (fastest - O(L)) ──
    const trieExact = suggestionTrie.search(lower);
    if (trieExact) {
        // Only add if different from rule engine output (avoid duplicate)
        if (!seen.has(trieExact.tamil)) {
            results.push({
                tanglish: lower,
                tamil: trieExact.tamil,
                type: '\u2B50 Match',
                priority: 1,
                exact: true,
                frequency: trieExact.frequency
            });
            seen.add(trieExact.tamil);
        }
        seenKeys.add(lower);
        if (limit === 1) return results;
    }

    // ── PASS 2: Trie prefix matches (fast - O(L) with collection) ──
    const triePrefixMatches = suggestionTrie.getWordsWithPrefix(lower, limit * 2);
    for (const match of triePrefixMatches) {
        if (results.length >= limit) break;
        if (!seenKeys.has(match.tanglish) && !seen.has(match.tamil) && !_isBrokenTamil(match.tamil)) {
            results.push({
                tanglish: match.tanglish,
                tamil: match.tamil,
                type: '📚 Trie',
                priority: 1,
                exact: true,
                frequency: match.frequency
            });
            seen.add(match.tamil);
            seenKeys.add(match.tanglish);
        }
    }

    // ── PASS 2.5: PHONETIC FUZZY PREFIX MATCH ───────────────────────────
    // Normalise the typed prefix and look it up in the phonetic trie.
    // This is the layer that makes "oorukula" find "oorukkulla → ஊருக்குள்ள"
    // even though the exact spellings don't share a common prefix.
    //
    // Only kicks in when lower.length >= 4 (avoids false positives on
    // very short inputs where normalization collapses too much).
    if (lower.length >= 3) {
        const phoneticPrefix = phoneticNormalize(lower);
        // Query phonetic trie
        const phoneticMatches = phoneticTrie.getWordsWithPrefix(phoneticPrefix, limit * 3);
        for (const match of phoneticMatches) {
            if (results.length >= limit) break;
            if (seen.has(match.tamil)) continue;
            // Recover the original (un-normalised) tanglish key from our side-map
            const originalKey = phoneticToOriginal.get(match.tanglish) || match.tanglish;
            if (seenKeys.has(originalKey)) continue;
            // ✅ ADD THIS: skip phonetic match if we already have an exact match
            // Skip phonetic match if first letter doesn't match what user typed
            if (originalKey[0] !== lower[0]) continue;
            // Skip if second char vowel class differs: 'aa' (long a) vs 'i' (short i)
            // Prevents vaalai matching villai, kaalam matching killam etc.
            const typedVowel = lower.slice(1, 3);   // e.g. 'aa' from 'vaalai'
            const matchVowel = originalKey.slice(1, 3); // e.g. 'il' from 'villai'
            const isTypedLong = /^(aa|ee|ii|oo|uu)/.test(typedVowel);
            const isMatchLong = /^(aa|ee|ii|oo|uu)/.test(matchVowel);
            if (isTypedLong !== isMatchLong) continue; // long vs short vowel — skip this hit
            // and the phonetic result's tanglish is longer than what was typed
            if (results.some(r => r.priority === 0) && originalKey.length > lower.length) continue;

            results.push({
                tanglish: originalKey,
                tamil: match.tamil,
                type: '🔊 Fuzzy',
                priority: 2,      // sits between trie-prefix (1) and dict-fallback (3)
                exact: false,
                frequency: match.frequency || 0
            });
            seen.add(match.tamil);
            seenKeys.add(originalKey);
        }

        // ── PASS 2.6: Phonetic variant expansion ────────────────────────
        // Generate a small set of alternate spellings of what the user typed
        // and run each through the EXACT trie.  Catches cases like:
        //   user types "ooru kula"  → we also try "oorukkulla", "oorulkulla"
        //   user types "veetukula"  → also try "veetukulla", "veetulkulla"
        // We generate alternates by un-collapsing the most common mutations.
        if (results.length < limit) {
            for (const variant of generatePhoneticVariants(lower)) {
                if (results.length >= limit) break;
                // Exact trie lookup for each variant
                const vExact = suggestionTrie.search(variant);
                if (vExact && !seen.has(vExact.tamil) && !seenKeys.has(variant)) {
                    results.push({
                        tanglish: variant,
                        tamil: vExact.tamil,
                        type: '🔊 Fuzzy',
                        priority: 2,
                        exact: false,
                        frequency: vExact.frequency || 0
                    });
                    seen.add(vExact.tamil);
                    seenKeys.add(variant);
                    continue;
                }
                // Prefix trie lookup for each variant (finds completions)
                const vPrefix = suggestionTrie.getWordsWithPrefix(variant, 3);
                for (const m of vPrefix) {
                    if (results.length >= limit) break;
                    if (!seen.has(m.tamil) && !seenKeys.has(m.tanglish)) {
                        results.push({
                            tanglish: m.tanglish,
                            tamil: m.tamil,
                            type: '🔊 Fuzzy',
                            priority: 2,
                            exact: false,
                            frequency: m.frequency || 0
                        });
                        seen.add(m.tamil);
                        seenKeys.add(m.tanglish);
                    }
                }
            }
        }
    }

    // ── PASS 3: Dictionary fallback (for words not in Trie yet) ──
    if (results.length < limit) {
        for (const [key, value] of exactDictionary.entries()) {
            if (results.length >= limit) break;
            if (!seenKeys.has(key) && key.startsWith(lower) && !seen.has(value)) {
                results.push({
                    tanglish: key,
                    tamil: value,
                    type: '📚 Word',
                    priority: 3,
                    exact: true
                });
                seen.add(value);
                seenKeys.add(key);
            }
        }
    }

    // ── PASS 4: Contains match (only if still need more results) ──
    if (lower.length >= 3 && results.length < limit) {
        for (const [key, value] of exactDictionary.entries()) {
            if (results.length >= limit) break;
            if (seen.has(value) || seenKeys.has(key)) continue;
            if (key.includes(lower)) {
                results.push({
                    tanglish: key,
                    tamil: value,
                    type: '🔍 Contains',
                    priority: 4,
                    exact: true
                });
                seen.add(value);
                seenKeys.add(key);
            }
        }
    }

    // ── PASS 5: Rule engine fallback (only if no dictionary matches) ──
    // Also pushes generateWordForms variants so user sees 3-4 forming options.
    if (results.length === 0 && typedText.length >= 2) {
        const ruleCandidates = beamSearchTransliterate(lower, 4, 3);
        ruleCandidates.forEach((cand) => {
            if (cand && !_isBrokenTamil(cand) && !seen.has(cand)) {
                results.push({
                    tanglish: lower,
                    tamil: cand,
                    type: '🔧 Rule',
                    priority: 5,
                    exact: false,
                    frequency: getWordFrequency(cand)
                });
                seen.add(cand);
            }
        });
        const forms5 = generateWordForms(lower);
        for (const f of forms5) {
            if (results.length >= limit) break;
            if (!seen.has(f) && !_isBrokenTamil(f) && /[஀-௿]/.test(f)) {
                results.push({
                    tanglish: typedText,
                    tamil: f,
                    type: '🔧 Form',
                    priority: 5,
                    exact: false,
                    frequency: getWordFrequency(f)
                });
                seen.add(f);
            }
        }
    }

    // ── PASS 6: Rule preview + word form variants (always show forming options) ──
    if (typedText.length >= 2 && results.length < limit) {
        const ruleCandidates = beamSearchTransliterate(lower, 4, 3);
        ruleCandidates.forEach((cand) => {
            if (results.length >= limit) return;
            if (cand && !_isBrokenTamil(cand) && !seen.has(cand)) {
                results.push({
                    tanglish: lower,
                    tamil: cand,
                    type: '🔧 Rule',
                    priority: 6,
                    exact: false,
                    frequency: getWordFrequency(cand)
                });
                seen.add(cand);
            }
        });
        const forms6 = generateWordForms(lower);
        for (const f of forms6) {
            if (results.length >= limit) break;
            if (!seen.has(f) && !_isBrokenTamil(f) && /[஀-௿]/.test(f)) {
                results.push({
                    tanglish: typedText,
                    tamil: f,
                    type: '🔧 Form',
                    priority: 6,
                    exact: false,
                    frequency: getWordFrequency(f)
                });
                seen.add(f);
            }
        }
    }
    // ── FILTER: Remove Tamil-invalid results before showing ────────────────
    // Kills garbage like னீ (ன at word start = invalid), lone vowel signs etc.
    const INVALID_START = /^[னறள]/; // ன ற ள cannot start a word
    const LONE_VOWEL_SIGN = /^[ா-ௌ]/;     // bare vowel sign with no base
    const filtered = results.filter(r => {
        if (!r.tamil) return false;
        if (INVALID_START.test(r.tamil)) return false;
        if (LONE_VOWEL_SIGN.test(r.tamil)) return false;
        if (!/[஀-௿]/.test(r.tamil)) return false;
        return true;
    });

    // Sort: priority → exact first → frequency → shorter tanglish length
    // Sort: learned first → priority → exact → context boost → frequency
    const _context = analyzeContext('');  // pass surrounding text if available
    filtered.sort((a, b) => {
        // Learned corrections always win
        if (a.priority === -1 && b.priority !== -1) return -1;
        if (b.priority === -1 && a.priority !== -1) return 1;
        // Exact-length match beats longer completions
        const aExactLen = a.tanglish.length === typedText.length;
        const bExactLen = b.tanglish.length === typedText.length;
        if (aExactLen && !bExactLen) return -1;
        if (!aExactLen && bExactLen) return 1;
        if (a.priority !== b.priority) return a.priority - b.priority;
        if (a.exact && !b.exact) return -1;
        if (!a.exact && b.exact) return 1;
        // Penalize completions much longer than what was typed
        // e.g. typed 'raghu'(5) → 'raghunaath'(10) should NOT beat 'raghu' itself
        const aLenPenalty = Math.max(0, a.tanglish.length - typedText.length);
        const bLenPenalty = Math.max(0, b.tanglish.length - typedText.length);
        const aScore = (a.frequency || 0) - aLenPenalty * 5;
        const bScore = (b.frequency || 0) - bLenPenalty * 5;
        if (a.tanglish.length !== b.tanglish.length) return a.tanglish.length - b.tanglish.length;
        return bScore - aScore;
    });

    return filtered.slice(0, limit);
}

// ── generatePhoneticVariants ──────────────────────────────────────────────
// Given a typed prefix, produce a small set of plausible alternate spellings
// by applying common Tanglish spelling mutations in reverse (un-collapsing).
// We focus on the highest-impact transformations: vowel length, doubled
// consonants, and the -kula/-kulla/-kulla/-ulkulla place-suffix cluster.
//
// Kept deliberately narrow (max ~8 variants) so it stays fast.
function generatePhoneticVariants(typed) {
    const variants = new Set();

    // ── Vowel length alternates ──────────────────────────────────────────
    // single-o → oo,  single-a → aa,  single-u → uu  (and vice-versa)
    const withDoubleO = typed.replace(/(?<!o)o(?!o)/g, 'oo');
    const withDoubleA = typed.replace(/(?<!a)a(?!a)/g, 'aa');
    const withDoubleU = typed.replace(/(?<!u)u(?!u)/g, 'uu');
    if (withDoubleO !== typed) variants.add(withDoubleO);
    if (withDoubleA !== typed) variants.add(withDoubleA);
    if (withDoubleU !== typed) variants.add(withDoubleU);
    // long → short
    variants.add(typed.replace(/oo/g, 'o').replace(/aa/g, 'a').replace(/uu/g, 'u'));

    // ── Double/single consonant alternates ──────────────────────────────
    // single-k → kk,  single-l → ll,  single-t → tt,  single-p → pp
    // (the most common doubling points in Tamil)
    const consonants = ['k', 'l', 't', 'p', 'n', 'm', 'r'];
    for (const c of consonants) {
        const re = new RegExp(`(?<!${c})${c}(?!${c})`, 'g');
        const doubled = typed.replace(re, c + c);
        if (doubled !== typed) variants.add(doubled);
    }
    // double → single
    variants.add(typed.replace(/(.)\1/g, '$1'));

    // ── Place-suffix specific: -kula → try -kulla / -kulLa / -kkulla ────
    // This is the exact mismatch from the bug report: user types "oorukula"
    // but dict has "oorukkulla".
    if (typed.endsWith('kula')) {
        const stem = typed.slice(0, -4);
        variants.add(stem + 'kulla');
        variants.add(stem + 'kkulla');
        variants.add(stem + 'kulLa');
        variants.add(stem + 'kuLLa');
        variants.add(stem + 'ulkulla');  // l-insertion: oorukula → ooruulkulla
        variants.add(stem + 'ulkula');
    }
    if (typed.endsWith('kulla')) {
        const stem = typed.slice(0, -5);
        variants.add(stem + 'kula');
        variants.add(stem + 'kkulla');
        variants.add(stem + 'kulLa');
        variants.add(stem + 'ulkulla');  // oorukulla → ooruulkulla
    }
    if (typed.endsWith('kkulla')) {
        const stem = typed.slice(0, -6);
        variants.add(stem + 'kula');
        variants.add(stem + 'kulla');
        variants.add(stem + 'ulkulla');
    }
    // -kule / -kulle / -kulLe variants
    if (typed.endsWith('kule')) {
        const stem = typed.slice(0, -4);
        variants.add(stem + 'kulle');
        variants.add(stem + 'kkule');
        variants.add(stem + 'kulLe');
        variants.add(stem + 'kuLLe');
    }

    // ── th ↔ t,  dh ↔ d ─────────────────────────────────────────────────
    if (typed.includes('th')) variants.add(typed.replace(/th/g, 't'));
    if (typed.includes('dh')) variants.add(typed.replace(/dh/g, 'd'));
    if (!typed.includes('th') && typed.includes('t'))
        variants.add(typed.replace(/t(?!h)/g, 'th'));

    // ── zh ↔ l / z ───────────────────────────────────────────────────────
    if (typed.includes('zh')) {
        variants.add(typed.replace(/zh/g, 'l'));
        variants.add(typed.replace(/zh/g, 'z'));
    }
    if (typed.includes('z') && !typed.includes('zh'))
        variants.add(typed.replace(/z/g, 'zh'));

    // Remove the original typed string itself (no point searching for it again)
    variants.delete(typed);

    return [...variants];
}

export function wordExistsInTrie(word) {
    return suggestionTrie.search(word) !== null;
}

export function getPrefixSuggestions(prefix, limit = 5) {
    return getTypingSuggestions(prefix, limit);
}


// ============ COLLOQUIAL DATA ============
// Colloquial words are now in the backend database.
// The colloquial.json is no longer needed — all words come from the backend.
console.log('[Engine v2.1-FIX] Dictionary will be loaded from backend on startup');

// ============ TAMIL WORD FORMATION RULES ============
// Rules about which letters can start/end words and how they combine

// 1. LETTERS THAT CANNOT START A WORD IN TAMIL
// These are called "Pulli" consonants (consonants without vowels)
const cannotStartWord = [
    'க்', 'ங்', 'ச்', 'ஞ்', 'ட்', 'ண்', 'த்', 'ந்', 'ப்', 'ம்',
    'ய்', 'ர்', 'ற்', 'ல்', 'ள்', 'ழ்', 'வ்', 'ஷ்', 'ஸ்', 'ஹ்', 'ஜ்'
];

// Helper function to check if a character is a Tamil vowel
function isVowel(char) {
    const vowels = ['அ', 'ஆ', 'இ', 'ஈ', 'உ', 'ஊ', 'எ', 'ஏ', 'ஐ', 'ஒ', 'ஓ', 'ஔ'];
    return vowels.includes(char);
}

// Helper function to get the ending letter of a Tamil word
// Tamil pulli consonants are 2 chars: consonant + ் (pulli dot)
// So we need to check the last 2 characters, not just 1
function getEndingLetter(word) {
    if (!word) return '';
    // Check if word ends with pulli (consonant + ் which is 2 chars)
    if (word.length >= 2) {
        const lastTwo = word.slice(-2);
        // If the last char is pulli dot (்), return the consonant+pulli pair
        if (lastTwo.endsWith('\u0BCD')) {
            return lastTwo;
        }
    }
    return word.slice(-1);
}

// Helper function to check if a word ends with a consonant (Pulli)
function endsWithPulli(word) {
    if (!word || word.length < 2) return false;
    // Check if last char is the pulli dot ்
    return word.slice(-1) === '\u0BCD';
}

// 3. VALID WORD FORMATION CHECK
export function isValidTamilWord(word) {
    if (!word || word.length === 0) return false;

    const firstChar = word[0];
    if (cannotStartWord.includes(firstChar)) {
        return false;
    }

    const tamilRegex = /^[\u0B80-\u0BFF]+$/;
    if (!tamilRegex.test(word)) {
        return false;
    }

    return true;
}

// 4. AUTO-CORRECT WORD START
export function autoCorrectWordStart(word) {
    if (!word || word.length === 0) return word;

    const firstChar = word[0];

    if (cannotStartWord.includes(firstChar)) {
        const corrections = {
            'க்': 'க', 'ச்': 'ச', 'ட்': 'ட', 'த்': 'த',
            'ப்': 'ப', 'ற்': 'ற', 'ல்': 'ல்'
        };

        if (corrections[firstChar]) {
            return corrections[firstChar] + word.slice(1);
        }
        return 'அ' + word;
    }

    return word;
}

// 5. SANDHI RULES FOR WORD COMBINATIONS
export function applySandhiRules(word1, word2) {
    if (!word1 || !word2) return word1 + word2;

    const ending1 = getEndingLetter(word1);
    const start2 = word2[0];

    // Rule 1: word ending in 'ம்' + vowel start → 'வ்'
    if (ending1 === 'ம்' && isVowel(start2)) {
        return word1.slice(0, -1) + 'வ்' + word2;
    }
    // Rule 2: word ending in 'ன்' + vowel start → 'ன'
    if (ending1 === 'ன்' && isVowel(start2)) {
        return word1.slice(0, -1) + 'ன' + word2;
    }
    // Rule 3: word ending in 'ல்' + vowel start → 'ல்ல'
    if (ending1 === 'ல்' && isVowel(start2)) {
        return word1.slice(0, -2) + 'ல்ல' + word2;
    }
    // Rule 4: word ending in 'ர்' + vowel start → 'ர'
    if (ending1 === 'ர்' && isVowel(start2)) {
        return word1.slice(0, -1) + 'ர' + word2;
    }
    // Rule 5: word ending in 'ட்' + 'ப' start → 'ற்'
    if (ending1 === 'ட்' && start2 === 'ப') {
        return word1.slice(0, -1) + 'ற்' + word2;
    }

    // Rule 6: ஐ-sandhi — word ending in ை + vowel-starting word → insert ய் glide
    // e.g. கை + இல் → கையில்
    if (ending1 === 'ை' && isVowel(start2)) {
        return word1 + 'ய்' + word2;
    }

    // Rule 7: ஒ-sandhi — word ending in ஒ before vowel lengthens to ஓ
    // e.g. கொ + அழகு → கோ + அழகு (uncommon but correct)
    if (ending1 === 'ஒ' && isVowel(start2)) {
        return word1.slice(0, -1) + 'ஓ' + word2;
    }

    // Rule 8: மெய்ம்மயக்கம் — ல் before க → ற்க (consonant assimilation)
    // e.g. பல் + கள் → பற்கள்
    if (ending1 === 'ல்' && start2 === 'க') {
        return word1.slice(0, -2) + 'ற்' + word2;
    }

    // Rule 9: long-vowel ending (ஆ ஈ ஊ ஏ ஓ) + vowel-starting word → insert வ் glide
    // e.g. பா + அடி → பாவடி, நூ + உல் → நூவுல் (rare but correct)
    const longVowelEndings = ['ா', 'ீ', 'ூ', 'ே', 'ோ'];
    if (longVowelEndings.includes(ending1) && isVowel(start2)) {
        return word1 + 'வ்' + word2;
    }

    // Rule 10: ன்-ending + vowel-starting suffix → drop pulli and merge
    // e.g. அவன் + உக்கு → அவனுக்கு  (don't use Rule 2 which inserts 'ன' standalone)
    if (word1.endsWith('ன்') && isVowel(start2)) {
        return word1.slice(0, -1) + word2;  // drop ் only, keep ன, let vowel sign attach
    }

    // Rule 11: ண்-ending + vowel-starting suffix → merge
    // e.g. மண் + இல் → மணில் (colloquial)
    if (word1.endsWith('ண்') && isVowel(start2)) {
        return word1.slice(0, -1) + word2;
    }

    // Rule 12: short-vowel sign ending + vallinam initial → double the vallinam
    // e.g. படி + கிறேன் → படிக்கிறேன்
    const shortVowelSignsS = '\u0BBF\u0BC1\u0BC6\u0BCA';
    const vallinamInitials = ['க', 'ச', 'ட', 'த', 'ப', 'ற'];
    if (shortVowelSignsS.includes(ending1) && vallinamInitials.includes(word2[0])) {
        return word1 + word2[0] + '்' + word2;
    }


    return word1 + word2;
}

// 6. COMMON WORD COMBINATION CORRECTIONS
const commonCombinations = {
    'போகின்றேன்': 'போகிறேன்',
    'செய்கின்றேன்': 'செய்கிறேன்',
    'பார்க்கின்றேன்': 'பார்க்கிறேன்',
    'என்ன என்று': 'என்று',
    'இல்லை என்று': 'இல்லென்று',
    'வேண்டும் என்று': 'வேண்டுமென்று',
    'கீழ் உள்ள': 'கீழுள்ள',
    'மேல் உள்ள': 'மேலுள்ள',
    'பின் உள்ள': 'பினுள்ள',
};

// 7. POST-PROCESS SENTENCE FOR GRAMMAR RULES
export function applyGrammarRules(sentence) {
    if (!sentence) return sentence;

    let result = sentence;

    for (const [wrong, correct] of Object.entries(commonCombinations)) {
        result = result.replace(new RegExp(wrong, 'g'), correct);
    }

    const words = result.split(/(\s+)/);
    const fixedWords = words.map(word => {
        if (word.trim() && !isValidTamilWord(word.trim())) {
            return autoCorrectWordStart(word);
        }
        return word;
    });

    return fixedWords.join('');
}

// 8. VALIDATE AND FIX COMPOUND WORDS
export function validateCompoundWord(word) {
    if (!word) return word;

    const doubleVowel = /[அஆஇஈஉஊஎஏஒஓ][அஆஇஈஉஊஎஏஒஓ]/;
    if (doubleVowel.test(word) && !word.includes('ஐ') && !word.includes('ஔ')) {
        word = word.replace(/([அஆஇஈஉஊஎஏஒஓ])([அஆஇஈஉஊஎஏஒஓ])/g, '$1ய்$2');
    }

    return word;
}

// 9. VALIDATION FUNCTION FOR UI
export function validateTamilText(text) {
    if (!text) return { valid: true, issues: [] };

    const issues = [];
    const words = text.split(/\s+/);

    words.forEach((word, index) => {
        if (word.length > 0 && cannotStartWord.includes(word[0])) {
            issues.push({
                word: word,
                position: index,
                issue: 'Word starts with a consonant (Pulli)',
                suggestion: autoCorrectWordStart(word),
                rule: 'Tamil words cannot start with consonant without vowel'
            });
        }

        if (/([அஆஇஈஉஊஎஏஒஓ])\1/.test(word) && !word.includes('ஐ') && !word.includes('ஔ')) {
            issues.push({
                word: word,
                position: index,
                issue: 'Double vowels not allowed',
                suggestion: word.replace(/([அஆஇஈஉஊஎஏஒஓ])\1/g, '$1ய்$1'),
                rule: 'Insert ய் between repeated vowels'
            });
        }
    });

    return {
        valid: issues.length === 0,
        issues: issues
    };
}

// ============ VALLINAM DOUBLING RULES ============
// Tamil rule: vallinam (hard consonant) doubles after short vowels at word junctions
// e.g. படி + கிறேன் → படிக்கிறேன், வீடு + கிட்ட → வீட்டுக்கிட்ட
export function applyVallinamDoubling(tamilWord) {
    if (!tamilWord || !/[\u0B80-\u0BFF]/.test(tamilWord)) return tamilWord;

    let result = tamilWord;

    // short vowel signs: ி(u+0BBF) ு(u+0BC1) ெ(u+0BC6) ொ(u+0BCA)
    const shortVowelSigns = '\u0BBF\u0BC1\u0BC6\u0BCA';

    // Rule 1: short vowel sign + lone vallinam pulli → double it
    const vallinamPulliMap = {
        'க்': 'க்க', 'ச்': 'ச்ச', 'ட்': 'ட்ட',
        'த்': 'த்த', 'ப்': 'ப்ப', 'ற்': 'ற்ற'
    };
    for (const [pulli, doubled] of Object.entries(vallinamPulliMap)) {
        const pattern = new RegExp(`([${shortVowelSigns}])(${pulli})(?!${pulli[0]})`, 'g');
        result = result.replace(pattern, (_, vowel, cons) => vowel + doubled);
    }
    // Never double a consonant that follows visarga ஃ (foreign loan words: ஃப், ஃக் etc.)
    result = result.replace(/\u0b83(\u0baa\u0bcd)\u0baa/g, '\u0b83$1');  // ஃப்ப → ஃப்
    result = result.replace(/\u0b83(\u0b95\u0bcd)\u0b95/g, '\u0b83$1');  // ஃக்க → ஃக்

    // Rule 2: suffix-based doubling for common case markers after short vowel letters
    // அ(0B85) இ(0B87) உ(0B89) எ(0B8E) ஒ(0B92)
    const shortVowelLetters = '\u0B85\u0B87\u0B89\u0B8E\u0B92';
    // Rule 0: nasal consonant (ம் ன் ண்) + bare கு → க்கு
    // namaku→நமகு, enaku→எனகு etc.
    result = result
        .replace(/ம்கு/g, 'ம்க்கு')   // namaku: மகு → ம்க்கு
        .replace(/ன்கு/g, 'ன்க்கு')   // enaku, unaku
        .replace(/ண்கு/g, 'ண்க்கு')   // after retroflex nasal
        .replace(/ம்கே/g, 'ம்க்கே')
        .replace(/ன்கே/g, 'ன்க்கே');
    const doublingSuffixes = [
        { suffix: 'கு', doubled: 'க்கு' },
        { suffix: 'கே', doubled: 'க்கே' },
        { suffix: 'கிட்ட', doubled: 'க்கிட்ட' },
        { suffix: 'கிட்டே', doubled: 'க்கிட்டே' },
        { suffix: 'கிட்டு', doubled: 'க்கிட்டு' },
        { suffix: 'தில்', doubled: 'த்தில்' },
        { suffix: 'திலிருந்து', doubled: 'த்திலிருந்து' },
        { suffix: 'துக்கு', doubled: 'த்துக்கு' },
        { suffix: 'பார்', doubled: 'ப்பார்' },
        { suffix: 'போ', doubled: 'ப்போ' },
    ];
    for (const { suffix, doubled } of doublingSuffixes) {
        const pat = new RegExp(`([${shortVowelLetters}])(${suffix})`, 'g');
        result = result.replace(pat, (_, v, s) => v + doubled);
    }

    // Rule 2b: long-vowel sign + bare vallinam suffix → double
    // ா/ீ/ூ/ே/ோ + கு → க்கு  (e.g. neengakku, paakku)
    const longVowelSigns = '\u0BBE\u0BC0\u0BC2\u0BC7\u0BCB';
    const longVowelDoublingSuffixes = [
        { suffix: 'கு', doubled: 'க்கு' },
        { suffix: 'கே', doubled: 'க்கே' },
    ];
    for (const { suffix, doubled } of longVowelDoublingSuffixes) {
        const pat = new RegExp(`([${longVowelSigns}])(${suffix})`, 'g');
        result = result.replace(pat, (_, v, s) => v + doubled);
    }

    // Rule 3: fix triple stacking that can result from above rules
    result = result
        .replace(/க்க்க/g, 'க்க')
        .replace(/ட்ட்ட/g, 'ட்ட')
        .replace(/த்த்த/g, 'த்த')
        .replace(/ப்ப்ப/g, 'ப்ப')
        .replace(/ச்ச்ச/g, 'ச்ச')
        .replace(/ற்ற்ற/g, 'ற்ற');

    return result;
}

// ============ POST-PROCESS CORRECTIONS ============
const postProcessRules = [
    // Fix aspectual verb doubling after short vowel signs (e.g. vandhukitte -> வந்துக்கிட்டே)
    { pattern: /([\u0BBF\u0BC1\u0BC6\u0BCA])கி(ட்ட|ட்டே|ட்டு|ட்டுரு|ட்டிரு)/g, replace: '$1க்கி$2' },
    // Rules for thirunthani, untana, untanar
    { pattern: /திருந்தனி/g, replace: 'திருந்தணி' },
    { pattern: /உண்டன$/g, replace: 'உண்டாண' },
    { pattern: /உண்டனர்$/g, replace: 'உண்டணர்' },
    // Fix: un+than split is disabled to keep grammatically correct 'உந்தன்' (with dental n)
    // { pattern: /உந்த([\u0BA9\u0BA8])/g, replace: 'உன்த$1' },
    // Fix: ந்ஹ sequence is always wrong — nh together = ந் alone
    { pattern: /ந்ஹ/g, replace: 'ந்' },
    { pattern: /ன்ஹ/g, replace: 'ன்' },



    // ── STEM SANDHI PATCHES (run first — most specific wins) ─────────────
    { pattern: /வீட்குள்/g, replace: 'வீட்டுக்குள்' },
    { pattern: /காதல்கு/g, replace: 'காதலுக்கு' },
    { pattern: /அவன்கு/g, replace: 'அவனுக்கு' },
    { pattern: /அவள்கு/g, replace: 'அவளுக்கு' },
    { pattern: /நம்மகு/g, replace: 'நமக்கு' },
    { pattern: /ஊர்கு/g, replace: 'ஊருக்கு' },
    { pattern: /படம்கு/g, replace: 'படத்திற்கு' },
    { pattern: /நேரம்கு/g, replace: 'நேரத்திற்கு' },

    // ── ந before ட cluster patches (sandai/mandham/thandu type words) ────
    { pattern: /சந்டை/g, replace: 'சண்டை' },
    { pattern: /சந்டல்/g, replace: 'சண்டல்' },
    { pattern: /மந்டம்/g, replace: 'மண்டம்' },
    { pattern: /பந்டம்/g, replace: 'பண்டம்' },
    { pattern: /கந்டன்/g, replace: 'கண்டன்' },
    { pattern: /மந்டி/g, replace: 'மண்டி' },
    { pattern: /கந்டு/g, replace: 'கண்டு' },
    { pattern: /தந்டு/g, replace: 'தண்டு' },
    { pattern: /தந்டா/g, replace: 'தண்டா' },
    { pattern: /பந்டி/g, replace: 'பண்டி' },

    { pattern: /வீடில்/, replace: 'வீட்டில்' },
    { pattern: /வீடுல்/, replace: 'வீட்டுல' },
    { pattern: /வீடுக்கு/, replace: 'வீட்டுக்கு' },
    { pattern: /கடில்/, replace: 'கடையில்' },
    { pattern: /படில்/, replace: 'படத்தில்' },
    // Fix: j after ஞ் in colloquial words → ச (therinja, purinja, mudinja etc.)
    // ஞ்ஜ is always wrong in Tamil — should be ஞ்ச
    { pattern: /ஞ்ஜ/g, replace: 'ஞ்ச' },
    { pattern: /ஞ்ஜி/g, replace: 'ஞ்சி' },
    { pattern: /ஞ்ஜு/g, replace: 'ஞ்சு' },
    { pattern: /ஞ்ஜா/g, replace: 'ஞ்சா' },
    { pattern: /ஞ்ஜே/g, replace: 'ஞ்சே' },
    // Fix: நஜ → ஞ்ச (vaninja type words)
    { pattern: /னஜ/g, replace: 'ஞ்ச' },
    // Fix: ll → ள்ள after short-vowel signs (ி ு ெ) in medial/final positions.
    // RULE: vowel-sign + ல்ல → vowel-sign + ள்ள
    //   Covers unseen words:  kulla→குள்ள, pulla→புள்ள, palli→பள்ளி,
    //                         malli→மள்ளி, valli→வள்ளி, pulli→புள்ளி etc.
    // EXCEPTIONS kept as-is (ல்ல correct):
    //   நல்ல (nalla — after ந, a common word-initial consonant cluster, NOT short-vowel sign)
    //   கல்லூரி (kalluri — ல்லூ context stays)
    //   The pattern only fires after a vowel SIGN (ி ு ெ), not after a bare consonant.
    //   So "nalla" → நல்ல (ல preceded by ந, not a vowel sign) stays correct.
    {
        pattern: /([\u0BBF\u0BC1])\u0BB2\u0BCD\u0BB2/g,
        replace: '$1\u0BB3\u0BCD\u0BB3'   // ி/ு/ெ + ல்ல  →  ி/ு/ெ + ள்ள
    },
    { pattern: /^எள்ள/, replace: 'எல்ல' },
    { pattern: /^யெள்ள/, replace: 'யெல்ல' },

    // Also fix ல்லி at word end after short-vowel sign  (palli type)
    {
        pattern: /([\u0BBF\u0BC1])\u0BB2\u0BCD\u0BB2\u0BBF/g,
        replace: '$1\u0BB3\u0BCD\u0BB3\u0BBF'
    },
    // Specific known correct overrides that survived the pattern but must stay ல்ல:
    // கல்லூரி must NOT be changed — ூ (long-u sign) is not in the pattern above, safe.
    // nalla/வல்ல/கல்ல etc. won't match because they have no short-vowel sign before ல்ல.
    // Hardcoded safety net for the most commonly needed forms (extra guard):
    { pattern: /பல்லி/g, replace: 'பள்ளி' },      // palli   (belt-and-suspenders)
    { pattern: /குல்ல/g, replace: 'குள்ள' },      // kulla
    { pattern: /குல்லே/g, replace: 'குள்ளே' },    // kulle
    { pattern: /புல்ல(?!ூ)/g, replace: 'புள்ள' }, // pulla (but not pullur)
    { pattern: /புல்லை/g, replace: 'புள்ளை' },    // pullai
    // Fix: standalone ஓரு → ஊரு (oor/ooru — oo sounds like ஊ here not ஓ)
    // The tokenizer reads 'oo' as ஓ (long-o), but in 'ooru/oor' Tanglish 
    // convention, oo = ஊ (long-u). Dictionary has 'ooru'→ஊரு but 
    // compound forms like 'oorulkulla' need this post-fix as backup.
    { pattern: /^ஓரு/, replace: 'ஊரு' },
    { pattern: /^ஓர்/, replace: 'ஊர்' },
    // Fix: word-medial dental-na: ன before vowels in common positions should be ந
    // e.g. neram → நேரம் (n at start fixed elsewhere, but also after space)
    // Fix: ன்ன → ண்ண after retroflex vowel signs (ி ு ெ) in medial position.
    // RULE: short-vowel-sign + ன்ன → short-vowel-sign + ண்ண
    //   annan→அண்ணன், kannan→கண்ணன், sinnam→சிண்ணம் etc.
    // EXCEPTIONS that must stay ன்ன:
    //   enna→என்ன (ன்ன after எ, not a vowel sign — stays)
    //   inna, anna at word start (no vowel sign before ன்ன — stays)
    // The pattern only fires when a vowel SIGN (ி ு ெ) directly precedes ன்ன.
    // {
    //     pattern: /([\u0BBF\u0BC1\u0BC6])\u0BA9\u0BCD\u0BA9/g,
    //     replace: '$1\u0BA3\u0BCD\u0BA3'   // ி/ு/ெ + ன்ன  →  ி/ு/ெ + ண்ண
    // },
    // Also handle ா (long-aa sign) + ன்ன → ண்ண  (kaannan, aannan)
    {
        pattern: /\u0BBE\u0BA9\u0BCD\u0BA9/g,
        replace: '\u0BBE\u0BA3\u0BCD\u0BA3'   // ா + ன்ன  →  ா + ண்ண
    },

    // FIX: ந before retroflex ட cluster → ண (sandai/mandham/thandu type)
    { pattern: /ந்ட/g, replace: 'ண்ட' },
    { pattern: /ந்டி/g, replace: 'ண்டி' },
    { pattern: /ந்டு/g, replace: 'ண்டு' },
    { pattern: /ந்டா/g, replace: 'ண்டா' },
    { pattern: /ந்டே/g, replace: 'ண்டே' },
    { pattern: /ந்டை/g, replace: 'ண்டை' },
    { pattern: /ந்டோ/g, replace: 'ண்டோ' },

    // FIX: vowel-sign + ந் at word-end → ன்  (ivan/avan type)
    {
        pattern: /([\u0BBE\u0BBF\u0BC0\u0BC1\u0BC2\u0BC6\u0BC7\u0BC8\u0BCA\u0BCB\u0BCC])\u0BA8\u0BCD$/g,
        replace: '$1\u0BA9\u0BCD'
    },
    {
        pattern: /([\u0BBE\u0BBF\u0BC1\u0BC6\u0BC8\u0BCA])\u0BA8$/g,
        replace: '$1\u0BA9'
    },

    { pattern: /ட்ட்/, replace: 'ட்ட' },
    { pattern: /த்த்/, replace: 'த்த' },
    { pattern: /ப்ப்/, replace: 'ப்ப' },
    { pattern: /ற்ற்/, replace: 'ற்ற' },
    { pattern: /ல்ல்/, replace: 'ல்ல' },
    { pattern: /ண்ண்/, replace: 'ண்ண' },
    { pattern: /ன்ன்/, replace: 'ன்ன' },
    { pattern: /ம்ம்/, replace: 'ம்ம' },
    // Fix: ஹ at word start for h-words that should be other letters
    // Fix: trailing lone vowel signs that have no base consonant
    { pattern: /^[\u0BBE-\u0BCC]/, replace: '' },
    // Fix: ஒம் at end of words → ஓம் (kaanom → காணோம்)
    { pattern: /ஒம்$/, replace: 'ஓம்' },
    // Fix: word ending னொ → னோ
    { pattern: /னொ/g, replace: 'னோ' },
    // Fix: ரொ at word END after consonant → ரோ (poren → போறோம் type)
    { pattern: /ணொம்/g, replace: 'ணோம்' },
    // Fix: common wrong outputs from tokenizer
    { pattern: /தெரிஞ்ஜ/g, replace: 'தெரிஞ்ச' },
    { pattern: /புரிஞ்ஜ/g, replace: 'புரிஞ்ச' },
    { pattern: /முடிஞ்ஜ/g, replace: 'முடிஞ்ச' },
    { pattern: /பிடிஞ்ஜ/g, replace: 'பிடிஞ்ச' },

    // i.e. bare consonant (U+0B95–U+0BB9) directly followed by கு
    { pattern: /([\u0B95-\u0BB9])கு/g, replace: '$1க்கு' },
    { pattern: /([\u0B95-\u0BB9])கே/g, replace: '$1க்கே' },
    // Fix: ர்க/ல்க before SHORT vowel signs (ி ெ only) → ர்க்க/ல்க்க
    // Guard: only doubles before ி (i-sign) and ெ (e-sign) where the cluster
    // is phonologically required.  ு (u-sign) is intentionally excluded to
    // avoid over-firing on valid ல்கு / ர்கு compounds.
    // e.g. solkirein→சொல்கிறேன் needs ல்க்கி; but solkudhu stays as-is.
    { pattern: /ர்க([\u0BBF\u0BC6])/g, replace: 'ர்க்க$1' },
    { pattern: /ல்க([\u0BBF\u0BC6])/g, replace: 'ல்க்க$1' },
    // Fix: word-final bare ம/ந/ல without pulli → add pulli (vanakkam, neram, kal etc.)
    // Pattern: consonant letter (not already followed by pulli or vowel sign) at word END
    // NOTE: _finalPulli:true → applyPostProcess() skips these for words < 4 Tamil chars
    { pattern: /ம$/, replace: 'ம்', _finalPulli: true },
    { pattern: /(?<!\u0BBE)ன$/, replace: 'ன்', _finalPulli: true },
    { pattern: /(?<!\u0BB2\u0BCD)\u0BB2$/, replace: 'ல்', _finalPulli: true },
    { pattern: /ர$/, replace: 'ர்', _finalPulli: true, _minChars: 5 },
    { pattern: /(?<!\u0BBE)ண$/, replace: 'ண்', _finalPulli: true },
];

// ============ GEMINATION FIX (Critical #2) ============
// When a consonant doubles (pakkam, vittai, kattai), the first gets pulli
// and the second joins the vowel. The tokenizer already handles kk→க்க etc.
// but this pass catches cases the token table misses — specifically when
// the user types a single consonant that should be doubled before a short vowel.
//
// Tamil rule: after a short vowel (அ இ உ எ ஒ or their signs ி ு ெ ொ),
// a vallinam consonant (க ச ட த ப ற) should be doubled.
// e.g. pakam → பக்கம், vitai → விட்டை, katai → கட்டை
function applyGeminationFix(tamilWord) {
    if (!tamilWord || tamilWord.length < 3) return tamilWord;

    // Guard: skip gemination for Grantha-consonant words (loanwords)
    // ஜ(0B9C) ஷ(0BB7) ஸ(0BB8) ஹ(0BB9) — these never geminate
    const granthaOnly = /^[\u0B9C\u0BB7\u0BB8\u0BB9]/.test(tamilWord);
    if (granthaOnly) return tamilWord;

    // Guard: skip if word contains ONLY Grantha consonants + vowels
    // e.g. பஸ், டிப், கப் — common English borrowings
    const _loanRoots = new Set([
        'பஸ்', 'டிப்', 'கப்', 'ஷாப்', 'ஆபீஸ்', 'கேம்', 'டீம்', 'ஸ்டேஜ்',
        'பிளான்', 'டெஸ்ட்', 'ஸ்கூல்', 'காலேஜ்', 'ஹோட்டல்', 'பஸ்ஸ்'
    ]);
    if (_loanRoots.has(tamilWord)) return tamilWord;

    const PULLI = '\u0BCD'; // ்
    // Short vowel signs: ி(0BBF) ு(0BC1) ெ(0BC6) ொ(0BCA)
    const shortVowelSigns = '\u0BBF\u0BC1\u0BC6\u0BCA';
    // Short standalone vowels: அ(0B85) இ(0B87) உ(0B89) எ(0B8E) ஒ(0B92)
    const shortVowels = '\u0B85\u0B87\u0B89\u0B8E\u0B92';
    // Vallinam consonants: க(0B95) ச(0B9A) ட(0B9F) த(0BA4) ப(0BAA) ற(0BB1)
    const vallinam = ['\u0B95', '\u0B9A', '\u0B9F', '\u0BA4', '\u0BAA', '\u0BB1'];

    let result = tamilWord;

    // Pattern: short-vowel-sign + vallinam + vowel-sign → insert pulli+consonant
    // e.g. ிக → ிக்க (only if not already doubled)
    for (const v of vallinam) {
        // After short vowel sign: sign + consonant + vowel → sign + consonant + pulli + consonant + vowel
        const re1 = new RegExp(`([${shortVowelSigns}])(${v})([\u0BBF\u0BC1\u0BC6\u0BCA\u0BC8])`, 'g');
        result = result.replace(re1, (match, sign, cons, vowel) => {
            // Don't double if already preceded by pulli (already geminated)
            return sign + cons + PULLI + cons + vowel;
        });

        // After short standalone vowel: vowel + consonant + vowel-sign → vowel + consonant + pulli + consonant + vowel-sign
        const re2 = new RegExp(`([${shortVowels}])(${v})([\u0BBF\u0BC1\u0BC6\u0BCA\u0BC8])`, 'g');
        result = result.replace(re2, (match, vow, cons, sign) => {
            return vow + cons + PULLI + cons + sign;
        });
    }

    // Fix triple-stacking from overzealous doubling
    result = result
        .replace(/க்க்க/g, 'க்க')
        .replace(/ட்ட்ட/g, 'ட்ட')
        .replace(/த்த்த/g, 'த்த')
        .replace(/ப்ப்ப/g, 'ப்ப')
        .replace(/ச்ச்ச/g, 'ச்ச')
        .replace(/ற்ற்ற/g, 'ற்ற');

    return result;
}

// ============ POSITIONAL NA FIX (Critical #3) ============
// "ன" (alveolar na) vs "ந" (dental na) positional rule:
//  - "n" at END of word after a vowel → ன் (alveolar) — e.g. avan→அவன்
//  - "n" at START of word → ந (dental) — e.g. naan→நான்
//  - "n" before a vowel in MIDDLE of word → ந (dental) — e.g. neram→நேரம்
//  - "nn" (doubled) → ன்ன (alveolar doubled) — e.g. enna→என்ன
//
// The tokenizer maps n→ந everywhere. This pass corrects word-final ந→ன.
// Also handles the reverse: ensures ன at word start becomes ந.
function applyPositionalNaFix(tamilWord) {
    if (!tamilWord || tamilWord.length < 2) return tamilWord;

    let result = tamilWord;

    // Rule 1: Word-final ந் → ன் (global — ந் at word-end is always wrong in Tamil)
    // Previously only matched after a vowel sign, missing: avan→அவன், ivan→இவன்
    result = result.replace(
        /\u0BA8\u0BCD$/g,
        '\u0BA9\u0BCD'
    );

    // Rule 2: Word-final bare ந → ன (global)
    result = result.replace(
        /\u0BA8$/g,
        '\u0BA9'
    );

    // Rule 3: Ensure word-initial ன → ந (ன cannot start a word)
    if (result[0] === '\u0BA9') {
        result = '\u0BA8' + result.slice(1);
    }

    // Rule 4: Medial ந before a vowel sign stays ந (dental)
    // e.g. மனிதன் — the first ந before ி must stay ந, not ன
    // Pattern: consonant/vowel-sign + ந + vowel-sign → keep ந (no change needed)
    // But: ன in medial position before a vowel sign → fix to ந
    // result = result.replace(
    //     /([\u0BBE-\u0BCC])\u0BA9([\u0BBE-\u0BCC])/g,
    //     '$1\u0BA8$2'
    // );

    return result;
}

function applyPostProcess(word) {
    let result = word;

    // ── WORD-FINAL PULLI GUARD ───────────────────────────────────────────
    // The rules that add ்  at word end (ம→ம், ன→ன் etc.) are only safe
    // when the word is long enough to be a real Tamil word (≥4 Tamil chars).
    // Short words like "சல" (sala), "வல" (vala) are valid open syllables
    // (e.g. verb stems, foreign words) and must NOT get a spurious pulli.
    // Count Tamil Unicode codepoints: range U+0B80–U+0BFF.
    const tamilCharCount = [...result].filter(c => c >= '\u0B80' && c <= '\u0BFF').length;
    const applyFinalPulli = tamilCharCount >= 4;

    for (const rule of postProcessRules) {
        // Skip word-final pulli rules for short words
        const isFinalPulliRule = rule._finalPulli === true;
        if (isFinalPulliRule && !applyFinalPulli) continue;
        if (rule._minChars && tamilCharCount < rule._minChars) continue;
        result = result.replace(rule.pattern, rule.replace);
    }
    return result;
}

// ============ VOWEL HIATUS FIX ============
// When the greedy tokenizer produces a standalone vowel (அ-ஔ) right after
// a vowel sign (ா-ௌ), it means the user typed something like "poi" which
// tokenized as po→பொ + i→இ = பொஇ. In Tamil this is invalid — a glide
// consonant ய (ya) must bridge the two vowel sounds.
// Fix: பொ+இ → பொய், மெ+இ → மெய், etc.

// Maps standalone vowel characters to the corresponding ய+vowel-sign form
const _vowelToYaForm = {
    '\u0b85': '\u0baf\u0bcd',     // அ → ய்  (ya pulli — rare but valid)
    '\u0b86': '\u0baf\u0bbe',     // ஆ → யா
    '\u0b87': '\u0baf\u0bcd',     // இ → ய்  (most common: poi→பொய், mei→மெய்)
    '\u0b88': '\u0baf\u0bc0',     // ஈ → யீ
    '\u0b89': '\u0baf\u0bc1',     // உ → யு
    '\u0b8a': '\u0baf\u0bc2',     // ஊ → யூ
    '\u0b8e': '\u0baf\u0bc6',     // எ → யெ
    '\u0b8f': '\u0baf\u0bc7',     // ஏ → யே
    '\u0b90': '\u0baf\u0bc8',     // ஐ → யை
    '\u0b92': '\u0baf\u0bca',     // ஒ → யொ
    '\u0b93': '\u0baf\u0bcb',     // ஓ → யோ
    '\u0b94': '\u0baf\u0bcc',     // ஔ → யௌ
};

// Tamil vowel signs (matras) range: \u0BBE to \u0BCC
const _vowelSignRegex = /[\u0bbe-\u0bcc]/;
// Tamil standalone vowels: \u0B85 to \u0B94
const _standaloneVowelRegex = /[\u0b85-\u0b94]/;

function applyVowelHiatusFix(word) {
    if (!word || word.length < 2) return word;

    let result = '';
    for (let i = 0; i < word.length; i++) {
        const ch = word[i];
        const prev = i > 0 ? word[i - 1] : '';

        // If current char is a standalone vowel AND previous char is a vowel sign,
        // this is a hiatus — insert ய glide instead
        if (_standaloneVowelRegex.test(ch) && _vowelSignRegex.test(prev)) {
            const yaForm = _vowelToYaForm[ch];
            if (yaForm) {
                result += yaForm;
                continue;
            }
        }
        result += ch;
    }
    return result;
}

// ============ SANDHI RULES ============
export function applySandhi(word1, word2) {
    if (!word1 || !word2) return word1 + word2;

    const tamilVowelRegex = /^[\u0B85-\u0B94]/;

    if (/ல்$/.test(word1) && tamilVowelRegex.test(word2)) {
        return word1.slice(0, -2) + 'ல்ல' + word2;
    }

    if (/ண்$/.test(word1) && tamilVowelRegex.test(word2)) {
        return word1.slice(0, -2) + 'ண்ண' + word2;
    }

    if (/ன்$/.test(word1) && tamilVowelRegex.test(word2)) {
        return word1.slice(0, -2) + 'ன்ன' + word2;
    }

    if (/ம்$/.test(word1) && tamilVowelRegex.test(word2)) {
        return word1.slice(0, -2) + 'ம்ம' + word2;
    }

    const vallinam = ['க', 'ச', 'ட', 'த', 'ப', 'ற'];

    if (/[\u0B85-\u0B94]$/.test(word1) && vallinam.some(v => word2.startsWith(v))) {
        const firstChar = word2[0];
        return word1 + firstChar + '்' + word2;
    }

    return word1 + word2;
}

// ============ RULE-BASED ENGINE ============
// NOTE: The old regex-based replacementRules array has been removed.
// The segment-based converter below (_buildTokenTable + greedy tokenizer) 
// handles all transliteration. It is faster and avoids ordering bugs.

// ============================================================
// SEGMENT-BASED CONVERTER
// Greedy longest-match tokenizer — fixes "s fires before nd" bug
// sandai: tries chunks left→right longest first → sa=ச, ndai=ண்டை → சண்டை ✅
// ============================================================

// Build token table programmatically
function _buildTokenTable() {
    const t = [];

    // sandai / mandham / thandu type
    t.push(['ndai', 'ண்டை']);
    t.push(['ndu', 'ண்டு']);
    t.push(['nda', 'ண்ட']);
    t.push(['ndam', 'ண்டம்']);
    t.push(['ndha', 'ண்ட']);
    t.push(['ndham', 'ண்டம்']);

    t.push(['naithum', 'னைத்தும்']);   // anaithum → அ + னைத்தும்
    t.push(['naithu', 'னைத்து']);      // anaithu  → அ + னைத்து
    t.push(['naithavargal', 'னைத்தவர்கள்']);
    t.push(['naivorum', 'னைவரும்']);
    t.push(['naivarum', 'னைவரும்']);
    t.push(['naivar', 'னைவர்']);
    t.push(['naiyum', 'னையும்']);
    t.push(['naith', 'னைத்']);        // bare cluster




    t.push(['vey', '\u0BB5\u0BC7']);
    t.push(['key', '\u0B95\u0BC7']);
    t.push(['ney', '\u0BA8\u0BC7']);
    t.push(['rey', '\u0BB0\u0BC7']);

    function addFamily(roman, tamil) {
        // Long vowels first (must try before short)
        t.push([roman + 'aa', tamil + '\u0bbe']); // ா
        t.push([roman + 'ii', tamil + '\u0bc0']); // ீ
        t.push([roman + 'uu', tamil + '\u0bc2']); // ூ
        t.push([roman + 'ee', tamil + '\u0bc0']); // ீ  (long-i sign — nee=நீ, veedu=வீடு)
        t.push([roman + 'oo', tamil + '\u0bc2']); // ூ  (long-u sign — koodam=கூடம், poo=பூ)
        t.push([roman + 'ae', tamil + '\u0bc7']); // ே  (long-e matra — kae=கே, mae=மே)
        t.push([roman + 'oa', tamil + '\u0bcb']); // ோ  (long-o matra — koa=கோ, toa=தோ)
        t.push([roman + 'ow', tamil + '\u0bcc']); // ௌ  (kow=கௌ)
        t.push([roman + 'ai', tamil + '\u0bc8']); // ை
        t.push([roman + 'au', tamil + '\u0bcc']); // ௌ
        // Uppercase vowel shortcuts (A=ஆ, I=ஈ, U=ஊ, E=ஏ, O=ஓ inside consonant)
        t.push([roman + 'A', tamil + '\u0bbe']); // kA=கா
        t.push([roman + 'I', tamil + '\u0bc0']); // kI=கீ
        t.push([roman + 'U', tamil + '\u0bc2']); // kU=கூ
        t.push([roman + 'E', tamil + '\u0bc7']); // kE=கே
        t.push([roman + 'O', tamil + '\u0bcb']); // kO=கோ
        // Short vowels
        t.push([roman + 'a', tamil]);
        t.push([roman + 'i', tamil + '\u0bbf']); // ி
        t.push([roman + 'u', tamil + '\u0bc1']); // ு
        t.push([roman + 'e', tamil + '\u0bc6']); // ெ
        t.push([roman + 'o', tamil + '\u0bca']); // ொ
        // Bare consonant (pulli)
        t.push([roman, tamil + '\u0bcd']);      // ்
    }

    // ── 1. MULTI-CHAR CLUSTERS (longest first, MUST be before singles) ──

    // ndra/ndri/ndru
    t.push(['ndru', '\u0ba9\u0bcd\u0bb1\u0bc1']); // ன்று
    t.push(['ndra', '\u0ba9\u0bcd\u0bb1']);      // ன்ற
    t.push(['ndri', '\u0ba9\u0bcd\u0bb1\u0bbf']); // ன்றி
    // stree / stra
    t.push(['stree', '\u0bb8\u0bcd\u0ba4\u0bcd\u0bb0\u0bc0']);
    t.push(['straa', '\u0bb8\u0bcd\u0ba4\u0bcd\u0bb0\u0bbe']);
    t.push(['stra', '\u0bb8\u0bcd\u0ba4\u0bcd\u0bb0']);
    // thra/thri/thru
    t.push(['thraa', '\u0ba4\u0bcd\u0bb0\u0bbe']);
    t.push(['thrii', '\u0ba4\u0bcd\u0bb0\u0bc0']);
    t.push(['thruu', '\u0ba4\u0bcd\u0bb0\u0bc2']);
    t.push(['thra', '\u0ba4\u0bcd\u0bb0']);
    t.push(['thri', '\u0ba4\u0bcd\u0bb0\u0bbf']);
    t.push(['thru', '\u0ba4\u0bcd\u0bb0\u0bc1']);
    t.push(['thre', '\u0ba4\u0bcd\u0bb0\u0bc6']);
    // shri / sri
    t.push(['shri', '\u0bb8\u0bcd\u0bb0\u0bc0']); // shri → ஸ்ரீ
    t.push(['sri', '\u0bb8\u0bcd\u0bb0\u0bc0']);   // sri → ஸ்ரீ

    // Special combinations (MISSING RULES FROM AZHAGI)
    t.push(['nH', '\u0ba9\u0bcd\u0bb9']);  // nH for ன்ஹ் (manHattan)
    t.push(['nkh', '\u0ba9\u0bcd\u0b95']); // nkh for ன்க்
    t.push(['nKh', '\u0ba9\u0bcd\u0b95']); // nKh for ன்க்
    t.push(['nK', '\u0ba9\u0bcd\u0b95']);   // nK for ன்க்
    t.push(['ngh', '\u0ba9\u0bcd\u0b95']); // ngh for ன்க்
    t.push(['nG', '\u0b99\u0bcd']);        // nG for ங்
    t.push(['Gn', '\u0b9e\u0bcd']);        // Gn for ஞ் (Gnaani)
    t.push(['nDr', '\u0ba9\u0bcd\u0b9f\u0bcd\u0bb0']); // nDr for ன்ட்ர் (aanDraaid)
    t.push(['nTh', '\u0ba9\u0bcd\u0ba4\u0bbe\u0ba9\u0bcd']); // nTh for ன்தான் (avanThaan)
    t.push(['Tr', '\u0b9f\u0bcd\u0bb0']);  // Tr for ட்ர் (venkaTraaman)
    // ── Full ஶ (sha U+0BB6) family — Sha, Shi, Shu etc. ──────────────────
    // Previously only ஶ் (pulli) was pushed; now the full vowel-family is registered
    // so that Sha→ஶ, Shi→ஶி, Shu→ஶு etc. work for Sanskrit/Grantha names.
    addFamily('Sh', '\u0BB6'); // Sh → ஶ family (Shankara, Shiva etc.)
    t.push(['Sr', '\u0bb8\u0bcd\u0bb0\u0bcd']);   // Sr for ஸ்ர் (naSreen)
    t.push(['srii', '\u0bb8\u0bcd\u0bb0\u0bc0']); // srii for ஸ்ரீ
    t.push(['Srii', '\u0bb8\u0bcd\u0bb0\u0bc0']); // Srii for ஸ்ரீ
    t.push(['Mr', '\u0bb8\u0bcd\u0bb0\u0bc0']);   // Mr for ஸ்ரீ
    // shr → ஶ்ர (Grantha cluster using ஶ not ஸ)
    t.push(['Shr', '\u0BB6\u0BCD\u0BB0']);        // Shr → ஶ்ர
    t.push(['shr', '\u0BB6\u0BCD\u0BB0']);        // shr → ஶ்ர (lowercase alias)
    t.push(['F', '\u0b83\u0baa']);          // F for ஃப்
    t.push(['ph', '\u0b83\u0baa\u0bcd']);   // ph → ஃப் (with pulli — stops vallinam doubling)         // ph for ஃப்
    t.push(['Z', '\u0b83\u0b9c\u0bcd']);    // Z for ஃஜ்
    t.push(['X', '\u0b83\u0bb8\u0bcd']);    // X for ஃஸ்
    t.push(['ow', '\u0b94']);               // ow for ஔ (standalone vowel)
    t.push(['ou', '\u0b94']);               // ou for ஔ
    // Aytham ஃ — standalone q or akh
    t.push(['akh', '\u0b83']);             // akh → ஃ
    t.push(['q', '\u0b83']);              // q → ஃ
    // NOTE: Removed broken diphthong tokens (aai, ooi, ei, oi, etc.)
    // They produced wrong output. Vowel-hiatus is now handled in applyVowelHiatusFix().
    t.push(['ae', '\u0b8f']);               // ae for ஏ (standalone vowel, e.g. aetram)
    t.push(['oa', '\u0b93']);               // oa for ஓ (standalone vowel, e.g. oar)
    t.push(['nh', '\u0ba8\u0bcd']);         // nh for ந் (nhagar)
    t.push(['aum', '\u0b90']);              // aum for ௐ
    t.push(['Aum', '\u0b90']);              // Aum for ௐ
    t.push(['OM', '\u0b90']);               // OM for ௐ


    // chr cluster (English loanwords: Christ, chrome)
    t.push(['chri', '\u0B95\u0BBF\u0BB1\u0BBF']); // கிறி
    t.push(['chru', '\u0B95\u0BBF\u0BB1\u0BC1']); // கிறு  
    t.push(['chre', '\u0B95\u0BBF\u0BB1\u0BC6']); // கிறெ
    t.push(['chr', '\u0B95\u0BBF\u0BB1\u0BCD']); // கிற்


    // tr family (Sanskrit) → த்ர
    addFamily('tr', '\u0ba4\u0bcd\u0bb0');

    // NOTE: Duplicate thr/ndr/str blocks removed — already defined above in section 1.
    // un+than split — must come before nth cluster to prevent nth from grabbing across word boundary
    // Add to _buildTokenTable, BEFORE addFamily('nth',...):
    t.push(['unthan', '\u0B89\u0BA8\u0BCD\u0BA4\u0BA9\u0BCD']);  // unthan → உந்தன்
    t.push(['unthane', '\u0B89\u0BA8\u0BCD\u0BA4\u0BA9\u0BC7']);  // unthane → உந்தனே
    t.push(['unthanai', '\u0B89\u0BA8\u0BCD\u0BA4\u0BA9\u0BC8']);  // unthanai → உந்தனை
    t.push(['unthankaga', '\u0B89\u0BA8\u0BCD\u0BA4\u0BA9\u0BCD\u0B95\u0BBE\u0B95']);  // உந்தன்காக

    // nth → ந்த
    addFamily('nth', '\u0ba8\u0bcd\u0ba4');
    // ksh → க்ஷ
    addFamily('ksh', '\u0b95\u0bcd\u0bb7');
    // sth → ஸ்த
    addFamily('sth', '\u0bb8\u0bcd\u0ba4');
    // nd → ண்ட
    addFamily('ndh', '\u0ba8\u0bcd\u0ba4');
    addFamily('nd', '\u0ba3\u0bcd\u0b9f');
    // nt → ண்ட
    addFamily('nt', '\u0ba3\u0bcd\u0b9f');
    // nk → ங்க AND ng → ங்க
    addFamily('nk', '\u0b99\u0bcd\u0b95');
    addFamily('ng', '\u0b99\u0bcd\u0b95');
    // mb → ம்ப
    addFamily('mb', '\u0bae\u0bcd\u0baa');
    addFamily('nb', '\u0ba3\u0bcd\u0baa');  // nb → ண்ப  (nanbargal → நண்பர்கள்)
    // nch → ஞ்ச AND nc → ஞ்ச
    addFamily('nch', '\u0b9e\u0bcd\u0b9a');
    addFamily('nc', '\u0b9e\u0bcd\u0b9a');
    // nn → ன்ன
    addFamily('nn', '\u0ba9\u0bcd\u0ba9');

    // sc → ஸ்க (school, scooter — prevents 'ch' from consuming the 'c')
    addFamily('sch', '\u0BB8\u0BCD\u0B95'); // sch → ஸ்க (school→ஸ்கூல்)
    t.push(['sch', '\u0BB8\u0BCD\u0B95\u0BCD']); // sch bare → ஸ்க்



    // ── ll → ல்ல (MUST be before single l) ──
    // In Tamil, double-l in Tanglish = ல்ல (e.g. palli=பள்ளி, nalla=நல்ல, kulla=குள்ள)
    // NOTE: palli, nalla etc. are in dictionary; this handles unseen ll words
    addFamily('ll', '\u0bb2\u0bcd\u0bb2'); // ll → ல்ல

    // ── LL → ள்ள (retroflex double-L, e.g. paLLi=பள்ளி) ──
    addFamily('LL', '\u0bb3\u0bcd\u0bb3'); // LL → ள்ள

    // ── 2. TWO-CHAR CONSONANT COMBOS ──
    // ── 2. TWO-CHAR CONSONANT COMBOS ──
    addFamily('sh', '\u0bb7');
    addFamily('ddh', '\u0ba4\u0bcd\u0ba4');
    addFamily('tth', '\u0ba4\u0bcd\u0ba4');
    addFamily('dh', '\u0ba4');
    addFamily('th', '\u0ba4');
    addFamily('bh', '\u0baa'); // bh → ப (bhagavan, bharat etc.)
    // bhi/bhe/bha — explicit forms so 'hi' doesn't fire after bh
    // thambhi → தம்பி, not தம்பஹி
    t.push(['bhi', '\u0baa\u0bbf']); // bhi → பி
    t.push(['bhe', '\u0baa\u0bc6']); // bhe → பெ
    addFamily('gh', '\u0b95');
    addFamily('ch', '\u0b9a');
    addFamily('zh', '\u0bb4');
    // Tamil ஞ never takes a direct vowel — it always needs ஞ்ச cluster.
    // These explicit tokens come BEFORE addFamily fires, so they win in the bucket.
    t.push(['njaa', '\u0b9e\u0bcd\u0b9a\u0bbe']); // njaa → ஞ்சா
    t.push(['njii', '\u0b9e\u0bcd\u0b9a\u0bc0']); // njii → ஞ்சீ
    t.push(['njuu', '\u0b9e\u0bcd\u0b9a\u0bc2']); // njuu → ஞ்சூ
    t.push(['njae', '\u0b9e\u0bcd\u0b9a\u0bc7']); // njae → ஞ்சே
    t.push(['njoa', '\u0b9e\u0bcd\u0b9a\u0bcb']); // njoa → ஞ்சோ
    t.push(['njai', '\u0b9e\u0bcd\u0b9a\u0bc8']); // njai → ஞ்சை
    t.push(['njA', '\u0b9e\u0bcd\u0b9a\u0bbe']); // njA  → ஞ்சா
    t.push(['njI', '\u0b9e\u0bcd\u0b9a\u0bc0']); // njI  → ஞ்சீ
    t.push(['njU', '\u0b9e\u0bcd\u0b9a\u0bc2']); // njU  → ஞ்சூ
    t.push(['njE', '\u0b9e\u0bcd\u0b9a\u0bc7']); // njE  → ஞ்சே
    t.push(['njO', '\u0b9e\u0bcd\u0b9a\u0bcb']); // njO  → ஞ்சோ
    t.push(['nja', '\u0b9e\u0bcd\u0b9a']);        // nja  → ஞ்ச
    t.push(['nji', '\u0b9e\u0bcd\u0b9a\u0bbf']); // nji  → ஞ்சி
    t.push(['nju', '\u0b9e\u0bcd\u0b9a\u0bc1']); // nju  → ஞ்சு  ← fixes anju→அஞ்சு
    t.push(['nje', '\u0b9e\u0bcd\u0b9a\u0bc6']); // nje  → ஞ்செ
    t.push(['njo', '\u0b9e\u0bcd\u0b9a\u0bca']); // njo  → ஞ்சொ
    addFamily('nj', '\u0b9e');
    addFamily('nju', '\u0b9e\u0bcd\u0b9a');
    addFamily('kk', '\u0b95\u0bcd\u0b95'); // kk → க்க (nallozhukkam etc.)
    addFamily('pp', '\u0baa\u0bcd\u0baa'); // pp → ப்ப
    addFamily('tt', '\u0b9f\u0bcd\u0b9f'); // tt → ட்ட (retroflex double)
    addFamily('mm', '\u0bae\u0bcd\u0bae'); // mm → ம்ம

    // ── 3. SINGLE CONSONANTS ──
    addFamily('k', '\u0b95'); addFamily('g', '\u0b95');
    // Tamil plural suffix -gal / -kal → கள்
    // t.push(['gal', '\u0b95\u0bb3\u0bcd']);   // nanbargal, aandugal etc.
    // t.push(['kal', '\u0b95\u0bb3\u0bcd']);   // manithargal, padangal etc.
    addFamily('p', '\u0baa'); addFamily('b', '\u0baa');
    addFamily('m', '\u0bae');
    addFamily('y', '\u0baf');
    addFamily('r', '\u0bb0');
    addFamily('l', '\u0bb2');
    addFamily('v', '\u0bb5');
    addFamily('h', '\u0bb9'); // h → ஹ (ha, hi, hu etc.)
    addFamily('s', '\u0b9a');
    addFamily('t', '\u0ba4'); addFamily('d', '\u0ba4');  // t/d → த (dental, correct for Tanglish)
    addFamily('T', '\u0b9f'); addFamily('D', '\u0b9f');  // T/D → ட (retroflex, explicit capital)
    addFamily('j', '\u0b9c');
    addFamily('n', '\u0ba8'); // n → ந (dental-na; nn=ன்ன handles alveolar doubled case)
    addFamily('n', '\u0ba9'); // n → ன (alveolar — correct default for colloquial Tanglish)
    // nh → ந (dental) is already above; word-initial ன→ந fixed below
    addFamily('w', '\u0bb5'); // w → வ (same as v; wa=வா, wi=வி)
    addFamily('N', '\u0ba3');
    addFamily('L', '\u0bb3');
    addFamily('R', '\u0bb1');
    addFamily('z', '\u0bb4');
    addFamily('f', '\u0b83\u0baa');

    // ── 4. VOWELS (long before short) ──
    t.push(['aa', '\u0b86'], ['ii', '\u0b88'], ['uu', '\u0b8a'],
        ['ee', '\u0b88'], ['oo', '\u0b8a'], ['ai', '\u0b90'], ['au', '\u0b94']); // ee=ஈ oo=ஊ
    t.push(['A', '\u0b86'], ['I', '\u0b88'], ['E', '\u0b8f'],
        ['U', '\u0b8a'], ['O', '\u0b93']);
    t.push(['a', '\u0b85'], ['i', '\u0b87'], ['u', '\u0b89'],
        ['e', '\u0b8e'], ['o', '\u0b92']);

    // NOTE: Removed duplicate ee/oo/uu vowel mappings that were already defined above.

    return t;
}

const _tokenTable = _buildTokenTable();

// Build a first-char bucketed Map for O(1) lookup per character position.
// Instead of scanning all ~400 entries per position, we only scan entries
// whose first character matches the current input character.
const _tokenMap = new Map();
for (const [key, val] of _tokenTable) {
    const c = key[0];
    if (!_tokenMap.has(c)) _tokenMap.set(c, []);
    _tokenMap.get(c).push([key, val]);
}

// Known verb-suffix endings — conjugateVerb only fires for these
const _verbSuffixRe = /(?:vaan|vaal|voom|paan|paal|poom|ren|tten|dhen|ran|ral|rom|ringa|ven|van|val|vom|vinga|pen|pan|pal|pom|pinga|ten|tan|tal|tom|tinga|then|than|thal|thom|tthen|tthan|tten|ttan|kiren|kiran|kiral|kirom|uren|uran|ural|urom|uringa|inja|ichu|keen|ken|kaan|kan|kaal|kal|koom|kom|keenga|kinga|kaanga|kanga|uten|utten|utaal|utaan|utaanga|njutaan|njutaal|njuten|iduvaan|iduvaal|iduven|idutten|uvaan|uven|unga|inga|aamal|aama)$/i;
const _locativeSuffixRe = /(?:la|ula|ule|il|kita|kitta|pola|maathiri|varai)$/i;
const _neverConjugate = new Set([
    'naanga', 'neanga', 'unna', 'enna', 'evan', 'evalll',
    'avanga', 'neenga', 'yaarnga', 'edhukku', 'ethukku',
    'yaathukkuun', 'eppadi', 'eppovum', 'enga',
    'unthan', 'unthane', 'unthanai', 'unthankaga',
    'untana', 'untanar', 'thirunthani', 'cheythirunthanar',
    // Proper nouns ending in -than/-nthan (names, not verbs)
    'ragunanthan', 'raghunanthan', 'rajinikanth', 'karthikeyan',
    'ganeshan', 'murugan', 'kumaran', 'sivakanthan', 'selvan',
    'deivanathan', 'subramanyan', 'krishnan', 'saravanan',
]);
export function convertWithRules(tanglishWord, skipCompoundCheck = false) {
    if (!tanglishWord || !tanglishWord.trim()) return '';

    // STEP 1: Normalize
    const normalized = normalizeInput(tanglishWord);

    // ── STEP 1a: Check _fallbackTamilMap first (known-correct words) ──────
    // convertWithRules is called by getTypingSuggestions (Pass 0 / Pass 6),
    // so it must honour the same fallback map that transliterateWord uses.
    // Without this, words like sandai/mandham/ivan produce wrong bases that
    // then get mutated into garbage variants by generateWordForms.
    const _cwrLower = tanglishWord.toLowerCase().trim();
    const _cwrFallback = _fallbackTamilMap.get(_cwrLower) || _fallbackTamilMap.get(normalized);
    if (_cwrFallback) return _cwrFallback;

    if (/^ooru(?:la|le)$/i.test(normalized)) {
        return 'ஊருல';
    }

    // ── STEP 1b: Word-initial t/d → த (dental) vs ட (retroflex) disambiguation ──
    // The tokenizer maps bare t/d → ட (retroflex, Azhagi standard).
    // But colloquial Tanglish users write "tambi" meaning தம்பி (dental த), not டம்பி.
    // Heuristic: if a word STARTS with t/d (lowercase) and the dictionary has no hit,
    // AND the remainder matches common dental patterns, rewrite to th/dh before tokenizing.
    // This is a limited rule; the dictionary/fallback map covers known words already.
    // We only fire for unseen words (dict check below will catch known ones).
    const _dentalStartRe = /^[td](?:a(?:mb|ng|m|n|l|r|v|k|pp|tt)|e(?:v|n|rin|ru|ra|l)|i(?:n|r|tt|ru|l)|u(?:r|n|mb|tt)|h)/i;
    let normalizedForTokenizer = normalized;

    // STEP 2: Check full word first
    if (fullWordMapping.has(normalized) && !_bypassDictionary.has(normalized)) {
        return fullWordMapping.get(normalized);
    }

    const lowerOriginal = tanglishWord.toLowerCase().trim();
    if (fullWordMapping.has(lowerOriginal) && !_bypassDictionary.has(lowerOriginal)) {
        return fullWordMapping.get(lowerOriginal);
    }

    // Check compound words
    if (!skipCompoundCheck) {
        const compoundResult = checkCompoundWord(normalized);
        if (compoundResult) return compoundResult;

        if (_locativeSuffixRe.test(normalized)) {
            const compoundResult = checkCompoundWord(normalized);
            if (compoundResult) return compoundResult;
        }
    }



    // Check verb forms — only for words with known verb suffixes (avoids false positives on nouns)
    const _likelyProperNoun = tanglishWord[0] === tanglishWord[0].toUpperCase()
        && tanglishWord[0] !== tanglishWord[0].toLowerCase()  // actually has uppercase
        && normalized.length >= 7;
    if (_verbSuffixRe.test(normalized) && !_neverConjugate.has(normalized) && !_likelyProperNoun) {
        const verbForms = conjugateVerb(normalized);
        if (verbForms && verbForms.length > 0 && verbForms[0]) {
            return verbForms[0];
        }
    }

    // STEP 3: Letter mapping (greedy tokenizer with O(1) bucket lookup)
    // Apply dental-start rewrite for unseen t/d-initial words before tokenizing
    // GUARD: Skip if word already starts with 'th'/'dh' — those already map to dental த.
    //   Without this guard, dhurandhar → dhhurandhar → த்ஹுரந்தர் (wrong!)
    const alreadyDental = /^(th|dh)/i.test(normalized);
    if (!alreadyDental &&
        _dentalStartRe.test(normalized) &&
        !fullWordMapping.has(normalized) &&
        !_fallbackTamilMap.has(normalized)) {
        // Rewrite leading t/d → th/dh so tokenizer picks dental-ta (த) not retroflex (ட)
        normalizedForTokenizer = normalized.replace(/^t/, 'th').replace(/^d/, 'dh');
    }
    let result = '';
    let pos = 0;
    const input = normalizedForTokenizer;

    while (pos < input.length) {
        let matched = false;
        const maxLen = Math.min(6, input.length - pos);
        const bucket = _tokenMap.get(input[pos]) || [];

        for (let len = maxLen; len >= 1; len--) {
            const chunk = input.slice(pos, pos + len);
            for (const [key, val] of bucket) {
                if (key === chunk) {
                    let finalVal = val;
                    if (pos === 0) {
                        finalVal = finalVal.replace(/\u0BA9/g, '\u0BA8');
                    }
                    // Priority 3: Word-final 'o' after a consonant -> long 'ō' (ோ)
                    if (key.endsWith('o') && key !== 'o' && pos + len === input.length) {
                        finalVal = finalVal.replace(/\u0BCA/g, '\u0BCB');
                    }
                    // Priority 3: Standalone 'o' word -> long 'ō' (ஓ)
                    if (key === 'o' && input.length === 1) {
                        finalVal = '\u0B93';
                    }
                    result += finalVal;
                    pos += len;
                    matched = true;
                    break;
                }
            }
            if (matched) break;
        }

        if (!matched) {
            result += input[pos];
            pos++;
        }
    }

    result = applyGeminationFix(result);
    result = applyVowelHiatusFix(result);
    result = applyPostProcess(result);
    result = applyVallinamDoubling(result);
    result = applyPositionalNaFix(result);

    // Fix word start issues: ன→ந, ற→ர, ள→ல at word start (invalid in Tamil)
    // Must check first Tamil char (may be followed by vowel signs)
    if (result.length > 0) {
        // Fix: word-initial vowel SIGN (ா ி ீ ு ூ ெ ே ை) has no base consonant.
        // The tokenizer produced a bare matra — prepend the correct standalone vowel.
        const vowelSignToLetter = {
            '\u0BBE': '\u0B86', // ா → ஆ  (aa)
            '\u0BBF': '\u0B87', // ி → இ  (i)
            '\u0BC0': '\u0B88', // ீ → ஈ  (ii/ee)
            '\u0BC1': '\u0B89', // ு → உ  (u)
            '\u0BC2': '\u0B8A', // ூ → ஊ  (uu/oo)
            '\u0BC6': '\u0B8E', // ெ → எ  (e)
            '\u0BC7': '\u0B8F', // ே → ஏ  (ae/E)
            '\u0BC8': '\u0B90', // ை → ஐ  (ai)
            '\u0BCA': '\u0B92', // ொ → ஒ  (o)
            '\u0BCB': '\u0B93', // ோ → ஓ  (oa/O)
            '\u0BCC': '\u0B94', // ௌ → ஔ  (au/ow)
        };
        const replacement = vowelSignToLetter[result[0]];
        if (replacement) result = replacement + result.slice(1);
        const firstChar = result[0];
        if (firstChar === '\u0ba9') result = '\u0ba8' + result.slice(1); // ன → ந
        else if (firstChar === '\u0bb1') result = '\u0bb0' + result.slice(1); // ற → ர
        else if (firstChar === '\u0bb3') result = '\u0bb2' + result.slice(1); // ள → ல
    }

    // Fix medial dental-na: ன followed immediately by a vowel sign in the
    // middle of a word is usually ந in genuine Tamil words.
    // Pattern: consonant + ன + vowel sign (not word boundary)
    // e.g. neram: ன + ே → should be ந + ே
    // We apply a targeted fix for the most common cases:
    // Medial ந before any vowel sign → ன
    // (.)\u0BA8 ensures word-initial ந is safe (nothing precedes it at pos 0)
    // Fixes: ninaippu→நினைப்பு, ninaipaal→நினைப்பால் etc.
    // Medial ந→ன: only fires when BOTH neighbours are vowel signs (true V-N-V)
    // Narrower scope prevents misfires on names like nandha, nandri
    result = result.replace(
        /([\u0BBE\u0BBF\u0BC0\u0BC1\u0BC2\u0BC6\u0BC7\u0BC8\u0BCA\u0BCB\u0BCC])\u0BA8([\u0BBE\u0BBF\u0BC0\u0BC1\u0BC2\u0BC6\u0BC7\u0BC8\u0BCA\u0BCB\u0BCC])/g,
        '$1\u0BA9$2'
    );

    // ── ல/ள/ழ DISAMBIGUATION ──────────────────────────────────────────────
    // Only runs for words NOT found in dictionary (those are already correct).
    // Fixes: palli→பள்ளி, vaazhkai→வாழ்க்கை, ulla→உள்ள, nalla stays நல்ல etc.
    if (isLaAmbiguous(tanglishWord)) {
        if (!(tanglishWord.toLowerCase().includes('vill') || tanglishWord.toLowerCase().includes('ellor'))) {
            result = disambiguateLa(tanglishWord.toLowerCase(), result);
        }
    }

    // ── ர/ற DISAMBIGUATION ────────────────────────────────────────────────
    // Fixes lowercase 'r' being used where ற (hard Ra) is correct.
    // Most common case: verb present-tense suffix -kura/-ura → குற
    //   veekura → வேகுற, paakura → பாக்குற, solura → சொல்லுற
    // Also fixes: maru- → மறு, veru → வேறு, uravu → உறவு, paravai → பறவை etc.
    if (isRaAmbiguous(tanglishWord) && !/ruppu$/i.test(tanglishWord)) {
        if (!/(?:உவான்|உவேன்|உவாள்|உவோம்|உவார்கள்|உங்க|உங்கள்)$/.test(result)) {
            result = disambiguateRa(tanglishWord.toLowerCase(), result);
        }
    }
    result = result.replace(/க்குக்கு/g, 'க்கு');
    result = result.replace(/க்ககு/g, 'க்கு');


    return result;
}

// ============ BEAM SEARCH TOKENIZER (Improvement #4) ============
// Explores multiple transliteration paths to generate 3-5 diverse Tamil candidates.
// Uses beam search (beam_width=4, topk=5) over the token table.
// Each beam tracks: { result: string, pos: number, score: number }
// Score penalizes shorter token matches (prefer longer = more accurate).

export function beamSearchTransliterate(tanglishWord, beamWidth = 4, topK = 5) {
    if (!tanglishWord || !tanglishWord.trim()) return [];

    const lower = tanglishWord.toLowerCase().trim();
    const normalized = normalizeInput(lower);
    const input = normalized;
    const candidateScores = new Map(); // tamilWord -> confidence score

    // Seed: check dictionary/fallback first
    let dictResult = fullWordMapping.get(normalized) || _fallbackTamilMap.get(lower);
    if (!dictResult && !_bypassDictionary.has(normalized)) {
        const pKey = phoneticNormalize(normalized);
        if (pKey && phoneticWordMap.has(pKey)) {
            dictResult = phoneticWordMap.get(pKey).tamil;
        }
    }
    if (dictResult) {
        candidateScores.set(dictResult, input.length * 2 + 10);
    }

    // Also add the standard rule engine output
    const ruleResult = convertWithRules(lower);
    if (ruleResult && /[\u0B80-\u0BFF]/.test(ruleResult)) {
        candidateScores.set(ruleResult, Math.max(candidateScores.get(ruleResult) || 0, input.length * 2 + 5));
    }

    // Beam search over token table
    let beams = [{ result: '', pos: 0, score: 0 }];

    while (beams.length > 0) {
        const nextBeams = [];

        for (const beam of beams) {
            if (beam.pos >= input.length) {
                // Beam completed — post-process and add to candidates
                let final = beam.result;
                final = applyGeminationFix(final);
                final = applyVowelHiatusFix(final);
                final = applyPostProcess(final);
                final = applyVallinamDoubling(final);
                final = applyPositionalNaFix(final);
                // Fix word start
                if (final.length > 0 && final[0] === '\u0BA9') final = '\u0BA8' + final.slice(1);
                if (final.length > 0 && final[0] === '\u0BB1') final = '\u0BB0' + final.slice(1);
                if (final.length > 0 && final[0] === '\u0BB3') final = '\u0BB2' + final.slice(1);

                if (/[\u0B80-\u0BFF]/.test(final)) {
                    candidateScores.set(final, Math.max(candidateScores.get(final) || 0, beam.score));
                }
                continue;
            }

            const bucket = _tokenMap.get(input[beam.pos]) || [];
            const maxLen = Math.min(6, input.length - beam.pos);
            const matches = [];

            // Collect all possible matches at this position
            for (let len = maxLen; len >= 1; len--) {
                const chunk = input.slice(beam.pos, beam.pos + len);
                for (const [key, val] of bucket) {
                    if (key === chunk) {
                        let finalVal = val;
                        if (beam.pos === 0) {
                            finalVal = finalVal.replace(/\u0BA9/g, '\u0BA8');
                        }
                        // Priority 3: Word-final 'o' after a consonant -> long 'ō' (ோ)
                        if (key.endsWith('o') && key !== 'o' && beam.pos + len === input.length) {
                            finalVal = finalVal.replace(/\u0BCA/g, '\u0BCB');
                        }
                        // Priority 3: Standalone 'o' word -> long 'ō' (ஓ)
                        if (key === 'o' && input.length === 1) {
                            finalVal = '\u0B93';
                        }
                        // Score: longer matches get higher score (more confident)
                        matches.push({ val: finalVal, len, score: len * 2 });
                    }
                }
            }

            if (matches.length === 0) {
                // No match — skip character
                nextBeams.push({
                    result: beam.result + input[beam.pos],
                    pos: beam.pos + 1,
                    score: beam.score - 1
                });
            } else {
                // Take top beamWidth matches to explore
                matches.sort((a, b) => b.score - a.score);
                const topMatches = matches.slice(0, beamWidth);
                for (const m of topMatches) {
                    nextBeams.push({
                        result: beam.result + m.val,
                        pos: beam.pos + m.len,
                        score: beam.score + m.score
                    });
                }
            }
        }

        // Prune beams: keep only top beamWidth * 2
        nextBeams.sort((a, b) => b.score - a.score);
        beams = nextBeams.slice(0, beamWidth * 2);

        // Early exit if we have enough candidates
        if (candidateScores.size >= topK * 2) break;
    }

    // Rank candidates using combined frequency + confidence score
    const ranked = Array.from(candidateScores.entries()).map(([word, confidence]) => {
        const freq = getWordFrequency(word);
        const score = freq * 1000 + confidence;
        return { word, score };
    });

    ranked.sort((a, b) => b.score - a.score);
    return ranked.map(c => c.word).slice(0, topK);
}

// ============ FUZZY MATCHING ============
function levenshteinDistance(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    return matrix[b.length][a.length];
}

function rankWords(words, tanglish = '') {
    const priorityPatterns = [
        /க்கம்$/,   // common endings
        /ம்$/,
        /ன்$/,
        /து$/,
        /க்கிறது$/,
        /த்த$/,
        /ா$/,
        /ை$/,
        /ி$/,
        /ு$/
    ];

    return words.sort((a, b) => {
        const getScore = (word) => {
            let s = 0;

            // Priority patterns give higher score
            priorityPatterns.forEach((pattern, i) => {
                if (pattern.test(word)) {
                    s += (20 - i);
                }
            });

            // Shorter common words slightly higher
            if (word.length >= 2 && word.length <= 4) {
                s += 5;
            }

            // Words starting with common letters get boost
            if (/^[அஆஇஈஉஊஎஏஐஒஓகசதபமயரலவழள]/i.test(word)) {
                s += 3;
            }

            // Contextual ending boosts based on what was typed
            if (tanglish) {
                const lowerT = tanglish.toLowerCase();
                if (lowerT.endsWith('a')) {
                    if (word.endsWith('\u0BBE')) s += 25; // ா sign
                } else if (lowerT.endsWith('u')) {
                    if (word.endsWith('\u0BC1')) s += 25; // ு sign
                } else if (lowerT.endsWith('am') || lowerT.endsWith('um') || lowerT.endsWith('m')) {
                    if (word.endsWith('ம்')) s += 25;
                } else if (lowerT.endsWith('an') || lowerT.endsWith('en') || lowerT.endsWith('n')) {
                    if (word.endsWith('ன்') || word.endsWith('ண்')) s += 25;
                }
            }

            // Bug 5 fix: blend in real word frequency so popular words rank higher
            s += Math.min(getWordFrequency(word) / 20, 30);

            return s;
        };

        return getScore(b) - getScore(a);
    });
}

function findClosestMatch(word, maxDistance = 1) {
    const wordLower = word.toLowerCase();
    let bestMatch = null;
    let bestDistance = Infinity;

    if (wordLower.length < 4) return null;

    for (const [key, value] of exactDictionary.entries()) {
        if (Math.abs(key.length - wordLower.length) > maxDistance) continue;
        const distance = levenshteinDistance(wordLower, key);
        if (distance < bestDistance && distance <= maxDistance) {
            bestDistance = distance;
            bestMatch = { tanglish: key, tamil: value, distance };
        }
    }
    return bestMatch;
}

// ============ LEARNED CORRECTIONS ============
const learnedCorrections = new Map();

export function learnCorrection(original, corrected) {
    const lower = original.toLowerCase();
    learnedCorrections.set(lower, corrected);
    try {
        const saved = JSON.parse(localStorage.getItem('tamilLearned') || '{}');
        saved[lower] = corrected;
        localStorage.setItem('tamilLearned', JSON.stringify(saved));
    } catch (_) { }
}

export function getLearnedCorrection(word) {
    return learnedCorrections.get(word.toLowerCase());
}

// Clean up incorrect user local storage preferences/history for target words
function _cleanupStaleCorrections() {
    if (typeof localStorage === 'undefined') return;
    const targets = {
        'unthan': 'உந்தன்',
        'thirunthani': 'திருந்தணி',
        'cheythirunthanar': 'செய்திருந்தனர்',
        'untana': 'உண்டாண',
        'untanar': 'உண்டணர்',
        'vandhukkitte': 'வந்துக்கிட்டே',
        'sollikkitte': 'சொல்லிக்கிட்டே',
        'kitte': 'கிட்டே',
        'solli': 'சொல்லி'
    };

    try {
        // 1. Clean tamilLearned
        const learnedSaved = localStorage.getItem('tamilLearned');
        if (learnedSaved) {
            const parsed = JSON.parse(learnedSaved);
            let changed = false;
            for (const key of Object.keys(targets)) {
                if (parsed[key] && parsed[key] !== targets[key]) {
                    delete parsed[key];
                    changed = true;
                }
            }
            if (changed) {
                localStorage.setItem('tamilLearned', JSON.stringify(parsed));
            }
        }

        // 2. Clean tamilWordPreferences
        const prefSaved = localStorage.getItem('tamilWordPreferences');
        if (prefSaved) {
            const parsed = JSON.parse(prefSaved);
            let changed = false;
            for (const key of Object.keys(targets)) {
                if (parsed[key]) {
                    const val = parsed[key];
                    if (val.tamil && val.tamil !== targets[key]) {
                        delete parsed[key];
                        changed = true;
                    }
                }
            }
            if (changed) {
                localStorage.setItem('tamilWordPreferences', JSON.stringify(parsed));
            }
        }

        // 3. Clean tamilCorrectionHistory
        const histSaved = localStorage.getItem('tamilCorrectionHistory');
        if (histSaved) {
            const parsed = JSON.parse(histSaved);
            const filtered = parsed.filter(item => {
                const key = item.original;
                if (targets[key] && item.tamil !== targets[key]) {
                    return false;
                }
                return true;
            });
            if (filtered.length !== parsed.length) {
                localStorage.setItem('tamilCorrectionHistory', JSON.stringify(filtered));
            }
        }
    } catch (_) { }
}

export function loadLearnedCorrections() {
    _cleanupStaleCorrections();
    try {
        const saved = localStorage.getItem('tamilLearned');
        if (saved) {
            for (const [k, v] of Object.entries(JSON.parse(saved))) {
                learnedCorrections.set(k, v);
                suggestionTrie.insert(k, v, 999); // Bug 4 fix: sync into trie on load
            }
        }
    } catch (_) { }
}

// ============ MAIN TRANSLITERATION ============

export function transliterateWord(word) {
    if (!word || !word.trim()) return '';

    const lower = word.toLowerCase().trim();
    const orig = word.trim();

    // 1. Learned corrections
    // Guard: skip cached values that look like corrupted backend data
    // (phrases with spaces, or values clearly shorter than the input)
    const learned = getLearnedCorrection(lower);
    if (learned) {
        const learnedBad = learned.includes(' '); // cached phrase → bad
        if (!learnedBad) return learned;
        // Clear the bad cached entry so it doesn't persist
        learnedCorrections.delete(lower);
        try {
            const saved = JSON.parse(localStorage.getItem('tamilLearned') || '{}');
            delete saved[lower];
            localStorage.setItem('tamilLearned', JSON.stringify(saved));
        } catch (_) { }
    }

    // 2. Full word mapping (exact dictionary)
    // Guard: skip backend entries that look wrong:
    //   • Contains spaces → it's a phrase mapping, not a word translation
    //   • Tamil value is clearly truncated (Tanglish ends in consonant but
    //     Tamil value ends in a vowel sign, suggesting the final consonant
    //     was dropped by bad database data)
    function isBackendValueSuspect(tanglishKey, tamilValue) {
        if (!tamilValue) return true;
        // Reject phrase mappings (multi-word Tamil for a single Tanglish word)
        if (tamilValue.includes(' ')) return true;
        // Reject if Tanglish ends in a consonant (no vowel) but Tamil value
        // ends in a vowel sign (ா-ௌ, U+0BBE-U+0BCC) OR a bare Tamil consonant
        // letter — means the final consonant of the Tanglish was dropped by bad
        // backend data (e.g. oruthar → ஒருத instead of ஒருத்தர்)
        const tanglishEndsConsonant = /[bcdfghjklmnpqrstvwxyz]$/.test(tanglishKey);
        // Tamil vowel signs ா-ௌ (U+0BBE-U+0BCC)
        const tamilEndsVowelSign = /[\u0BBE-\u0BCC]$/.test(tamilValue);
        // Tamil base consonant letters க-ஹ WITHOUT pulli — means no final ் was added
        // i.e. the Tamil word ends in an open syllable when Tanglish implies closed
        // A consonant WITH pulli (்\u0BCD) at the end is a valid Tamil word-ending
        // e.g. சுபாஷ் ends in ஷ் — last char is ் so this is correct, not "bare".
        // Only flag as bare if the last char is a consonant letter WITHOUT pulli.
        const tamilEndsBareCons = /[\u0B95-\u0BB9]$/.test(tamilValue) && !tamilValue.endsWith('\u0BCD');
        if (tanglishEndsConsonant && (tamilEndsVowelSign || tamilEndsBareCons)) return true;
        return false;
    }
    if (fullWordMapping.has(lower) && !_bypassDictionary.has(lower)) {
        const val = fullWordMapping.get(lower);
        if (!isBackendValueSuspect(lower, val)) return val;
        // else: fall through to rule engine
    }
    if (fullWordMapping.has(orig) && !_bypassDictionary.has(orig)) {
        const val = fullWordMapping.get(orig);
        if (!isBackendValueSuspect(orig, val)) return val;
        // else: fall through to rule engine
    }

    // 2a. Spelling correction map → dictionary lookup
    // Catches "naaliku" → "naalaikku" → நாளைக்கு
    const spellingCorrected = _tanglishSpellingMap.get(lower);
    if (spellingCorrected && fullWordMapping.has(spellingCorrected) && !_bypassDictionary.has(lower) && !_bypassDictionary.has(spellingCorrected)) {
        const result = fullWordMapping.get(spellingCorrected);
        // Cache so future lookups are instant
        learnCorrection(lower, result);
        return result;
    }

    // 2b. Try normalized form in dictionary
    const normalizedLower = normalizeInput(lower);
    if (normalizedLower !== lower && fullWordMapping.has(normalizedLower)) {
        return fullWordMapping.get(normalizedLower);
    }

    // 2c. Hardcoded fallback map — works even when backend is offline.
    // This is the safety net that prevents the rule engine from producing
    // phonetically-wrong outputs (e.g. "naliku" → நலிகு instead of நாளைக்கு).
    const fallback = _fallbackTamilMap.get(lower);
    if (fallback) {
        learnCorrection(lower, fallback); // cache for instant future lookup
        return fallback;
    }
    // Also check spelling-corrected form in fallback map
    if (spellingCorrected) {
        const fallbackCorrected = _fallbackTamilMap.get(spellingCorrected);
        if (fallbackCorrected) {
            learnCorrection(lower, fallbackCorrected);
            return fallbackCorrected;
        }
    }
    // Also check normalized form in fallback map
    if (normalizedLower !== lower) {
        const fallbackNorm = _fallbackTamilMap.get(normalizedLower);
        if (fallbackNorm) {
            learnCorrection(lower, fallbackNorm);
            return fallbackNorm;
        }
    }

    // 3. (Dictionary chunks removed — all words are in exactDictionary from backend)

    // 4. Compound words
    const compoundResult = checkCompoundWord(normalizeInput(lower));
    if (compoundResult) return compoundResult;

    // 5. Verb conjugations
    const verbForms = (!_neverConjugate.has(lower) && !_neverConjugate.has(normalizeInput(lower))) ? conjugateVerb(normalizeInput(lower)) : [];
    if (verbForms && verbForms.length > 0 && verbForms[0]) {
        return verbForms[0];
    }


    // 6. Rule engine  ← MOVED BEFORE fuzzy match so rule output is always preferred
    //    (fuzzy was running first and returning wrong prefix-matches like
    //     orutha for oruthar, giving ஒருத instead of ஒருதர்)
    const normalized = normalizeInput(orig);
    const ruled = convertWithRules(normalized);
    if (ruled && ruled !== normalized && /[\u0B80-\u0BFF]/.test(ruled)) {
        // ── ல/ள/ழ DISAMBIGUATION ──────────────────────────────────────────
        // convertWithRules() already calls disambiguateLa() internally,
        // but we also run it here on the final result to catch any remaining
        // ambiguity in the normalized form vs original typed form.
        let finalResult = ruled;
        if (isLaAmbiguous(lower)) {
            finalResult = disambiguateLa(lower, ruled);
        }
        // If the word has ambiguous letters (l/n/r) and is long enough, flag for AI
        // but return ruled result immediately (AI runs async in background)
        if (isUncertainConversion(lower, finalResult)) {
            // fire-and-forget: AI will learnCorrection() if it finds a better answer
            aiDisambiguate(lower, '').then(aiResult => {
                if (aiResult) learnCorrection(lower, aiResult);
            }).catch(() => { });
        }
        return finalResult;
    }

    // 7. Fuzzy match — last resort before Sanscript, only when rule engine
    //    produced nothing useful. Max distance 1 to avoid false positives.
    const closest = findClosestMatch(lower, 1);
    if (closest && closest.tamil) return closest.tamil;

    // 8. Sanscript fallback — also flag for AI async correction
    try {
        const result = Sanscript.t(lower, 'itrans', 'tamil');
        if (result && result !== lower) {
            // Any word reaching Sanscript is a candidate for AI improvement
            aiDisambiguate(lower, '').then(aiResult => {
                if (aiResult) learnCorrection(lower, aiResult);
            }).catch(() => { });
            return result;
        }
    } catch (_) { }

    return word;
}

export function transliterateSentence(sentence) {
    if (!sentence) return '';

    // Tamil numeral map: ASCII digit → Tamil numeral (U+0BE6–U+0BEF)
    const _tamilNumerals = { '0': '௦', '1': '௧', '2': '௨', '3': '௩', '4': '௪', '5': '௫', '6': '௬', '7': '௭', '8': '௮', '9': '௯' };

    // Pre-process: convert Tamil punctuation markers
    let input = sentence
        .replace(/\|\|/g, '\u0964\u0964') // || → ॥ (double purnam)
        .replace(/\|/g, '\u0964');          // | → । (purnam)

    const parts = input.split(/(\s+|[.,!?;:।॥\-])/);
    let transliterated = parts.map(part => {
        if (/[a-zA-Z]/.test(part)) {
            return transliterateWord(part);
        }
        // Convert digits to Tamil numerals
        if (/[0-9]/.test(part)) {
            return part.replace(/[0-9]/g, d => _tamilNumerals[d]);
        }
        return part;
    }).join('');

    // Apply sandhi rules between words
    const finalWords = transliterated.split(/(\s+)/);
    let result = '';
    let prevWord = '';

    for (let i = 0; i < finalWords.length; i++) {
        const word = finalWords[i];
        if (word.trim() && prevWord) {
            const combined = applySandhiRules(prevWord, word);
            if (combined !== prevWord + word) {
                result = result.slice(0, -prevWord.length) + combined;
                prevWord = combined;
                continue;
            }
        }
        result += word;
        if (word.trim()) {
            prevWord = word;
        }
    }

    // Apply final grammar rules
    result = applyGrammarRules(result);

    return result;
}

// ============ TYPING SUGGESTIONS ============


export function getWordSuggestions(partial, limit = 8) {
    return getTypingSuggestions(partial, limit);
}

// ============ LIVE WORD FORMING OPTIONS ============
// Returns 3–4 distinct Tamil candidates while the user is still typing.
// Combines:
//   1. Best trie/dictionary suggestion (highest confidence)
//   2. Rule engine output (phonetic transliteration)
//   3. generateWordForms variants (safe letter alternates)
//   4. Phonetic fuzzy match (if different from above)
//
// Each entry: { tamil: string, source: string }
// source values: 'dict' | 'rule' | 'form' | 'fuzzy'
//
// Usage in UI:  show these as inline chips above/below the composing word.
// When user taps one, commit that Tamil value and clear the composing buffer.

export function getLiveWordFormingOptions(typedText, maxOptions = 4) {
    if (!typedText || typedText.trim().length < 1) return [];

    const lower = typedText.toLowerCase().trim();
    const seen = new Set();
    const options = [];

    function push(tamil, source) {
        if (!tamil) return;
        if (!/[஀-௿]/.test(tamil)) return;
        if (seen.has(tamil)) return;
        seen.add(tamil);
        options.push({ tamil, source });
    }

    // 0. Exact transliterateWord — always first (catches நீ for nee, நான் for naan etc.)
    const exactResult = transliterateWord(lower);
    push(exactResult, 'dict');

    // 1. Vowel ambiguity alternates for short words
    // In Tanglish: ee/ii, oo/uu, aa/a are interchangeable
    // e.g. 'nee' -> also try 'nii' -> gets நீ; 'poo' -> also 'puu'
    if (lower.length <= 6) {
        const vowelAlts = new Set();
        if (lower.includes('ee')) vowelAlts.add(lower.replace(/ee/g, 'ii'));
        if (lower.includes('ii')) vowelAlts.add(lower.replace(/ii/g, 'ee'));
        if (lower.includes('oo')) vowelAlts.add(lower.replace(/oo/g, 'uu'));
        if (lower.includes('uu')) vowelAlts.add(lower.replace(/uu/g, 'oo'));
        if (lower.includes('aa')) vowelAlts.add(lower.replace(/aa/g, 'a'));
        if (!lower.includes('aa')) vowelAlts.add(lower.replace(/(?<!a)a(?!a)/g, 'aa'));
        for (const alt of vowelAlts) {
            if (alt === lower || options.length >= maxOptions) continue;
            push(transliterateWord(alt), 'dict');
            push(convertWithRules(alt), 'rule');
        }
    }

    // 2. Trie prefix completions (fetch double to get variety)
    const trieResults = getTypingSuggestions(lower, maxOptions * 2);
    for (const r of trieResults) {
        if (options.length >= maxOptions) break;
        push(r.tamil, r.exact ? 'dict' : 'fuzzy');
    }

    // 3. Rule engine direct output
    push(convertWithRules(lower), 'rule');

    // 3b. Long-vowel alternates — try aa for every a in the word
    // Catches: bhagavan→பகவன் but bhagavaan→பகவான் is also valid
    if (options.length < maxOptions) {
        const vowelAlternates = [];
        // Replace each 'a' with 'aa' one at a time
        const aPositions = [...lower.matchAll(/(?<![aeiou])a(?![aeiou])/g)].map(m => m.index);
        for (const pos of aPositions) {
            const alt = lower.slice(0, pos) + 'aa' + lower.slice(pos + 1);
            if (alt !== lower) vowelAlternates.push(alt);
        }
        // Also try full double-vowel version
        vowelAlternates.push(lower.replace(/(?<![aeiou])a(?![aeiou])/g, 'aa'));
        for (const alt of [...new Set(vowelAlternates)]) {
            if (options.length >= maxOptions) break;
            push(transliterateWord(alt), 'rule');
        }
    }



    // 4. generateWordForms variants (l/L/zh, r/R alternates etc.)
    if (options.length < maxOptions) {
        const forms = generateWordForms(lower);
        for (const f of forms) {
            if (options.length >= maxOptions) break;
            push(f, 'form');
        }
    }

    // 5. Phonetic fuzzy for longer words
    if (options.length < maxOptions && lower.length >= 4) {
        const phoneticKey = phoneticNormalize(lower);
        const fuzzyMatches = phoneticTrie.getWordsWithPrefix(phoneticKey, maxOptions);
        for (const m of fuzzyMatches) {
            if (options.length >= maxOptions) break;
            push(m.tamil, 'fuzzy');
        }
    }

    return options.slice(0, maxOptions);
}
export function getDictionary() { return Object.fromEntries(exactDictionary); }
export const DICTIONARY = new Proxy({}, {
    get(_, key) { return exactDictionary.get(key) || undefined; },
    has(_, key) { return exactDictionary.has(key); },
    ownKeys() { return [...exactDictionary.keys()]; },
    getOwnPropertyDescriptor(_, key) {
        if (exactDictionary.has(key)) return { configurable: true, enumerable: true, value: exactDictionary.get(key) };
    }
});

loadLearnedCorrections();


// ============ CONTROLLED LETTER VARIATIONS ============

function generateSafeVariations(base) {
    const variations = new Set();
    variations.add(base);

    // ல → ள only in middle (not at start or end)
    if (base.includes('ல') && !base.startsWith('ல') && !base.endsWith('ல')) {
        variations.add(base.replace(/ல/g, 'ள'));
    }

    // ல → ழ only in middle (limited, only for specific words)
    if (base.includes('ல') && !base.startsWith('ல') && !base.endsWith('ல')) {
        variations.add(base.replace(/ல/g, 'ழ'));
    }

    // ந → ண (only after retro letters: ட, த, ற)
    if (/([டதற])ந/.test(base)) {
        variations.add(base.replace(/([டதற])ந/g, '$1ண'));
    }

    // ர → ற only in middle
    // if (base.includes('ர') && !base.startsWith('ர') && !base.endsWith('ர')) {
    //     variations.add(base.replace(/ர/g, 'ற'));
    // }

    return Array.from(variations);
}

// ============ STRICT WORD FILTER ============

function isLikelyValid(word) {
    if (!word) return false;

    // ❌ avoid too many repeated letters
    if (/(.)\1{3,}/.test(word)) return false;

    // ❌ avoid weird endings - too short with 'ல்'
    if (/ல்$/.test(word) && word.length < 3) return false;

    // ❌ avoid double vowel nonsense
    if (/[ாிீுூெேொோ]{2,}/.test(word)) return false;

    // ❌ avoid starting with invalid consonant clusters
    if (/^[க்ச்ட்த்ப்ற்ய்வ]+[்]/.test(word)) return false;

    // ✅ Valid Tamil word must start with a proper character
    if (!isValidTamilWord(word)) return false;

    return true;
}



// ============ UPDATED MULTI WORD FORMATION WITH CONTROLS ============

export function generateWordForms(tanglish) {
    if (!tanglish) return [];

    const lower = tanglish.toLowerCase().trim();
    const forms = new Set();

    // Base form
    const base = convertWithRules(lower);
    if (base && isLikelyValid(base)) {
        forms.add(enforceTamilPatterns(base));
    } else if (base) {
        forms.add(base);
    }

    // ── RULE: If base is a known-complete word, skip all speculative variants ──
    // A word is "complete" if:
    //   (a) it ends in a case-suffix vowel sign (ை ா ீ ூ ே ோ ி) — already inflected
    //   (b) it ends in க்கு / லுக்கு / னுக்கு — dative suffix, nothing to add
    //   (c) it ends in ண்டை / ண்டம் / ண்டு — retroflex cluster words
    //   (d) the base came directly from _fallbackTamilMap (already correct)
    const _isCompleteSuffix = base && (
        /[ைாீூேோி]$/.test(base) ||          // ends in vowel sign — already inflected
        /க்கு$/.test(base) ||                 // dative suffix
        /லுக்கு$/.test(base) ||               // sonorant + dative
        /னுக்கு$/.test(base) ||
        /ண்ட[ைம்ுாேோ]/.test(base) ||        // retroflex cluster words
        /கிட்ட$/.test(base) ||                // கிட்ட suffix
        /ில்$/.test(base) ||                  // locative -ில்
        /[ம்ன்ள்ல்ர்ண்]$/.test(base) ||      // pulli-ending nouns (மனம், இவன், etc.)
        _fallbackTamilMap.get(lower) === base  // exact fallback hit
    );

    if (_isCompleteSuffix) {
        // Word is already complete — return only the base form, no variants
        return [base].filter(w => isLikelyValid(w));
    }

    // Apply controlled letter variations
    if (base) {
        const safeVariations = generateSafeVariations(base);
        safeVariations.forEach(v => {
            if (isLikelyValid(v)) forms.add(v);
        });

        // ந் at word end → ன் (very common: bhagavan, raman, krishnan etc.)
        if (base.endsWith('ந்')) {
            forms.add(base.slice(0, -2) + 'ன்');
        }
        // ந் at word end → ண் (for retroflex names: arjunan etc.)
        if (base.endsWith('ந்')) {
            forms.add(base.slice(0, -2) + 'ண்');
        }
    }

    // Double consonant strengthening
    // ── RULE: only double if base ends in a SHORT consonant (pulli ்) ──
    // Words ending in vowel signs are already complete — doubling is wrong.
    const PULLI = '்';
    const _baseEndsInPulli = base && base.slice(-1) === PULLI;
    if (_baseEndsInPulli) {
        const doubleConsonants = [
            { from: /க/g, to: 'க்க' },
            { from: /த/g, to: 'த்த' },
            { from: /ப/g, to: 'ப்ப' },
            { from: /ட/g, to: 'ட்ட' }
        ];
        doubleConsonants.forEach(({ from, to }) => {
            if (base && base.match(from)) {
                const doubled = base.replace(from, to);
                if (isLikelyValid(doubled)) forms.add(doubled);
            }
        });
    }

    // Ending vowel corrections
    // ── RULE: skip if base already ends in a vowel sign or pulli ──
    const TAMIL_STANDALONE_VOWELS = ['அ', 'ஆ', 'இ', 'ஈ', 'உ', 'ஊ', 'எ', 'ஏ', 'ஐ', 'ஒ', 'ஓ', 'ஔ'];
    const TAMIL_VOWEL_SIGNS = ['ா', 'ி', 'ீ', 'ு', 'ூ', 'ெ', 'ே', 'ை', 'ொ', 'ோ', 'ௌ'];
    if (base && base.length >= 2) {
        const lastChar = base.slice(-1);
        const endsInVowel = TAMIL_STANDALONE_VOWELS.includes(lastChar) || TAMIL_VOWEL_SIGNS.includes(lastChar);
        const endsInPulli = lastChar === PULLI;
        if (!endsInVowel && !endsInPulli) {
            const baseTamilChars = [...base].filter(c => /[\u0B80-\u0BFF]/.test(c)).length;
            if (baseTamilChars <= 4) {
                const endings = ['ா', 'ு', 'ம்', 'ன்', 'ான்', 'ான'];
                endings.forEach(ending => {
                    const withEnding = base + ending;
                    if (isLikelyValid(withEnding) && !forms.has(withEnding)) {
                        forms.add(withEnding);
                    }
                });
            }
        }
    }

    // Verb endings
    // ── RULE: skip if base already ends in a vowel sign (already complete) ──
    if (base && base.length >= 2 && base.length <= 6 && base.slice(-1) !== PULLI) {
        const lastChar = base.slice(-1);
        const endsInVowelSign = TAMIL_VOWEL_SIGNS.includes(lastChar);
        if (!endsInVowelSign) {
            const verbEndings = ['ும்', 'து'];
            verbEndings.forEach(ending => {
                const withEnding = base + ending;
                if (isLikelyValid(withEnding)) forms.add(withEnding);
            });
        }
    }

    // LIMIT FORMATION EXPLOSION - VERY IMPORTANT
    if (forms.size > 50) {
        const limitedForms = Array.from(forms).slice(0, 30);
        forms.clear();
        limitedForms.forEach(f => forms.add(f));
    }

    // Rank and filter
    let finalForms = Array.from(forms).filter(w => isLikelyValid(w));
    finalForms = rankWords(finalForms, lower);

    return finalForms.slice(0, 12);
}

// ============ VERB CONJUGATION ENGINE ============
// Dynamically generates tense+person forms from a verb root
// This handles: saptingala → சாப்பிட்டீங்களா style words WITHOUT extraWords entry

const verbRoots = {
    'saapidu': { past: 'சாப்பிட்ட', present: 'சாப்பிடுகிற', future: 'சாப்பிடுவ' },
    'saaptu': { past: 'சாப்பிட்ட', present: 'சாப்பிடுகிற', future: 'சாப்பிடுவ' },
    'po': { past: 'போன', present: 'போற', future: 'போவ' },
    'poo': { past: 'போன', present: 'போற', future: 'போவ' },
    'sel': { past: 'சென்ற', present: 'செல்கிற', future: 'செல்வ' },
    'vaa': { past: 'வந்த', present: 'வர்ற', future: 'வருவ' },
    'va': { past: 'வந்த', present: 'வர்ற', future: 'வருவ' },
    'varu': { past: 'வந்த', present: 'வர்ற', future: 'வருவ' },
    'paar': { past: 'பார்த்த', present: 'பார்க்கிற', future: 'பார்ப்ப' },
    'paaru': { past: 'பார்த்த', present: 'பார்க்கிற', future: 'பார்ப்ப' },
    'paak': { past: 'பார்த்த', present: 'பார்க்கிற', future: 'பார்ப்ப' },
    'sei': { past: 'செய்த', present: 'செய்கிற', future: 'செய்வ' },
    'pann': { past: 'பண்ண', present: 'பண்றி', future: 'பண்ணுவ' },
    'pannu': { past: 'பண்ண', present: 'பண்றி', future: 'பண்ணுவ' },
    'sol': { past: 'சொன்ன', present: 'சொல்ற', future: 'சொல்லுவ' },
    'soll': { past: 'சொன்ன', present: 'சொல்ற', future: 'சொல்லுவ' },
    'kel': { past: 'கேட்ட', present: 'கேக்கிற', future: 'கேப்ப' },
    'kekku': { past: 'கேட்ட', present: 'கேக்கிற', future: 'கேப்ப' },
    'kelu': { past: 'கேட்ட', present: 'கேக்கிற', future: 'கேப்ப' },
    'thoong': { past: 'தூங்கின', present: 'தூங்குறி', future: 'தூங்குவ' },
    'thoongku': { past: 'தூங்கின', present: 'தூங்குறி', future: 'தூங்குவ' },
    'padi': { past: 'படித்த', present: 'படிக்கிற', future: 'படிப்ப' },
    'padika': { past: 'படித்த', present: 'படிக்கிற', future: 'படிப்ப' },
    'odu': { past: 'ஓடின', present: 'ஓடுறி', future: 'ஓடுவ' },
    'kodu': { past: 'கொடுத்த', present: 'கொடுக்கிற', future: 'கொடுப்ப' },
    'thar': { past: 'தந்த', present: 'தர்றி', future: 'தருவ' },
    'edu': { past: 'எடுத்த', present: 'எடுக்கிற', future: 'எடுப்ப' },
    'vaangu': { past: 'வாங்கின', present: 'வாங்குறி', future: 'வாங்குவ' },
    'vaang': { past: 'வாங்கின', present: 'வாங்குறி', future: 'வாங்குவ' },
    'ukkaaru': { past: 'உட்கார்ந்த', present: 'உட்கார்றி', future: 'உட்கார்வ' },
    'ukka': { past: 'உட்கார்ந்த', present: 'உட்கார்றி', future: 'உட்கார்வ' },
    'nill': { past: 'நின்ற', present: 'நிக்கிற', future: 'நிப்ப' },
    'nil': { past: 'நின்ற', present: 'நிக்கிற', future: 'நிப்ப' },
    'ezhudu': { past: 'எழுதின', present: 'எழுதுறி', future: 'எழுதுவ' },
    'ezhudhu': { past: 'எழுதின', present: 'எழுதுறி', future: 'எழுதுவ' },
    'theriy': { past: 'தெரிஞ்ச', present: 'தெரியுற', future: 'தெரியும்' },
    'theri': { past: 'தெரிஞ்ச', present: 'தெரியுற', future: 'தெரியும்' },
    'puriy': { past: 'புரிஞ்ச', present: 'புரியுற', future: 'புரியும்' },
    'puri': { past: 'புரிஞ்ச', present: 'புரியுற', future: 'புரியும்' },
    'vilaya': { past: 'விளையாடின', present: 'விளையாடுறி', future: 'விளையாடுவ' },
    'aadu': { past: 'ஆடின', present: 'ஆடுறி', future: 'ஆடுவ' },
    'pesu': { past: 'பேசின', present: 'பேசுறி', future: 'பேசுவ' },
    'pechu': { past: 'பேசின', present: 'பேசுறி', future: 'பேசுவ' },
    'iruku': { past: 'இருந்த', present: 'இருக்க', future: 'இருப்ப' },
    'iru': { past: 'இருந்த', present: 'இருக்க', future: 'இருப்ப' },
    'iruk': { past: 'இருந்த', present: 'இருக்க', future: 'இருப்ப' },
    'muudi': { past: 'மூடின', present: 'மூடுறி', future: 'மூடுவ' },
    'tiruppu': { past: 'திருப்பின', present: 'திருப்புறி', future: 'திருப்புவ' },
    'vidu': { past: 'விட்ட', present: 'விடுறி', future: 'விடுவ' },
    'vittu': { past: 'விட்ட', present: 'விடுறி', future: 'விடுவ' },
    'ketku': { past: 'கேட்ட', present: 'கேக்கிற', future: 'கேப்ப' },
    'peshu': { past: 'பேசின', present: 'பேசுறி', future: 'பேசுவ' },
    'azhudhu': { past: 'அழுத', present: 'அழுறி', future: 'அழுவ' },
    'azhu': { past: 'அழுத', present: 'அழுறி', future: 'அழுவ' },
    'siri': { past: 'சிரித்த', present: 'சிரிக்கிற', future: 'சிரிப்ப' },
    'odi': { past: 'ஓடின', present: 'ஓடுறி', future: 'ஓடுவ' },
    // ── NEW: 30+ additional common Tamil verbs ──────────────────────────
    'thaakku': { past: 'தாக்கின', present: 'தாக்குற', future: 'தாக்குவ' },
    'thaak': { past: 'தாக்கின', present: 'தாக்குற', future: 'தாக்குவ' },
    'thirumbu': { past: 'திரும்பின', present: 'திரும்புற', future: 'திரும்புவ' },
    'thirumb': { past: 'திரும்பின', present: 'திரும்புற', future: 'திரும்புவ' },
    'utkaar': { past: 'உட்கார்ந்த', present: 'உட்காருற', future: 'உட்காருவ' },
    'thedu': { past: 'தேடின', present: 'தேடுற', future: 'தேடுவ' },
    'thed': { past: 'தேடின', present: 'தேடுற', future: 'தேடுவ' },
    'pidi': { past: 'பிடித்த', present: 'பிடிக்கிற', future: 'பிடிப்ப' },
    'piddi': { past: 'பிடித்த', present: 'பிடிக்கிற', future: 'பிடிப்ப' },
    'vai': { past: 'வச்ச', present: 'வைக்கிற', future: 'வைப்ப' },
    'vechi': { past: 'வச்ச', present: 'வைக்கிற', future: 'வைப்ப' },
    'vaiku': { past: 'வச்ச', present: 'வைக்கிற', future: 'வைப்ப' },
    'poodu': { past: 'போட்ட', present: 'போடுற', future: 'போடுவ' },
    'podu': { past: 'போட்ட', present: 'போடுற', future: 'போடுவ' },
    'thodu': { past: 'தொட்ட', present: 'தொடுற', future: 'தொடுவ' },
    'nada': { past: 'நடந்த', present: 'நடக்கிற', future: 'நடப்ப' },
    'nadha': { past: 'நடந்த', present: 'நடக்கிற', future: 'நடப்ப' },
    'kaattu': { past: 'காட்டின', present: 'காட்டுற', future: 'காட்டுவ' },
    'kaatu': { past: 'காட்டின', present: 'காட்டுற', future: 'காட்டுவ' },
    'thinnu': { past: 'தின்ன', present: 'தின்னுற', future: 'தின்னுவ' },
    'thin': { past: 'தின்ன', present: 'தின்னுற', future: 'தின்னுவ' },
    'kudi': { past: 'குடித்த', present: 'குடிக்கிற', future: 'குடிப்ப' },
    'kuddi': { past: 'குடித்த', present: 'குடிக்கிற', future: 'குடிப்ப' },
    'vizhu': { past: 'விழுந்த', present: 'விழுற', future: 'விழுவ' },
    'thalli': { past: 'தள்ளின', present: 'தள்ளுற', future: 'தள்ளுவ' },
    'thallu': { past: 'தள்ளின', present: 'தள்ளுற', future: 'தள்ளுவ' },
    'izhuthu': { past: 'இழுத்த', present: 'இழுக்கிற', future: 'இழுப்ப' },
    'izhu': { past: 'இழுத்த', present: 'இழுக்கிற', future: 'இழுப்ப' },
    'ottu': { past: 'ஓட்டின', present: 'ஓட்டுற', future: 'ஓட்டுவ' },
    'otu': { past: 'ஓட்டின', present: 'ஓட்டுற', future: 'ஓட்டுவ' },
    'sutru': { past: 'சுற்றின', present: 'சுற்றுற', future: 'சுற்றுவ' },
    'suthu': { past: 'சுற்றின', present: 'சுற்றுற', future: 'சுற்றுவ' },
    'thudhi': { past: 'துடித்த', present: 'துடிக்கிற', future: 'துடிப்ப' },
    'thudi': { past: 'துடித்த', present: 'துடிக்கிற', future: 'துடிப்ப' },
    'kuupdu': { past: 'கூப்பிட்ட', present: 'கூப்பிடுற', future: 'கூப்பிடுவ' },
    'kuupidu': { past: 'கூப்பிட்ட', present: 'கூப்பிடுற', future: 'கூப்பிடுவ' },
    'mudhi': { past: 'முடிஞ்ச', present: 'முடியுற', future: 'முடியும்' },
    'mudi': { past: 'முடிஞ்ச', present: 'முடியுற', future: 'முடியும்' },
    'kallu': { past: 'கற்ற', present: 'கற்கிற', future: 'கற்ப' },
    'katru': { past: 'கற்ற', present: 'கற்கிற', future: 'கற்ப' },
    'aluvu': { past: 'அழுத', present: 'அழுற', future: 'அழுவ' },
    'malai': { past: 'மலர்ந்த', present: 'மலருற', future: 'மலருவ' },
    'thiru': { past: 'திரும்பின', present: 'திரும்புற', future: 'திரும்புவ' },
    'vizhungu': { past: 'விழுங்கின', present: 'விழுங்குற', future: 'விழுங்குவ' },
    'nillu': { past: 'நின்ற', present: 'நிக்கிற', future: 'நிப்ப' },
    'thullu': { past: 'துள்ளின', present: 'துள்ளுற', future: 'துள்ளுவ' },
    'pooru': { past: 'போர்த்தின', present: 'போர்த்துற', future: 'போர்த்துவ' },
    'vali': { past: 'வலித்த', present: 'வலிக்கிற', future: 'வலிப்ப' },
    'adi': { past: 'அடித்த', present: 'அடிக்கிற', future: 'அடிப்ப' },
    'addi': { past: 'அடித்த', present: 'அடிக்கிற', future: 'அடிப்ப' },
    'eriy': { past: 'எறிந்த', present: 'எறியுற', future: 'எறிவ' },
    'thukku': { past: 'தூக்கின', present: 'தூக்குற', future: 'தூக்குவ' },
    'thook': { past: 'தூக்கின', present: 'தூக்குற', future: 'தூக்குவ' },
    'kattu': { past: 'கட்டின', present: 'கட்டுற', future: 'கட்டுவ' },
    'kat': { past: 'கட்டின', present: 'கட்டுற', future: 'கட்டுவ' },
    'koluthu': { past: 'கொளுத்தின', present: 'கொளுத்துற', future: 'கொளுத்துவ' },
    'maatru': { past: 'மாற்றின', present: 'மாற்றுற', future: 'மாற்றுவ' },
    'maaru': { past: 'மாறின', present: 'மாறுற', future: 'மாறுவ' },
    'neenai': { past: 'நினைத்த', present: 'நினைக்கிற', future: 'நினைப்ப' },
    'ninai': { past: 'நினைத்த', present: 'நினைக்கிற', future: 'நினைப்ப' },
    'kollu': { past: 'கொன்ன', present: 'கொல்லுற', future: 'கொல்லுவ' },
    'kol': { past: 'கொன்ன', present: 'கொல்லுற', future: 'கொல்லுவ' },
    'thudaikku': { past: 'துடைத்த', present: 'துடைக்கிற', future: 'துடைப்ப' },
    'vesu': { past: 'வீசின', present: 'வீசுற', future: 'வீசுவ' },
    'veesu': { past: 'வீசின', present: 'வீசுற', future: 'வீசுவ' },
    'nedhu': { past: 'நீந்தின', present: 'நீந்துற', future: 'நீந்துவ' },
    'neendhu': { past: 'நீந்தின', present: 'நீந்துற', future: 'நீந்துவ' },
};

// Person suffixes — colloquial Tamil
const conjSuffixes = {
    past: { en: 'ேன்', om: 'ோம்', an: 'ான்', aal: 'ாள்', anga: 'ார்கள்', inga: 'ீங்க', a: 'ா' },
    present: { en: 'ேன்', om: 'ோம்', an: 'ான்', aal: 'ாள்', anga: 'ார்கள்', inga: 'ீங்க', a: 'ா' },
    future: { en: 'ேன்', om: 'ோம்', an: 'ான்', aal: 'ாள்', anga: 'ார்கள்', inga: 'ீங்க', a: 'ா' },
};

function detectPerson(t) {
    if (t.endsWith('inga') || t.endsWith('enga') || t.endsWith('keenga') || t.endsWith('kinga')) return 'inga';
    if (t.endsWith('anga') || t.endsWith('kaanga') || t.endsWith('kanga')) return 'anga';
    if (t.endsWith('aal') || t.endsWith('al') || t.endsWith('kaal') || t.endsWith('kal')) return 'aal';
    if (t.endsWith('aan') || t.endsWith('an') || t.endsWith('kaan') || t.endsWith('kan')) return 'an';
    if (t.endsWith('oom') || t.endsWith('om') || t.endsWith('koom') || t.endsWith('kom')) return 'om';
    if (t.endsWith('een') || t.endsWith('en') || t.endsWith('keen') || t.endsWith('ken') || t.endsWith('aen')) return 'en';
    if (t.endsWith('a')) return 'a';
    return null;
}

function detectVerbTense(t) {
    if (/th[ae]n$|tt[ae]n$|nd[ae]n$|tten$|then$|thal$|tthal$|thinga$|ttinga$|ndinga$/.test(t)) return 'past';
    if (/th[ao]m$|tt[ao]m$|nd[ao]m$/.test(t)) return 'past';
    if (/inga$/.test(t) && /nth|tt|pp/.test(t)) return 'past';
    // colloquial past: -itten, -itaan, -ittaal, -inja, -ichu
    if (/itten$|itaan$|ittaal$|ittom$/.test(t)) return 'past';
    if (/inja$|injchu$|injchen$|injchan$/.test(t)) return 'past';
    if (/ichu$|ichen$|ichan$/.test(t)) return 'past';
    if (/v(?:ae?|e)n$|van$|val$|vom$|vinga$|pen$|pan$|pal$|pom$|pinga$/.test(t)) return 'future';
    if (/ren$|ran$|ral$|rom$|ringa$|kiren$|kiran$|kiral$|kirom$/.test(t)) return 'present';
    // colloquial present: -uren, -uran, -keen, -kaan, -kaal, -koom, -keenga, -kaanga
    if (/uren$|uran$|ural$|urom$|uringa$/.test(t)) return 'present';
    if (/keen$|ken$|kaan$|kan$|kaal$|kal$|koom$|kom$|keenga$|kinga$|kaanga$|kanga$/.test(t)) return 'present';
    return null;
}

function findVerbRoot(tanglish) {
    const t = tanglish.toLowerCase();
    // Sort roots longest-first so longer roots match before shorter ones
    // (e.g. 'saapidu' before 'saa', 'thirumbu' before 'thiru')
    const sortedRoots = Object.keys(verbRoots).sort((a, b) => b.length - a.length);
    for (const root of sortedRoots) {
        if (t.startsWith(root)) {
            // Guard: if root ends in a consonant (like t/d/p/k) and the next character in t is 'h',
            // it's a different consonant sound (th/dh/ph/kh), so this root doesn't match.
            const nextChar = t[root.length];
            const rootLastChar = root.slice(-1);
            const isConsonant = /[bcdfghjklmnpqrstvwxyz]/i.test(rootLastChar);
            if (nextChar === 'h' && isConsonant && rootLastChar !== 's' && rootLastChar !== 'c') {
                continue;
            }
            return root;
        }
    }
    // strip suffix patterns and try again
    const strips = [
        /[tp]ingala?$/, /[tp]inga$/, /then$/, /than$/, /thal$/, /thom$/, /thinga$/,
        /tten$/, /ttan$/, /ttal$/, /ttom$/, /ttinga$/, /nden$/, /ndan$/, /ndal$/, /ndom$/,
        /ven$/, /van$/, /val$/, /vom$/, /vinga$/, /pen$/, /pan$/, /pal$/, /pom$/, /pinga$/,
        /ren$/, /ran$/, /ral$/, /rom$/, /ringa$/, /kiren$/, /kiran$/, /kiral$/, /kirom$/,
        /uren$/, /uran$/, /ural$/, /urom$/, /uringa$/,
        // colloquial -keen/-kaan/-kaal/-koom/-keenga/-kaanga (irukeen, irukaan etc.)
        /keenga$/, /kinga$/, /kaanga$/, /kanga$/,
        /keen$/, /ken$/, /kaan$/, /kan$/, /kaal$/, /kal$/, /koom$/, /kom$/,
        /een$/, /aan$/, /aal$/,
        /en$/, /an$/, /al$/, /om$/, /la$/, /a$/,
    ];
    for (const pat of strips) {
        const stripped = t.replace(pat, '');
        if (stripped.length >= 2 && verbRoots[stripped]) return stripped;
    }

    // ── MORPHOLOGICAL FALLBACK (Disabled) ──────────────────────────────
    // Disabled to prevent false positive verb conjugations on common nouns/adjectives
    // ending in verb-like suffixes (such as 'al', 'an', 'a', etc.)
    /*
    for (const pat of strips) {
        const stripped = t.replace(pat, '');
        if (stripped.length >= 2 && stripped !== t) {
            // Convert stem to Tamil using rule engine
            const stemTamil = convertWithRules(stripped);
            if (stemTamil && /[\u0B80-\u0BFF]/.test(stemTamil) && stemTamil.length >= 2) {
                // Dynamically register this verb root based on stem ending pattern
                const dynData = _inferVerbClass(stripped, stemTamil);
                if (dynData) {
                    verbRoots[stripped] = dynData;
                    return stripped;
                }
            }
        }
    }
    */
    return null;
}

// ── DYNAMIC VERB CLASS INFERENCE ─────────────────────────────────────────
// Tamil verbs fall into several classes based on their stem ending.
// This function infers the conjugation pattern from the Tanglish stem.
// It's intentionally conservative — produces colloquial forms only.
function _inferVerbClass(tanglishStem, tamilStem) {
    if (!tamilStem || tamilStem.length < 2) return null;

    // Class detection based on Tanglish stem ending:
    //   -kku/-ttu/-ppu (geminated)  → strong verb: past=stem+in, pres=stem+ற, fut=stem+வ
    //   -du/-tu/-gu/-bu (stop+u)    → weak verb:   past=stem_t+த, pres=stem+கிற, fut=stem+ப
    //   -u (other)                  → class 3:     past=stem+ன, pres=stem+ற, fut=stem+வ
    //   -i                         → class 6:     past=stem_t+த, pres=stem+க்கிற, fut=stem+ப
    //   consonant end              → use as-is

    const stem = tanglishStem.toLowerCase();

    if (/kku$|ttu$|ppu$|llu$/.test(stem)) {
        // Strong/geminated verb (e.g. thaakku→தாக்கு)
        return {
            past: tamilStem + 'ன',
            present: tamilStem + 'ற',
            future: tamilStem + 'வ'
        };
    }
    if (/du$|tu$|dhu$|thu$/.test(stem)) {
        // Weak verb ending in dental/retroflex stop (e.g. thedu→தேடு)
        // Past: stem minus last vowel + த்த
        const stemBase = tamilStem.replace(/[\u0BC1\u0BC2]$/, '');
        return {
            past: stemBase + 'ன',
            present: tamilStem + 'ற',
            future: tamilStem + 'வ'
        };
    }
    if (/[^aeiou]u$|gu$|bu$/.test(stem)) {
        // Class 3 verb (e.g. sutru→சுற்று, vizhungu→விழுங்கு)
        return {
            past: tamilStem + 'ன',
            present: tamilStem + 'ற',
            future: tamilStem + 'வ'
        };
    }
    if (/i$/.test(stem)) {
        // Class 6 verb (e.g. pidi→பிடி, adi→அடி)
        return {
            past: tamilStem + 'த்த',
            present: tamilStem + 'க்கிற',
            future: tamilStem + 'ப்ப'
        };
    }
    // Default: treat as class 3
    return {
        past: tamilStem + 'ன',
        present: tamilStem + 'ற',
        future: tamilStem + 'வ'
    };
}

export function conjugateVerb(tanglish) {
    if (!tanglish || tanglish.length < 3) return [];
    const rootKey = findVerbRoot(tanglish);
    if (!rootKey) return [];

    const lower = tanglish.toLowerCase();
    const suffix = lower.slice(rootKey.length);
    const verbData = verbRoots[rootKey];

    if (lower.endsWith('utten') || lower.endsWith('uten')) {
        return [verbData.past + 'ுட்டேன்'];
    }

    if (lower.endsWith('utaan')) {
        return [verbData.past + 'ுட்டான்'];
    }

    if (lower.endsWith('njutaan')) {
        return [verbData.past + 'ுட்டான்'];
    }

    if (lower.endsWith('iduvaan')) {
        if (rootKey === 'po' || rootKey === 'poo') return ['போயிடுவான்'];
        return [verbData.past + 'ிடுவான்'];
    }

    if (lower.endsWith('uvaan')) {
        return [verbData.future + 'ான்'];
    }

    if (lower.endsWith('uven')) {
        return [verbData.future + 'ேன்'];
    }

    if (lower.endsWith('unga')) {
        return [verbData.present.replace(/ற$/, '') + 'ுங்க'];
    }
    const tense = detectVerbTense(lower);
    const person = detectPerson(lower);

    // If the word has extra characters beyond the root but neither tense
    // nor person suffix is detected, this is NOT a verb form — it's a
    // different word that happens to start with a verb root.
    // e.g. "iruthayam" starts with "iru" but is the noun இருதயம் (heart),
    //      not a conjugation of இரு (to be).
    if (suffix.length > 0 && !tense && !person) return [];

    const effectiveTense = tense || 'present';
    const stem = verbData[effectiveTense] || verbData.present;
    const suffixes = conjSuffixes[effectiveTense] || conjSuffixes.present;
    const results = [];
    if (person && suffixes[person]) {
        results.push(stem + suffixes[person]);
    } else {
        // If person is null, do not return any conjugated finite verb forms.
        // This prevents incorrect guessing of first-person endings for participles/nouns.
        return [];
    }
    return results.filter(Boolean);
}

export function getVerbFormSuggestions(tanglish) {
    if (!tanglish || tanglish.length < 4) return [];
    return conjugateVerb(tanglish).map((word, i) => ({
        tanglish,
        tamil: word,
        type: '🔤 Verb',
        priority: 2 + i,
        exact: false
    }));
}

// ============ AI FALLBACK FOR UNCERTAIN WORDS ============
// Called when rule engine is uncertain — same Anthropic API you already use for grammar

const _aiWordCache = new Map();

export async function aiDisambiguate(tanglishWord, surroundingTamil = '') {
    if (!tanglishWord) return null;
    const cacheKey = tanglishWord.toLowerCase() + '|' + surroundingTamil.slice(-30);
    if (_aiWordCache.has(cacheKey)) return _aiWordCache.get(cacheKey);

    try {
        const prompt = surroundingTamil
            ? `You are a Tamil transliteration expert. The user typed "${tanglishWord}" in Tanglish. Surrounding Tamil text: "${surroundingTamil}". What is the single most correct Tamil word for "${tanglishWord}" in this context? Reply with ONLY the Tamil word, nothing else.`
            : `You are a Tamil transliteration expert. The user typed "${tanglishWord}" in Tanglish (Tamil in English letters). What is the single most correct Tamil word? Reply with ONLY the Tamil word, nothing else.`;

        const apiKey = import.meta.env.VITE_CLAUDE_API_KEY;
        const response = await fetch('/api/claude/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey || '',
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-haiku-20240307',
                max_tokens: 50,
                messages: [{ role: 'user', content: prompt }]
            })
        });
        const data = await response.json();
        const result = data?.content?.[0]?.text?.trim();
        if (result && /[\u0B80-\u0BFF]/.test(result)) {
            _aiWordCache.set(cacheKey, result);
            learnCorrection(tanglishWord.toLowerCase(), result);
            return result;
        }
    } catch (_) { }
    return null;
}

// Returns true when word is ambiguous and should go to AI fallback
export function isUncertainConversion(tanglish, ruledResult) {
    if (!tanglish || !ruledResult) return true;
    if (exactDictionary.has(tanglish.toLowerCase())) return false;
    if (learnedCorrections.has(tanglish.toLowerCase())) return false;
    if (tanglish.length <= 3) return false;
    if (ruledResult === tanglish) return true; // rule engine totally failed
    // ambiguous letters present in longer words
    if (/[lLrRnN]/.test(tanglish) && tanglish.length >= 5) return true;
    return false;
}

// ============ MULTI-CHOICE WORD SUGGESTIONS ============

export function getWordFormationChoices(input, limit = 6) {
    if (!input) return [];

    const results = [];
    const seen = new Set();

    // 1. Dictionary matches (highest priority)
    for (const [key, value] of exactDictionary.entries()) {
        if (key.includes(input.toLowerCase()) && !seen.has(value)) {
            results.push({
                word: value,
                type: '📘 Dictionary',
                priority: 1
            });
            seen.add(value);
        }
    }

    // 2. Generated forms (RULE ENGINE with controls)
    const generated = generateWordForms(input);

    generated.forEach(word => {
        if (!seen.has(word)) {
            results.push({
                word: word,
                type: '⚙️ Formed',
                priority: 2
            });
            seen.add(word);
        }
    });

    // 3. Verb conjugation suggestions (dynamic verb forms)
    const verbSuggestions = getVerbFormSuggestions(input);
    verbSuggestions.forEach(({ tamil }) => {
        if (!seen.has(tamil)) {
            results.push({ word: tamil, type: '🔤 Verb', priority: 1 });
            seen.add(tamil);
        }
    });

    // 4. Direct conversion preview
    const direct = convertWithRules(input);
    if (direct && !seen.has(direct)) {
        results.push({
            word: direct,
            type: '🔤 Direct',
            priority: 0
        });
    }

    // Sort by priority
    results.sort((a, b) => a.priority - b.priority);

    return results.slice(0, limit);
}

// ============ PATTERN VALIDATION ============

export function enforceTamilPatterns(word) {
    if (!word) return word;

    // Prevent invalid double vowels
    word = word.replace(/([அஆஇஈஉஊஎஏஒஓ])\1+/g, '$1ய்$1');

    // Fix ending pulli → add vowel
    if (endsWithPulli(word)) {
        word += 'ு';
    }

    // Prevent invalid start
    word = autoCorrectWordStart(word);

    return word;
}

// ============ FREQUENCY DATA SYSTEM ============
// Usage frequency for contextual ranking
// Higher number = more common usage

let frequencyData = {};

// Default frequency data (common Tamil words)
const defaultFrequencyData = {
    'வணக்கம்': 1000,
    'நன்றி': 950,
    'எப்படி': 900,
    'என்ன': 950,
    'யார்': 850,
    'எங்கே': 820,
    'எப்போ': 800,
    'ஏன்': 850,
    'நான்': 990,
    'நீங்கள்': 980,
    'அவர்': 950,
    'அவள்': 920,
    'அது': 960,
    'இது': 960,
    'உள்ளது': 900,
    'இல்லை': 950,
    'ஆம்': 880,
    'சரி': 850,
    'வேண்டும்': 900,
    'வேண்டாம்': 750,
    'செல்கிறேன்': 700,
    'வருகிறேன்': 720,
    'பார்க்கிறேன்': 680,
    'செய்கிறேன்': 650,
    'பேசுகிறேன்': 600,
    'கேட்கிறேன்': 580,
    'எழுதுகிறேன்': 550,
    'படிக்கிறேன்': 650,
    'சாப்பிடுகிறேன்': 600,
    'தூங்குகிறேன்': 500,
    'சென்றேன்': 680,
    'வந்தேன்': 750,
    'பார்த்தேன்': 670,
    'செய்தேன்': 620,
    'பேசினேன்': 550,
    'கேட்டேன்': 560,
    'எழுதினேன்': 520,
    'படித்தேன்': 620,
    'சாப்பிட்டேன்': 580,
    'செல்வேன்': 650,
    'வருவேன்': 700,
    'பார்ப்பேன்': 620,
    'செய்வேன்': 600,
    'வீடு': 750,
    'பள்ளி': 700,
    'அலுவலகம்': 600,
    'கடை': 650,
    'ஊர்': 620,
    'மனிதன்': 650,
    'பெண்': 650,
    'குழந்தை': 700,
    'குடும்பம்': 680,
    'நண்பர்': 650,
    'சந்தோஷம்': 700,
    'வருத்தம்': 650,
    'கோபம்': 600,
    'பயம்': 580,
    'காதல்': 750,
    'அன்பு': 700,
    'நம்பிக்கை': 620,
    'இன்று': 800,
    'நேற்று': 750,
    'நாளை': 780,
    'இப்போது': 820,
    'இங்கே': 750,
    'அங்கே': 730,
    'நல்ல': 850,
    'கெட்ட': 600,
    'பெரிய': 750,
    'சிறிய': 700,
    'புதிய': 700,
    'பழைய': 650,
    'அழகான': 700,
    'மற்றும்': 800,
    'அல்லது': 700,
    'ஆனால்': 750,
    'தமிழ்': 950,
    'இசை': 700,
    'கலை': 650,
    'மொழி': 750,
    'கவிதை': 600,
    'பாடல்': 650
};

// Initialize frequency data
function initFrequencyData() {
    try {
        const saved = localStorage.getItem('tamilFrequency');
        if (saved) {
            const parsed = JSON.parse(saved);
            // Merge: imported list → default → user saved (user overrides all)
            frequencyData = { ...tamilFrequencyList, ...defaultFrequencyData, ...parsed };
        } else {
            frequencyData = { ...tamilFrequencyList, ...defaultFrequencyData };
        }
    } catch (_) {
        frequencyData = { ...tamilFrequencyList, ...defaultFrequencyData };
    }
    console.log(`[Engine] Frequency data initialized: ${Object.keys(frequencyData).length} words (${FREQUENCY_LIST_SIZE} from expanded list)`);
}

// Get frequency score for a Tamil word
export function getWordFrequency(word) {
    if (!word) return 0;
    return Math.max(frequencyData[word] || 0, _tamilWordFrequency.get(word) || 0);
}

// Update frequency data (learn from user usage)
export function updateFrequency(word, increment = 1) {
    if (!word) return;
    const current = frequencyData[word] || 0;
    frequencyData[word] = current + increment;

    // Store in localStorage for persistence
    try {
        localStorage.setItem('tamilFrequency', JSON.stringify(frequencyData));
    } catch (_) { }
}

// Get multiple word frequency scores
export function getFrequencies(words) {
    const result = {};
    for (const word of words) {
        result[word] = getWordFrequency(word);
    }
    return result;
}

// ============ PHONETIC NORMALIZATION LAYER ============
// Only normalize common TYPING ERRORS — do NOT strip valid Tamil distinctions
// like sh/zh/th/dh which map to different Tamil letters

const phoneticNormalizations = {
    // Common ye- colloquial → e- (same as normalizeInput)
    'yena': 'enna',
    'yenga': 'enga',
    'yepdi': 'eppadi',
    'yepo': 'eppo',
    'yenge': 'enge',
    'yeri': 'eri',
    'yellam': 'ellam',
    'yerkanave': 'erkanave',
    // Common Tamil word variations
    'ille': 'illai',
    'illay': 'illai',
    // Short form expansions
    'therla': 'theriyala',
    'purla': 'puriyala',
    'mudla': 'mudiyala',
    'varla': 'varala',
    'porla': 'porala',
    // Common truncations
    'sap': 'saapidu',
    'thoong': 'thoongiru',
    // Alternate spellings
    'nala': 'nalla',
    'nalaa': 'nallaa',
    'rombha': 'romba',
    'sari': 'seri',
    'ceri': 'seri',
    'ena': 'enna',
    'epdi': 'eppadi',
    'apdi': 'appadi',
    'ipdi': 'ippadi',
    'yepdi': 'eppadi',
    'kopam': 'kovam',
    'kashtam': 'kastam',
    'sandosham': 'santhosham',
};

export function normalizePhonetic(tanglish) {
    if (!tanglish) return tanglish;

    let normalized = tanglish.toLowerCase();

    // Only apply safe whole-word normalizations
    if (phoneticNormalizations[normalized]) {
        normalized = phoneticNormalizations[normalized];
    }

    return normalized;
}

// ============ FREQUENCY-BASED SUGGESTIONS (NEW) ============

export function getFrequencyBasedSuggestions(tanglishWord, limit = 6) {
    if (!tanglishWord) return [];

    const normalized = normalizePhonetic(tanglishWord);
    const suggestions = getTypingSuggestions(normalized, 15);

    if (suggestions.length === 0) return [];

    // Score each suggestion based on frequency and match quality
    const scored = suggestions.map(suggestion => {
        let score = 0;

        // Frequency score (0-100)
        const freq = getWordFrequency(suggestion.tamil);
        score += Math.min(freq / 10, 100);

        // Priority from original suggestion
        score += (10 - suggestion.priority) * 5;

        // Length similarity boost
        const lengthDiff = Math.abs(tanglishWord.length - suggestion.tanglish.length);
        score += Math.max(0, 10 - lengthDiff);

        return {
            ...suggestion,
            frequencyScore: score,
            frequency: freq
        };
    });

    // Sort by frequency score
    scored.sort((a, b) => b.frequencyScore - a.frequencyScore);

    return scored.slice(0, limit);
}

// ============ AUTO-LEARNING SYSTEM (NEW) ============

// Track user corrections for learning
let userCorrectionHistory = [];
let userWordPreferences = new Map();

// Load user learning data
function loadUserLearning() {
    _cleanupStaleCorrections();
    try {
        const savedHistory = localStorage.getItem('tamilCorrectionHistory');
        if (savedHistory) {
            userCorrectionHistory = JSON.parse(savedHistory);
        }

        const savedPreferences = localStorage.getItem('tamilWordPreferences');
        if (savedPreferences) {
            const parsed = JSON.parse(savedPreferences);
            for (const [key, value] of Object.entries(parsed)) {
                userWordPreferences.set(key, value);
            }
        }
    } catch (_) { }
}

// Save user learning data
function saveUserLearning() {
    try {
        localStorage.setItem('tamilCorrectionHistory', JSON.stringify(userCorrectionHistory.slice(-100)));
        const preferencesObj = Object.fromEntries(userWordPreferences);
        localStorage.setItem('tamilWordPreferences', JSON.stringify(preferencesObj));
    } catch (_) { }
}

// Record a user correction (auto-learn)
export function recordUserCorrection(originalTanglish, correctedTanglish, correctedTamil) {
    if (!originalTanglish || !correctedTanglish) return;

    const lowerOriginal = originalTanglish.toLowerCase();
    const lowerCorrected = correctedTanglish.toLowerCase();

    // Store in correction history
    userCorrectionHistory.unshift({
        original: lowerOriginal,
        corrected: lowerCorrected,
        tamil: correctedTamil,
        timestamp: Date.now()
    });

    // Limit history size
    if (userCorrectionHistory.length > 200) {
        userCorrectionHistory = userCorrectionHistory.slice(0, 200);
    }

    // Update user preferences
    const currentPref = userWordPreferences.get(lowerOriginal) || {};
    currentPref.preferred = lowerCorrected;
    currentPref.tamil = correctedTamil;
    currentPref.count = (currentPref.count || 0) + 1;
    currentPref.lastUsed = Date.now();
    userWordPreferences.set(lowerOriginal, currentPref);

    // Also learn in the main correction system
    learnCorrection(lowerOriginal, correctedTamil);

    // Update frequency for the corrected word
    if (correctedTamil) {
        updateFrequency(correctedTamil, 2); // Extra boost for user-corrected words
    }

    saveUserLearning();
}

// Get auto-learned suggestion for a word
export function getLearnedSuggestion(tanglishWord) {
    if (!tanglishWord) return null;

    const lower = tanglishWord.toLowerCase();
    const pref = userWordPreferences.get(lower);

    if (pref && pref.preferred) {
        return {
            tanglish: pref.preferred,
            tamil: pref.tamil,
            confidence: Math.min(pref.count || 1, 10),
            type: '🎓 Learned'
        };
    }

    // Check correction history
    const recentCorrection = userCorrectionHistory.find(h => h.original === lower);
    if (recentCorrection) {
        return {
            tanglish: recentCorrection.corrected,
            tamil: recentCorrection.tamil,
            confidence: 8,
            type: '🔄 Recent'
        };
    }

    return null;
}

// Get combined suggestions (learned + frequency + context)
export function getIntelligentSuggestions(tanglishWord, surroundingText = '', limit = 6) {
    if (!tanglishWord) return [];

    const results = [];
    const seen = new Set();

    // 1. Learned suggestions (highest priority)
    const learned = getLearnedSuggestion(tanglishWord);
    if (learned && !seen.has(learned.tamil)) {
        results.push({
            ...learned,
            priority: 0,
            rank: 0
        });
        seen.add(learned.tamil);
    }

    // 2. Exact dictionary match
    const lower = tanglishWord.toLowerCase();
    if (exactDictionary.has(lower) && !seen.has(exactDictionary.get(lower))) {
        results.push({
            tanglish: lower,
            tamil: exactDictionary.get(lower),
            type: '📚 Dictionary',
            priority: 1,
            rank: 1
        });
        seen.add(exactDictionary.get(lower));
    }

    // 3. Frequency-based suggestions
    const freqSuggestions = getFrequencyBasedSuggestions(tanglishWord, 10);
    for (const suggestion of freqSuggestions) {
        if (!seen.has(suggestion.tamil)) {
            results.push({
                ...suggestion,
                rank: results.length
            });
            seen.add(suggestion.tamil);
        }
    }

    // 4. Context-aware suggestions (if surrounding text provided)
    if (surroundingText) {
        const contextSuggestions = getContextAwareSuggestions(tanglishWord, surroundingText);
        for (const suggestion of contextSuggestions) {
            if (!seen.has(suggestion.tamil)) {
                results.push({
                    ...suggestion,
                    rank: results.length
                });
                seen.add(suggestion.tamil);
            }
        }
    } else {
        // Regular typing suggestions
        const typingSuggestions = getTypingSuggestions(tanglishWord, 8);
        for (const suggestion of typingSuggestions) {
            if (!seen.has(suggestion.tamil)) {
                results.push({
                    ...suggestion,
                    rank: results.length
                });
                seen.add(suggestion.tamil);
            }
        }
    }

    // 5. Sort by rank/priority
    results.sort((a, b) => {
        if (a.priority !== undefined && b.priority !== undefined) {
            return a.priority - b.priority;
        }
        if (a.rank !== undefined && b.rank !== undefined) {
            return a.rank - b.rank;
        }
        return 0;
    });

    return results.slice(0, limit);
}

// Enhanced transliteration with auto-learning
export async function transliterateWithLearning(tanglishWord, surroundingText = '') {
    if (!tanglishWord) return '';

    const lower = tanglishWord.toLowerCase();

    // Check learned correction first
    const learned = getLearnedSuggestion(lower);
    if (learned && learned.tamil) {
        return learned.tamil;
    }

    // Check dictionary
    if (exactDictionary.has(lower) && !_bypassDictionary.has(lower)) {
        return exactDictionary.get(lower);
    }

    // Check closest match
    const closest = findClosestMatch(lower, 1);
    if (closest) {
        return closest.tamil;
    }

    // Use context-aware transliteration
    if (surroundingText) {
        return transliterateWithContext(tanglishWord, surroundingText);
    }

    // Fallback to standard transliteration
    return transliterateWord(tanglishWord);
}

// ============ CONTEXT ENGINE ============

// Word categories for context matching
const wordCategories = {
    greetings: ['வணக்கம்', 'வனக்கம்', 'நமஸ்காரம்'],
    question: ['என்ன', 'யார்', 'எங்கே', 'எப்போ', 'ஏன்', 'எப்படி', 'எவ்வளவு', 'எத்தனை', 'எது', 'எந்த'],
    time_past: ['நேற்று', 'முன்னர்', 'முன்பு', 'சற்று முன்', 'கடந்த', 'முந்தைய'],
    time_present: ['இன்று', 'இப்போது', 'தற்போது', 'இப்போ', 'நடப்பு'],
    time_future: ['நாளை', 'பின்னர்', 'பிறகு', 'அடுத்த', 'வரும்'],
    location_here: ['இங்கே', 'இங்கு', 'இந்த இடத்தில்', 'இங்க'],
    location_there: ['அங்கே', 'அங்கு', 'அந்த இடத்தில்', 'அங்க'],
    location_where: ['எங்கே', 'எங்கு'],
    affirmation: ['ஆம்', 'சரி', 'சரியானது', 'ஒப்புக்கொள்கிறேன்', 'ஆமாம்', 'ஆகா'],
    negation: ['இல்லை', 'வேண்டாம்', 'கூடாது', 'அல்ல', 'இல்ல', 'வேணாம்'],
    conjunction: ['மற்றும்', 'அல்லது', 'ஆனால்', 'ஏனெனில்', 'எனவே', 'பிறகு', 'அப்புறம்'],
    pronouns: ['நான்', 'நீ', 'நீங்கள்', 'அவன்', 'அவள்', 'அவர்கள்', 'நாம்', 'நாங்கள்', 'நமக்கு', 'எனக்கு'],
    verbs_go: ['செல்', 'போ', 'செல்கிறேன்', 'போகிறேன்', 'சென்றேன்', 'போனேன்', 'செல்வேன்', 'போவேன்'],
    verbs_come: ['வா', 'வருகிறேன்', 'வந்தேன்', 'வருவேன்', 'வாருங்கள்'],
    verbs_see: ['பார்', 'பார்க்கிறேன்', 'பார்த்தேன்', 'பார்ப்பேன்', 'பாருங்கள்'],
    verbs_do: ['செய்', 'செய்கிறேன்', 'செய்தேன்', 'செய்வேன்', 'பண்ணு', 'பண்றேன்'],
    verbs_speak: ['பேசு', 'பேசுகிறேன்', 'பேசினேன்', 'பேசுவேன்', 'சொல்', 'சொல்கிறேன்'],
    verbs_listen: ['கேள்', 'கேட்கிறேன்', 'கேட்டேன்', 'கேட்பேன்', 'கேளுங்கள்'],
    verbs_eat: ['சாப்பிடு', 'சாப்பிடுகிறேன்', 'சாப்பிட்டேன்', 'சாப்பிடுவேன்', 'சாப்டு'],
    verbs_give: ['தா', 'தருகிறேன்', 'கொடு', 'கொடுக்கிறேன்', 'கொடுத்தேன்'],
    verbs_take: ['எடு', 'எடுக்கிறேன்', 'எடுத்தேன்', 'வாங்கு', 'வாங்கினேன்']
};

// Context state for current session
let contextState = {
    lastTopic: null,
    recentWords: [],
    recentTamilWords: [],
    questionMode: false,
    affirmationMode: false,
    negationMode: false,
    locationContext: null,
    timeContext: null,
    lastVerb: null,
    lastSubject: null
};

// Analyze context from text
export function analyzeContext(text) {
    if (!text) return { ...contextState };

    const lowerText = text.toLowerCase();

    let newQuestionMode = false;
    let newAffirmationMode = false;
    let newNegationMode = false;
    let newLocationContext = contextState.locationContext;
    let newTimeContext = contextState.timeContext;
    let newLastVerb = contextState.lastVerb;
    let newLastSubject = contextState.lastSubject;

    if (wordCategories.question.some(q => lowerText.includes(q)) ||
        text.includes('?') ||
        /^(என்ன|யார்|எங்கே|எப்போ|ஏன்|எப்படி)/.test(text)) {
        newQuestionMode = true;
    }

    if (wordCategories.affirmation.some(a => lowerText.includes(a))) {
        newAffirmationMode = true;
        newNegationMode = false;
    } else if (wordCategories.negation.some(n => lowerText.includes(n))) {
        newNegationMode = true;
        newAffirmationMode = false;
    }

    if (wordCategories.location_here.some(l => lowerText.includes(l))) {
        newLocationContext = 'here';
    } else if (wordCategories.location_there.some(l => lowerText.includes(l))) {
        newLocationContext = 'there';
    } else if (wordCategories.location_where.some(l => lowerText.includes(l))) {
        newLocationContext = 'where';
    }

    if (wordCategories.time_past.some(t => lowerText.includes(t))) {
        newTimeContext = 'past';
    } else if (wordCategories.time_present.some(t => lowerText.includes(t))) {
        newTimeContext = 'present';
    } else if (wordCategories.time_future.some(t => lowerText.includes(t))) {
        newTimeContext = 'future';
    }

    for (const [category, verbs] of Object.entries(wordCategories)) {
        if (category.startsWith('verbs_')) {
            for (const verb of verbs) {
                if (lowerText.includes(verb.toLowerCase())) {
                    newLastVerb = verb;
                    break;
                }
            }
        }
    }

    for (const pronoun of wordCategories.pronouns) {
        if (lowerText.includes(pronoun.toLowerCase())) {
            newLastSubject = pronoun;
            break;
        }
    }

    const words = text.split(/\s+/);
    contextState.recentWords = [...contextState.recentWords, ...words].slice(-15);

    contextState.questionMode = newQuestionMode;
    contextState.affirmationMode = newAffirmationMode;
    contextState.negationMode = newNegationMode;
    contextState.locationContext = newLocationContext;
    contextState.timeContext = newTimeContext;
    contextState.lastVerb = newLastVerb;
    contextState.lastSubject = newLastSubject;

    return { ...contextState };
}

// Add Tamil word to recent context
export function addToContext(tamilWord) {
    if (!tamilWord) return;
    contextState.recentTamilWords = [...contextState.recentTamilWords, tamilWord].slice(-20);
}

// Get context-aware suggestions for a word
export function getContextAwareSuggestions(tanglishWord, surroundingText = '') {
    const suggestions = getTypingSuggestions(tanglishWord, 10);
    if (!suggestions.length) return suggestions;

    const context = analyzeContext(surroundingText);

    const scored = suggestions.map(suggestion => {
        let score = suggestion.priority * 10;

        const freq = getWordFrequency(suggestion.tamil);
        score += Math.min(freq / 10, 50);

        if (context.timeContext === 'past') {
            if (suggestion.tamil.includes('ேன்') || suggestion.tamil.includes('த்') ||
                suggestion.tamil.includes('து') || wordCategories.verbs_go.some(v => suggestion.tamil.includes(v))) {
                score += 30;
            }
        } else if (context.timeContext === 'future') {
            if (suggestion.tamil.includes('வேன்') || suggestion.tamil.includes('ப்')) {
                score += 30;
            }
        }

        if (context.questionMode && wordCategories.question.some(q => suggestion.tamil.includes(q))) {
            score += 40;
        }

        if (context.locationContext === 'here' && (suggestion.tamil.includes('இங்கே') || suggestion.tamil.includes('இந்த'))) {
            score += 25;
        } else if (context.locationContext === 'there' && (suggestion.tamil.includes('அங்கே') || suggestion.tamil.includes('அந்த'))) {
            score += 25;
        }

        if (context.lastVerb && suggestion.tamil.includes(context.lastVerb)) {
            score += 20;
        }

        return { ...suggestion, contextScore: score };
    });

    scored.sort((a, b) => b.contextScore - a.contextScore);

    return scored.slice(0, 8);
}

// Rank multiple Tamil word candidates by context and frequency
export function rankTamilCandidates(candidates, surroundingText = '') {
    if (!candidates || candidates.length === 0) return candidates;

    const context = analyzeContext(surroundingText);

    const scored = candidates.map(candidate => {
        let score = 0;

        const freq = getWordFrequency(candidate);
        score += Math.min(freq / 10, 50);

        if (context.timeContext === 'past') {
            if (candidate.includes('ேன்') || candidate.includes('த்') || candidate.includes('து')) {
                score += 25;
            }
        } else if (context.timeContext === 'future') {
            if (candidate.includes('வேன்') || candidate.includes('ப்')) {
                score += 25;
            }
        }

        if (context.questionMode && wordCategories.question.some(q => candidate.includes(q))) {
            score += 35;
        }

        if (context.affirmationMode && wordCategories.affirmation.some(a => candidate.includes(a))) {
            score += 30;
        }
        if (context.negationMode && wordCategories.negation.some(n => candidate.includes(n))) {
            score += 30;
        }

        return { word: candidate, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.map(s => s.word);
}

// Enhanced transliteration with context awareness
export async function transliterateWithContext(tanglishWord, surroundingText = '') {
    const lower = tanglishWord.toLowerCase().trim();

    // ── PRIORITY CHECK ──────────────────────────────────────────────────────
    // 1. Learned corrections
    const learned = getLearnedCorrection(lower);
    if (learned) return learned;

    // 2. Hardcoded fallback map
    const directFallback = _fallbackTamilMap.get(lower);
    if (directFallback) return directFallback;

    // 3. Direct exact dictionary
    const directDict = _bypassDictionary.has(lower) ? null : fullWordMapping.get(lower);
    if (directDict) return directDict;

    // 4. Check spelling correction → dictionary path
    const spellingCorrected = _tanglishSpellingMap.get(lower);
    if (spellingCorrected && !_bypassDictionary.has(lower) && !_bypassDictionary.has(spellingCorrected)) {
        const dictResult = fullWordMapping.get(spellingCorrected) || _fallbackTamilMap.get(spellingCorrected);
        if (dictResult) return dictResult;
    }

    // 5. Compound words
    const compoundResult = checkCompoundWord(normalizeInput(lower));
    if (compoundResult) return compoundResult;

    // 6. Verb conjugations
    const verbForms = (!_neverConjugate.has(lower) && !_neverConjugate.has(normalizeInput(lower))) ? conjugateVerb(normalizeInput(lower)) : [];
    if (verbForms && verbForms.length > 0 && verbForms[0]) {
        return verbForms[0];
    }

    const standard = transliterateWord(tanglishWord);
    if (!standard || standard === tanglishWord) return standard;

    const forms = generateWordForms(tanglishWord);
    if (forms.length <= 1) return standard;

    // Try DL reranker first, fall back to rule-based ranking
    try {
        const dlRanked = await rerankWithDL(lower, forms);
        return dlRanked[0] || standard;
    } catch {
        const ranked = rankTamilCandidates(forms, surroundingText);
        return ranked[0] || standard;
    }
}

// Update frequency when user accepts a suggestion
export function recordWordUsage(tamilWord, tanglishWord = '') {
    if (!tamilWord) return;
    updateFrequency(tamilWord, 1);
    addToContext(tamilWord);

    // ── Also boost the trie node frequency so next lookup ranks it higher ──
    if (tanglishWord) {
        const lower = tanglishWord.toLowerCase();
        // Update main trie
        const node = _findTrieNode(suggestionTrie, lower);
        if (node && node.isEnd) {
            node.frequency = (node.frequency || 0) + 5; // boost by 5 per usage
        }
        // Update phonetic trie
        const pKey = phoneticNormalize(lower);
        if (pKey) {
            const pNode = _findTrieNode(phoneticTrie, pKey);
            if (pNode && pNode.isEnd) {
                pNode.frequency = (pNode.frequency || 0) + 5;
            }
        }
    }
}

// Helper: walk the trie to find a specific node (does not create nodes)
function _findTrieNode(trie, word) {
    if (!word || !trie) return null;
    let node = trie.root;
    for (const char of word.toLowerCase()) {
        if (!node.children.has(char)) return null;
        node = node.children.get(char);
    }
    return node;
}

// Reset context (for new session or clear)
export function resetContext() {
    contextState = {
        lastTopic: null,
        recentWords: [],
        recentTamilWords: [],
        questionMode: false,
        affirmationMode: false,
        negationMode: false,
        locationContext: null,
        timeContext: null,
        lastVerb: null,
        lastSubject: null
    };
}

// Get current context state
export function getCurrentContext() {
    return { ...contextState };
}




// ── DL RERANKER ─────────────────────────────────────────────────────────────
async function rerankWithDL(tanglishWord, candidates) {
    if (!candidates || candidates.length < 2) return candidates;
    try {
        const res = await fetch('/api/usil/rerank', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tanglish: tanglishWord, candidates })
        });
        if (!res.ok) return candidates;
        const data = await res.json();
        return data.ranked.map(r => r.tamil);
    } catch {
        return candidates; // fallback to rule-based if DL fails
    }
}

// Load all data on init
buildFullWordMapping();
initFrequencyData();
loadUserLearning();

buildSuggestionTrie();
buildPhoneticIndex();

// Dictionary is loaded from the backend API via loadDictionaryFromBackend()
// which is called by preloadCommonChunks() in TanglishEditor.vue onMounted hook.