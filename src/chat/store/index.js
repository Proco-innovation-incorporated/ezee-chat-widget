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
  const authToken = await getAuthToken();
  if (!chatConfig.value?.apiBaseUrl || !authToken) {
    throw new Error('Cannot get Org Branding. Set up configs before calling');
  }

  const url = buildUrl(
    chatConfig.value.apiBaseUrl,
    buildUrlPath("/api/<pathSegment>/org/branding"),
    {
      token: authToken
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

const getPrivateUploadUrl = async (attachments) => {
  const { chatConfig } = mapState(["chatConfig"]);
  const authToken = await getAuthToken();
  if (
    !chatConfig.value?.apiBaseUrl ||
    !isPrivateChat()
  ) {
    throw new Error('Cannot get Upload URL. Set up configs before calling');
  }

  const url = buildUrl(
    chatConfig.value.apiBaseUrl,
    buildUrlPath("/api/<pathSegment>/org/url/upload"),
    {
      token: authToken,
      email: chatConfig.value.userEmail || "",
    },
  );

  try {
    const response = await fetch(
      url.toString(),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          attachments: attachments
        }),
      }
    );
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }

    const result = await response.json()
    return result;
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
}

const getUserToken = async () => {
  const { chatConfig } = mapState(["chatConfig"]);
  if (
    !chatConfig.value?.apiBaseUrl ||
    !isPrivateChat()
  ) {
    throw new Error('Cannot get User Connect Token . Set up configs before calling');
  }
  else if (chatConfig.value.userToken) {
    return chatConfig.value.userToken;
  }

  const url = buildUrl(
    chatConfig.value.apiBaseUrl,
    buildUrlPath("/api/<pathSegment>/org/auth"),
    {
      token: chatConfig.value.privateToken,
      email: chatConfig.value.userEmail || "",
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

const getAuthToken = async () => {
  const { chatConfig } = mapState(["chatConfig"]);

  if (chatConfig.value?.userToken) {
    return chatConfig.value.userToken;
  }
  else if (chatConfig.value?.privateToken) {
    if (chatConfig.value?.userEmail) {
      return chatConfig.value.privateToken;
    }
    else {
      return await getUserToken();
    }
  }
  else {
    return chatConfig.value?.publicToken;
  }
};

const isPrivateChat = () => {
  const { chatConfig } = mapState(["chatConfig"]);
  return (chatConfig.value?.userToken || chatConfig.value?.privateToken);
};

export default store;
export {
  buildUrlPath,
  closeSocketConnection,
  getUserToken,
  getPrivateUploadUrl,
  isPrivateChat,
  loadOrgBranding,
  mapState,
  sendSocketMessage,
};
