// カメラ／マイクにアクセスするためのメソッドを取得しておく
navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

var localStream;    // 自分の映像ストリームを保存しておく変数
var connectedCall;  // 接続したコールを保存しておく変数

// APIキーを復号するためのパスフレーズを入力する
var passphrase = window.prompt('passphrase');
var encryptedKey = 'U2FsdGVkX19lUxP5qgAcUFDFWSJoQl+TSjhY5HZQMD/P1PVeavTIE0JIjwNnC1KpQ0RHoc93af2/AhaRdrq5TA=='
var decryptedKey = CryptoJS.AES.decrypt(encryptedKey, passphrase).toString(CryptoJS.enc.Utf8);
console.log(decryptedKey);

if (decryptedKey === '') {
    alert('Invalid passphrase');
    location.reload();
}

// SkyWayのシグナリングサーバーへ接続する (APIキーを置き換える必要あり）
var peer = new Peer({ key: decryptedKey, debug: 3});

// シグナリングサーバへの接続が確立したときに、このopenイベントが呼ばれる
peer.on('open', function(){
    // 自分のIDを表示する
    // - 自分のIDはpeerオブジェクトのidプロパティに存在する
    // - 相手はこのIDを指定することで、通話を開始することができる
    $('#my-id').text(peer.id);
});

// 相手からビデオ通話がかかってきた場合、このcallイベントが呼ばれる
// - 渡されるcallオブジェクトを操作することで、ビデオ映像を送受信できる
peer.on('call', function(call){

    // 切断時に利用するため、コールオブジェクトを保存しておく
    connectedCall = call;

    // 相手のIDを表示する
    // - 相手のIDはCallオブジェクトのpeerプロパティに存在する
    $("#peer-id").text(call.peer);

    // 自分の映像ストリームを相手に渡す
    // - getUserMediaで取得したストリームオブジェクトを指定する
    call.answer(localStream);

    // 相手のストリームが渡された場合、このstreamイベントが呼ばれる
    // - 渡されるstreamオブジェクトは相手の映像についてのストリームオブジェクト
    call.on('stream', function(stream){

        // 映像ストリームオブジェクトをURLに変換する
        // - video要素に表示できる形にするため変換している
        var url = URL.createObjectURL(stream);

        // video要素のsrcに設定することで、映像を表示する
        $('#peer-video').prop('src', url);
    });

    call.on('close', function(){
        // 相手のIDを削除する
        $("#peer-id").text("-");
    });
});

peer.on('error', function(err){
    console.error(err);
});

// DOM要素の構築が終わった場合に呼ばれるイベント
// - DOM要素に結びつく設定はこの中で行なう
$(function() {

    // カメラ／マイクのストリームを取得する
    // - 取得が完了したら、第二引数のFunctionが呼ばれる。呼び出し時の引数は自身の映像ストリーム
    // - 取得に失敗した場合、第三引数のFunctionが呼ばれる
    navigator.getUserMedia({audio: true, video: true}, function(stream){

        // このストリームを通話がかかってき場合と、通話をかける場合に利用するため、保存しておく
        localStream = stream;

        // 映像ストリームオブジェクトをURLに変換する
        // - video要素に表示できる形にするため変換している
        var url = URL.createObjectURL(stream);

        // video要素のsrcに設定することで、映像を表示する
        $('#my-video').prop('src', url);

    }, function() { alert("Error!"); });

    // 通話開始
    function callStart(peer_id) {

        // 相手と通話を開始して、自分のストリームを渡す
        var call = peer.call(peer_id, localStream);

        // 切断時に利用するため、コールオブジェクトを保存しておく
        connectedCall = call;

        // 相手のストリームが渡された場合、このstreamイベントが呼ばれる
        // - 渡されるstreamオブジェクトは相手の映像についてのストリームオブジェクト
        call.on('stream', function(stream){
            // 相手のIDを表示する
            $("#peer-id").text(call.peer);

            // 映像ストリームオブジェクトをURLに変換する
            // - video要素に表示できる形にするため変換している
            var url = URL.createObjectURL(stream);

            // video要素のsrcに設定することで、映像を表示する
            $('#peer-video').prop('src', url);
        });

        call.on('close', function(){
            // 相手のIDを削除する
            $("#peer-id").text("-");
        });
    };

    // 通話終了
    function callEnd() {
        // ビデオ通話を終了する
        connectedCall.close();

        // 相手のIDを削除する
        $("#peer-id").text("-");
    }

    // Start Callボタンクリック時の動作
    $('#call-start').click(function(){
        $('#peer-list').empty();
        peer.listAllPeers(function(list){
            var my_id = $('#my-id').text();
            list.forEach(function(peer_id) {
                if (peer_id === my_id) {
                    return;
                }

                $('#peer-list').append($('<button></button>', {
                    class : 'list-group-item list-group-item-action',
                    text : peer_id,
                    'data-dismiss' : 'modal',
                    on : {
                        click : function(event){
                            callStart(peer_id);
                        }
                    }
                }));
            });
        });
    });

    // End　Callボタンクリック時の動作
    $('#call-end').click(function(){
        callEnd();
    });
});
