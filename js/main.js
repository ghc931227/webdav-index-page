if(window.location.href.indexOf('root=') != -1){
    root = new URLSearchParams(window.location.search).get('root');
    curPath = "/";
    setStorage("root", root);
    setStorage("curPath", curPath);
}
var root = getStorage('root');
if(!root){
    if(window.location.href.indexOf('/webdav/index.html') != -1){
        root = window.location.href.split('/webdav/index.html')[0];
    }
    if(window.location.href.indexOf('/webdav/index-m.html') != -1){
        root = window.location.href.split('/webdav/index-m.html')[0];
    }
}

var client = function () {
    return new WebDAV.Fs(root);
};

function getStorage(name) {
    return localStorage.getItem(name);
};

function setStorage(name, value) {
    localStorage.setItem(name, value);
};

var sortFor = function (a, b) {
    if(a.type != b.type) return a.type == 'dir' ? -1 : 1;
    var sortItem = getStorage('sortItem') || 'name';
    var asc = getStorage(sortItem + 'asc') || 'true';
    var map = {
        size: 'contentlength',
        time: 'time',
        name: 'name'
    };
    var result;
    if(asc === 'true'){
        result = a[map[sortItem]] > b[map[sortItem]];
    }else{
        result = b[map[sortItem]] > a[map[sortItem]];
    }
    setStorage('sortItem', sortItem);
    setStorage(sortItem + 'asc', asc);
    return result ? 1 : -1;
};

var _UPLOAD = {

    process: false,

    overwrite: false,

    fileindex: 0,

    fileobjarr: [],

    onprogress : function (event) {
        if (event.lengthComputable) {
            var percent = parseInt(event.loaded/event.total * 100) + '%';
            $('.loading').text((_UPLOAD.fileindex + 1) + '/' + _UPLOAD.fileobjarr.length + ' ' + percent);
            $('.loading').css('background-color', '#cbcfd0');
            if(event.loaded == event.total){
                $('.loading').text('上传文件');
                $('.loading').css('background-color', '#5fdaff');
            }
        }
    },

    onloadSuccess : function (res, status) {
        loadDir(fs.dir(curPath));
        _UPLOAD.fileindex ++;
        if(_UPLOAD.fileindex <= _UPLOAD.fileobjarr.length - 1){
            _UPLOAD.uploadStart();
        }else{
            _UPLOAD.process = false;
        }
    },

    onerror: function(err){
        alert('上传失败!');
    },

    onload : function(res){

    },

    uploadStart : function (overwrite){
        var fileobj = _UPLOAD.fileobjarr[_UPLOAD.fileindex];
        if(!overwrite){
            WebDAV.PROPFIND(curDir.url + '/' + fileobj.name, function (resbody, status) {
                if(status !== '404'){
                    if(confirm('\'' + fileobj.name + '\' 已存在, 确认覆盖?')){
                        _UPLOAD.uploadStart(true);
                    }
                }else{
                    _UPLOAD.uploadStart(true);
                }
            });
        }else{
            _UPLOAD.process = true;
            curDir.upload(fileobj.name, fileobj, _UPLOAD.onloadSuccess, _UPLOAD.onload, _UPLOAD.onerror, null, _UPLOAD.onprogress);
        }
    }
};

var _DELETE = {

    fileindex: 0,

    fileobjarr: [],

    onloadSuccess : function (res, status) {
        _DELETE.fileindex ++;
        if(_DELETE.fileindex <= _DELETE.fileobjarr.length - 1){
            _DELETE.deleteStart();
        }else{
            loadDir(fs.dir(curPath));
        }
    },

    deleteStart : function (){
        var fileobj = _DELETE.fileobjarr[_DELETE.fileindex];
        fileobj.rm(_DELETE.onloadSuccess);
    }
};

var _MVCP = {

    action: '',

    fileindex: 0,

    fileobjarr: [],

    onloadSuccess : function (res, status) {
        _MVCP.fileindex ++;
        if(_MVCP.fileindex <= _MVCP.fileobjarr.length - 1){
            _MVCP.doaction();
        }else{
            loadDir(fs.dir(curPath));
            _MVCP.fileobjarr = [];
            _MVCP.action = '';
        }
    },

    doaction : function (overwrite){
        var fileobj = _MVCP.fileobjarr[_MVCP.fileindex];
        if(!overwrite){
            WebDAV.PROPFIND(curPath + '/' + encodeURIComponent(fileobj.name), function (resbody, status) {
                if(status !== '404'){
                    if(confirm('\'' + fileobj.name + '\' 已存在, 确认覆盖?')){
                        _MVCP.doaction(true);
                    }else{
                        _MVCP.onloadSuccess();
                    }
                }else{
                    _MVCP.doaction(true);
                }
            });
        }else{
            if(decodeURIComponent(fileobj.url) === curPath + '/' + fileobj.name){
                _MVCP.onloadSuccess();
            }
            if(_MVCP.action === 'COPY'){
                WebDAV.COPY(fileobj.url, curPath + '/' + encodeURIComponent(fileobj.name), _MVCP.onloadSuccess);
            }
            if(_MVCP.action === 'MOVE'){
                WebDAV.MOVE(fileobj.url, curPath + '/' + encodeURIComponent(fileobj.name), _MVCP.onloadSuccess);
            }
        }
    }
};