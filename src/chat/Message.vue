<template>
  <div :id="message.id" class="sc-message">
    <div
      class="sc-message--content"
      :class="{
        sent: message.author === 'me',
        received: message.author !== 'me' && message.type !== 'system',
        system: message.type === 'system',
      }"
    >
      <slot name="user-avatar" :message="message" :user="user">
        <div
          v-if="message.type !== 'system' && authorName"
          :tooltip="authorName"
          :title="authorName"
          class="sc-message--avatar"
          :class="{
            sent: message.author === 'me',
          }"
          :style="{
            backgroundImage: `url('${chatImageUrl}')`,
          }"
        ></div>
      </slot>

      <TextMessage
        v-if="(message.type === 'stream' || message.type === 'text') && !isEmoji"
        :message="message"
        :message-colors="messageColors"
        :message-styling="messageStyling"
        @remove="$emit('remove')"
      >
        <template v-slot:default="scopedProps">
          <slot
            name="text-message-body"
            :message="scopedProps.message"
            :messageColors="scopedProps.messageColors"
            :me="scopedProps.me"
          >
          </slot>
        </template>
        <template v-slot:text-message-toolbox="scopedProps">
          <slot
            name="text-message-toolbox"
            :message="scopedProps.message"
            :me="scopedProps.me"
          >
          </slot>
        </template>
      </TextMessage>

      <EmojiMessage
        v-else-if="isEmoji"
        :data="{ emoji:  message.data.emoji ?? emojiSymbols[message.data.text] }"
      />

      <FileMessage
        v-else-if="message.type === 'file'"
        :data="message.data"
        :message-colors="messageColors"
      />

      <TypingMessage
        v-else-if="message.type === 'typing'"
        :message-colors="messageColors"
      />

      <SystemMessage
        v-else-if="message.type === 'system'"
        :data="message.data"
        :message-colors="messageColors"
      >
        <slot name="system-message-body" :message="message.data"> </slot>
      </SystemMessage>

    </div>
  </div>
</template>

<script>
import TextMessage from "./messages/TextMessage.vue";
import FileMessage from "./messages/FileMessage.vue";
import EmojiMessage from "./messages/EmojiMessage.vue";
import TypingMessage from "./messages/TypingMessage.vue";
import SystemMessage from "./messages/SystemMessage.vue";
import userIcon from "./assets/user-icon.png";

export default {
  components: {
    TextMessage,
    FileMessage,
    EmojiMessage,
    TypingMessage,
    SystemMessage,
  },
  props: {
    message: {
      type: Object,
      required: true,
    },
    colors: {
      type: Object,
      required: true,
    },
    messageStyling: {
      type: Boolean,
      required: true,
    },
    user: {
      type: Object,
      required: true,
    },
  },
  computed: {
    emojiSymbols() {
      return {
        ":-1:": "👎",
        ":+1:": "👍",
      };
    },
    isEmoji() {
      return (
        this.message.type === "emoji" ||
        Object.keys(this.emojiSymbols).includes(this.message?.data?.text)
      );
    },
    authorName() {
      return this.user && this.user.name;
    },
    chatImageUrl() {
      return (this.user && this.user.imageUrl) || userIcon;
    },
    messageColors() {
      return this.message.author === "me"
        ? this.sentColorsStyle
        : this.receivedColorsStyle;
    },
    receivedColorsStyle() {
      return {
        color: this.colors.receivedMessage.text,
        backgroundColor: this.colors.receivedMessage.bg,
      };
    },
    sentColorsStyle() {
      return {
        color: this.colors.sentMessage.text,
        backgroundColor: this.colors.sentMessage.bg,
      };
    },
  },
};
</script>

<style lang="scss"></style>
