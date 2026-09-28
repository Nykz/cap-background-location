import Capacitor
import WebKit

/// Bridge view controller used by `SceneDelegate` and `Main.storyboard`.
///
/// iOS 27 workaround: on startup Capacitor's `native-bridge.js` asks the native
/// side two configuration questions through a synchronous `window.prompt()`
/// (`CapacitorCookies.isEnabled`, `CapacitorHttp`). On the iOS 27 WKWebView that
/// reply never arrives, so the WebContent process blocks inside the injected
/// script and the page stays blank. A document-start script, injected before
/// Capacitor's own scripts, answers exactly those two questions with the real
/// values from `capacitor.config` and forwards every other prompt unchanged.
/// Remove this class once Capacitor ships a fix.
class AppBridgeViewController: CAPBridgeViewController {

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        guard let controller = webView?.configuration.userContentController else { return }

        let cookiesEnabled = pluginEnabled("CapacitorCookies")
        let httpEnabled = pluginEnabled("CapacitorHttp")
        let shim = WKUserScript(
            source: Self.promptShimSource(cookiesEnabled: cookiesEnabled, httpEnabled: httpEnabled),
            injectionTime: .atDocumentStart,
            forMainFrameOnly: false
        )

        // WKUserContentController has no insert API: re-add Capacitor's scripts after the shim.
        // Copy element-by-element first: `userScripts` bridges lazily to WebKit's live array,
        // so iterating it while re-adding would never terminate.
        let existing: [WKUserScript] = controller.userScripts.map { $0 }
        controller.removeAllUserScripts()
        controller.addUserScript(shim)
        existing.forEach(controller.addUserScript)
    }

    private func pluginEnabled(_ pluginId: String) -> Bool {
        bridge?.config.getPluginConfig(pluginId).getBoolean("enabled", false) ?? false
    }

    private static func promptShimSource(cookiesEnabled: Bool, httpEnabled: Bool) -> String {
        """
        (function () {
          var answers = {
            'CapacitorCookies.isEnabled': '\(cookiesEnabled)',
            'CapacitorHttp': '\(httpEnabled)'
          };
          var nativePrompt = window.prompt;
          window.prompt = function (message, defaultValue) {
            try {
              var payload = JSON.parse(message);
              if (payload && Object.prototype.hasOwnProperty.call(answers, payload.type)) {
                return answers[payload.type];
              }
            } catch (e) {}
            return nativePrompt.call(window, message, defaultValue);
          };
        })();
        """
    }
}
