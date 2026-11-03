// ---- 存储 ----
function getStorage(name) {
    return localStorage.getItem(name);
}

function setStorage(name, value) {
    localStorage.setItem(name, value);
}

// ---- WebDAV root 解析 ----
// 优先级: URL 参数 ?root= > localStorage(校验失效则重新探测) > 逐级向上探测 > 手动输入
var root = getStorage('root');
var oldRoot = root;

var rootParam = new URLSearchParams(window.location.search).get('root');
if(rootParam !== null && rootParam !== ''){
    // 显式指定的 root 直接信任, 不做探测(跨域探测会因 CORS 误判)
    root = rootParam.trim().replace(/\/+$/, '');
    setStorage('root', root);
    setStorage('curPath', '/');
}

// 探测 url 是否为可用的 WebDAV 服务端点
// 207 = 正常, 401 = 需要认证(同样是 WebDAV 服务)
function probeDav(url) {
    try {
        var xhr = new XMLHttpRequest();
        xhr.open('PROPFIND', url, false);
        xhr.setRequestHeader('Depth', '0');
        xhr.send(null);
        return xhr.status == 207 || xhr.status == 401;
    } catch (e) {
        return false;
    }
}

function normalizeDavUrl(input) {
    input = (input || '').trim().replace(/\/+$/, '');
    if(!input) return '';
    if(!/^https?:\/\//i.test(input)){
        input = window.location.origin + (input.charAt(0) == '/' ? '' : '/') + input;
    }
    return input;
}

function detectRoot() {
    var origin = window.location.origin;
    var pageDir = window.location.pathname.replace(/\/[^/]*$/, '');
    // 从页面所在目录开始逐级向上探测, 直到不通为止; 最后再试站点根
    var candidates = [];
    var dir = pageDir;
    while(dir !== ''){
        candidates.push(origin + dir);
        dir = dir.replace(/\/[^/]*$/, '');
    }
    candidates.push(origin);
    for(var i = 0; i < candidates.length; i++){
        if(probeDav(candidates[i])) return candidates[i];
    }
    return null;
}

function askRoot() {
    var tip = t('No WebDAV').replace('{url}', window.location.origin + '/webdav');
    for(;;){
        var input = prompt(tip);
        if(input === null) return null;
        var url = normalizeDavUrl(input);
        if(url && probeDav(url)) return url;
        alert(t('Invalid WebDAV'));
    }
}

if(rootParam === null || rootParam === ''){
    if(!root || !probeDav(root)){
        var detected = detectRoot();
        root = detected || askRoot();
        if(root){
            setStorage('root', root);
            if(root !== oldRoot) setStorage('curPath', '/');
        }
    }
}
if(!root){
    // 用户取消输入时的兜底: 使用页面所在目录或站点根
    var pageDir = window.location.pathname.replace(/\/[^/]*$/, '');
    root = window.location.origin + pageDir;
    setStorage('root', root);
}

var client = function () {
    return new WebDAV.Fs(root);
};

// ---- 只读分享模式: URL 带 ?readonly 时隐藏所有写操作 ----
window.READONLY = new URLSearchParams(window.location.search).get('readonly') !== null;

// ---- 工具函数 ----
function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
        return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
}

function decodeUriSafe(s) {
    try { return decodeURIComponent(s); } catch (e) { return s; }
}

function extOf(name) {
    return (String(name).split('.').pop() || '').toLowerCase();
}

// 相对时间: 1 小时内/当天/一周内用相对表述, 更早显示日期
function relTime(s) {
    if (!s) return '';
    var d = new Date(String(s).replace(' ', 'T'));
    var time = d.getTime();
    if (isNaN(time)) return String(s);
    var diff = Date.now() - time;
    if (diff < 0) diff = 0;
    if (diff < 60e3) return t('Just now');
    if (diff < 36e5) return Math.floor(diff / 60e3) + t(' minutes ago');
    if (diff < 864e5) return Math.floor(diff / 36e5) + t(' hours ago');
    if (diff < 7 * 864e5) return Math.floor(diff / 864e5) + t(' days ago');
    return String(s).slice(0, 10);
}

// 按文件类型返回图标 HTML
function iconFor(name, doctype) {
    var ext = extOf(name);
    if(doctype === 'video') return '<i class="fa fa-file-video-o text-warning"></i>';
    if(doctype === 'audio') return '<i class="fa fa-file-audio-o text-success"></i>';
    if(doctype === 'pdf')   return '<i class="fa fa-file-pdf-o text-danger"></i>';
    if(doctype === 'image') return '<i class="fa fa-file-image-o text-primary"></i>';
    if(['zip','rar','7z','tar','gz','bz2','xz','tgz','iso'].indexOf(ext) !== -1) return '<i class="fa fa-file-archive-o text-warning"></i>';
    if(['js','css','json','xml','html','htm','sql','java','c','h','cpp','hpp','go','py','php','rb','rs','sh','bat','cmd','ps1','yml','yaml','toml','ini','conf','config','pl','vim','ahk'].indexOf(ext) !== -1) return '<i class="fa fa-file-code-o text-info"></i>';
    if(doctype === 'text') return '<i class="fa fa-file-text-o text-success"></i>';
    return '<i class="fa fa-file-o text-muted"></i>';
}

// ---- 排序 ----
var sortFor = function (a, b) {
    if(a.type != b.type) return a.type == 'dir' ? -1 : 1;
    var sortItem = getStorage('sortItem') || 'name';
    var asc = (getStorage(sortItem + 'asc') || 'true') === 'true';
    var map = {
        size: 'contentlength',
        time: 'time',
        name: 'name'
    };
    var va = a[map[sortItem]], vb = b[map[sortItem]];
    var result;
    if(sortItem === 'name'){
        // 自然排序: file2 排在 file10 前面, 且不区分大小写
        result = String(va || '').localeCompare(String(vb || ''), undefined, {numeric: true, sensitivity: 'base'});
    }else{
        result = (parseInt(va) || 0) - (parseInt(vb) || 0);
    }
    return asc ? result : -result;
};

// ---- 上传 ----
var _UPLOAD = {

    process: false,

    fileindex: 0,

    fileobjarr: [],

    onprogress : function (event) {
        if (event.lengthComputable) {
            var percent = parseInt(event.loaded/event.total * 100) + '%';
            $('.loading').text((_UPLOAD.fileindex + 1) + '/' + _UPLOAD.fileobjarr.length + ' ' + percent);
            $('.loading').css('background-color', '#cbcfd0');
            if(event.loaded == event.total){
                $('.loading').text(t('Upload file'));
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
        alert(t('Upload failed'));
    },

    onload : function(res){

    },

    uploadStart : function (overwrite){
        var fileobj = _UPLOAD.fileobjarr[_UPLOAD.fileindex];
        if(!overwrite){
            WebDAV.PROPFIND(curDir.url + '/' + encodeURIComponent(fileobj.name), function (resbody, status) {
                if(status !== '404'){
                    if(confirm('\'' + fileobj.name + t('Overwrite confirm'))){
                        _UPLOAD.uploadStart(true);
                    }else{
                        _UPLOAD.onloadSuccess(); // 跳过该文件, 继续下一个
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

// ---- 删除 ----
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

// ---- 移动/复制 ----
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
        var dest = curPath + '/' + encodeURIComponent(fileobj.name);
        if(!overwrite){
            WebDAV.PROPFIND(dest, function (resbody, status) {
                if(status !== '404'){
                    if(confirm('\'' + fileobj.name + t('Overwrite confirm'))){
                        _MVCP.doaction(true);
                    }else{
                        _MVCP.onloadSuccess(); // 跳过该文件
                    }
                }else{
                    _MVCP.doaction(true);
                }
            });
        }else{
            if(decodeUriSafe(fileobj.url) === decodeUriSafe(dest)){
                _MVCP.onloadSuccess();
                return;
            }
            var done = function (res, status) {
                if(status !== '201'){
                    alert(t('Op failed').replace('{s}', status).replace('{n}', fileobj.name));
                }
                _MVCP.onloadSuccess(res, status);
            };
            if(_MVCP.action === 'COPY'){
                WebDAV.COPY(fileobj.url, dest, done);
            }
            if(_MVCP.action === 'MOVE'){
                WebDAV.MOVE(fileobj.url, dest, done);
            }
        }
    }
};
