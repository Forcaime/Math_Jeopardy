// ========================================
// GLOBAL STATE
// ========================================
const state = {
    adminPassword: 'pradita178',
    questions: {
        set1: { easy: [], medium: [], hard: [] },
        set2: { easy: [], medium: [], hard: [] },
        set3: { easy: [], medium: [], hard: [] },
        set4: { easy: [], medium: [], hard: [] },
        set5: { easy: [], medium: [], hard: [] },
        set6: { easy: [], medium: [], hard: [] }
    },
    questionPool: {
        easy: [],    // Pool 6 soal mudah
        medium: [],  // Pool 6 soal sedang
        hard: []     // Pool 6 soal sulit
    },
    usedQuestions: {}, // Track soal yang sudah digunakan per peserta
    participants: [],
    currentSet: 1,
    phase: 'setup',
    timeLeft: 30,
    selectedDifficulty: null,
    participantId: null,
    participantName: '',
    answers: {},
    currentQuestion: null,
    isCompetitionActive: false,
    timerInterval: null
};

// ========================================
// UTILITY FUNCTIONS
// ========================================
function shuffleArray(array, seed) {
    const arr = [...array];
    let currentIndex = arr.length;
    const random = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    };
    while (currentIndex !== 0) {
        const randomIndex = Math.floor(random() * currentIndex);
        currentIndex--;
        [arr[currentIndex], arr[randomIndex]] = [arr[randomIndex], arr[currentIndex]];
    }
    return arr;
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ========================================
// VIEW SWITCHING
// ========================================
function showAdminLogin() {
    document.getElementById('adminView').classList.add('hidden');
    document.getElementById('participantView').classList.add('hidden');
    document.getElementById('adminLogin').classList.remove('hidden');
    
    document.getElementById('loginError').classList.add('hidden');
    document.getElementById('adminPassword').value = '';
    setTimeout(() => document.getElementById('adminPassword').focus(), 100);
}

function switchToAdmin() {
    document.getElementById('adminLogin').classList.add('hidden');
    document.getElementById('participantView').classList.add('hidden');
    document.getElementById('adminView').classList.remove('hidden');
}

function switchToParticipant() {
    document.getElementById('adminLogin').classList.add('hidden');
    document.getElementById('adminView').classList.add('hidden');
    document.getElementById('participantView').classList.remove('hidden');
}

// ========================================
// ADMIN AUTHENTICATION
// ========================================
function loginAdmin() {
    const password = document.getElementById('adminPassword').value;
    
    if (password === state.adminPassword) {
        document.getElementById('loginError').classList.add('hidden');
        document.getElementById('adminPassword').value = '';
        switchToAdmin();
    } else {
        document.getElementById('loginError').classList.remove('hidden');
        document.getElementById('adminPassword').value = '';
        document.getElementById('adminPassword').focus();
    }
}

function logoutAdmin() {
    showAdminLogin();
}

// ========================================
// QUESTION MANAGEMENT
// ========================================
function initQuestionInput() {
    const area = document.getElementById('questionInputArea');
    let html = '';
    
    const difficulties = [
        { key: 'easy', label: 'Mudah', color: 'green' },
        { key: 'medium', label: 'Sedang', color: 'yellow' },
        { key: 'hard', label: 'Sulit', color: 'red' }
    ];
    
    difficulties.forEach(diff => {
        html += `
            <div class="mb-6 p-4 bg-gray-50 rounded-lg border-2 border-${diff.color}-200">
                <h3 class="font-semibold mb-3 text-lg text-${diff.color}-700">${diff.label} (<span id="count-${diff.key}">0</span>/6 soal)</h3>
                <div class="grid grid-cols-3 gap-3 mb-3" id="preview-${diff.key}"></div>
                <input type="file" 
                       id="input-${diff.key}" 
                       accept="image/jpeg,image/jpg,image/png"
                       multiple
                       class="hidden"
                       onchange="handleImageUpload(event, '${diff.key}')">
                <button onclick="document.getElementById('input-${diff.key}').click()" 
                        class="w-full py-2 px-4 bg-${diff.color}-500 text-white rounded-lg hover:bg-${diff.key === 'easy' ? 'green' : diff.key === 'medium' ? 'yellow' : 'red'}-600 transition">
                    + Upload Gambar Soal
                </button>
            </div>
        `;
    });
    
    area.innerHTML = html;
}

function handleImageUpload(event, difficulty) {
    const files = event.target.files;
    const currentCount = state.questionPool[difficulty].length;
    
    if (currentCount >= 6) {
        alert('Maksimal 6 soal untuk setiap tingkat kesulitan!');
        event.target.value = '';
        return;
    }
    
    const remaining = 6 - currentCount;
    const filesToProcess = Math.min(files.length, remaining);
    
    for (let i = 0; i < filesToProcess; i++) {
        const file = files[i];
        
        if (!file.type.match('image/(jpeg|jpg|png)')) {
            alert('Format file harus JPG, JPEG, atau PNG!');
            continue;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const imageData = e.target.result;
            state.questionPool[difficulty].push({
                id: Date.now() + Math.random(),
                data: imageData,
                filename: file.name
            });
            updateQuestionPreview(difficulty);
        };
        reader.readAsDataURL(file);
    }
    
    event.target.value = '';
}

function updateQuestionPreview(difficulty) {
    const count = state.questionPool[difficulty].length;
    document.getElementById(`count-${difficulty}`).textContent = count;
    
    const previewArea = document.getElementById(`preview-${difficulty}`);
    previewArea.innerHTML = state.questionPool[difficulty].map((q, index) => `
        <div class="relative">
            <img src="${q.data}" class="w-full h-24 object-cover rounded border-2 border-gray-300">
            <button onclick="removeQuestion('${difficulty}', ${index})" 
                    class="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600">
                ×
            </button>
            <p class="text-xs text-gray-600 mt-1 truncate">${index + 1}. ${q.filename}</p>
        </div>
    `).join('');
}

function removeQuestion(difficulty, index) {
    state.questionPool[difficulty].splice(index, 1);
    updateQuestionPreview(difficulty);
}

// ========================================
// PARTICIPANT MANAGEMENT
// ========================================
function updateParticipantList() {
    const list = document.getElementById('participantList');
    const count = document.getElementById('participantCount');
    
    count.textContent = state.participants.length;
    
    if (state.participants.length === 0) {
        list.innerHTML = '<p class="text-gray-500 text-sm col-span-3">Belum ada peserta terdaftar</p>';
    } else {
        list.innerHTML = state.participants.map(p => 
            `<div class="bg-white p-2 rounded text-sm">${p.name}</div>`
        ).join('');
    }
}

function registerParticipant() {
    const nameInput = document.getElementById('participantName');
    const name = nameInput.value.trim();
    
    if (!name) {
        alert('Masukkan nama peserta!');
        return;
    }
    
    if (state.participants.length >= 15) {
        alert('Maksimal 15 peserta!');
        return;
    }
    
    const id = Date.now() + Math.random();
    state.participantId = id;
    state.participantName = name;
    state.participants.push({ id, name, answers: {} });
    
    nameInput.value = '';
    updateParticipantList();
    
    document.getElementById('registrationForm').classList.add('hidden');
    document.getElementById('waitingScreen').classList.remove('hidden');
    document.getElementById('registeredName').textContent = name;
}

// ========================================
// COMPETITION MANAGEMENT
// ========================================
function startCompetition() {
    if (state.participants.length === 0) {
        alert('Tambahkan peserta terlebih dahulu!');
        return;
    }
    
    // Check if all difficulties have 6 questions
    if (state.questionPool.easy.length < 6) {
        alert('Upload 6 soal Mudah terlebih dahulu!');
        return;
    }
    if (state.questionPool.medium.length < 6) {
        alert('Upload 6 soal Sedang terlebih dahulu!');
        return;
    }
    if (state.questionPool.hard.length < 6) {
        alert('Upload 6 soal Sulit terlebih dahulu!');
        return;
    }
    
    // Initialize used questions tracking for each participant
    state.participants.forEach(p => {
        state.usedQuestions[p.id] = { easy: [], medium: [], hard: [] };
    });
    
    state.isCompetitionActive = true;
    state.phase = 'selection';
    state.currentSet = 1;
    state.timeLeft = 30;
    
    document.getElementById('startBtn').disabled = true;
    document.getElementById('startBtn').textContent = 'Kompetisi Sedang Berjalan';
    document.getElementById('competitionStatus').classList.remove('hidden');
    document.getElementById('currentSetAdmin').textContent = state.currentSet;
    
    if (state.participantId) {
        showCompetitionScreen();
    }
    
    startTimer();
}

function startTimer() {
    if (state.timerInterval) {
        clearInterval(state.timerInterval);
    }
    
    state.timerInterval = setInterval(() => {
        state.timeLeft--;
        updateTimerDisplay();
        
        if (state.timeLeft <= 0) {
            handleTimeUp();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const timerEl = document.getElementById('timer');
    if (timerEl) {
        timerEl.textContent = formatTime(state.timeLeft);
    }
}

function handleTimeUp() {
    if (state.phase === 'selection') {
        if (!state.selectedDifficulty) {
            state.selectedDifficulty = 'easy';
        }
        startWorkingPhase();
    } else if (state.phase === 'working') {
        finishWorkingPhase();
    }
}

// ========================================
// COMPETITION PHASES
// ========================================
function showCompetitionScreen() {
    document.getElementById('waitingScreen').classList.add('hidden');
    document.getElementById('competitionScreen').classList.remove('hidden');
    showSelectionPhase();
}

function showSelectionPhase() {
    state.phase = 'selection';
    state.timeLeft = 30;
    state.selectedDifficulty = null;
    
    document.getElementById('selectionPhase').classList.remove('hidden');
    document.getElementById('workingPhase').classList.add('hidden');
    document.getElementById('currentSetNum').textContent = state.currentSet;
    
    // Show available question counts (6 for all since we always have 6 questions)
    document.getElementById('easyCount').textContent = '6';
    document.getElementById('mediumCount').textContent = '6';
    document.getElementById('hardCount').textContent = '6';
    
    resetDifficultyButtons();
    startTimer();
}

function selectDifficulty(difficulty) {
    state.selectedDifficulty = difficulty;
    updateDifficultyButtons(difficulty);
}

function resetDifficultyButtons() {
    ['btnEasy', 'btnMedium', 'btnHard'].forEach(id => {
        document.getElementById(id).className = 'p-6 rounded-lg border-4 border-gray-200 hover:border-gray-300 transition-all';
    });
}

function updateDifficultyButtons(selected) {
    const buttons = { easy: 'btnEasy', medium: 'btnMedium', hard: 'btnHard' };
    
    Object.entries(buttons).forEach(([diff, id]) => {
        const btn = document.getElementById(id);
        if (diff === selected) {
            btn.className = 'p-6 rounded-lg border-4 border-green-500 bg-green-50 scale-105 transition-all';
        } else {
            btn.className = 'p-6 rounded-lg border-4 border-gray-200 hover:border-gray-300 transition-all';
        }
    });
}

function startWorkingPhase() {
    const difficulty = state.selectedDifficulty;
    const questionPool = state.questionPool[difficulty];
    const usedQuestions = state.usedQuestions[state.participantId][difficulty];
    
    // Get available questions (not used by this participant yet)
    const availableQuestions = questionPool.filter(q => !usedQuestions.includes(q.id));
    
    if (availableQuestions.length === 0) {
        alert('Tidak ada soal tersedia lagi untuk kesulitan ini!');
        // Auto select another difficulty
        if (state.questionPool.easy.length > 0 && state.usedQuestions[state.participantId].easy.length < 6) {
            state.selectedDifficulty = 'easy';
        } else if (state.questionPool.medium.length > 0 && state.usedQuestions[state.participantId].medium.length < 6) {
            state.selectedDifficulty = 'medium';
        } else if (state.questionPool.hard.length > 0 && state.usedQuestions[state.participantId].hard.length < 6) {
            state.selectedDifficulty = 'hard';
        } else {
            finishWorkingPhase();
            return;
        }
        return startWorkingPhase();
    }
    
    // Randomize and select one question
    const shuffled = shuffleArray(availableQuestions, state.participantId + state.currentSet);
    const selectedQuestion = shuffled[0];
    
    // Mark this question as used
    state.usedQuestions[state.participantId][difficulty].push(selectedQuestion.id);
    state.currentQuestion = selectedQuestion;
    state.phase = 'working';
    state.timeLeft = 600;
    
    document.getElementById('selectionPhase').classList.add('hidden');
    document.getElementById('workingPhase').classList.remove('hidden');
    
    const diffLabels = { easy: 'Mudah', medium: 'Sedang', hard: 'Sulit' };
    document.getElementById('selectedDifficultyLabel').textContent = diffLabels[state.selectedDifficulty];
    
    // Display image question
    const questionText = document.getElementById('questionText');
    questionText.innerHTML = `<img src="${selectedQuestion.data}" class="max-w-full h-auto rounded-lg border-2 border-gray-300">`;
    
    const savedAnswer = state.answers[`set${state.currentSet}`] || '';
    document.getElementById('answerInput').value = savedAnswer;
    
    startTimer();
}

function finishWorkingPhase() {
    const answer = document.getElementById('answerInput').value;
    state.answers[`set${state.currentSet}`] = answer;
    
    const participantIndex = state.participants.findIndex(p => p.id === state.participantId);
    if (participantIndex !== -1) {
        state.participants[participantIndex].answers[`set${state.currentSet}`] = {
            difficulty: state.selectedDifficulty,
            question: state.currentQuestion,
            answer: answer
        };
    }
    
    if (state.currentSet < 6) {
        state.currentSet++;
        document.getElementById('currentSetAdmin').textContent = state.currentSet;
        showSelectionPhase();
    } else {
        finishCompetition();
    }
}

function finishCompetition() {
    state.phase = 'finished';
    clearInterval(state.timerInterval);
    
    document.getElementById('competitionScreen').classList.add('hidden');
    document.getElementById('finishedScreen').classList.remove('hidden');
}

// ========================================
// KEYBOARD SHORTCUT
// ========================================
function setupKeyboardShortcut() {
    // Option+Shift+G (Mac) or Alt+Shift+G (Windows/Linux)
    document.addEventListener('keydown', (e) => {
        // Check for Option/Alt + Shift + G
        if ((e.altKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'g') {
            e.preventDefault();
            showAdminLogin();
        }
    });
    
    // Enter key on password input
    document.getElementById('adminPassword').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            loginAdmin();
        }
    });
    
    // Enter key on participant name
    document.getElementById('participantName').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            registerParticipant();
        }
    });
}

// ========================================
// INITIALIZATION
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    initQuestionInput();
    switchToParticipant();
    updateParticipantList();
    setupKeyboardShortcut();
    
    const answerInput = document.getElementById('answerInput');
    if (answerInput) {
        answerInput.addEventListener('input', (e) => {
            state.answers[`set${state.currentSet}`] = e.target.value;
        });
    }
});