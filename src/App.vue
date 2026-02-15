<template>
  <BubbleChat
    :always-scroll-to-bottom="alwaysScrollToBottom"
    :close="closeChat"
    :colors="colors"
    :is-open="isChatOpen"
    :message-list="messageList"
    :message-styling="messageStyling"
    :new-messages-count="newMessagesCount"
    :on-message-was-sent="onMessageWasSent"
    :open="openChat"
    :show-close-button="true"
    :show-launcher="true"
    :show-emoji="false"
    :show-feedback="showFeedback"
    :show-file="showFile"
    :show-typing-indicator="showTypingIndicator"
    :show-edition="true"
    :show-deletion="true"
    :title="botTitle"
    :title-image-url="titleImageUrl"
    :legal="legal"
    :disable-user-list-toggle="true"
    @onType="handleOnType"
    @edit="editMessage"
    @remove="removeMessage"
  >
    <template v-slot:text-message-toolbox="scopedProps">
      <button
        v-if="!scopedProps.me && scopedProps.message.type === 'text'"
        @click.prevent="like(scopedProps.message.id)"
      >
        👍
      </button>
    </template>
    <template v-slot:text-message-body="scopedProps">
      <p
        class="sc-message--text-content"
        v-html="scopedProps.message.data.text"
      />
      <p
        v-if="scopedProps.message.data.meta"
        class="sc-message--meta"
        :style="{ color: scopedProps.messageColors.color }"
      >
        {{ scopedProps.message.data.meta }}
      </p>
      <p
        v-if="scopedProps.message.isEdited || scopedProps.message.liked"
        class="sc-message--edited"
      >
        <template v-if="scopedProps.message.isEdited">✎</template>
        <template v-if="scopedProps.message.liked">👍</template>
      </p>
    </template>
    <template v-slot:system-message-body="{ message }">
      [System]: {{ message.text }}
    </template>
  </BubbleChat>
</template>

<script>
import { mdToHtml, processCitations } from "./chat/utils";
import { parseBlocks, parseIncompleteMarkdown } from 'streamdown-vue';

import { invertColor }  from "./colors";
import { emitter } from "./chat/event/index.js";
import store, {
  getPrivateUploadUrl,
  isPrivateChat,
  mapState,
  sendSocketMessage,
} from "./chat/store/index.js";

function getMediaMessage(author, id, file, name) {
  return {
    type: "file",
    author: author,
    id: id + Math.random(),
    data: {
      file: {
        url: file,
        //name: name,
      },
    },
  };
}

/*
function tryToGetMediaFromMessage(message) {
  const imageRegex = /(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif))/gi;
  const fileRegex = /(https?:\/\/[^\s]+\.(?:pdf|docx|doc|xls|xlsx))/gi;

  const imageLinks = message.data.text.match(imageRegex);
  const fileLinks = message.data.text.match(fileRegex);

  const listOfArray = [...(imageLinks || []), ...(fileLinks || [])];

  return listOfArray.map((item) => {
    return getMediaMessage(message.author, message.message, item);
  });
}
*/

export default {
  name: "App",
  data() {
    const { chatConfig, orgBranding } = mapState(["chatConfig", "orgBranding"]);
    let logoPathPrefix = chatConfig.value?.logoPathPrefix;
    if (typeof logoPathPrefix !== "string") {
      logoPathPrefix = ""
    }

    const brandColor = orgBranding.value?.highlight_color || '#4e8cff';
    const textColor = invertColor(brandColor, true);
    document.documentElement.style.setProperty('--ezee-public-chat--brand-color', brandColor);
    document.documentElement.style.setProperty('--ezee-public-chat--brand-text-color', textColor);

    return {
      botTitle: (
        orgBranding.value?.bot_name ||
        chatConfig.value?.botTitle ||
        "Ezee Assist Agent"
      ),
      titleImageUrl: (
        orgBranding.value?.org_logo ||
        (logoPathPrefix + "/bot-logo.png")
      ),
      legal: orgBranding.value?.legal || "",
      messageList: [],
      wholeMessageMap: new Map(),
      newMessagesCount: 0,
      isChatOpen: false,
      showTypingIndicator: true,
      colors: {
        errorInfo: {
          bg: '#ffffff',
          text: '#D32F2F',
        },
        header: {
          bg: brandColor,
          text: textColor,
          bgError: '#D32F2F'
        },
        launcher: {
          bg: brandColor,
          bgError: '#D32F2F'
        },
        messageList: {
          bg: '#ffffff'
        },
        sentMessage: {
          bg: brandColor,
          text: textColor,
        },
        receivedMessage: {
          bg: '#eaeaea',
          text: '#222222'
        },
        userInput: {
          bg: '#fff',
          text: '#212121'
        },
        userList: {
          bg: '#fff',
          text: '#212121'
        }
      },
      alwaysScrollToBottom: true,
      messageStyling: true,
      userIsTyping: false,
      showFile: chatConfig.value?.enableAttachments || false,
      showFeedback: chatConfig.value?.enableFeedback || false,
      types: {
        user: "me",
        bot: "bot",
        prompt: "prompt",
        message: "message",
      },
      streamBuffers: {},
    };
  },
  computed: {
    linkColor() {
      return this.chosenColor === "dark"
        ? this.colors.sentMessage.text
        : this.colors.launcher.bg;
    },
    backgroundColor() {
      return this.chosenColor === "dark" ? this.colors.messageList.bg : "#fff";
    },
    ...mapState(["error"]),
  },
  watch: {
    error(value) {
      if (!value) {
        this.messageList = [];
        this.wholeMessageMap.clear();
      }
    },
  },
  created() {
  },
  mounted() {
    emitter.$on("onopen", (event) => {
      //console.log('socket opened event');
    });

    emitter.$on("onclose", (event) => {
      //console.log('socket closed event');
    });

    emitter.$on("onmessage", (event) => {
      if (Array.isArray(event)) {
        const messages = event.flat(2);
        messages.forEach((item) => {
          this.handleItemSocketAnswer(item);
        });

        if (
          messages.length == 1 &&
          this.types[messages[0].msg_type] &&
          //messages[0].msg_type !== "me" &&
          !this.isChatOpen
        ) {
          this.newMessagesCount = this.newMessagesCount + 1;
        }
      } else {
        this.handleItemSocketAnswer(event);
      }
    });
    this.messageList.forEach((x) => (x.liked = false));
  },
  methods: {
    handleItemSocketAnswer(event) {
      const extras = event.extras || {};

      if (event.msg_type === "system") {
        switch (event.response) {
          case "ready-for-messages":
            this.showTypingIndicator = false;
            break;
          case "message-received":
          default:
            this.showTypingIndicator = true;
            break;
        }
        return;
      }

      const processMessage = (!event.msg_type || this.types[event.msg_type]);
      if (!processMessage) return;

      let media_urls = [];
      if (isPrivateChat()) {
        // TODO BBORIE better presentation of media
        media_urls = event.media_urls?.map(
          (i) => getMediaMessage(`bot`, event.id, i.url, i.media_name)
        ) || [];
      }

      let response = event.response;
      const isStreamMessage = extras.message?.streaming === true;

      let citations = (event.citations || []).reduce(
        (o, cur) => ({...o, [cur.anchor]: cur}), {}
      );
      let message = Object.assign(
        {},
        {
          type: "text",
          data: {
            text: (
              isStreamMessage
                ? response
                : (
                  event.msg_type !== "me"
                    ? processCitations(mdToHtml(response), citations)
                    : mdToHtml(response)
                )
            ),
            attachments: event?.attachments || [],
            citations: citations,
          },
          author: this.types[event.msg_type] || "bot",
        },
        {
          id: event.id,
          groupId: extras.message?.group_id,
        }
      );

      if (isStreamMessage) {
        message.type = "stream";
        const isStreaming = message.data.more = extras.message.more;
        const groupId = extras.message.group_id;
        let rawBuffer = this.streamBuffers?.[groupId] || "";

        // use the last text message with same groupId
        const idx = this.messageList.findLastIndex(
          (m) => m.groupId === groupId
        );
        //console.log("Group ID", groupId, idx);
        const oldMessage = idx !== -1 ? this.messageList[idx] : undefined;

        rawBuffer += response;
        const repaired = parseIncompleteMarkdown(rawBuffer);
        const blocks = parseBlocks(repaired);
        //console.log(blocks);
        let cleaned = blocks.join('');
        //console.log("cleaned", cleaned);

        if (cleaned.lastIndexOf("_") === cleaned.length - 1) {
          cleaned = cleaned.slice(0, cleaned.length - 1);
        }

        // last chunk, end the stream
        if (!isStreaming) {
          if (groupId in this.streamBuffers) {
            delete this.streamBuffers[groupId];
          }
        }
        else {
          this.streamBuffers[groupId] = rawBuffer;
        }

        if (oldMessage) {
          citations = message.data.citations = {
            ...oldMessage.data.citations,
            ...message.data.citations,
          };
        }

        message.data.text = processCitations(mdToHtml(cleaned), citations);
        //console.log(message.data.text);

        if (oldMessage) {
          message.data.attachments = [
            ...oldMessage.data.attachments,
            ...message.data.attachments,
          ];
          this.messageList.splice(idx, 1, message);
        }
        else {
          this.messageList.push(message);
        }
      }
      else {
        if (!this.wholeMessageMap.has(message.id)) {
          this.messageList.push(message);
          this.wholeMessageMap.set(message.id, message);
        }
      }

      this.messageList.push(...media_urls);
      this.messageList = [...this.messageList];

      if (Object.keys(this.streamBuffers).length < 2) {
        this.showTypingIndicator = false;
      }
    },

    async uploadFileByS3PresignedURL(file, presigned_url) {
      const formData = new FormData();

      // Append fields from the response
      Object.entries(presigned_url.fields).forEach(([key, value]) => {
        formData.append(key, value);
      });

      // Append the file to the form data
      formData.append("file", file, file.name);

      try {
        const httpResponse = await fetch(presigned_url.url, {
          method: "POST",
          body: formData,
        });
        return httpResponse.status === 204;
      } catch (error) {
        return false;
      }
    },

    async onMessageWasSent(message) {
      const messageText =
        message.type === "emoji" ? message.data.emoji : message.data.text;

      const { chatConfig } = mapState(["chatConfig"]);

      const attachments = [];
      
      // upload media
      if (isPrivateChat() && message.files?.length) {
        const presignedFilesData = await getPrivateUploadUrl(
          message.files.map(({ name, type }) => {
            return {
              content_type: type,
              name: name,
            };
          })
        );
        
        if (presignedFilesData?.attachments?.length) {
          presignedFilesData.attachments.forEach((attachment, index) => {
            const uploaded = this.uploadFileByS3PresignedURL(
              message.files[index],
              attachment.presigned_url
            );

            if (uploaded) {
              attachments.push({
                file_name: attachment.file_name,
                s3_key: attachment.s3_key,
                bucket: attachment.bucket,
              });
            }
          });
        }
      }

      message.data.attachments = attachments.map(({ file_name }) => {
        return {
          filename: file_name,
          url: "",
        };
      });

      sendSocketMessage(messageText, attachments);
      this.showTypingIndicator = true;
      this.messageList = [
        ...this.messageList,
        Object.assign({}, message, { id: Math.random() }),
      ];

      store.setState("isMessageSending", false);
    },
    openChat() {
      this.isChatOpen = true;
      setTimeout(() => {
        this.$nextTick(() => {
          this.newMessagesCount = 0;
        });
      }, 0);
    },
    closeChat() {
      this.isChatOpen = false;
    },
    /*
    setColor(color) {
      this.colors = this.availableColors[color];
      this.chosenColor = color;
    },
    */
    showStylingInfo() {
      this.$modal.show("dialog", {
        title: "Info",
        text: "You can use *word* to <strong>boldify</strong>, /word/ to <em>emphasize</em>, _word_ to <u>underline</u>, `code` to <code>write = code;</code>, ~this~ to <del>delete</del> and ^sup^ or ¡sub¡ to write <sup>sup</sup> and <sub>sub</sub>",
      });
    },
    messageStylingToggled(e) {
      this.messageStyling = e.target.checked;
    },
    handleOnType() {
      emitter.$emit("onType");
      this.userIsTyping = true;
    },
    editMessage(message) {
      const m = this.messageList.find((m) => m.id === message.id);
      m.isEdited = true;
      m.data.text = message.data.text;
    },
    removeMessage(message) {
      if (confirm("Delete?")) {
        const m = this.messageList.find((m) => m.id === message.id);
        m.type = "system";
        m.data.text = "This message has been removed";
      }
    },
    like(id) {
      const m = this.messageList.findIndex((m) => m.id === id);
      var msg = this.messageList[m];
      msg.liked = !msg.liked;
      this.$set(this.messageList, m, msg);
    },
  },
};
</script>

<style scoped>
@import "normalize.css";

.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}

a {
  font-weight: 500;
  color: #393db0;
  text-decoration: inherit;
}
a:hover {
  color: #2d308c;
}

body {
  margin: 0;
  display: flex;
  place-items: center;
  min-width: 320px;
  min-height: 100vh;
}

h1 {
  font-size: 3.2em;
  line-height: 1.1;
}

button {
  border-radius: 8px;
  border: 1px solid transparent;
  padding: 0.6em 1.2em;
  font-size: 1em;
  font-weight: 500;
  font-family: inherit;
  background-color: #1a1a1a;
  cursor: pointer;
  transition: border-color 0.25s;
}
button:hover {
  border-color: #646cff;
}
button:focus,
button:focus-visible {
  outline: 4px auto -webkit-focus-ring-color;
}

.card {
  padding: 2em;
}

#app {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}

@media (prefers-color-scheme: light) {
  a:hover {
    color: #0e142cff;
  }
  button {
    background-color: #f9f9f9;
  }
}

</style>

<style>
.ezee-public-chat-tooltip {
  --ezee-tooltip-zindex: 1000000;
  --ezee-tooltip-max-width: 350px;
  --ezee-tooltip-padding-x: 0.5rem;
  --ezee-tooltip-padding-y: 0.25rem;
  --ezee-tooltip-margin: ;
  --ezee-tooltip-font-size: 0.875rem;
  --ezee-tooltip-color: #fff;
  --ezee-tooltip-bg: rgb(0, 0, 0);
  --ezee-tooltip-border-radius: 5px;
  --ezee-tooltip-opacity: 0.9;
  --ezee-tooltip-arrow-width: 0.8rem;
  --ezee-tooltip-arrow-height: 0.4rem;
  z-index: var(--ezee-tooltip-zindex);
  display: block;
  margin: var(--ezee-tooltip-margin);
  font-family: var(--ezee-font-sans-serif);
  font-style: normal;
  font-weight: 400;
  line-height: 1.5;
  text-align: left;
  text-align: start;
  text-decoration: none;
  text-shadow: none;
  text-transform: none;
  letter-spacing: normal;
  word-break: normal;
  white-space: normal;
  word-spacing: normal;
  line-break: auto;
  font-size: var(--ezee-tooltip-font-size);
  word-wrap: break-word;
  opacity: 0;
}
.ezee-public-chat-tooltip.show {
  opacity: var(--ezee-tooltip-opacity);
}
.ezee-public-chat-tooltip .tooltip-arrow {
  display: block;
  width: var(--ezee-tooltip-arrow-width);
  height: var(--ezee-tooltip-arrow-height);
}
.ezee-public-chat-tooltip .tooltip-arrow::before {
  position: absolute;
  content: "";
  border-color: transparent;
  border-style: solid;
}

.ezee-public-chat-tooltip[data-popper-placement^=top] .tooltip-arrow {
  bottom: calc(-1 * var(--ezee-tooltip-arrow-height));
}
.ezee-public-chat-tooltip[data-popper-placement^=top] .tooltip-arrow::before {
  top: -1px;
  border-width: var(--ezee-tooltip-arrow-height) calc(var(--ezee-tooltip-arrow-width) * 0.5) 0;
  border-top-color: var(--ezee-tooltip-bg);
}

/* rtl:begin:ignore */
.ezee-public-chat-tooltip[data-popper-placement^=right] .tooltip-arrow {
  left: calc(-1 * var(--ezee-tooltip-arrow-height));
  width: var(--ezee-tooltip-arrow-height);
  height: var(--ezee-tooltip-arrow-width);
}
.ezee-public-chat-tooltip[data-popper-placement^=right] .tooltip-arrow::before {
  right: -1px;
  border-width: calc(var(--ezee-tooltip-arrow-width) * 0.5) var(--ezee-tooltip-arrow-height) calc(var(--ezee-tooltip-arrow-width) * 0.5) 0;
  border-right-color: var(--ezee-tooltip-bg);
}

/* rtl:end:ignore */
.ezee-public-chat-tooltip[data-popper-placement^=bottom] .tooltip-arrow {
  top: calc(-1 * var(--ezee-tooltip-arrow-height));
}
.ezee-public-chat-tooltip[data-popper-placement^=bottom] .tooltip-arrow::before {
  bottom: -1px;
  border-width: 0 calc(var(--ezee-tooltip-arrow-width) * 0.5) var(--ezee-tooltip-arrow-height);
  border-bottom-color: var(--ezee-tooltip-bg);
}

/* rtl:begin:ignore */
.ezee-public-chat-tooltip[data-popper-placement^=left] .tooltip-arrow {
  right: calc(-1 * var(--ezee-tooltip-arrow-height));
  width: var(--ezee-tooltip-arrow-height);
  height: var(--ezee-tooltip-arrow-width);
}
.ezee-public-chat-tooltip[data-popper-placement^=left] .tooltip-arrow::before {
  left: -1px;
  border-width: calc(var(--ezee-tooltip-arrow-width) * 0.5) 0 calc(var(--ezee-tooltip-arrow-width) * 0.5) var(--ezee-tooltip-arrow-height);
  border-left-color: var(--ezee-tooltip-bg);
}

/* rtl:end:ignore */
.ezee-public-chat-tooltip .tooltip-inner {
  max-width: var(--ezee-tooltip-max-width);
  padding: var(--ezee-tooltip-padding-y) var(--ezee-tooltip-padding-x);
  color: var(--ezee-tooltip-color);
  text-align: center;
  background-color: var(--ezee-tooltip-bg);
  border-radius: var(--ezee-tooltip-border-radius);
}
</style>
