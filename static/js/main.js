// Global variables
let currentQuestion = 1;
let isRecording = false;
let speechRecognition = null;
let currentQuestionText = '';
let recognizedText = '';

// Initialize assessment
async function initializeAssessment() {
    try {
        // Start CV analysis
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
            
            // Hide loading screen and show assessment interface
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
        } else {
            console.error('Failed to generate audio:', data.error);
        }
    } catch (error) {
        console.error('Error generating audio:', error);
    }
}

// Play question audio
function playQuestion() {
    const audioElement = document.getElementById('question-audio');
    if (audioElement.src) {
        audioElement.play().catch(error => {
            console.error('Error playing audio:', error);
            showError('Unable to play audio. Please check your browser settings.');
        });
    }
}

// Start recording using browser speech recognition
async function startRecording() {
    try {
        // Check if browser supports speech recognition
        if (!BrowserSpeechRecognition.isSupported()) {
            showError('Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
            return;
        }

        // Initialize speech recognition if not already done
        if (!speechRecognition) {
            speechRecognition = new BrowserSpeechRecognition();
            speechRecognition.initialize();
            
            // Set up event handlers
            speechRecognition.onResult = (result) => {
                // Update the display with interim results
                const displayText = result.final + (result.interim ? ' ' + result.interim : '');
                document.getElementById('transcribed-text').textContent = displayText;
                
                // Show answer section if we have some text
                if (displayText.trim()) {
                    document.getElementById('answer-section').style.display = 'block';
                }
                
                // If we have final results, enable submit button
                if (result.isFinal && result.final.trim()) {
                    recognizedText = result.final;
                    document.getElementById('submit-btn').style.display = 'inline-block';
                }
            };
            
            speechRecognition.onError = (error) => {
                console.error('Speech recognition error:', error);
                stopRecording();
                showError('Erreur de reconnaissance vocale. Veuillez réessayer.');
            };
            
            speechRecognition.onEnd = () => {
                stopRecording();
            };
        }
        
        // Start listening
        speechRecognition.start();
        isRecording = true;
        recognizedText = '';
        
        // Update UI
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
        
        // Update UI
        document.getElementById('record-btn').innerHTML = '<i class="fas fa-microphone me-2"></i>Record Answer';
        document.getElementById('record-btn').classList.remove('btn-warning');
        document.getElementById('record-btn').classList.add('btn-danger');
        document.getElementById('recording-indicator').style.display = 'none';
    }
}

// This function is no longer needed as we use browser speech recognition
// Keeping for reference but will be removed in cleanup

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
                // Assessment completed
                showCompletionScreen();
            } else {
                // Next question
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

// Update progress indicator
function updateProgress() {
    // Update progress steps
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
    
    // Update current question text
    document.getElementById('current-question').textContent = currentQuestion;
}

// Reset UI for next question
function resetForNextQuestion() {
    document.getElementById('answer-section').style.display = 'none';
    document.getElementById('submit-btn').style.display = 'none';
    document.getElementById('transcribed-text').textContent = '';
}

// Show completion screen
function showCompletionScreen() {
    document.getElementById('assessment-interface').style.display = 'none';
    document.getElementById('completion-screen').style.display = 'block';
    
    // Update all progress steps to completed
    for (let i = 1; i <= 5; i++) {
        document.getElementById(`step${i}`).classList.add('completed');
        document.getElementById(`step${i}`).classList.remove('active');
    }
}

// Generate final report
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
            // Redirect to report page
            window.location.href = '/report';
        } else {
            throw new Error(data.error || 'Failed to generate report');
        }
    } catch (error) {
        console.error('Error generating report:', error);
        showError('Failed to generate report. Please try again.');
        
        // Re-enable button
        const button = document.getElementById('generate-report-btn');
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-file-pdf me-2"></i>Generate Report';
    }
}

// Show error message
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger alert-dismissible fade show';
    errorDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    const container = document.querySelector('.container');
    container.insertBefore(errorDiv, container.firstChild);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Play question button
    document.getElementById('play-question-btn').addEventListener('click', playQuestion);
    
    // Record button
    document.getElementById('record-btn').addEventListener('click', function() {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    });
    
    // Submit button
    document.getElementById('submit-btn').addEventListener('click', submitAnswer);
    
    // Generate report button
    document.getElementById('generate-report-btn').addEventListener('click', generateReport);
});
