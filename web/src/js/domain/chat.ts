export interface Emoticon {
  code: string;
  emoticon_set: number;
  id: number;
}

export interface Message {
  from: string;
  body: string;
  displayName: string;
  color: string;
  tts: boolean;
}

export interface MessageEvent {
  from: string;
  body: string;
  displayName: string;
  color: string;
  tts: boolean;
}
