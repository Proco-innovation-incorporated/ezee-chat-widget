/*
 * Use store pattern instead of Vuex since this is a chat-plugin
 * and instantiated externally
 **/

import { computed, ref } from "vue";

const EZEE_HASH_SESSION_ID = "ezee_session_id";
const EZEE_STORAGE_SESSION_ID = "ezee.publicChat.sessionId";

const store = {
  state: ref({
    editMessage: null,
    loadedConnection: false,
    error: null,
    isMessageSending: true,
    sessionId: null,
  }),
  /*
  tokens: {
    access_token: null,
    refresh_token: null,
  },
  */
  socket: null,
  setSocket(socket) {
    this.socket = socket;
  },
  setupFirst: () => {
    store.state = ref({
      editMessage: null,
      sessionId: store.getSessionId(),
    });
  },
  setState(key, val) {
    this.state.value = {
      ...this.state.value,
      [key]: val,
    };
  },
  getSessionId() {
    let sessionId;

    const hashValue = window.location.hash.substr(1)
    const hashResults = hashValue.split('&').reduce(function (res, item) {
        var parts = item.split('=');
        res[parts[0]] = parts[1];
        return res;
    }, {});
    sessionId = hashResults[EZEE_HASH_SESSION_ID];
    if (sessionId) {
      window.sessionStorage.setItem(EZEE_STORAGE_SESSION_ID, sessionId);
      console.log(`Saved Session ID found in URL Hash: ${sessionId}`);
      return sessionId;
    }

    sessionId = window.sessionStorage.getItem(EZEE_STORAGE_SESSION_ID);
    console.log(`Session ID from Session Storage: ${sessionId}`);
    if (sessionId === null) {
      sessionId = window.crypto.randomUUID();
      window.sessionStorage.setItem(EZEE_STORAGE_SESSION_ID, sessionId);
      console.log(`Generated Session ID: ${sessionId}`);
    }
    return sessionId;
  },
};

function mapState(keys) {
  const map = {};
  keys.forEach((key) => {
    map[key] = computed(() => {
      return store.state.value[key];
    });
  });
  return map;
}

function sendSocketMessage(message, attachments = []) {
  if (!store.socket) return;
  const msg = JSON.stringify({
    version: "v1",
    message: message,
    session_id: store.state.value.sessionId,
    attachments: attachments,
  });

  store.socket.send(msg);
  console.debug(`[socket]: Sent Message: ${msg}`);
}

function closeSocketConnection() {
  store.socket = null;
}

const buildUrl = (baseUrl, pathname, params) => {
  const url = new URL(baseUrl);
  url.pathname = pathname;
  for (const key in params) {
    url.searchParams.set(key, params[key]);
  }

  return url;
}

const buildUrlPath = (pathTemplate) => {
  const pathSegment = isPrivateChat() ? "streamchat" : "publicchat";
  return pathTemplate.replace("<pathSegment>", pathSegment);
};

const loadOrgBranding = async () => {
  const { chatConfig } = mapState(["chatConfig"]);
  const orgToken = chatConfig.value.privateToken || chatConfig.value.publicToken;
  if (!chatConfig.value?.apiBaseUrl || !orgToken) {
    throw new Error('Cannot fetch Org Branding. Set up configs before calling');
  }

  const url = buildUrl(
    chatConfig.value.apiBaseUrl,
    buildUrlPath("/api/<pathSegment>/org/branding"),
    {
      token: orgToken
    },
  );

  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }

    const result = await response.json()
    store.setState("orgBranding", {
      ...result
    });
  }
  catch(error) {
    console.error("Error loading Org branding", error.message)
    store.setState("orgBranding", {
      code: null,
      name: null,
      bot_name: null,
      bot_icon: null,
      org_logo: null,
      legal: null,
      highlight_color: '#4e8cff',
    });
  }
};

const getPrivateConnectToken = async () => {
  const { chatConfig } = mapState(["chatConfig"]);
  if (
    !chatConfig.value?.apiBaseUrl ||
    !isPrivateChat()
  ) {
    throw new Error('Cannot get User Connect Token . Set up configs before calling');
  }

  const url = buildUrl(
    chatConfig.value.apiBaseUrl,
    buildUrlPath("/api/<pathSegment>/org/auth"),
    {
      token: chatConfig.value.privateToken,
      email: chatConfig.value.userEmail,
    },
  );

  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }

    const result = await response.json()
    return result.token;
  }
  catch(error) {
    console.error("Error gettting User Connect Token", error.message)
  }
};

const isPrivateChat = () => {
  const { chatConfig } = mapState(["chatConfig"]);
  return (chatConfig.value?.privateToken && chatConfig.value?.userEmail);
};

export default store;
export {
  buildUrlPath,
  closeSocketConnection,
  getPrivateConnectToken,
  isPrivateChat,
  loadOrgBranding,
  mapState,
  sendSocketMessage,
};
