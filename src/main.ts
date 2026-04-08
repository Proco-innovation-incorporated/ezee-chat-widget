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
        // one of...

        publicToken: undefined,

        // or...

        privateToken: undefined,
        userEmail: undefined,

        // or...

        userToken: undefined,

        botTitle: "EZee Assist Agent",
        apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
        wsBaseUrl: import.meta.env.VITE_WS_BASE_URL,
        logoPathPrefix: "",
        enableAttachments: undefined,
        enableFeedback: undefined,
        useLogoForOpenIcon: false,
        openWhenReady: true,
      },
      ...props,
    };
    if (config.wsBaseUrl === undefined || config.wsBaseUrl === null) {
      config.wsBaseUrl = "";
    }

    const isPrivateChat = (config.privateToken || config.userToken);
    if (!config.publicToken && !isPrivateChat) {
      throw new Error("EZee Assist Agent cannot start. Missing required settings");
    }

    if (isPrivateChat) {
      if (config.enableAttachments === undefined) {
        config.enableAttachments = true;
      }
      if (config.enableFeedback === undefined) {
        config.enableFeedback = true;
      }
    }
  
    store.setState("chatConfig", {
      ...config
    });
  };

  if (isDevMode) {
    if (import.meta.env.VITE_USER_TOKEN) {
      window.ezee.setupChatConfig({
        userToken: import.meta.env.VITE_USER_TOKEN,
        enableAttachments: true,
      });
    }
    else if (import.meta.env.VITE_PRIVATE_TOKEN) {
      window.ezee.setupChatConfig({
        privateToken: import.meta.env.VITE_PRIVATE_TOKEN,
        userEmail: import.meta.env.VITE_PRIVATE_USER_EMAIL || null,
        enableAttachments: true,
      });
    }
    else if (import.meta.env.VITE_PUBLIC_TOKEN) {
      window.ezee.setupChatConfig({
        publicToken: import.meta.env.VITE_PUBLIC_TOKEN,
      });
    }
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
