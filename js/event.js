// event page
(function(w, d) {

    'use strict';

    var DEBUG = false;
    var CONTEXT_ID = "getTwitterImage";
    var CONTEXT_TITLE = "AnkPixiv形式で保存(&D)";

    function Logger(obj) {
        if (DEBUG) {
            console.log(obj);
        }
    }

    var isCreatedContextMenu = false;
    chrome.runtime.onInstalled.addListener(Run);
    chrome.runtime.onStartup.addListener(Run);

    // contextMenuを作成する。
    function Run() {
        if (isCreatedContextMenu == false) {
            chrome.contextMenus.create({
                "type": "normal",
                "id": CONTEXT_ID,
                "title": CONTEXT_TITLE,
                "contexts": ["image"],
                "targetUrlPatterns": ["*://pbs.twimg.com/media/*"]
            });
            isCreatedContextMenu = true;
        }
    }

    // contextMenuクリック時の処理
    chrome.contextMenus.onClicked.addListener(function cb_ContextOnClick(info, tab) {
        // 現在のタブに対し content script を実行する。
        chrome.tabs.query({
            "active": true,
            "currentWindow": true
        }, function cb_RunDownload(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {
                "type": "contextMenu"
               ,"srcUrl": info.srcUrl
            });
        });
    });

    // content scriptからの要求受付。
    chrome.runtime.onMessage.addListener(function cb_waitCS(msg, sender, response) {
        // ダウンロード要求
        if (msg.type = "download") {
            Logger("start download: " + msg.filename);
            chrome.downloads.download({
                url: msg.img_url_orig,
                filename: msg.filename
            });
        }
    });
}
)(window, document);

// EOF
