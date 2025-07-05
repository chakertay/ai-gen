// Browser-based speech recognition utility
class BrowserSpeechRecognition {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.transcript = '';
        this.interimTranscript = '';
        this.onResult = null;
        this.onError = null;
        this.onEnd = null;
    }

    // Check if browser supports speech recognition
    static isSupported() {
        return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    }

    // Initialize speech recognition
    initialize() {
        if (!BrowserSpeechRecognition.isSupported()) {
            throw new Error('Speech recognition not supported in this browser');
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();

        // Configure recognition settings
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'fr-FR';
        this.recognition.maxAlternatives = 1;

        // Set up event handlers
        this.recognition.onstart = () => {
            this.isListening = true;
            console.log('Speech recognition started');
        };

        this.recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            this.transcript = finalTranscript;
            this.interimTranscript = interimTranscript;

            if (this.onResult) {
                this.onResult({
                    final: finalTranscript,
                    interim: interimTranscript,
                    isFinal: finalTranscript.length > 0
                });
            }
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.isListening = false;
            
            if (this.onError) {
                this.onError(event.error);
            }
        };

        this.recognition.onend = () => {
            this.isListening = false;
            console.log('Speech recognition ended');
            
            if (this.onEnd) {
                this.onEnd(this.transcript);
            }
        };
    }

    // Start listening
    start() {
        if (!this.recognition) {
            this.initialize();
        }

        if (!this.isListening) {
            this.transcript = '';
            this.interimTranscript = '';
            this.recognition.start();
        }
    }

    // Stop listening
    stop() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
    }

    // Abort listening
    abort() {
        if (this.recognition && this.isListening) {
            this.recognition.abort();
            this.isListening = false;
        }
    }

    // Get final transcript
    getFinalTranscript() {
        return this.transcript;
    }

    // Get current transcript (including interim)
    getCurrentTranscript() {
        return this.transcript + this.interimTranscript;
    }

    // Set language
    setLanguage(lang) {
        if (this.recognition) {
            this.recognition.lang = lang;
        }
    }

    // Set continuous mode
    setContinuous(continuous) {
        if (this.recognition) {
            this.recognition.continuous = continuous;
        }
    }

    // Set interim results
    setInterimResults(interim) {
        if (this.recognition) {
            this.recognition.interimResults = interim;
        }
    }
}

// Export for use in other files
window.BrowserSpeechRecognition = BrowserSpeechRecognition;