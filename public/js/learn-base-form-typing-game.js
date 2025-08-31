// Adapter for Learn Base Form typing game
// Prepares a base-form word list in the same storage the original game reads

(function initBaseFormAdapter() {
  try {
    // Pull session data prepared by the previous page
    const raw = sessionStorage.getItem('learnUnknownWords2Data');
    let data = {};
    try { 
      data = raw ? JSON.parse(raw) : {}; 
    } catch (parseError) { 
      console.warn('Failed to parse session data:', parseError);
      data = {}; 
    }

    const unknownWords = Array.isArray(data.unknownWords) ? data.unknownWords : [];
    
    // Safety check: if no unknown words, redirect to original typing game
    if (unknownWords.length === 0) {
      console.warn('No unknown words found, redirecting to original typing game');
      window.location.href = '/learn-original-words-typing-game.html';
      return;
    }

    // Get base forms from localStorage
    let baseForms = {};
    try {
      const baseFormsRaw = localStorage.getItem('vocabKillerBaseForms');
      baseForms = baseFormsRaw ? JSON.parse(baseFormsRaw) : {};
    } catch (baseFormsError) {
      console.warn('Failed to parse base forms:', baseFormsError);
      baseForms = {};
    }

    // Build base-form list: use base form if present, else original
    const mapped = unknownWords.map(w => {
      if (!w || typeof w !== 'string') return '';
      
      const key = w.toLowerCase().trim();
      const b = baseForms[key] || baseForms[w] || baseForms[w.trim()];
      return (b && String(b).trim()) ? String(b).trim() : String(w).trim();
    }).filter(Boolean);

    // Deduplicate while preserving order
    const seen = new Set();
    const deduped = [];
    for (const w of mapped) {
      const k = w.toLowerCase();
      if (!seen.has(k)) { 
        seen.add(k); 
        deduped.push(w); 
      }
    }

    // Safety check: if the final list is empty, redirect to original typing game
    if (deduped.length === 0) {
      console.warn('No valid words found after processing, redirecting to original typing game');
      window.location.href = '/learn-original-words-typing-game.html';
      return;
    }

    // Update session data with the processed word list
    const prepared = { ...data, unknownWords: deduped };
    sessionStorage.setItem('learnUnknownWords2Data', JSON.stringify(prepared));
    
    console.log(`Base form adapter: Processed ${unknownWords.length} words into ${deduped.length} unique words`);
    
  } catch (e) {
    // Non-fatal; redirect to original typing game
    console.error('Base form adapter failed:', e);
    window.location.href = '/learn-original-words-typing-game.html';
  }
})();


