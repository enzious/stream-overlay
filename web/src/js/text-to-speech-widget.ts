import { html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { Service } from 'js/service';
import { MessageEvent } from 'js/domain/chat';

import styles from './text-to-speech-widget.scss?lit';

interface TtsOptions {
  voice?: number,
}

const LOCALSTORAGE_DEFAULT_VOICE = 'defaultVoice';

@customElement('text-to-speech-widget')
export class TextToSpeechWidget extends LitElement {
  static styles = [styles];

  service = Service.getInstance();

  @property()
  voices: SpeechSynthesisVoice[] = window.speechSynthesis.getVoices();

  @property()
  voiceIdx: number | null;

  ttsQueue: [string, TtsOptions][] = [];
  speaking: boolean = false;
  voiceSet: boolean = false;

  constructor() {
    super();

    try {
      this.voiceIdx = parseInt(window.localStorage.getItem(LOCALSTORAGE_DEFAULT_VOICE));

      console.log('Reselecting voice', this.voiceIdx);
    } catch (_) {
      console.warn('Could not restore previous voice.')
    }
  }

  startTtsQueue = () => {
    if (this.speaking || !this.ttsQueue.length) {
      return;
    }

    this.speaking = true;
    console.log('Speaking...');

    const speech = new SpeechSynthesisUtterance();
    speech.rate = 1;
    speech.pitch = 1;
    speech.volume = 1;

    speech.onend = speech.onerror = () => {
      window.speechSynthesis.cancel();
      this.speaking = false;
      console.log('Done speaking...');
      this.startTtsQueue();
    };

    speech.onpause = () => {
      window.speechSynthesis.cancel();
      this.speaking = false;
      console.log('Done speaking...');
      this.startTtsQueue();
    };

    const [text, options] = this.ttsQueue.shift();
    speech.text = text;
    speech.voice = this.voices[options?.voice || this.voiceIdx];

    console.log('speech', speech);

    let dummySpeech = new SpeechSynthesisUtterance('.');
    dummySpeech.onend = () => {
      console.log('saying', text);

      setTimeout(() => {
        window.speechSynthesis.speak(speech);
      }, 3000);
    };

    window.speechSynthesis.speak(dummySpeech);
  }

  queueTts = (text: string[], options: TtsOptions = {}) => {
    this.ttsQueue = this.ttsQueue.concat(text.map((value) => {
      return [value, options];
    }));

    this.startTtsQueue();
  };

  handleVoicesChanged = () => {
    this.voices = window.speechSynthesis.getVoices();

    if (this.voiceIdx === undefined && this.voices.length) {
      this.voiceIdx = 0;
    }
  };

  handleMessage = (msg: MessageEvent) => {
    const { tts, body } = msg;

    if (tts && body) {
      this.queueTts(body.match(/.{1,40}[^ ]*( |$)/g) as string[], {});
    }
  };

  handleVoiceChange = (evt: InputEvent) => {
    const { target: { value = undefined } = {} } = evt as any;

    if (value) {
      this.voiceIdx = parseInt(value, 10);

      window.localStorage.setItem(LOCALSTORAGE_DEFAULT_VOICE, value);
    }
  };

  connectedCallback() {
    super.connectedCallback();

    this.service.on('message', this.handleMessage);
    window.speechSynthesis.addEventListener('voiceschanged', this.handleVoicesChanged);
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    this.service.off('message', this.handleMessage);
    window.speechSynthesis.removeEventListener('voiceschanged', this.handleVoicesChanged);
  }

  render() {
    const { voiceIdx, handleVoiceChange } = this;

    return html`
      <div>
        <div>
          <select
            @change=${handleVoiceChange}
          >
            ${
              this.voices.map((voice, i) => {
                const { name } = voice;
                return html`
                  <option
                    value=${i}
                    .selected=${i === voiceIdx}
                  >${name}${i === voiceIdx ? ' (Default)' : ''}</option>
                `;
              })
            }
          </select>
        </div>
      </div>
    `;
  }
}
