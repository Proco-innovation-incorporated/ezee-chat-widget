/* eslint-disable import/order */

import styles from "./style.css?inline";

import { createApp } from "vue";
import App from "./App.vue";
import Launcher from "./chat/Launcher.vue";
import store, { loadOrgBranding } from "./chat/store";
import "./chat/socket";

declare const window: any;

(function (){
  const isDevMode: boolean = import.meta.env.MODE === "development";

  window.ezee = window.ezee || {};

  store.setupFirst();
  window.ezee.setupChatConfig = (props: any = {}) => {
    const config = {
      ...{
        publicToken: undefined,
        botTitle: "EZee Assist Public Agent",
        apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
        wsBaseUrl: import.meta.env.VITE_WS_BASE_URL,
        logoPathPrefix: "",
        enableAttachments: false,
        useLogoForOpenIcon: true,
      },
      ...props,
    };
    if (config.wsBaseUrl === undefined || config.wsBaseUrl === null) {
      config.wsBaseUrl = "";
    }

    if (!config.publicToken) {
      throw new Error("Ezee Assist Public Agent requires a Public Token");
    }
  
    store.setState("chatConfig", {
      ...config
    });
  };

  if (isDevMode && import.meta.env.VITE_PUBLIC_TOKEN) {
    window.ezee.setupChatConfig({
      publicToken: import.meta.env.VITE_PUBLIC_TOKEN,
    });
  }

  window.ezee.initChat = async () => {
    await loadOrgBranding();

    const shadowRoot = document.createElement("div");
    shadowRoot.id = "shadow-root"
    shadowRoot.className = "shadow-root"
    shadowRoot.style.position = "absolute";
    shadowRoot.style.zIndex = "999999";
    document.body.append(shadowRoot);
    if (shadowRoot) {
      const shadow = shadowRoot.attachShadow({mode: "open"});
      const style = document.createElement("style");
      const chat = document.createElement("div");
      chat.id = "chat";
      chat.class = "chat-root";
      style.textContent = styles;
      shadow.appendChild(style);
      shadow.appendChild(chat);
      createApp(App)
        .component("BubbleChat", Launcher)
        .mount(chat);
    }
  };
})();
