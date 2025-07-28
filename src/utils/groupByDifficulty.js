import basicWords from '../data/basicWords.json';

/**
 * Groups unique words into simple (Dolch sight words) and challenging categories
 * @param {Array} uniqueWords - Array of word objects with {word, count} structure
 * @returns {Object} - Object with {simple, challenging} arrays
 */
export function groupWords(uniqueWords) {
  const simple = [];
  const challenging = [];

  uniqueWords.forEach((wordObj) => {
    const cleaned = wordObj.word.toLowerCase();
    if (basicWords.includes(cleaned)) {
      simple.push(wordObj);
    } else {
      challenging.push(wordObj);
    }
  });

  return { simple, challenging };
}

/**
 * Gets statistics about word grouping
 * @param {Object} groups - Object with {simple, challenging} arrays
 * @returns {Object} - Statistics object
 */
export function getGroupingStats(groups) {
  const totalWords = groups.simple.length + groups.challenging.length;
  const simplePercentage = totalWords > 0 ? Math.round((groups.simple.length / totalWords) * 100) : 0;
  const challengingPercentage = totalWords > 0 ? Math.round((groups.challenging.length / totalWords) * 100) : 0;
  
  return {
    total: totalWords,
    simple: groups.simple.length,
    challenging: groups.challenging.length,
    simplePercentage,
    challengingPercentage
  };
} 