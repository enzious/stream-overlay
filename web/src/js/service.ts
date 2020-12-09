import { EventEmitter } from 'tsee';

import { Emoticon, MessageEvent } from 'js/domain/chat';

export class Service extends EventEmitter<{
  message: (msg: MessageEvent) => void,
  clearChat: () => void,
}> {
  private static _instance: Service;

  public static getInstance(): Service {
    return this._instance || (this._instance = new this());
  }

  socket: WebSocket;

  emoticons: Emoticon[];
  emoticonsMap: Map<string, Emoticon> = new Map();

  private constructor(){
    super();

    this.getEmoteList();
    this.connectSocket();
  }

  private connectSocket() {
    this.socket = new WebSocket(`${(window as any).appOptions.socketEndpoint}/`);
    this.socket.onmessage = ({ data }) => {
      try {
        const { type, ...json } = JSON.parse(data);

        switch (type) {
          case 'message':
            const { from, body, displayName, color, tts } = json;
            this.emit('message', { from, body, displayName, color, tts });
            break;
          case 'chat.clear':
            this.emit('clearChat');
            break;
          default:
        }
      } catch (err) {}
    };
    this.socket.onclose = () => {
      setTimeout(() => {
        this.connectSocket();
      }, 2000);
    };
  }

  private getEmoteList() {
    fetch(`${(window as any).appOptions.apiEndpoint}/emotes`)
      .then((response) => {
        if (response.status !== 200) {
          return new Error('');
        }
        return response.json();
      })
      .then(({ emoticons }) => {
        this.emoticons = emoticons;
        emoticons.reverse().forEach((emoticon) => {
          this.emoticonsMap.set(emoticon.code, emoticon);
        });
        console.log('emote', emoticons[0]);
      });
  }

  public translate(input: string): string {
    let pieces = input
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .split(" ");

    pieces = pieces.map((piece) => {
      const emote = this.emoticonsMap.get(piece);
      if (!emote) {
        return piece;
      } else {
        return (
          `<img src="https://static-cdn.jtvnw.net/emoticons/v1/${emote.id}/1.0" />`
        );
      }
    }) as string[];

    return pieces.join(" ");
  }
}