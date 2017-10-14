// content scripts
(function(w, d) {

    'use strict';

    var DEBUG = false;

    function logger(obj) {
        if (DEBUG) {
            console.log(obj);
        }
    }

    // backgroundからイベントを受け取り、画像の情報を返す。
    chrome.runtime.onMessage.addListener(function cb_GetImgInfo(msg, sender, sendResponse) {
        // contextmenuクリック
        if (msg.msg === "contextMenu") {
            var info = getImgInfo(d);

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
    function getImgInfo(doc) {
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
        logger('fullname: ' + fullname);
        logger('tweet: ' + tweet);
        for (i=0; i<imgurls.length; i++) {
            logger('imgurl: ' + imgurls[i]);
        }

        return {
            result: result,
            fullname: fullname,
            tweet: tweet,
            imgurls: imgurls
        };
    }
}
)(window, document);
