import test from "node:test";
import assert from "node:assert/strict";
import { createJarvisVoice } from "../public/jarvis-voice.js";

function setup() {
  const recognitions = [], utterances = [], transcripts = [], notices = [], listening = [], speaking = [];
  let started = 0, aborted = 0, cancelled = 0;
  class Recognition {
    constructor() { recognitions.push(this); }
    start() { started++; this.onstart?.(); }
    stop() { this.onresult(result("Finished dictation")); this.onend(); }
    abort() { aborted++; }
  }
  class Utterance {
    constructor(text) { this.text = text; }
  }
  const scope = {
    isSecureContext: true, SpeechRecognition: Recognition, SpeechSynthesisUtterance: Utterance,
    speechSynthesis: { speak(value) { utterances.push(value); }, cancel() { cancelled++; } }
  };
  const voice = createJarvisVoice({ scope, onTranscript: text => transcripts.push(text),
    onNotice: text => notices.push(text), onListening: active => listening.push(active),
    onSpeaking: active => speaking.push(active) });
  return { voice, scope, recognitions, utterances, transcripts, notices, listening, speaking,
    stats: () => ({ started, aborted, cancelled }) };
}

function result(text, final = true) {
  const value = [{ transcript: text }];
  value.isFinal = final;
  return { resultIndex: 0, results: [value] };
}

test("Jarvis never starts a microphone or playback on initialization", () => {
  const s = setup();
  assert.deepEqual(s.stats(), { started: 0, aborted: 0, cancelled: 0 });
  assert.equal(s.voice.canListen, true);
  assert.equal(s.voice.canSpeak, true);
});

test("Explicit listening produces only final draft text and does not restart", () => {
  const s = setup();
  assert.equal(s.voice.startListening(), true);
  const r = s.recognitions[0];
  assert.equal(r.continuous, false);
  assert.equal(r.interimResults, false);
  r.onresult(result("unfinished", false));
  assert.equal(s.transcripts.length, 0);
  r.onresult(result("Check Streetwise status"));
  assert.deepEqual(s.transcripts, ["Check Streetwise status"]);
  r.onend();
  assert.equal(s.listening.at(-1), false);
  assert.equal(s.stats().started, 1);
  assert.match(s.notices.at(-1), /Review the text/);
});

test("Stopping or disconnecting ignores late recognition and playback events", () => {
  const s = setup();
  s.voice.startListening();
  const r = s.recognitions[0];
  s.voice.speak("First reply");
  const u = s.utterances[0];
  s.voice.stop();
  r.onresult(result("Do not submit this"));
  r.onerror({ error: "network" });
  r.onend();
  u.onend();
  assert.deepEqual(s.transcripts, []);
  assert.equal(s.listening.at(-1), false);
  assert.equal(s.speaking.at(-1), false);
  assert.equal(s.stats().aborted, 1);
});

test("User finish preserves the final recognized draft rather than aborting it", () => {
  const s = setup();
  s.voice.startListening();
  s.voice.finishListening();
  assert.deepEqual(s.transcripts, ["Finished dictation"]);
  assert.equal(s.stats().aborted, 0);
  assert.equal(s.listening.at(-1), false);
});

test("Microphone denial resets state and gives an actionable fallback", () => {
  const s = setup();
  s.voice.startListening();
  s.recognitions[0].onerror({ error: "not-allowed" });
  assert.match(s.notices.at(-1), /denied/);
  assert.equal(s.listening.at(-1), false);
  assert.equal(s.voice.startListening(), true);
});

test("Unsupported or insecure browsers do not start speech recognition", () => {
  for (const scope of [{}, { ...setup().scope, isSecureContext: false }]) {
    const notices = [];
    const voice = createJarvisVoice({ scope, onNotice: value => notices.push(value) });
    assert.equal(voice.canListen, false);
    assert.equal(voice.startListening(), false);
    assert.match(notices.at(-1), /still type/);
  }
});

test("Speech playback is explicit and its stop control cancels it", () => {
  const s = setup();
  assert.equal(s.voice.speak("Streetwise is ready"), true);
  assert.equal(s.utterances[0].text, "Streetwise is ready");
  assert.equal(s.speaking.at(-1), true);
  s.voice.stopSpeaking();
  assert.equal(s.speaking.at(-1), false);
  assert.equal(s.stats().cancelled, 2);
});
