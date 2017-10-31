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
            var info = GetImgInfo(d.activeElement);
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
        var active_element = event.target;
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
            // background側でchrome.downloads.downloadを実行して保存する。
            chrome.runtime.sendMessage({
                type: 'download',
                img_url_orig: info.imgurls[i],
                filename: info.filenames[i]
            });
        }
    }

    // 画像情報を取得する。
    // TODO: セレクタ部分を何とかしたい。
    function GetImgInfo(doc) {
        var result = false
          , fullname = null
          , tweet = null
          , imgurls = []
          , filenames = [];
        // 画像詳細画面
        if (doc.querySelector('.media-image')) {
            fullname = doc.querySelector('.Gallery-content .fullname').innerHTML;
            tweet = doc.querySelector('.Gallery-content .js-tweet-text-container > p').innerText.replace(/\r?\n/g, "");
            imgurls = [ GetImgUrl(doc.querySelector('.media-image').src) ];
            filenames = [ GetImgFilename(imgurls[0], fullname, tweet) ];
            result = true;
            // ツイート詳細画面
        } else if (doc.querySelector('.permalink-inner .js-adaptive-photo')) {
            fullname = doc.querySelector('.permalink-inner .fullname').innerText
            tweet = doc.querySelector('.permalink-inner .js-tweet-text-container > p').innerText.replace(/\r?\n/g, "");
            var url_list = doc.querySelectorAll('.permalink-inner .js-adaptive-photo > img');
            for (var i = 0; i < url_list.length; i++) {
                imgurls.push( GetImgUrl(url_list[i].src) );
                filenames.push( GetImgFilename(imgurls[i], fullname, tweet) );
            }
            result = true;
        } else if (doc.className.match(/js-stream-item/)) {
            // TLでのDLボタンクリック
            var fullname = doc.querySelector('.FullNameGroup > strong').innerText;
            var tweet = doc.querySelector('.js-tweet-text-container > p').innerText.replace(/\r?\n/g, "");
            var url_list = doc.querySelectorAll('.js-adaptive-photo > img');
            for (var i=0; i<url_list.length; i++) {
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
    // TODO: tweetやユーザー名に特定の記号が含まれていると、chrome.downloads.download を
    //  実行した時に、「Invalid filename」で失敗する事がある。
    function GetImgFilename(url, fullname, tweet) {
        url = url.replace( /^.+\/([^\/.]+)\.(\w+):(\w+)$/, '\($1\).$2' );
        if (fullname || tweet) {
            // tweetやfullnameから、使えない文字や記号を削除
            tweet = tweet.replace(/(http(s).*\s|[<>])/g, '')
                    .replace(/[<>]/g, '')
                    .replace(/@\S+\s/, '')
                    .trim()
                    .substring(0,15);
            fullname = fullname.trim();
            return fullname + '-' + tweet + url
        } else {
            return url;
        }
    }

    // DL用のボタンを作成。
    var dlBtn = ( function CreateDLButton () {
        var firstLink = d.createElement('div');
        firstLink.className = 'ProfileTweet-action ProfileTweet-action--orig';

        var secondBtn = d.createElement('button');
        secondBtn.className = 'ProfileTweet-actionButton js-action-button js-download-image';
        secondBtn.type = 'button';
        secondBtn.innerText = '画像DL';

        firstLink.appendChild(secondBtn);
        return firstLink;
    })();

    // ボタン一覧に追加。
    $('.ProfileTweet-actionList').append(dlBtn);

    // DLボタンのクリックイベントを作成。
    // $('.js-download-image').on('click', function(event) {
    var btnList = d.querySelectorAll('.js-download-image');
    for (let x=0; x<btnList.length; x++) {
        // 該当ツイートの画像を取得する。
        AddEvent(btnList[x], 'click', function cb_onClickDownload(event) {
            var tl = btnList[x].closest('.js-stream-item');
            Download(tl);
        });
    }
}
)(window, document);
