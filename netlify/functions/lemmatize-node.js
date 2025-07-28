exports.handler = async function(event, context) {
    // Handle CORS preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            body: ''
        };
    }

    try {
        // Parse request
        if (event.httpMethod === 'POST') {
            let body;
            try {
                body = JSON.parse(event.body);
            } catch (e) {
                return {
                    statusCode: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({ error: 'Invalid JSON' })
                };
            }

            const word = body.word ? body.word.trim() : '';
            
            if (!word) {
                return {
                    statusCode: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({ error: 'Word is required' })
                };
            }

            // Enhanced lemmatization rules
            const result = lemmatizeWord(word);

            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type'
                },
                body: JSON.stringify(result)
            };
        } else {
            return {
                statusCode: 405,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ error: 'Method not allowed. Use POST.' })
            };
        }
    } catch (error) {
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};

function lemmatizeWord(word) {
    const lowerWord = word.toLowerCase();
    
    // Irregular plurals
    const irregularPlurals = {
        'children': 'child',
        'men': 'man',
        'women': 'woman',
        'feet': 'foot',
        'teeth': 'tooth',
        'mice': 'mouse',
        'geese': 'goose',
        'oxen': 'ox',
        'phenomena': 'phenomenon',
        'criteria': 'criterion',
        'data': 'datum',
        'media': 'medium',
        'memoranda': 'memorandum',
        'strata': 'stratum',
        'symposia': 'symposium',
        'theses': 'thesis',
        'indices': 'index',
        'matrices': 'matrix',
        'vertices': 'vertex',
        'appendices': 'appendix',
        'crises': 'crisis',
        'analyses': 'analysis',
        'diagnoses': 'diagnosis',
        'hypotheses': 'hypothesis',
        'parentheses': 'parenthesis',
        'synopses': 'synopsis',
        'theses': 'thesis'
    };
    
    // Irregular verbs
    const irregularVerbs = {
        'am': 'be',
        'is': 'be',
        'are': 'be',
        'was': 'be',
        'were': 'be',
        'been': 'be',
        'being': 'be',
        'went': 'go',
        'gone': 'go',
        'going': 'go',
        'saw': 'see',
        'seen': 'see',
        'seeing': 'see',
        'came': 'come',
        'coming': 'come',
        'did': 'do',
        'done': 'do',
        'doing': 'do',
        'had': 'have',
        'has': 'have',
        'having': 'have',
        'made': 'make',
        'making': 'make',
        'said': 'say',
        'saying': 'say',
        'took': 'take',
        'taken': 'take',
        'taking': 'take',
        'got': 'get',
        'gotten': 'get',
        'getting': 'get',
        'gave': 'give',
        'given': 'give',
        'giving': 'give',
        'wrote': 'write',
        'written': 'write',
        'writing': 'write',
        'ran': 'run',
        'running': 'run',
        'sang': 'sing',
        'sung': 'sing',
        'singing': 'sing',
        'drank': 'drink',
        'drunk': 'drink',
        'drinking': 'drink',
        'swam': 'swim',
        'swum': 'swim',
        'swimming': 'swim',
        'flew': 'fly',
        'flown': 'fly',
        'flying': 'fly',
        'drew': 'draw',
        'drawn': 'draw',
        'drawing': 'draw',
        'grew': 'grow',
        'grown': 'grow',
        'growing': 'grow',
        'knew': 'know',
        'known': 'know',
        'knowing': 'know',
        'threw': 'throw',
        'thrown': 'throw',
        'throwing': 'throw',
        'drove': 'drive',
        'driven': 'drive',
        'began': 'begin',
        'begun': 'begin',
        'beginning': 'begin',
        'became': 'become',
        'becoming': 'become',
        'broke': 'break',
        'broken': 'break',
        'breaking': 'break',
        'brought': 'bring',
        'bringing': 'bring',
        'built': 'build',
        'building': 'build',
        'bought': 'buy',
        'buying': 'buy',
        'caught': 'catch',
        'catching': 'catch',
        'chose': 'choose',
        'chosen': 'choose',
        'choosing': 'choose',
        'came': 'come',
        'coming': 'come',
        'cost': 'cost',
        'cut': 'cut',
        'cutting': 'cut',
        'did': 'do',
        'done': 'do',
        'doing': 'do',
        'drew': 'draw',
        'drawn': 'draw',
        'drawing': 'draw',
        'drank': 'drink',
        'drunk': 'drink',
        'drinking': 'drink',
        'drove': 'drive',
        'driven': 'drive',
        'driving': 'drive',
        'ate': 'eat',
        'eaten': 'eat',
        'eating': 'eat',
        'fell': 'fall',
        'fallen': 'fall',
        'falling': 'fall',
        'felt': 'feel',
        'feeling': 'feel',
        'fought': 'fight',
        'fighting': 'fight',
        'found': 'find',
        'finding': 'find',
        'flew': 'fly',
        'flown': 'fly',
        'flying': 'fly',
        'forgot': 'forget',
        'forgotten': 'forget',
        'forgetting': 'forget',
        'forgave': 'forgive',
        'forgiven': 'forgive',
        'forgiving': 'forgive',
        'froze': 'freeze',
        'frozen': 'freeze',
        'freezing': 'freeze',
        'got': 'get',
        'gotten': 'get',
        'getting': 'get',
        'gave': 'give',
        'given': 'give',
        'giving': 'give',
        'went': 'go',
        'gone': 'go',
        'going': 'go',
        'grew': 'grow',
        'grown': 'grow',
        'growing': 'grow',
        'had': 'have',
        'has': 'have',
        'having': 'have',
        'heard': 'hear',
        'hearing': 'hear',
        'hid': 'hide',
        'hidden': 'hide',
        'hiding': 'hide',
        'hit': 'hit',
        'hitting': 'hit',
        'held': 'hold',
        'holding': 'hold',
        'hurt': 'hurt',
        'hurting': 'hurt',
        'kept': 'keep',
        'keeping': 'keep',
        'knew': 'know',
        'known': 'know',
        'knowing': 'know',
        'laid': 'lay',
        'laying': 'lay',
        'led': 'lead',
        'leading': 'lead',
        'left': 'leave',
        'leaving': 'leave',
        'lent': 'lend',
        'lending': 'lend',
        'let': 'let',
        'letting': 'let',
        'lay': 'lie',
        'lain': 'lie',
        'lying': 'lie',
        'lost': 'lose',
        'losing': 'lose',
        'made': 'make',
        'making': 'make',
        'meant': 'mean',
        'meaning': 'mean',
        'met': 'meet',
        'meeting': 'meet',
        'paid': 'pay',
        'paying': 'pay',
        'put': 'put',
        'putting': 'put',
        'read': 'read',
        'reading': 'read',
        'rode': 'ride',
        'ridden': 'ride',
        'riding': 'ride',
        'rang': 'ring',
        'rung': 'ring',
        'ringing': 'ring',
        'rose': 'rise',
        'risen': 'rise',
        'rising': 'rise',
        'ran': 'run',
        'running': 'run',
        'said': 'say',
        'saying': 'say',
        'saw': 'see',
        'seen': 'see',
        'seeing': 'see',
        'sold': 'sell',
        'selling': 'sell',
        'sent': 'send',
        'sending': 'send',
        'set': 'set',
        'setting': 'set',
        'shook': 'shake',
        'shaken': 'shake',
        'shaking': 'shake',
        'shone': 'shine',
        'shining': 'shine',
        'shot': 'shoot',
        'shooting': 'shoot',
        'showed': 'show',
        'shown': 'show',
        'showing': 'show',
        'shut': 'shut',
        'shutting': 'shut',
        'sang': 'sing',
        'sung': 'sing',
        'singing': 'sing',
        'sat': 'sit',
        'sitting': 'sit',
        'slept': 'sleep',
        'sleeping': 'sleep',
        'spoke': 'speak',
        'spoken': 'speak',
        'speaking': 'speak',
        'spent': 'spend',
        'spending': 'spend',
        'stood': 'stand',
        'standing': 'stand',
        'stole': 'steal',
        'stolen': 'steal',
        'stealing': 'steal',
        'stuck': 'stick',
        'sticking': 'stick',
        'struck': 'strike',
        'stricken': 'strike',
        'striking': 'strike',
        'swore': 'swear',
        'sworn': 'swear',
        'swearing': 'swear',
        'swept': 'sweep',
        'sweeping': 'sweep',
        'swam': 'swim',
        'swum': 'swim',
        'swimming': 'swim',
        'swung': 'swing',
        'swinging': 'swing',
        'took': 'take',
        'taken': 'take',
        'taking': 'take',
        'taught': 'teach',
        'teaching': 'teach',
        'tore': 'tear',
        'torn': 'tear',
        'tearing': 'tear',
        'told': 'tell',
        'telling': 'tell',
        'thought': 'think',
        'thinking': 'think',
        'threw': 'throw',
        'thrown': 'throw',
        'throwing': 'throw',
        'understood': 'understand',
        'understanding': 'understand',
        'woke': 'wake',
        'woken': 'wake',
        'waking': 'wake',
        'wore': 'wear',
        'worn': 'wear',
        'wearing': 'wear',
        'wrote': 'write',
        'written': 'write',
        'writing': 'write',
        'driving': 'drive',
        'rode': 'ride',
        'ridden': 'ride',
        'riding': 'ride',
        'wore': 'wear',
        'worn': 'wear',
        'wearing': 'wear',
        'tore': 'tear',
        'torn': 'tear',
        'tearing': 'tear',
        'bore': 'bear',
        'born': 'bear',
        'bearing': 'bear',
        'forbore': 'forbear',
        'forborne': 'forbear',
        'forbearing': 'forbear',
        'swore': 'swear',
        'sworn': 'swear',
        'swearing': 'swear',
        'wore': 'wear',
        'worn': 'wear',
        'wearing': 'wear',
        'tore': 'tear',
        'torn': 'tear',
        'tearing': 'tear',
        'bore': 'bear',
        'born': 'bear',
        'bearing': 'bear',
        'forbore': 'forbear',
        'forborne': 'forbear',
        'forbearing': 'forbear',
        'swore': 'swear',
        'sworn': 'swear',
        'swearing': 'swear'
    };
    
    // Check irregular forms first
    if (irregularPlurals[lowerWord]) {
        return {
            original: word,
            lemma: irregularPlurals[lowerWord],
            pos: 'NOUN',
            success: true,
            method: 'irregular_plural'
        };
    }
    
    if (irregularVerbs[lowerWord]) {
        return {
            original: word,
            lemma: irregularVerbs[lowerWord],
            pos: 'VERB',
            success: true,
            method: 'irregular_verb'
        };
    }
    
    // Regular plural forms (words ending in 's')
    if (lowerWord.endsWith('s') && lowerWord.length > 3) {
        // Remove 's' for regular plurals
        const withoutS = lowerWord.slice(0, -1);
        return {
            original: word,
            lemma: withoutS,
            pos: 'NOUN',
            success: true,
            method: 'regular_plural'
        };
    }
    
    // Present participle (words ending in 'ing')
    if (lowerWord.endsWith('ing') && lowerWord.length > 5) {
        const withoutIng = lowerWord.slice(0, -3);
        return {
            original: word,
            lemma: withoutIng,
            pos: 'VERB',
            success: true,
            method: 'present_participle'
        };
    }
    
    // Past tense (words ending in 'ed')
    if (lowerWord.endsWith('ed') && lowerWord.length > 4) {
        const withoutEd = lowerWord.slice(0, -2);
        return {
            original: word,
            lemma: withoutEd,
            pos: 'VERB',
            success: true,
            method: 'past_tense'
        };
    }
    
    // Comparative adjectives (ending in 'er')
    if (lowerWord.endsWith('er') && lowerWord.length > 4) {
        const withoutEr = lowerWord.slice(0, -2);
        return {
            original: word,
            lemma: withoutEr,
            pos: 'ADJ',
            success: true,
            method: 'comparative'
        };
    }
    
    // Superlative adjectives (ending in 'est')
    if (lowerWord.endsWith('est') && lowerWord.length > 5) {
        const withoutEst = lowerWord.slice(0, -3);
        return {
            original: word,
            lemma: withoutEst,
            pos: 'ADJ',
            success: true,
            method: 'superlative'
        };
    }
    
    // If no rules match, return the original word
    return {
        original: word,
        lemma: word,
        pos: 'UNKNOWN',
        success: true,
        method: 'no_change'
    };
} 