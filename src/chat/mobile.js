import { getRootChatContainer } from "./utils.js";

export function treatAsMobile() {
  // 450 is based upon our CSS for media with max width of 450
  return Math.min(screen.availWidth, screen.availHeight) < 450;
}

export function applyTweaks() {
  if (!treatAsMobile()) return;
  screen.orientation.addEventListener("change", (evt) => {
    // TODO
    //console.log(evt);
  });
}

let lastViewportContent;
export function applyChatTweaks() {
  if (!treatAsMobile()) return;

  if (!lastViewportContent) {
    lastViewportContent = document.querySelector(
      "meta[name='viewport']"
    ).getAttribute(
      "content"
    );
  }

  const viewportContent = new Map();
  lastViewportContent.split(",").forEach((elem) => {
    const parts = elem.trim().split("=");
    viewportContent.set(parts[0], parts[1]);
  });

  viewportContent.set("maximum-scale", "1.0");
  viewportContent.set("interactive-widget", "resizes-content");

  const contentArray = [];
  viewportContent.forEach((value, key) => {
    contentArray.push(`${key}=${value}`);
  });

  const content = contentArray.join(", ");
  console.log(lastViewportContent, " => ", content);
  document.querySelector(
    'meta[name="viewport"]'
  ).setAttribute(
    "content",
    content
  );
}

export function removeChatTweaks() {
  if (!treatAsMobile()) return;

  document.querySelector(
    'meta[name="viewport"]'
  ).setAttribute(
    "content",
    lastViewportContent,
  );

  console.log(lastViewportContent);
  lastViewportContent = undefined;
}

let viewportEventListener;
export function addInputTweaks() {
  /*
  if (!treatAsMobile()) return;
  if (viewportEventListener) return;

  viewportEventListener = window.visualViewport.addEventListener("resize", () => {
    if (window.visualViewport.height / window.innerHeight < 0.1) return;
    const chatContainer = getRootChatContainer();
    const chatWindow = chatContainer.getElementsByClassName("sc-chat-window")[0];
    // TODO THIS DOESN'T WORK QUITE RIGHT
    chatWindow.style.height = `${window.visualViewport.height}px`;
  });
  */
}

export function removeInputTweaks() {
  /*
  if (!treatAsMobile()) return;
  if (!viewportEventListener) return;

  const chatContainer = getRootChatContainer();
  const chatWindow = chatElement.getElementsByClassName("sc-chat-window")[0];
  chatWindow.style.height = null;

  window.visualViewport.removeEventListener("resize", viewportEventListener);
  viewportEventListener = undefined;
  */
}
