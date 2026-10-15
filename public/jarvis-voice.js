// Browser voice is optional. Listening always starts from an explicit user action.
export function createJarvisVoice({
  scope = globalThis,
  onTranscript = () => {},
  onNotice = () => {},
  onListening = () => {},
  onSpeaking = () => {},
  language = "en-US"
} = {}) {
  const Recognition = scope.SpeechRecognition || scope.webkitSpeechRecognition;
  const canListen = Boolean(Recognition) && scope.isSecureContext !== false;
  const canSpeak = Boolean(scope.speechSynthesis && scope.SpeechSynthesisUtterance);
  let recognition = null;
  let utterance = null;

  function stopListening() {
    const active = recognition;
    recognition = null;
    if (active) {
      try { active.abort(); } catch { /* Already stopped by the browser. */ }
    }
    onListening(false);
  }

  function finishListening() {
    if (!recognition) return;
    try {
      recognition.stop();
      onNotice("Finishing voice input… Review the recognized text before sending.");
    } catch { stopListening(); }
  }

  function stopSpeaking() {
    utterance = null;
    if (canSpeak) scope.speechSynthesis.cancel();
    onSpeaking(false);
  }

  function startListening() {
    if (!canListen) {
      onNotice("Voice input isn’t available in this browser. You can still type your message.");
      return false;
    }
    if (recognition) return false;
    stopSpeaking();
    try {
      const active = new Recognition();
      recognition = active;
      let received = false;
      active.lang = language;
      active.continuous = false;
      active.interimResults = false;
      active.maxAlternatives = 1;
      active.onstart = () => {
        if (recognition === active) onNotice("Listening… Speak your message, then review it before sending.");
      };
      active.onresult = event => {
        if (recognition !== active) return;
        const parts = [];
        for (let i = event.resultIndex || 0; i < event.results.length; i++) {
          if (event.results[i].isFinal) parts.push(event.results[i][0].transcript);
        }
        const text = parts.join(" ").trim();
        if (text) {
          received = true;
          onTranscript(text.slice(0, 4000));
          onNotice("Voice input added. Review the text, then choose Send message.");
        }
      };
      active.onerror = event => {
        if (recognition !== active) return;
        recognition = null;
        onListening(false);
        const messages = {
          "not-allowed": "Microphone access was denied. Allow it in your browser settings or type instead.",
          "service-not-allowed": "Speech recognition is blocked by this browser. You can type instead.",
          "audio-capture": "No microphone is available. Check your microphone or type instead.",
          "no-speech": "No speech was detected. Try again or type your message.",
          "network": "The browser’s speech service couldn’t connect. You can type instead."
        };
        onNotice(messages[event.error] || "Voice input stopped. Try again or type your message.");
      };
      active.onend = () => {
        if (recognition !== active) return;
        recognition = null;
        onListening(false);
        if (!received) onNotice("Voice input ended without text. Try again or type your message.");
      };
      onListening(true);
      onNotice("Starting microphone… Allow access if your browser asks.");
      active.start();
      return true;
    } catch {
      stopListening();
      onNotice("Voice input couldn’t start. Try again or type your message.");
      return false;
    }
  }

  function speak(text) {
    if (!canSpeak || typeof text !== "string" || !text.trim()) return false;
    stopListening();
    stopSpeaking();
    try {
      const active = new scope.SpeechSynthesisUtterance(text.slice(0, 16000));
      utterance = active;
      active.lang = language;
      active.onend = () => {
        if (utterance !== active) return;
        utterance = null;
        onSpeaking(false);
      };
      active.onerror = () => {
        if (utterance !== active) return;
        utterance = null;
        onSpeaking(false);
        onNotice("Spoken playback isn’t available. The reply is still shown above.");
      };
      onSpeaking(true);
      scope.speechSynthesis.speak(active);
      return true;
    } catch {
      stopSpeaking();
      onNotice("Spoken playback couldn’t start. The reply is still shown above.");
      return false;
    }
  }

  return { canListen, canSpeak, startListening, finishListening, stopListening, speak, stopSpeaking,
    stop() { stopListening(); stopSpeaking(); } };
}
