<template>
  <div>
    <Suggestions
      :suggestions="suggestions"
      :colors="colors"
      @sendSuggestion="_submitSuggestion"
    />
    <div
      class="sc-legal"
      v-if="legal && legal.length > 0"
    >
      {{ legal }}
    </div>
    <form
      class="sc-user-input"
      :class="{ active: inputActive }"
      v-if="!error && !connecting"
      :style="{ background: colors.userInput.bg }"
    >
      <div
        ref="userInput"
        role="button"
        tabIndex="0"
        contentEditable="true"
        :placeholder="placeholder"
        class="sc-user-input--text"
        :style="{ color: colors.userInput.text }"
        @focus="setInputActive(true)"
        @blur="setInputActive(false)"
        @keydown="handleKey"
        @focusUserInput="focusUserInput()"
      ></div>
      <div class="sc-user-input--buttons">
        <div
          v-if="showEmoji && !isEditing && !isMessageSending"
          class="sc-user-input--button"
        >
          <EmojiIcon
            :on-emoji-picked="_handleEmojiPicked"
            :color="colors.userInput.text"
          />
        </div>
        <!--        v-if="showEmoji && !isEditing"-->
        <div
          v-if="showFeedback && !isMessageSending"
          @click="_handleEmojiPicked('👎')"
          class="sc-user-input--button"
          style="cursor: pointer; margin-right: 10px"
        >
          👎
        </div>
        <div
          v-if="showFeedback && !isMessageSending"
          @click="_handleEmojiPicked('👍')"
          class="sc-user-input--button"
          style="cursor: pointer; margin-right: 10px"
        >
          👍
        </div>
        <!--        v-if="showEmoji && !isEditing"-->

        <div
          v-if="showFile && !isEditing && !isMessageSending"
          class="sc-user-input--button"
        >
          <FileIcons
            :on-change="_handleFileSubmit"
            :color="colors.userInput.text"
          />
        </div>
        <div v-if="isEditing" class="sc-user-input--button">
          <UserInputButton
            :color="colors.userInput.text"
            tooltip="Cancel"
            @click.native.prevent="_editFinish"
          >
            <IconCross />
          </UserInputButton>
        </div>
        <div class="sc-user-input--button">
          <UserInputButton
            v-if="isEditing"
            :color="colors.userInput.text"
            tooltip="Edit"
            @click.native.prevent="_editText"
          >
            <IconOk />
          </UserInputButton>

          <div v-else style="position: relative">
            <UserInputButton
              v-if="!isMessageSending"
              :color="colors.userInput.text"
              tooltip="Send"
              @click.native.prevent="_submitText"
            >
              <IconSend />
            </UserInputButton>
            <Loader
              class="sc-user-input--loader"
              :isLoading="isMessageSending"
            ></Loader>
          </div>
        </div>
      </div>
    </form>

    <div
      v-else-if="!error && connecting"
      class="sc-user-input sc-user-error"
      :style="{
        background: colors.errorInfo.bg,
        color: colors.errorInfo.text,
      }"
    >
      <div>
        Connecting to the server
      </div>
    </div>

    <div
      v-else
      class="sc-user-input sc-user-error"
      :style="{
        background: colors.errorInfo.bg,
        color: colors.errorInfo.text,
      }"
    >
      <div>
        Connection to the server lost.
        <a class="reconnect-button" @click.native.prevent="reconnect">
          Click here to reconnect
        </a>
      </div>
    </div>

  </div>
  <div v-if="files.length" class="files-container">
    <!-- <span class="icon-file-message"
      ><img :src="icons.file.img" :alt="icons.file.name" height="15"
    /></span> -->
    <!-- {{ file.name }} -->

    <div v-for="file in files" class="file">
      <IconDeleteAttachment
        v-if="!isMessageSending"
        class="delete-file-button"
        @click.prevent.stop="removeFileAttachment(file)"
      />

      <img
        v-if="fileImageTypes.includes(file.type)"
        class="file-image"
        :src="file.url"
        alt=""
      />
      <div v-else class="file-default">
        <img
          src="https://cdn-icons-png.flaticon.com/128/2258/2258853.png"
          alt=""
        />
        <div>
          <div class="file-name" style="font-size: 12px">
            {{ file.name }}
          </div>
          <div class="file-extention" style="font-size: 12px">
            {{ file.name.substring(file.name.lastIndexOf(".") + 1) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import EmojiIcon from "./icons/EmojiIcon.vue";
import Loader from "./loading-worker/Loader.vue";
import FileIcons from "./icons/FileIcons.vue";
import UserInputButton from "./UserInputButton.vue";
import Suggestions from "./Suggestions.vue";
import FileIcon from "./assets/file.svg";
import CloseIconSvg from "./assets/close.svg";
import store, { mapState } from "./store/";
import IconCross from "./components/icons/IconCross.vue";
import IconOk from "./components/icons/IconOk.vue";
import IconDeleteAttachment from "./components/icons/IconDeleteAttachment.vue";
import IconSend from "./components/icons/IconSend.vue";
import { emitter } from "./event/index.js";
import { ErrorTypes } from "../error.js";
import { reconnect as reconnectNow } from "./socket/index.js";

export default {
  components: {
    EmojiIcon,
    FileIcons,
    UserInputButton,
    Suggestions,
    IconDeleteAttachment,
    IconCross,
    IconOk,
    IconSend,
    Loader,
  },
  setup() {
    function reconnect() {
      reconnectNow(true);
    }

    return {
      ...mapState(["error", "connecting"]),
      reconnect,
    };
  },
  props: {
    icons: {
      type: Object,
      default: function () {
        return {
          file: {
            img: FileIcon,
            name: "default",
          },
          closeSvg: {
            img: CloseIconSvg,
            name: "default",
          },
        };
      },
    },
    showEmoji: {
      type: Boolean,
      default: () => false,
    },
    showFeedback: {
      type: Boolean,
      default: () => false,
    },

    suggestions: {
      type: Array,
      default: () => [],
    },
    legal: {
      type: String,
      required: false,
      default: () => "",
    },
    showFile: {
      type: Boolean,
      default: () => false,
    },
    onSubmit: {
      type: Function,
      required: true,
    },
    placeholder: {
      type: String,
      default: "Write something...",
    },
    colors: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      files: [],
      file: null,
      inputActive: false,
      fileImageTypes: ["image/png", "image/jpeg", "image/jpg"],
      presignedFilesData: [],
      isMessageSending: false,
    };
  },
  computed: {
    ErrorTypes() {
      return ErrorTypes;
    },
    editMessageId() {
      return this.isEditing && store.state.editMessage.id;
    },
    isEditing() {
      return store.state.editMessage && store.state.editMessage.id;
    },
  },
  watch: {
    editMessageId(m) {
      if (
        store.state.editMessage != null &&
        store.state.editMessage != undefined
      ) {
        this.$refs.userInput.focus();
        this.$refs.userInput.textContent = store.state.editMessage.data.text;
      } else {
        this.$refs.userInput.textContent = "";
      }
    },
  },
  mounted() {
    emitter.$on("focusUserInput", () => {
      if (this.$refs.userInput) {
        this.focusUserInput();
      }
    });
  },
  methods: {
    cancelFile() {
      this.file = null;
    },
    setInputActive(onoff) {
      this.inputActive = onoff;
    },
    handleKey(event) {
      if (event.keyCode === 13 && !event.shiftKey) {
        if (!this.isEditing) {
          this._submitText(event);
        } else {
          this._editText(event);
        }
        this._editFinish();
        event.preventDefault();
      } else if (event.keyCode === 27) {
        this._editFinish();
        event.preventDefault();
      }

      this.$emit("onType");
    },
    focusUserInput() {
      this.$nextTick(() => {
        this.$refs.userInput.focus();
      });
    },
    _submitSuggestion(suggestion) {
      this.onSubmit({ author: "me", type: "text", data: { text: suggestion } });
    },
    _checkSubmitSuccess(success) {
      this.isMessageSending = true;
      if (Promise !== undefined) {
        Promise.resolve(success).then(
          function (wasSuccessful) {
            if (wasSuccessful === undefined || wasSuccessful) {
              this.files = [];
              this.$refs.userInput.innerHTML = "";
              this.isMessageSending = false;
            }
          }.bind(this)
        );
      } else {
        this.$refs.userInput.innerHTML = "";
        this.files = [];
        this.isMessageSending = false;
      }
    },
    _submitText(event) {
      const text = this.$refs.userInput.textContent;
      const file = this.file;
      if (file) {
        this._submitTextWhenFile(event, text, file);
      } else {
        if (text && text.length > 0) {
          this._checkSubmitSuccess(
            this.onSubmit({
              author: "me",
              type: "text",
              data: { text },
              files: this.files,
            })
          );
        }
      }
    },
    _submitTextWhenFile(event, text, file) {
      if (text && text.length > 0) {
        this._checkSubmitSuccess(
          this.onSubmit({
            author: "me",
            type: "file",
            data: { text, file },
          })
        );
      } else {
        this._checkSubmitSuccess(
          this.onSubmit({
            author: "me",
            type: "file",
            data: { file },
          })
        );
      }
    },
    _editText(event) {
      const text = this.$refs.userInput.textContent;
      if (text && text.length) {
        this.$emit("edit", {
          author: "me",
          type: "text",
          id: store.state.editMessage.id,
          data: { text },
        });
        this._editFinish();
      }
    },
    _handleEmojiPicked(emoji) {
      this._checkSubmitSuccess(
        this.onSubmit({
          author: "me",
          type: "emoji",
          data: { emoji },
        })
      );
    },
    async _handleFileSubmit(files) {
      this.files = this.files.concat(files);
    },
    _editFinish() {
      store.setState("editMessage", null);
    },

    removeFileAttachment(file) {
      this.files.splice(this.files.indexOf(file), 1);
    },
  },
};
</script>
