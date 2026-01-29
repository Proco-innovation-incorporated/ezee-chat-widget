<template>
  <div v-show="chatConfig">
    <div
      v-show="showLauncher"
      class="sc-launcher"
      :class="{opened: isOpen}"
      :style="{backgroundColor:colors.launcher.bg}"
      @click.prevent="isOpen ? close() : loadedConnection && openAndFocus()"
    >
      <div v-if="newMessagesCount > 0 && !isOpen" class="sc-new-messsages-count">
        {{ newMessagesCount }}
      </div>
      <template v-if="loadedConnection">
        <img v-if="isOpen" class="sc-closed-icon" :src="icons.close.img" alt="" />
        <img
          v-else
          class="sc-open-icon"
          :src="botIcon"
          alt=""
        />
      </template>

      <div v-show="!loadedConnection" style="position: absolute; top:-100%; left: 0; width: 100%; height: 100%">
        <Loader name="showLauncher"></Loader>
      </div>
    </div>
    <ChatWindow
      :message-list="messageList"
      :is-loaded="loadedConnection"
      :on-user-input-submit="onMessageWasSent"
      :participants="participants"
      :title="chatWindowTitle"
      :legal="legal"
      :is-open="isOpen"
      :show-emoji="showEmoji"
      :show-feedback="showFeedback"
      :show-file="showFile"
      :show-header="showHeader"
      :placeholder="placeholder"
      :show-typing-indicator="showTypingIndicator"
      :colors="colors"
      :always-scroll-to-bottom="alwaysScrollToBottom"
      :message-styling="messageStyling"
      @close="close"
      @scrollToTop="$emit('scrollToTop')"
      @onType="$emit('onType')"
      @edit="$emit('edit', $event)"
      @remove="$emit('remove', $event)"
    >
      <template v-slot:header>
        <slot name="header"> </slot>
      </template>
      <template v-slot:user-avatar="scopedProps">
        <slot name="user-avatar" :user="scopedProps.user" :message="scopedProps.message"> </slot>
      </template>
      <template v-slot:text-message-body="scopedProps">
        <slot
          name="text-message-body"
          :message="scopedProps.message"
          :messageColors="scopedProps.messageColors"
          :me="scopedProps.me"
        >
        </slot>
      </template>
      <template v-slot:system-message-body="scopedProps">
        <slot name="system-message-body" :message="scopedProps.message"> </slot>
      </template>
      <template v-slot:text-message-toolbox="scopedProps">
        <slot name="text-message-toolbox" :message="scopedProps.message" :me="scopedProps.me">
        </slot>
      </template>
    </ChatWindow>
  </div>
</template>

<script>
import store, {mapState} from "./store/"
import {watch} from "vue"
import ChatWindow from "./ChatWindow.vue"

import CloseIcon from "./assets/close-icon.png"
import OpenIcon from "./assets/logo-no-bg.svg"
import { emitter } from "./event/index.js";
import { createSocketConnection } from "./socket/index.js";
import Loader from "./loading-worker/Loader.vue";
import {
  finishSpinnerByName,
  startSpinnerByName
} from "./loading-worker";

export default {
  components: {
    Loader,
    ChatWindow
  },
  props: {
    icons: {
      type: Object,
      default: function () {
        return {
          open: {
            img: OpenIcon,
            name: "default"
          },
          close: {
            img: CloseIcon,
            name: "default"
          }
        }
      }
    },
    showEmoji: {
      type: Boolean,
      default: false
    },
    showFeedback: {
      type: Boolean,
      default: false
    },
    showEdition: {
      type: Boolean,
      default: false
    },
    showDeletion: {
      type: Boolean,
      default: false
    },
    isOpen: {
      type: Boolean,
      required: true
    },
    open: {
      type: Function,
      required: true
    },
    close: {
      type: Function,
      required: true
    },
    showFile: {
      type: Boolean,
      default: false
    },
    showLauncher: {
      type: Boolean,
      default: true
    },
    showCloseButton: {
      type: Boolean,
      default: true
    },
    showHeader: {
      type: Boolean,
      default: true
    },
    participants: {
      type: Array,
      required: true
    },
    title: {
      type: String,
      default: () => ""
    },
    titleImageUrl: {
      type: String,
      default: () => ""
    },
    legal: {
      type: String,
      default: () => "",
    },
    onMessageWasSent: {
      type: Function,
      required: true
    },
    messageList: {
      type: Array,
      default: () => []
    },
    newMessagesCount: {
      type: Number,
      default: () => 0
    },
    placeholder: {
      type: String,
      default: "Write a message..."
    },
    showTypingIndicator: {
      type: Boolean,
      required: true,
    },
    colors: {
      type: Object,
      validator: (c) =>
        "header" in c &&
        "bg" in c.header &&
        "text" in c.header &&
        "launcher" in c &&
        "bg" in c.launcher &&
        "messageList" in c &&
        "bg" in c.messageList &&
        "sentMessage" in c &&
        "bg" in c.sentMessage &&
        "text" in c.sentMessage &&
        "receivedMessage" in c &&
        "bg" in c.receivedMessage &&
        "text" in c.receivedMessage &&
        "userInput" in c &&
        "bg" in c.userInput &&
        "text" in c.userInput,
      default: function () {
        return {
          header: {
            bg: "#4e8cff",
            text: "#ffffff"
          },
          launcher: {
            bg: "#4e8cff"
          },
          messageList: {
            bg: "#ffffff"
          },
          sentMessage: {
            bg: "#4e8cff",
            text: "#ffffff"
          },
          receivedMessage: {
            bg: "#f4f7f9",
            text: "#ffffff"
          },
          userInput: {
            bg: "#f4f7f9",
            text: "#565867"
          }
        }
      }
    },
    alwaysScrollToBottom: {
      type: Boolean,
      default: () => false
    },
    messageStyling: {
      type: Boolean,
      default: () => false
    },
    disableUserListToggle: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    chatWindowTitle() {
      if (this.title !== "") return this.title
      return "";
    },
    botIcon() {
      const defaultIcon = this.icons.open.img;
      if (this.chatConfig.useLogoForOpenIcon !== true) return defaultIcon;

      return (
        this.orgBranding.org_logo ||
        this.orgBranding.bot_icon ||
        defaultIcon
      );
    },
  },
  watch: {
    $props: {
      deep: true,
      immediate: true,
      handler(props) {
        for (const prop in props) {
          store.setState(prop, props[prop]);
        }
      },
    }
  },
  setup() {
    const {
      orgBranding,
      chatConfig,
      loadedConnection,
      error
    } = mapState([
      "orgBranding",
      "chatConfig",
      "loadedConnection",
      "error"
    ]);

    setTimeout(() => {
      startSpinnerByName("showLauncher");
      createSocketConnection();
    }, 0);
    watch(loadedConnection, (value) => {
      if (value) {
        finishSpinnerByName("showLauncher");
      } else {
        startSpinnerByName("showLauncher");
      }
    });

    return {
      orgBranding,
      chatConfig,
      loadedConnection,
      error,
    };
  },
  methods: {
    openAndFocus() {
      this.open();
      emitter.$emit("focusUserInput");
    }
  }
}
</script>

<style scoped>
</style>
