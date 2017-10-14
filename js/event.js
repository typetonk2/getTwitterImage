// event page
(function(w, d) {

    'use strict';

    var DEBUG = false;

    function logger(obj) {
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
                "id": "contextId",
                "title": "AnkPixiv形式で保存(&D)",
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
        }, function cb_GetImgInfo(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {
                "msg": "contextMenu"
            }, function cb_RunDownload(res) {
                if (info.menuItemId === "contextId" && res) {
                    Download(info.srcUrl, res.fullname, res.tweet);
                } else if (info.menuItemId === "contextId") {
                    Download(info.srcUrl, null, null);
                }
            });
        });
    });

    // 画像のURLを返す。
    // TODO: :orig しか想定していない。
    function GetImgUrl(url, kind) {
      if ( kind ) {
        return url.replace( /:\w*$/, '' ) + kind;
      } else {
        return url.replace( /:\w*$/, '' );
      }
    }

    // 画像のファイル名を返す。
    function GetImgFilename(url, fullname, tweet) {
      if (fullname) {
        return fullname + '-' + tweet + url.replace( /^.+\/([^\/.]+)\.(\w+):(\w+)$/, '\($1\).$2' );
      } else {
        return url.replace( /^.+\/([^\/.]+)\.(\w+):(\w+)$/, '\($1\).$2' );
      }
    }

    // 画像をDLする。
    function Download(src, fullname, tweet) {
        var img_url_orig = GetImgUrl(src, ':orig');
        var filename = GetImgFilename(img_url_orig, fullname, tweet);

        logger('start download: ' + name);
        chrome.downloads.download({
            url: img_url_orig,
            filename: filename
        });
    }
}
)(window, document);

// EOF
