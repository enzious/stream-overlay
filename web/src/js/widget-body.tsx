import { customElement, html, LitElement } from 'lit-element';

import styles from './widget-body.scss?lit';

@customElement('widget-body')
export class WidgetBody extends LitElement {
  static styles = styles;

  connectedCallback() {
    super.connectedCallback();

    Object.assign(window.document.body.style, {
      margin: 0,
      padding: 0,
      height: '100%',
      background: 'transparent',
      fontFamily: 'arial',
    });

    Object.assign(document.documentElement.style, {
      height: '100%',
    });
  }

  render() {
    return html(
      <slot></slot>
    );
  }
}