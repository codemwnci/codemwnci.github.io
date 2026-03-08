let words = JSON.parse(localStorage.getItem('spanishWords')) || [];
let currentWordIndex = -1;

// Elements
const questionEl = document.getElementById('question');
const answerInput = document.getElementById('answer-input');
const submitBtn = document.getElementById('submit-answer');
const dontKnowBtn = document.getElementById('dont-know');
const feedbackEl = document.getElementById('feedback');
const newWordInput = document.getElementById('new-word');
const newTransInput = document.getElementById('new-translation');
const addWordBtn = document.getElementById('add-word');
const levelSelect = document.getElementById('level-select');
const loadLevelBtn = document.getElementById('load-level');

// Categorization Logic
function getCategory(word) {
    const percent = word.asked > 0 ? (word.correct / word.asked) * 100 : 0;
    if (word.asked >= 3 && percent > 80) return 'Fully Learned';
    if (percent > 50) return 'Learning';
    return 'Not Learned';
}

function updateStats() {
    const categories = {
        'Fully Learned': { id: 'cat-fully-learned', words: [] },
        'Learning': { id: 'cat-learning', words: [] },
        'Not Learned': { id: 'cat-not-learned', words: [] }
    };

    words.forEach(w => {
        const cat = getCategory(w);
        categories[cat].words.push(w);
    });

    for (let catName in categories) {
        const catData = categories[catName];
        const container = document.getElementById(catData.id);
        container.querySelector('.count').textContent = catData.words.length;
        
        const list = container.querySelector('.word-list');
        let displayWords = [...catData.words];

        if (catName === 'Fully Learned' || catName === 'Learning') {
            // Sort by lastPracticed descending (most recent first)
            displayWords.sort((a, b) => (b.lastPracticed || 0) - (a.lastPracticed || 0));
            // Only show last 5
            displayWords = displayWords.slice(0, 5);
            list.innerHTML = displayWords.map(w => `<li>${w.word} (${w.translation})</li>`).join('');
        } else {
            // Not Learned: Spanish only
            list.innerHTML = displayWords.map(w => `<li>${w.word}</li>`).join('');
        }
    }

    localStorage.setItem('spanishWords', JSON.stringify(words));
}

function nextQuestion() {
    if (words.length === 0) {
        questionEl.textContent = "Add some words or load a level to start!";
        return;
    }

    feedbackEl.className = 'feedback';
    feedbackEl.textContent = '';
    answerInput.value = '';
    
    // Prioritize words not fully learned
    const candidates = words.filter(w => getCategory(w) !== 'Fully Learned');
    const source = candidates.length > 0 ? candidates : words;
    currentWordIndex = words.indexOf(source[Math.floor(Math.random() * source.length)]);
    
    questionEl.textContent = `Translate: ${words[currentWordIndex].word}`;
    answerInput.focus();
}

function handleAnswer() {
    if (currentWordIndex === -1) return;

    const answer = answerInput.value.trim().toLowerCase();
    const translation = words[currentWordIndex].translation.toLowerCase().split(" (")[0].trim(); // handle cases where a parenthisis is a clarifiying statement, but not part of the answer (e.g. esta -> this (f))
    const correctAnswers = translation.split('/').map(t => t.trim());
    
    words[currentWordIndex].asked = (words[currentWordIndex].asked || 0) + 1;
    words[currentWordIndex].lastPracticed = Date.now();
    
    if (correctAnswers.includes(answer)) {
        words[currentWordIndex].correct = (words[currentWordIndex].correct || 0) + 1;
        feedbackEl.textContent = '¡Correcto!';
        feedbackEl.className = 'feedback correct';
    } else {
        feedbackEl.textContent = `Wrong. The correct word was: "${words[currentWordIndex].translation}"`;
        feedbackEl.className = 'feedback incorrect';
    }

    updateStats();
    setTimeout(nextQuestion, 2000);
}

function handleDontKnow() {
    if (currentWordIndex === -1) return;

    words[currentWordIndex].asked = (words[currentWordIndex].asked || 0) + 1;
    words[currentWordIndex].lastPracticed = Date.now();
    
    feedbackEl.textContent = `The correct word was: "${words[currentWordIndex].translation}"`;
    feedbackEl.className = 'feedback incorrect';

    updateStats();
    setTimeout(nextQuestion, 2000);
}

async function loadLevel() {
    const level = levelSelect.value;
    try {
        const module = await import(`./data/${level}.js`);
        const newWords = module.default;
        
        // Merge without duplicates
        newWords.forEach(nw => {
            if (!words.find(w => w.word.toLowerCase() === nw.word.toLowerCase())) {
                words.push({ ...nw, asked: 0, correct: 0 });
            }
        });

        updateStats();
        nextQuestion();
        alert(`Loaded ${newWords.length} words for level ${level.toUpperCase()}`);
    } catch (e) {
        console.error(e);
        alert(`Error loading level ${level}. Make sure the data file exists.`);
    }
}

// Events
submitBtn.addEventListener('click', handleAnswer);
dontKnowBtn.addEventListener('click', handleDontKnow);
answerInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAnswer();
});

addWordBtn.addEventListener('click', () => {
    const word = newWordInput.value.trim();
    const trans = newTransInput.value.trim();
    
    if (word && trans) {
        words.push({ word, translation: trans, asked: 0, correct: 0, level: 'Custom' });
        newWordInput.value = '';
        newTransInput.value = '';
        updateStats();
        if (currentWordIndex === -1) nextQuestion();
    }
});

loadLevelBtn.addEventListener('click', loadLevel);

// Init
updateStats();
if (words.length > 0) nextQuestion();
else questionEl.textContent = "Select a level to begin!";
