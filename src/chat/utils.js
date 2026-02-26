import markdownit from "markdown-it";
import taskLists from "markdown-it-task-lists";
import markdownSub from "markdown-it-sub";
import markdownSup from "markdown-it-sup";
import DOMPurify from "dompurify";

// !!! IMPORTANT !!!
// this converter will automatically wrap bare HTTP URLs with <a></a> tags!
const md = markdownit({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true
})
  .use(taskLists, { enabled: true })
  .use(markdownSub, { enabled: true })
  .use(markdownSup, { enabled: true });

// Converts commonmark + gfm to html
// Pass in options if we want to transform elements or add classes
export function mdToHtml(commonmark, options = {linksNewTab: true}) {
  if (!commonmark) return '<div class="markdown"></div>';
  console.debug("markdown", commonmark)
  
  // md -> html
  const html = md.render(commonmark)
  console.debug("html", html)

  // Check options
  DOMPurify.removeAllHooks?.();

  // Run this after the attributes have been sanitized
  // TODO: Think about a way to do this generally. We do not want the same problem as the 
  // get methods on the BE where we have to make a check for every single filter param
  DOMPurify.addHook('afterSanitizeAttributes', (node)=>{
    if(options.linksNewTab && node.tagName === 'A') {
      node.setAttribute('target', '_blank')
    }

  })

  // validate html
  const santized = DOMPurify.sanitize(html,
     { 
      USE_PROFILES: {html: true},
      ADD_TAGS: ["s", "sup", "sub"],
      ADD_ATTR: ['class','target','rel'] // Need this for later, so applied styles stay
  })
  console.debug("sanitized", santized)

  return `<div class="markdown">${santized}</div>`
}

export function purifyHtml(html) {
  const santized = DOMPurify.sanitize(html,
     { 
      USE_PROFILES: {html: true},
      ADD_TAGS: ["s", "sup", "sub"],
      ADD_ATTR: ['class','target','rel'] // Need this for later, so applied styles stay
  })
  // console.debug("sanitized: ", santized)
  DOMPurify.removeAllHooks();

  return `<div class="purified">${santized}</div>`
}

// Transforms the citations in the html response to tooltips
export function processCitations(html, citations) {
  let citationNum = 1;
  const messageWithCitations = html.replace(/\[\[cite:(\d+)\]\]/g, (match, numStr) => {
    // get the citation
    const citation = citations[match];
    if (!citation) return "";

    const emoji = citation.page ? '📄' : citation.timestamp ? '🎬' : '🌐'

    // Assume there is only ever a page or a timestamp, not both
    const title = [
      `${emoji} <strong>${truncateString(citation.name, 40)}</strong>`,
      citation.page && `on page(s) ${citation.page}`,
      !citation.page && citation.timestamp && `at ${formatTime(citation.timestamp)}`
    ].filter(Boolean).join(' ');

    const num = citationNum++;
    const el = `
      <a
        href="${citation.url}"
        target="_blank"
        data-bs-toggle="tooltip"
        data-bs-placement="auto"
        data-bs-html="true"
        data-bs-custom-class="ezee-public-chat-tooltip"
        title="${title}"
      >
        [${num}]
      </a>
    `
    return el
  })

  return messageWithCitations;
}

export function formatTime(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function truncateString(str, length, defaultValue = "") {
  if (!str) return defaultValue;
  if (str.length >= length) {
    return `${str.slice(0, length)}...`;
  }
  return str;
}

export function getRootChatContainer() {
  // now the hardcoded ezee-chat-shadow-root element id
  return document.getElementById(
    "ezee-chat-shadow-root"
  ).shadowRoot.getElementById("chat");
}
