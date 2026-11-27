// Voice for the assistant, with the browser's own speech tools: listening (speech to text) and speaking (text to speech).
import type { Lang } from "../i18n/text";

// The browser's speech recognizer; Chrome, Edge and Safari have it (Safari under the webkit name), Firefox does not.
interface Recognizer {
  lang: string;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type RecognizerClass = new () => Recognizer;

const BCP47: Record<Lang, string> = { he: "he-IL", en: "en-US" };

const recognizerClass = (): RecognizerClass | undefined => {
  const speech = window as unknown as { SpeechRecognition?: RecognizerClass; webkitSpeechRecognition?: RecognizerClass };
  return speech.SpeechRecognition ?? speech.webkitSpeechRecognition;
};

export const canListen = () => typeof window !== "undefined" && Boolean(recognizerClass());
export const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window;

// Listens once; shows the words as they come and hands over the final sentence. Returns a function that stops listening.
export function listen(lang: Lang, onWords: (text: string, final: boolean) => void, onEnd: () => void): () => void {
  const Recognition = recognizerClass();
  if (!Recognition) {
    onEnd();
    return () => undefined;
  }
  const recognizer = new Recognition();
  recognizer.lang = BCP47[lang];
  recognizer.interimResults = true;
  recognizer.onresult = (event) => {
    const results = Array.from(event.results);
    const text = results.map((result) => result[0].transcript).join("");
    onWords(text, results.every((result) => result.isFinal));
  };
  recognizer.onend = onEnd;
  recognizer.onerror = onEnd;
  recognizer.start();
  return () => recognizer.stop();
}

// Reads a text aloud in the site's language, cutting off anything still being read.
export function speak(text: string, lang: Lang) {
  if (!canSpeak()) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = BCP47[lang];
  // A voice of the right language, when the device has one.
  const voice = window.speechSynthesis.getVoices().find((item) => item.lang.replace("_", "-").startsWith(BCP47[lang].slice(0, 2)));
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if (canSpeak()) window.speechSynthesis.cancel();
}
