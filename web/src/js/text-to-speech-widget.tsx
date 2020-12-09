import { customElement, html, LitElement, internalProperty } from 'lit-element';

import { Service } from 'js/service';
import { MessageEvent } from 'js/domain/chat';

import styles from './text-to-speech-widget.scss?lit';

interface TtsOptions {
  voice?: number,
}

@customElement('text-to-speech-widget')
export class TextToSpeechWidget extends LitElement {
  static styles = styles;

  service = Service.getInstance();

  @internalProperty()
  voices: SpeechSynthesisVoice[] = window.speechSynthesis.getVoices();

  @internalProperty()
  defaultVoiceIdx?: number;

  ttsQueue: [string, TtsOptions][] = [];
  speech?: SpeechSynthesisUtterance;
  speaking: boolean = false;
  voiceSet: boolean = false;

  constructor() {
    super();

    this.speech = new SpeechSynthesisUtterance();
    this.speech.rate = 1;
    this.speech.pitch = 1;
    this.speech.volume = 1;
    this.speech.onend = this.speech.onerror = () => {
      window.speechSynthesis.cancel();
      this.speaking = false;
      this.startTtsQueue();
    }
    this.speech.onpause = () => {
      window.speechSynthesis.cancel();
      this.speaking = false;
      this.startTtsQueue();
    }
  }

  startTtsQueue() {
    if (this.speaking || !this.ttsQueue.length) {
      return;
    }
    this.speaking = true;

    const [ text, options ] = this.ttsQueue.shift();
    this.speech.text = text;
    this.speech.voice = this.voices[options?.voice || this.defaultVoiceIdx];
    console.log('saying', text);
    window.speechSynthesis.speak(this.speech);
  }

  queueTts(text: string[], options: TtsOptions = {}) {
    this.ttsQueue = this.ttsQueue.concat(text.map((value) => {
      return [ value, options ];
    }));
    this.startTtsQueue();
  }

  handleVoicesChanged = () => {
    this.voices = window.speechSynthesis.getVoices();
    if (this.defaultVoiceIdx === undefined && this.voices.length) {
      this.defaultVoiceIdx = 0;
    }
  }

  handleMessage = (msg: MessageEvent) => {
    const { tts, body } = msg;

    if (tts && body) {
      this.queueTts(body.match(/.{1,40}[^ ]*( |$)/g) as string[], {});
    }
  }

  handleVoiceChange = (evt: InputEvent) => {
    const { target : { value = undefined } = {}  } = evt as any;
    if (value) {
      this.defaultVoiceIdx = parseInt(value, 10);
    }
  }

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
    return html(
      <div>
        <div>
          <select
            _eventChange={this.handleVoiceChange}
          >
            {
              this.voices.map((voice, i) => {
                const { name } = voice;
                return html(
                  <option
                    value={i}
                  >{name}{voice.default ? ' (Default)' : ''}</option>
                );
              })
            }
          </select>
        </div>
      </div>
    );
  }
}