// content scripts
(function(w, d) {

    'use strict';

    var DEBUG = false;

    function Logger(obj) {
        if (DEBUG) {
            console.log(obj);
        }
    }

    // backgroundからイベントを受け取り、画像の情報を返す。
    chrome.runtime.onMessage.addListener(function cb_GetImgInfo(msg, sender, sendResponse) {
        // contextmenuクリック
        if (msg.msg === "contextMenu") {
            var info = GetImgInfo(d);

            if (info.result) {
                sendResponse({
                    fullname: info.fullname,
                    tweet: info.tweet,
                    imgurl: info.imgurls
                });
            } else {
                // responseを返さないと、長い待ち時間が発生する
                sendResponse({});
            }
        }
    });

    // キー押下の監視イベントを追加
    function AddEvent(target, event_name, event_function, info) {
        if (!info) {
            target.addEventListener(event_name, event_function, false);
            return;
        }

        // 必要な処理があれば追加。
    }

    AddEvent(d.body, 'keydown', function cb_KeyCheck(event) {
        var active_element = d.activeElement;
        var key_code = event.keyCode;
        Logger('press key: ' + key_code);

        // 押されたkeyを調べる
        switch (key_code) {
        case 68: // d
            Download(active_element);
            break;
        default:
        }
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

    // 画像情報を取得する。
    function GetImgInfo(doc) {
        var result = false
          , fullname = null
          , tweet = null
          , imgurls = [];
        // 画像詳細画面
        if (doc.querySelector('.media-image')) {
            fullname = doc.querySelector('.Gallery-content .fullname').innerHTML;
            tweet = doc.querySelector('.Gallery-content .js-tweet-text-container > p').innerHTML.match(/(.*)\<a href.*/)[1].substring(0, 15);
            imgurls = [doc.querySelector('.media-image').src];
            result = true;
            // ツイート詳細画面
        } else if (doc.querySelector('.permalink-inner .js-adaptive-photo')) {
            fullname = doc.querySelector('.permalink-inner .fullname').innerText
            tweet = doc.querySelector('.permalink-inner .js-tweet-text-container > p').innerHTML.match(/(.*)\<a href.*/)[1].substring(0, 15);
            var url_list = doc.querySelectorAll('.permalink-inner .js-adaptive-photo > img');
            for (var i = 0; i < url_list.length; i++) {
                imgurls.push(url_list[i].src);
            }
            result = true;
        }
        Logger('fullname: ' + fullname);
        Logger('tweet: ' + tweet);
        for (i=0; i<imgurls.length; i++) {
            Logger('imgurl: ' + imgurls[i]);
        }

        return {
            result: result,
            fullname: fullname,
            tweet: tweet,
            imgurls: imgurls
        };
    }

    // 画像をダウンロードする。
    function Download(target) {
        // 画像情報取得
        var info = GetImgInfo(target);
        if (!info.result) {
            Logger("image is not found.");
            return;
        }
        // ファイル名とURL生成
        // TODO: :origに画像が存在しないケース
        for (var i = 0; i < info.imgurls.length; i++) {
            var img_url_orig = GetImgUrl( info.imgurls[i], ':orig' );
            var filename = GetImgFilename(img_url_orig, info.fullname, info.tweet);
            // background側でchrome.downloads.downloadを実行して保存する。
            // TODO: 任意の保存先を指定したい。
            chrome.runtime.sendMessage({
                message: 'download-media-image',
                img_url_orig: img_url_orig,
                filename: filename
            });
        }
    }
}
)(window, document);
