export const generateStudyUnknownWordsHTML = () => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Study Unknown Words - VocabKiller</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { 
      font-family: "Adobe Garamond Pro", serif; 
      font-size: 16px; 
    } 
    .word-card { 
      transition: all 0.3s ease; 
    } 
    .word-card:hover { 
      transform: translateY(-2px); 
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); 
    }
  </style>
</head>
<body class="bg-gray-50 min-h-screen">
  <div class="container mx-auto px-4 py-8">
    <div class="max-w-4xl mx-auto">
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold text-black mb-4">Study Unknown Words</h1>
        <p class="text-gray-600 text-lg">Focus on learning the words you marked as unknown</p>
      </div>
      
      <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-2xl font-semibold text-black">Your Unknown Words</h2>
          <div class="flex items-center gap-4">
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" id="showTranslationsToggle" onchange="toggleTranslations()" class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded">
              <span class="text-gray-700">Show translations</span>
            </label>
            <button onclick="window.close()" class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors">Close</button>
          </div>
        </div>
        <div id="wordsContainer" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"></div>
      </div>
    </div>
  </div>

  <script>
    const studyData = JSON.parse(sessionStorage.getItem("studyUnknownWordsData") || "{}");
    const words = studyData.words || [];
    const fontFamily = studyData.fontFamily || "Adobe Garamond Pro, serif";
    const fontSize = studyData.fontSize || 16;
    const targetLanguage = studyData.targetLanguage || "zh";
    
    let showTranslations = false;
    let translationCache = {};
    let isTranslating = false;
    
    document.body.style.fontFamily = fontFamily;
    document.body.style.fontSize = fontSize + "px";
    
    function renderWords() {
      const container = document.getElementById("wordsContainer");
      if (words.length === 0) {
        container.innerHTML = '<div class="col-span-full text-center py-8"><p class="text-gray-500">No unknown words to study.</p></div>';
        return;
      }
      
      let html = "";
      words.forEach((word, index) => {
        html += generateWordCard(word, index);
      });
      container.innerHTML = html;
      
      if (showTranslations) {
        translateAllWords();
      }
    }
    
    function generateWordCard(word, index) {
      const cardId = "word-card-" + index;
      let html = '<div id="' + cardId + '" class="word-card bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-300">';
      html += '<div class="flex justify-between items-start mb-3">';
      html += '<h3 class="text-xl font-semibold text-black cursor-pointer" onclick="speakWord(\'' + word + '\')" title="Click to speak">' + word + '</h3>';
      html += '<button onclick="speakWord(\'' + word + '\')" class="text-gray-500 hover:text-black transition-colors" title="Speak word">';
      html += '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';
      html += '</button>';
      html += '</div>';
      html += '<div id="translation-' + index + '" class="translation-area"></div>';
      html += '</div>';
      return html;
    }
    
    function toggleTranslations() {
      const toggle = document.getElementById("showTranslationsToggle");
      showTranslations = toggle.checked;
      if (showTranslations) {
        translateAllWords();
      } else {
        hideAllTranslations();
      }
    }
    
    function hideAllTranslations() {
      words.forEach((word, index) => {
        const translationArea = document.getElementById("translation-" + index);
        translationArea.innerHTML = "";
      });
    }
    
    async function translateAllWords() {
      if (isTranslating) return;
      isTranslating = true;
      
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const translationKey = word + "_" + targetLanguage;
        
        if (!translationCache[translationKey]) {
          try {
            const translation = await translateWord(word, targetLanguage);
            translationCache[translationKey] = translation;
            updateTranslation(i, translation);
            await new Promise(resolve => setTimeout(resolve, 200));
          } catch (error) {
            console.error("Translation error for word:", word, error);
            translationCache[translationKey] = "[Translation failed]";
            updateTranslation(i, "[Translation failed]");
          }
        } else {
          updateTranslation(i, translationCache[translationKey]);
        }
      }
      
      isTranslating = false;
    }
    
    function updateTranslation(index, translation) {
      const translationArea = document.getElementById("translation-" + index);
      if (translationArea) {
        translationArea.innerHTML = '<div class="text-sm text-gray-600 italic mt-2 p-2 bg-gray-50 rounded">' + translation + '</div>';
      }
    }
    
    async function translateWord(word, targetLang) {
      try {
        const response = await fetch("https://lingva.ml/api/v1/en/" + targetLang + "/" + encodeURIComponent(word));
        if (!response.ok) {
          throw new Error("HTTP error! status: " + response.status);
        }
        const data = await response.json();
        return data.translation || "[Translation unavailable: " + word + "]";
      } catch (error) {
        console.error("Translation error:", error);
        return "[Translation failed: " + word + "]";
      }
    }
    
    function speakWord(word) {
      if ("speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.rate = 0.8;
        utterance.volume = 0.8;
        utterance.lang = "en-US";
        speechSynthesis.speak(utterance);
      }
    }
    
    renderWords();
  </script>
</body>
</html>`;
}; 