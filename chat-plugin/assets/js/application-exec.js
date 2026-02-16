document.addEventListener("DOMContentLoaded", function () {
  window.ezee.setupChatConfig({
    wordpressPluginPath: (
      pluginData.pluginBasePath ?
        `${pluginData.pluginBasePath}assets` :
        (
          window.pluginPath || '/wp-content/plugins/chat-plugin/assets'
        )
    ),

    publicToken: pluginData.publicToken,

    privateToken: pluginData.privateToken,
    userEmail: pluginData.userEmail,
  });
  window.ezee.initChat();
});
