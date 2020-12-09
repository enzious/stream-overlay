import { customElement, html, LitElement, internalProperty } from 'lit-element';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import { classMap } from 'lit-html/directives/class-map.js';
import { styleMap } from 'lit-html/directives/style-map.js';

import { Service } from 'js/service';
import { Message } from 'js/domain/chat';

import styles from './chat-widget.scss?lit';

const DEFAULT_COLORS = [
  ["Red", "#FF0000"],
  ["Blue", "#0000FF"],
  ["Green", "#00FF00"],
  ["FireBrick", "#B22222"],
  ["Coral", "#FF7F50"],
  ["YellowGreen", "#9ACD32"],
  ["OrangeRed", "#FF4500"],
  ["SeaGreen", "#2E8B57"],
  ["GoldenRod", "#DAA520"],
  ["Chocolate", "#D2691E"],
  ["CadetBlue", "#5F9EA0"],
  ["DodgerBlue", "#1E90FF"],
  ["HotPink", "#FF69B4"],
  ["BlueViolet", "#8A2BE2"],
  ["SpringGreen", "#00FF7F"]
];

const generateUserColor = (name) => {
  var n = name.charCodeAt(0) + name.charCodeAt(name.length - 1);
  return DEFAULT_COLORS[n % DEFAULT_COLORS.length][1];
};

@customElement('chat-widget')
export class ChatWidget extends LitElement {
  static styles = styles;

  service = Service.getInstance();

  @internalProperty()
  messages: Message[] = [];

  connectedCallback() {
    super.connectedCallback();
    this.service.on('message', (msg) => {
      this.messages = [
        ...(this.messages.length == 120 ? this.messages.splice(1) : this.messages),
        msg,
      ];
    });
    this.service.on('clearChat', () => {
      this.messages = [];
    });
  }

  render() {
    return html(
      <div>
        {
          this.messages.map(({ from, body, displayName, color, tts }) => {
            return html(
              <div className={classMap({
                message: true,
                tts,
              })}>
                <span style={styleMap({ color: color || generateUserColor(displayName) })}>{displayName || from}</span>:
                {unsafeHTML(this.service.translate(body))}
              </div>
            );
          })
        }
      </div>
    );
  }
}