// ========================================
// GLOBAL STATE
// ========================================
const state = {
    adminPassword: 'pradita789',
    sessionToken: 'OS2J8U', // Fixed token
    questionPool: {
        easy: [
            { id: 'A1', filename: 'A1.png', url: 'questions/A1.png' },
            { id: 'B1', filename: 'B1.png', url: 'questions/B1.png' },
            { id: 'C1', filename: 'C1.png', url: 'questions/C1.png' },
            { id: 'D1', filename: 'D1.png', url: 'questions/D1.png' },
            { id: 'E1', filename: 'E1.png', url: 'questions/E1.png' },
            { id: 'F1', filename: 'F1.png', url: 'questions/F1.png' }
        ],
        medium: [
            { id: 'A2', filename: 'A2.png', url: 'questions/A2.png' },
            { id: 'B2', filename: 'B2.png', url: 'questions/B2.png' },
            { id: 'C2', filename: 'C2.png', url: 'questions/C2.png' },
            { id: 'D2', filename: 'D2.png', url: 'questions/D2.png' },
            { id: 'E2', filename: 'E2.png', url: 'questions/E2.png' },
            { id: 'F2', filename: 'F2.png', url: 'questions/F2.png' }
        ],
        hard: [
            { id: 'A3', filename: 'A3.png', url: 'questions/A3.png' },
            { id: 'B3', filename: 'B3.png', url: 'questions/B3.png' },
            { id: 'C3', filename: 'C3.png', url: 'questions/C3.png' },
            { id: 'D3', filename: 'D3.png', url: 'questions/D3.png' },
            { id: 'E3', filename: 'E3.png', url: 'questions/E3.png' },
            { id: 'F3', filename: 'F3.png', url: 'questions/F3.png' }
        ]
    },
    usedQuestions: {},
    participants: [],
    currentSet: 1,
    phase: 'setup',
    timeLeft: 30,
    selectedDifficulty: null,
    participantId: null,
    participantName: '',
    participantToken: '',
    answers: {},
    currentQuestion: null,
    isCompetitionActive: false,
    timerInterval: null,
    isAdmin: false
};

// ========================================
// UTILITY FUNCTIONS
// ========================================
function generateToken() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let token = '';
    for (let i = 0; i < 6; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
}

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

function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash);
}

// ========================================
// LOCAL STORAGE SYNC
// ========================================
function saveToStorage(key, data) {
    localStorage.setItem(`olympiad_${state.sessionToken}_${key}`, JSON.stringify(data));
    broadcastUpdate(key, data);
}

function loadFromStorage(key) {
    const data = localStorage.getItem(`olympiad_${state.sessionToken}_${key}`);
    return data ? JSON.parse(data) : null;
}

function broadcastUpdate(key, data) {
    localStorage.setItem(`olympiad_${state.sessionToken}_update`, JSON.stringify({
        key: key,
        data: data,
        timestamp: Date.now()
    }));
}

function listenForUpdates() {
    window.addEventListener('storage', (e) => {
        if (e.key === `olympiad_${state.sessionToken}_update` && !state.isAdmin) {
            const update = JSON.parse(e.newValue);
            handleUpdate(update.key, update.data);
        }
    });
    
    // Poll for updates (fallback for same-tab updates)
    setInterval(() => {
        if (!state.isAdmin) {
            checkForUpdates();
        }
    }, 500);
}

function checkForUpdates() {
    const competition = loadFromStorage('competition');
    if (competition && competition.isActive) {
        if (!state.isCompetitionActive) {
            state.isCompetitionActive = true;
            showCompetitionScreen();
        }
        
        state.currentSet = competition.currentSet;
        state.phase = competition.phase;
        state.timeLeft = competition.timeLeft;
        updateTimerDisplay();
        
        if (competition.phase === 'selection' && !document.getElementById('selectionPhase').classList.contains('hidden')) {
            // Already in selection
        } else if (competition.phase === 'selection' && document.getElementById('selectionPhase').classList.contains('hidden')) {
            showSelectionPhase();
        } else if (competition.phase === 'working' && state.selectedDifficulty && document.getElementById('workingPhase').classList.contains('hidden')) {
            startWorkingPhase();
        } else if (competition.phase === 'finished') {
            finishCompetition();
        }
    }
    
    // Update participant list
    const participants = loadFromStorage('participants') || [];
    state.participants = participants;
    updateParticipantList();
}

function handleUpdate(key, data) {
    if (key === 'competition') {
        checkForUpdates();
    } else if (key === 'participants') {
        state.participants = data;
        updateParticipantList();
    }
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
    state.isAdmin = true;
    document.getElementById('adminLogin').classList.add('hidden');
    document.getElementById('participantView').classList.add('hidden');
    document.getElementById('adminView').classList.remove('hidden');
    
    // Load existing data
    const participants = loadFromStorage('participants') || [];
    state.participants = participants;
    updateParticipantList();
}

function switchToParticipant() {
    state.isAdmin = false;
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
    state.isAdmin = false;
    showAdminLogin();
}

// ========================================
// PARTICIPANT MANAGEMENT
// ========================================
function updateParticipantList() {
    const list = document.getElementById('participantList');
    const count = document.getElementById('participantCount');
    
    if (!list || !count) return;
    
    count.textContent = state.participants.length;
    
    if (state.participants.length === 0) {
        list.innerHTML = '<p class="text-gray-500 text-sm col-span-3">Belum ada peserta terdaftar</p>';
    } else {
        list.innerHTML = state.participants.map(p => 
            `<div class="bg-white p-2 rounded text-sm">${p.name}</div>`
        ).join('');
    }
}

function joinCompetition() {
    const tokenInput = document.getElementById('tokenInput');
    const nameInput = document.getElementById('participantName');
    const token = tokenInput.value.trim().toUpperCase();
    const name = nameInput.value.trim();
    
    if (!token) {
        alert('Masukkan token!');
        return;
    }
    
    if (!name) {
        alert('Masukkan nama!');
        return;
    }
    
    if (token !== state.sessionToken) {
        alert('Token salah!');
        return;
    }
    
    const participants = loadFromStorage('participants') || [];
    
    if (participants.length >= 15) {
        alert('Maksimal 15 peserta!');
        return;
    }
    
    const id = 'participant_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    state.participantId = id;
    state.participantName = name;
    state.participantToken = token;
    state.usedQuestions[id] = { easy: [], medium: [], hard: [] };
    
    participants.push({
        id: id,
        name: name,
        joinedAt: Date.now(),
        answers: {}
    });
    
    saveToStorage('participants', participants);
    state.participants = participants;
    
    tokenInput.value = '';
    nameInput.value = '';
    
    document.getElementById('tokenForm').classList.add('hidden');
    document.getElementById('waitingScreen').classList.remove('hidden');
    document.getElementById('registeredName').textContent = name;
    document.getElementById('usedToken').textContent = token;
    
    // Start listening for updates
    listenForUpdates();
    checkForUpdates();
}

// ========================================
// COMPETITION MANAGEMENT
// ========================================
function startCompetition() {
    if (state.participants.length === 0) {
        alert('Tambahkan peserta terlebih dahulu!');
        return;
    }
    
    state.isCompetitionActive = true;
    state.phase = 'selection';
    state.currentSet = 1;
    state.timeLeft = 30;
    
    saveToStorage('competition', {
        isActive: true,
        phase: 'selection',
        currentSet: 1,
        timeLeft: 30,
        startedAt: Date.now()
    });
    
    document.getElementById('startBtn').disabled = true;
    document.getElementById('startBtn').textContent = 'Kompetisi Sedang Berjalan';
    document.getElementById('competitionStatus').classList.remove('hidden');
    document.getElementById('currentSetAdmin').textContent = state.currentSet;
    document.getElementById('currentPhaseAdmin').textContent = state.phase;
    
    startTimer();
}

function startTimer() {
    if (state.timerInterval) {
        clearInterval(state.timerInterval);
    }
    
    if (!state.isAdmin) return;
    
    state.timerInterval = setInterval(() => {
        state.timeLeft--;
        
        saveToStorage('competition', {
            isActive: true,
            phase: state.phase,
            currentSet: state.currentSet,
            timeLeft: state.timeLeft
        });
        
        updateTimerDisplay();
        document.getElementById('timerAdmin').textContent = formatTime(state.timeLeft);
        
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
        state.phase = 'working';
        state.timeLeft = 600;
        
        saveToStorage('competition', {
            isActive: true,
            phase: 'working',
            currentSet: state.currentSet,
            timeLeft: 600
        });
        
        document.getElementById('currentPhaseAdmin').textContent = 'working';
    } else if (state.phase === 'working') {
        if (state.currentSet < 6) {
            state.currentSet++;
            state.phase = 'selection';
            state.timeLeft = 30;
            
            saveToStorage('competition', {
                isActive: true,
                phase: 'selection',
                currentSet: state.currentSet,
                timeLeft: 30
            });
            
            document.getElementById('currentSetAdmin').textContent = state.currentSet;
            document.getElementById('currentPhaseAdmin').textContent = 'selection';
        } else {
            finishCompetitionAdmin();
        }
    }
}

function finishCompetitionAdmin() {
    state.phase = 'finished';
    clearInterval(state.timerInterval);
    
    saveToStorage('competition', {
        isActive: false,
        phase: 'finished',
        currentSet: 6,
        timeLeft: 0
    });
    
    alert('Kompetisi selesai!');
}

// ========================================
// COMPETITION PHASES (PARTICIPANT)
// ========================================
function showCompetitionScreen() {
    document.getElementById('waitingScreen').classList.add('hidden');
    document.getElementById('competitionScreen').classList.remove('hidden');
    showSelectionPhase();
}

function showSelectionPhase() {
    state.selectedDifficulty = null;
    
    document.getElementById('selectionPhase').classList.remove('hidden');
    document.getElementById('workingPhase').classList.add('hidden');
    document.getElementById('currentSetNum').textContent = state.currentSet;
    
    document.getElementById('easyCount').textContent = '6';
    document.getElementById('mediumCount').textContent = '6';
    document.getElementById('hardCount').textContent = '6';
    
    resetDifficultyButtons();
}

function selectDifficulty(difficulty) {
    state.selectedDifficulty = difficulty;
    updateDifficultyButtons(difficulty);
}

function resetDifficultyButtons() {
    ['btnEasy', 'btnMedium', 'btnHard'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.className = 'p-6 rounded-lg border-4 border-gray-200 hover:border-gray-300 transition-all';
        }
    });
}

function updateDifficultyButtons(selected) {
    const buttons = { easy: 'btnEasy', medium: 'btnMedium', hard: 'btnHard' };
    
    Object.entries(buttons).forEach(([diff, id]) => {
        const btn = document.getElementById(id);
        if (btn) {
            if (diff === selected) {
                btn.className = 'p-6 rounded-lg border-4 border-green-500 bg-green-50 scale-105 transition-all';
            } else {
                btn.className = 'p-6 rounded-lg border-4 border-gray-200 hover:border-gray-300 transition-all';
            }
        }
    });
}

function startWorkingPhase() {
    if (!state.selectedDifficulty) {
        state.selectedDifficulty = 'easy';
    }
    
    const difficulty = state.selectedDifficulty;
    const questionPool = state.questionPool[difficulty];
    
    if (!state.usedQuestions[state.participantId]) {
        state.usedQuestions[state.participantId] = { easy: [], medium: [], hard: [] };
    }
    
    const usedQuestions = state.usedQuestions[state.participantId][difficulty];
    const availableQuestions = questionPool.filter(q => !usedQuestions.includes(q.id));
    
    if (availableQuestions.length === 0) {
        alert('Semua soal sudah dikerjakan!');
        return;
    }
    
    const shuffled = shuffleArray(availableQuestions, hashString(state.participantId) + state.currentSet);
    const selectedQuestion = shuffled[0];
    
    state.usedQuestions[state.participantId][difficulty].push(selectedQuestion.id);
    state.currentQuestion = selectedQuestion;
    
    document.getElementById('selectionPhase').classList.add('hidden');
    document.getElementById('workingPhase').classList.remove('hidden');
    
    const diffLabels = { easy: 'Mudah', medium: 'Sedang', hard: 'Sulit' };
    document.getElementById('selectedDifficultyLabel').textContent = diffLabels[difficulty];
    
    const questionText = document.getElementById('questionText');
    questionText.innerHTML = `<img src="${selectedQuestion.url}" class="max-w-full h-auto rounded-lg border-2 border-gray-300" alt="Soal ${selectedQuestion.filename}" onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22300%22%3E%3Crect fill=%22%23ddd%22 width=%22400%22 height=%22300%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 fill=%22%23999%22 font-size=%2220%22%3E${selectedQuestion.filename}%3C/text%3E%3C/svg%3E';">`;
    
    const savedAnswer = state.answers[`set${state.currentSet}`] || '';
    document.getElementById('answerInput').value = savedAnswer;
}

function finishCompetition() {
    state.phase = 'finished';
    
    document.getElementById('competitionScreen').classList.add('hidden');
    document.getElementById('finishedScreen').classList.remove('hidden');
}

// ========================================
// KEYBOARD SHORTCUT
// ========================================
function setupKeyboardShortcut() {
    document.addEventListener('keydown', (e) => {
        if ((e.altKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'g') {
            e.preventDefault();
            showAdminLogin();
        }
    });
    
    document.getElementById('adminPassword').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            loginAdmin();
        }
    });
    
    const tokenInput = document.getElementById('tokenInput');
    if (tokenInput) {
        tokenInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
        });
    }
}

// ========================================
// INITIALIZATION
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    switchToParticipant();
    setupKeyboardShortcut();
    
    const answerInput = document.getElementById('answerInput');
    if (answerInput) {
        answerInput.addEventListener('input', (e) => {
            state.answers[`set${state.currentSet}`] = e.target.value;
            
            // Save answer to participant data
            if (state.participantId) {
                const participants = loadFromStorage('participants') || [];
                const pIndex = participants.findIndex(p => p.id === state.participantId);
                if (pIndex !== -1) {
                    if (!participants[pIndex].answers) {
                        participants[pIndex].answers = {};
                    }
                    participants[pIndex].answers[`set${state.currentSet}`] = {
                        difficulty: state.selectedDifficulty,
                        answer: e.target.value,
                        questionId: state.currentQuestion?.id,
                        timestamp: Date.now()
                    };
                    saveToStorage('participants', participants);
                }
            }
        });
    }
});
