// ========================================
// GLOBAL STATE
// ========================================
const state = {
    adminPassword: 'pradita898',
    sessionId: 'olympiad-session-' + Date.now(), // Unique session ID
    questionPool: {
        easy: [],
        medium: [],
        hard: []
    },
    usedQuestions: {},
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
    timerInterval: null,
    isAdmin: false
};

// Firebase references
const dbRef = {
    participants: null,
    competition: null,
    questions: null
};

// ========================================
// FIREBASE INITIALIZATION
// ========================================
function initFirebase() {
    // Create unique session or use existing
    const urlParams = new URLSearchParams(window.location.search);
    const sessionParam = urlParams.get('session');
    
    if (sessionParam) {
        state.sessionId = sessionParam;
    }
    
    // Set up Firebase references
    dbRef.participants = database.ref(`sessions/${state.sessionId}/participants`);
    dbRef.competition = database.ref(`sessions/${state.sessionId}/competition`);
    dbRef.questions = database.ref(`sessions/${state.sessionId}/questions`);
    
    // Listen for changes
    setupFirebaseListeners();
}

function setupFirebaseListeners() {
    // Listen to participants
    dbRef.participants.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            state.participants = Object.keys(data).map(key => ({
                id: key,
                ...data[key]
            }));
            updateParticipantList();
        }
    });
    
    // Listen to competition status
    dbRef.competition.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data && !state.isAdmin) {
            // Update competition state for participants
            if (data.isActive && !state.isCompetitionActive) {
                state.isCompetitionActive = true;
                state.currentSet = data.currentSet || 1;
                state.phase = data.phase || 'selection';
                state.timeLeft = data.timeLeft || 30;
                
                if (state.participantId) {
                    showCompetitionScreen();
                }
            }
            
            if (data.isActive) {
                state.currentSet = data.currentSet || 1;
                state.phase = data.phase || 'selection';
                state.timeLeft = data.timeLeft || 30;
                updateTimerDisplay();
                
                // Sync phase
                if (data.phase === 'selection' && document.getElementById('workingPhase').classList.contains('hidden') === false) {
                    showSelectionPhase();
                }
            }
        }
    });
    
    // Listen to questions
    dbRef.questions.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            state.questionPool = data;
        }
    });
}

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
    state.isAdmin = true;
    document.getElementById('adminLogin').classList.add('hidden');
    document.getElementById('participantView').classList.add('hidden');
    document.getElementById('adminView').classList.remove('hidden');
    
    // Show session link
    const sessionUrl = `${window.location.origin}${window.location.pathname}?session=${state.sessionId}`;
    console.log('Session URL:', sessionUrl);
    alert(`Link untuk peserta:\n${sessionUrl}\n\nBagikan link ini ke semua peserta!`);
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
    loadQuestionsFromFirebase();
}

async function handleImageUpload(event, difficulty) {
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
        
        // Upload to Firebase Storage
        const storageRef = storage.ref(`${state.sessionId}/questions/${difficulty}/${Date.now()}_${file.name}`);
        
        try {
            const snapshot = await storageRef.put(file);
            const downloadURL = await snapshot.ref.getDownloadURL();
            
            const questionData = {
                id: Date.now() + Math.random(),
                url: downloadURL,
                filename: file.name
            };
            
            state.questionPool[difficulty].push(questionData);
            
            // Save to Firebase Database
            await dbRef.questions.child(difficulty).set(state.questionPool[difficulty]);
            
            updateQuestionPreview(difficulty);
        } catch (error) {
            console.error('Upload error:', error);
            alert('Gagal upload gambar: ' + error.message);
        }
    }
    
    event.target.value = '';
}

function loadQuestionsFromFirebase() {
    dbRef.questions.once('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            state.questionPool = data;
            ['easy', 'medium', 'hard'].forEach(diff => {
                updateQuestionPreview(diff);
            });
        }
    });
}

function updateQuestionPreview(difficulty) {
    const count = state.questionPool[difficulty]?.length || 0;
    document.getElementById(`count-${difficulty}`).textContent = count;
    
    const previewArea = document.getElementById(`preview-${difficulty}`);
    if (!previewArea) return;
    
    const questions = state.questionPool[difficulty] || [];
    previewArea.innerHTML = questions.map((q, index) => `
        <div class="relative">
            <img src="${q.url}" class="w-full h-24 object-cover rounded border-2 border-gray-300">
            <button onclick="removeQuestion('${difficulty}', ${index})" 
                    class="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600">
                ×
            </button>
            <p class="text-xs text-gray-600 mt-1 truncate">${index + 1}. ${q.filename}</p>
        </div>
    `).join('');
}

async function removeQuestion(difficulty, index) {
    state.questionPool[difficulty].splice(index, 1);
    await dbRef.questions.child(difficulty).set(state.questionPool[difficulty]);
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

async function registerParticipant() {
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
    
    const id = 'participant_' + Date.now();
    state.participantId = id;
    state.participantName = name;
    
    // Save to Firebase
    await dbRef.participants.child(id).set({
        name: name,
        joinedAt: Date.now(),
        answers: {}
    });
    
    nameInput.value = '';
    
    document.getElementById('registrationForm').classList.add('hidden');
    document.getElementById('waitingScreen').classList.remove('hidden');
    document.getElementById('registeredName').textContent = name;
}

// ========================================
// COMPETITION MANAGEMENT
// ========================================
async function startCompetition() {
    if (state.participants.length === 0) {
        alert('Tambahkan peserta terlebih dahulu!');
        return;
    }
    
    // Check if all difficulties have 6 questions
    if (!state.questionPool.easy || state.questionPool.easy.length < 6) {
        alert('Upload 6 soal Mudah terlebih dahulu!');
        return;
    }
    if (!state.questionPool.medium || state.questionPool.medium.length < 6) {
        alert('Upload 6 soal Sedang terlebih dahulu!');
        return;
    }
    if (!state.questionPool.hard || state.questionPool.hard.length < 6) {
        alert('Upload 6 soal Sulit terlebih dahulu!');
        return;
    }
    
    state.isCompetitionActive = true;
    state.phase = 'selection';
    state.currentSet = 1;
    state.timeLeft = 30;
    
    // Save to Firebase
    await dbRef.competition.set({
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
    
    startTimer();
}

function startTimer() {
    if (state.timerInterval) {
        clearInterval(state.timerInterval);
    }
    
    if (!state.isAdmin) return; // Only admin controls timer
    
    state.timerInterval = setInterval(async () => {
        state.timeLeft--;
        
        // Update Firebase
        await dbRef.competition.update({ timeLeft: state.timeLeft });
        
        if (state.timeLeft <= 0) {
            await handleTimeUp();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const timerEl = document.getElementById('timer');
    if (timerEl) {
        timerEl.textContent = formatTime(state.timeLeft);
    }
}

async function handleTimeUp() {
    if (state.phase === 'selection') {
        state.phase = 'working';
        state.timeLeft = 600;
        
        await dbRef.competition.update({
            phase: 'working',
            timeLeft: 600
        });
        
        // Participants will handle their own working phase
    } else if (state.phase === 'working') {
        if (state.currentSet < 6) {
            state.currentSet++;
            state.phase = 'selection';
            state.timeLeft = 30;
            
            await dbRef.competition.update({
                phase: 'selection',
                currentSet: state.currentSet,
                timeLeft: 30
            });
            
            document.getElementById('currentSetAdmin').textContent = state.currentSet;
        } else {
            await finishCompetition();
        }
    }
}

// ========================================
// COMPETITION PHASES (PARTICIPANT)
// ========================================
function showCompetitionScreen() {
    document.getElementById('waitingScreen').classList.add('hidden');
    document.getElementById('competitionScreen').classList.remove('hidden');
    
    // Listen for phase changes
    dbRef.competition.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data && data.isActive) {
            state.currentSet = data.currentSet;
            state.phase = data.phase;
            state.timeLeft = data.timeLeft;
            
            if (data.phase === 'selection') {
                showSelectionPhase();
            } else if (data.phase === 'working' && state.selectedDifficulty) {
                startWorkingPhase();
            }
        }
    });
}

function showSelectionPhase() {
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

async function startWorkingPhase() {
    if (!state.selectedDifficulty) {
        state.selectedDifficulty = 'easy';
    }
    
    const difficulty = state.selectedDifficulty;
    
    // Get question pool from Firebase
    const snapshot = await dbRef.questions.child(difficulty).once('value');
    const questionPool = snapshot.val() || [];
    
    if (questionPool.length === 0) {
        alert('Tidak ada soal tersedia!');
        return;
    }
    
    // Initialize used questions tracking
    if (!state.usedQuestions[state.participantId]) {
        state.usedQuestions[state.participantId] = { easy: [], medium: [], hard: [] };
    }
    
    const usedQuestions = state.usedQuestions[state.participantId][difficulty];
    const availableQuestions = questionPool.filter(q => !usedQuestions.includes(q.id));
    
    if (availableQuestions.length === 0) {
        alert('Semua soal sudah dikerjakan!');
        return;
    }
    
    // Random select
    const shuffled = shuffleArray(availableQuestions, state.participantId + state.currentSet);
    const selectedQuestion = shuffled[0];
    
    // Mark as used
    state.usedQuestions[state.participantId][difficulty].push(selectedQuestion.id);
    state.currentQuestion = selectedQuestion;
    
    document.getElementById('selectionPhase').classList.add('hidden');
    document.getElementById('workingPhase').classList.remove('hidden');
    
    const diffLabels = { easy: 'Mudah', medium: 'Sedang', hard: 'Sulit' };
    document.getElementById('selectedDifficultyLabel').textContent = diffLabels[difficulty];
    
    const questionText = document.getElementById('questionText');
    questionText.innerHTML = `<img src="${selectedQuestion.url}" class="max-w-full h-auto rounded-lg border-2 border-gray-300" alt="Soal">`;
    
    const savedAnswer = state.answers[`set${state.currentSet}`] || '';
    document.getElementById('answerInput').value = savedAnswer;
}

async function finishCompetition() {
    state.phase = 'finished';
    clearInterval(state.timerInterval);
    
    await dbRef.competition.update({
        isActive: false,
        phase: 'finished'
    });
    
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
    initFirebase();
    initQuestionInput();
    switchToParticipant();
    setupKeyboardShortcut();
    
    const answerInput = document.getElementById('answerInput');
    if (answerInput) {
        answerInput.addEventListener('input', async (e) => {
            state.answers[`set${state.currentSet}`] = e.target.value;
            
            // Save answer to Firebase
            if (state.participantId) {
                await dbRef.participants.child(state.participantId).child('answers').child(`set${state.currentSet}`).set({
                    difficulty: state.selectedDifficulty,
                    answer: e.target.value,
                    timestamp: Date.now()
                });
            }
        });
    }
});
