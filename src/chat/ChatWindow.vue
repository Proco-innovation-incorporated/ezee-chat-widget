<template>
  <div
    class="sc-chat-window"
    :class="{
      opened: isOpen,
      closed: !isOpen,
      full: showFullSizeChat,
    }">
    <Header
      v-if="showHeader"
      :title="title"
      :colors="colors"
      @close="$emit('close')"
      @userList="handleUserListToggle"
    >
      <template>
        <slot name="header"> </slot>
      </template>
    </Header>
    <UserList
      v-if="showUserList"
      :colors="colors"
      :participants="participants"
    />
    <MessageList
      v-if="!showUserList && isOpen"
      ref="messagesList"
      :messages="messages"
      :participants="participants"
      :show-typing-indicator="showTypingIndicator"
      :colors="colors"
      :always-scroll-to-bottom="alwaysScrollToBottom"
      :message-styling="messageStyling"
      @scrollToTop="$emit('scrollToTop')"
      @remove="$emit('remove', $event)"
    >
      <template v-slot:user-avatar="scopedProps">
        <slot
          name="user-avatar"
          :user="scopedProps.user"
          :message="scopedProps.message"
        >
        </slot>
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
        <slot
          name="text-message-toolbox"
          :message="scopedProps.message"
          :me="scopedProps.me"
        >
        </slot>
      </template>
    </MessageList>
    <UserInput
      v-if="!showUserList"
      :show-emoji="showEmoji"
      :show-feedback="showFeedback"
      :on-submit="onUserInputSubmit"
      :suggestions="getSuggestions()"
      :show-file="showFile"
      :placeholder="placeholder"
      :colors="colors"
      @onType="$emit('onType')"
      @edit="$emit('edit', $event)"
      :legal="legal"
    />
    <div :class="{ 'is-loaded': !isLoaded }"></div>
  </div>
</template>

<script>
import { mapState } from './store/';
import { applyChatTweaks, removeChatTweaks } from "./mobile";

import Header from "./Header.vue";
import MessageList from "./MessageList.vue";
import UserInput from "./UserInput.vue";
import UserList from "./UserList.vue";

export default {
  components: {
    Header,
    MessageList,
    UserInput,
    UserList,
  },
  props: {
    showEmoji: {
      type: Boolean,
      default: false,
    },
    showFeedback: {
      type: Boolean,
      default: false,
    },
    showFile: {
      type: Boolean,
      default: false,
    },
    showHeader: {
      type: Boolean,
      default: true,
    },
    isLoaded: {
      type: Boolean,
      default: true,
    },
    participants: {
      type: Array,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    legal: {
      type: String,
      required: false,
      default: () => "",
    },
    onUserInputSubmit: {
      type: Function,
      required: true,
    },
    messageList: {
      type: Array,
      default: () => [],
    },
    isOpen: {
      type: Boolean,
      default: () => false,
    },
    isOpenFull: {
      type: Boolean,
      default: () => false,
    },
    placeholder: {
      type: String,
      required: true,
    },
    showTypingIndicator: {
      type: Boolean,
      required: true,
    },
    colors: {
      type: Object,
      required: true,
    },
    alwaysScrollToBottom: {
      type: Boolean,
      required: true,
    },
    messageStyling: {
      type: Boolean,
      required: true,
    },
  },
  watch: {
    // Watch the 'message' prop
    isOpen(newVal, oldVal) {
      //this.$refs.messagesList._scrollDown();

      if (newVal === true) {
        applyChatTweaks();
      }
      else {
        removeChatTweaks();
      }
    },
  },
  data() {
    return {
      showUserList: false,
    };
  },
  computed: {
    messages() {
      let messages = this.messageList;
      return messages;
    },
  },
  setup() {
    return {
      ...mapState([
        'showFullSizeChat',
      ])
    }
  },
  methods: {
    handleUserListToggle(showUserList) {
      this.showUserList = showUserList;
    },
    getSuggestions() {
      return this.messages.length > 0
        ? this.messages[this.messages.length - 1].suggestions
        : [];
    },
  },
};
</script>

<style scoped></style>
