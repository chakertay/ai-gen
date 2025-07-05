// Global variables
let currentQuestion = 1;
let isRecording = false;
let speechRecognition = null;
let currentQuestionText = '';
let recognizedText = '';

const avatar = document.getElementById('avatar');

function setAvatarState(state) {
    avatar.classList.remove('talking', 'listening');
    if (state) avatar.classList.add(state);
}

function startVoiceRecognition() {
    if (!isRecording) {
        isRecording = true;
        setAvatarState('listening');
        startRecording();
    }
}

function stopVoiceRecognition() {
    isRecording = false;
    avatar.style.display = 'none';
    setAvatarState('');
    stopRecording();
}

// Initialize assessment
async function initializeAssessment() {
    try {
        await analyzeCV();
    } catch (error) {
        console.error('Error initializing assessment:', error);
        showError('Échec de l\'initialisation de l\'évaluation. Veuillez réessayer.');
    }
}

// Analyze CV and get first question
async function analyzeCV() {
    try {
        const response = await fetch('/api/analyze_cv', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();

        if (data.success) {
            currentQuestionText = data.first_question;
            displayQuestion(data.first_question);
            await generateQuestionAudio(data.first_question);

            document.getElementById('loading-screen').style.display = 'none';
            document.getElementById('assessment-interface').style.display = 'block';
        } else {
            throw new Error(data.error || 'Failed to analyze CV');
        }
    } catch (error) {
        console.error('Error analyzing CV:', error);
        showError('Échec de l\'analyse du CV. Veuillez réessayer.');
    }
}

// Display question
function displayQuestion(question) {
    const questionElement = document.getElementById('current-question-text');
    questionElement.textContent = question;
    currentQuestionText = question;
}

// Generate audio for question
async function generateQuestionAudio(text) {
    try {
        setAvatarState('talking');
        avatar.style.display = 'block';

        const response = await fetch('/api/generate_audio', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: text }),
        });

        const data = await response.json();

        if (data.success) {
            const audioElement = document.getElementById('question-audio');
            audioElement.src = data.audio_url;
            audioElement.load();
            audioElement.play().catch(error => {
                console.error('Error playing audio:', error);
                showError('Unable to play audio. Please check your browser settings.');
            });

            audioElement.onended = () => {
                setAvatarState('listening');
                startVoiceRecognition();
            };
        } else {
            console.error('Failed to generate audio:', data.error);
        }
    } catch (error) {
        console.error('Error generating audio:', error);
    }
}

// Play question audio manually
function playQuestion() {
    const audioElement = document.getElementById('question-audio');
    if (audioElement.src) {
        audioElement.play().catch(error => {
            console.error('Error playing audio:', error);
            showError('Unable to play audio. Please check your browser settings.');
        });
    }
}

// Start recording
async function startRecording() {
    try {
        if (!BrowserSpeechRecognition.isSupported()) {
            showError('Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
            return;
        }

        if (!speechRecognition) {
            speechRecognition = new BrowserSpeechRecognition();
            speechRecognition.initialize();

            speechRecognition.onResult = (result) => {
                const displayText = result.final + (result.interim ? ' ' + result.interim : '');
                document.getElementById('transcribed-text').textContent = displayText;

                if (displayText.trim()) {
                    document.getElementById('answer-section').style.display = 'block';
                }

                if (result.isFinal && result.final.trim()) {
                    recognizedText = result.final;
                    document.getElementById('submit-btn').style.display = 'inline-block';
                }
            };

            speechRecognition.onError = (error) => {
                console.error('Speech recognition error:', error);
                stopVoiceRecognition();
                showError('Erreur de reconnaissance vocale. Veuillez réessayer.');
            };

            speechRecognition.onEnd = () => {
                stopVoiceRecognition();
            };
        }

        speechRecognition.start();
        isRecording = true;

        document.getElementById('record-btn').innerHTML = '<i class="fas fa-stop me-2"></i>Stop Recording';
        document.getElementById('record-btn').classList.remove('btn-danger');
        document.getElementById('record-btn').classList.add('btn-warning');
        document.getElementById('recording-indicator').style.display = 'block';
    } catch (error) {
        console.error('Error starting recording:', error);
        showError('Unable to start speech recognition. Please check your browser permissions.');
    }
}

// Stop recording
function stopRecording() {
    if (speechRecognition && isRecording) {
        speechRecognition.stop();
        isRecording = false;

        document.getElementById('record-btn').innerHTML = '<i class="fas fa-microphone me-2"></i>Record Answer';
        document.getElementById('record-btn').classList.remove('btn-warning');
        document.getElementById('record-btn').classList.add('btn-danger');
        document.getElementById('recording-indicator').style.display = 'none';
    }
}

// Submit answer
async function submitAnswer() {
    try {
        const answer = recognizedText || document.getElementById('transcribed-text').textContent;

        if (!answer.trim()) {
            showError('Please record an answer before submitting.');
            return;
        }

        const response = await fetch('/api/submit_answer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                question: currentQuestionText,
                answer: answer
            }),
        });

        const data = await response.json();

        if (data.success) {
            if (data.completed) {
                showCompletionScreen();
            } else {
                currentQuestion = data.question_number;
                updateProgress();
                displayQuestion(data.next_question);
                await generateQuestionAudio(data.next_question);
                resetForNextQuestion();
            }
        } else {
            throw new Error(data.error || 'Failed to submit answer');
        }
    } catch (error) {
        console.error('Error submitting answer:', error);
        showError('Failed to submit answer. Please try again.');
    }
}

// Update progress
function updateProgress() {
    for (let i = 1; i <= 8; i++) {
        const step = document.getElementById(`step${i}`);
        if (i < currentQuestion) {
            step.classList.add('completed');
            step.classList.remove('active');
        } else if (i === currentQuestion) {
            step.classList.add('active');
            step.classList.remove('completed');
        } else {
            step.classList.remove('active', 'completed');
        }
    }

    document.getElementById('current-question').textContent = currentQuestion;
}

// Reset for next question
function resetForNextQuestion() {
    document.getElementById('answer-section').style.display = 'none';
    document.getElementById('submit-btn').style.display = 'none';
    document.getElementById('transcribed-text').textContent = '';
}

// Completion screen
function showCompletionScreen() {
    document.getElementById('assessment-interface').style.display = 'none';
    document.getElementById('completion-screen').style.display = 'block';

    for (let i = 1; i <= 5; i++) {
        document.getElementById(`step${i}`).classList.add('completed');
        document.getElementById(`step${i}`).classList.remove('active');
    }
}

// Generate report
async function generateReport() {
    try {
        const button = document.getElementById('generate-report-btn');
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Generating...';

        const response = await fetch('/api/generate_report', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();

        if (data.success) {
            window.location.href = '/report';
        } else {
            throw new Error(data.error || 'Failed to generate report');
        }
    } catch (error) {
        console.error('Error generating report:', error);
        showError('Failed to generate report. Please try again.');

        const button = document.getElementById('generate-report-btn');
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-file-pdf me-2"></i>Generate Report';
    }
}

// Error message
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger alert-dismissible fade show';
    errorDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    const container = document.querySelector('.container');
    container.insertBefore(errorDiv, container.firstChild);

    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// Event listeners
document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('play-question-btn').addEventListener('click', playQuestion);
    document.getElementById('record-btn').addEventListener('click', function () {
        if (isRecording) {
            stopVoiceRecognition();
        } else {
            startVoiceRecognition();
        }
    });
    document.getElementById('submit-btn').addEventListener('click', submitAnswer);
    document.getElementById('generate-report-btn').addEventListener('click', generateReport);
});
