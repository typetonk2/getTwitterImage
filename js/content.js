// content scripts
(function(w, d) {

    'use strict';

    var DEBUG = false;

    function Logger(obj) {
        if (DEBUG) {
            console.log(obj);
        }
    }

    // backgroundからの要求受付。
    chrome.runtime.onMessage.addListener(function cb_GetImgInfo(msg, sender, sendResponse) {
        // contextmenuクリック
        if (msg.type === "contextMenu") {
            var info = GetImgInfo(d);
            if (info.result) {
                for (var i=0; i<info.imgurls.length; i++) {
                    chrome.runtime.sendMessage({
                        message: 'download',
                        img_url_orig: info.imgurls[i],
                        filename: info.filenames[i]
                    });
                }
            } else {
                var url = GetImgUrl( msg.srcUrl );
                var name = GetImgFilename( url, info.fullname, info.tweet );
                chrome.runtime.sendMessage({
                    message: 'download',
                    img_url_orig: url,
                    filename: name
                });
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
            // 画像詳細orツイート詳細の時だけ実行
            if ( $('.permalink-inner .js-adaptive-photo').length > 0 ||
                 $('.media-image').length > 0 ) {
                Download(active_element);
            }
            break;
        default:
        }
    });

    // 画像をダウンロードする。
    function Download(target) {
        // 画像情報取得
        var info = GetImgInfo(target, null);
        if (!info.result) {
            Logger("image is not found.");
            return;
        }
        // ファイル名とURL生成
        for (var i = 0; i < info.imgurls.length; i++) {
            var img_url_orig = GetImgUrl( info.imgurls[i] );
            var filename = GetImgFilename(img_url_orig, info.fullname, info.tweet);
            // background側でchrome.downloads.downloadを実行して保存する。
            chrome.runtime.sendMessage({
                message: 'download',
                img_url_orig: img_url_orig,
                filename: filename
            });
        }
    }

    // 画像情報を取得する。
    function GetImgInfo(doc) {
        var result = false
          , fullname = null
          , tweet = null
          , imgurls = []
          , filenames = [];
        // 画像詳細画面
        if (doc.querySelector('.media-image')) {
            fullname = doc.querySelector('.Gallery-content .fullname').innerHTML;
            tweet = doc.querySelector('.Gallery-content .js-tweet-text-container > p').innerText.substring(0, 15);
            imgurls = [ GetImgUrl(doc.querySelector('.media-image').src) ];
            filenames = [ GetImgFilename(imgurls[0], fullname, tweet) ];
            result = true;
            // ツイート詳細画面
        } else if (doc.querySelector('.permalink-inner .js-adaptive-photo')) {
            fullname = doc.querySelector('.permalink-inner .fullname').innerText
            tweet = doc.querySelector('.permalink-inner .js-tweet-text-container > p').innerText.substring(0, 15);
            var url_list = doc.querySelectorAll('.permalink-inner .js-adaptive-photo > img');
            for (var i = 0; i < url_list.length; i++) {
                imgurls.push( GetImgUrl(url_list[i].src) );
                filenames.push( GetImgFilename(imgurls[i], fullname, tweet) );
            }
            result = true;
        } else {
            fullname = doc.querySelector('.ProfileHeaderCard-nameLink').innerText;
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
            imgurls: imgurls,
            filenames: filenames
        }
    }

    // 画像のURLを返す。
    function GetImgUrl(url) {
        var url_orig = url.replace( /:\w*$/, '' ) + ':orig';
        if ( CheckImgUrl(url_orig) ) {
            return url_orig;
        } else {
            return url;
        }
    }

    // 画像が存在するか確認する。
    // TODO: 非同期にしないと警告が出る。
    function CheckImgUrl(url) {
        var xhr = new XMLHttpRequest();
        xhr.open( "GET", url, false );
        xhr.send();
        if( xhr.status == 200 ) {
            return true;
        } else {
            return false;
        }
    }

    // 画像のファイル名を返す。
    function GetImgFilename(url, fullname, tweet) {
      if (fullname && tweet) {
        return fullname + '-' + tweet + url.replace( /^.+\/([^\/.]+)\.(\w+):(\w+)$/, '\($1\).$2' );
      } else {
        return url.replace( /^.+\/([^\/.]+)\.(\w+):(\w+)$/, '\($1\).$2' );
      }
    }
}
)(window, document);
