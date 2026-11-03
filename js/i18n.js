// ---- i18n: 中/英双语, 浏览器语言自动检测, localStorage 持久化, t() 全局取词 ----
var i18nData = {
    "zh-CN": {
        "Select All": "全选",
        "Refresh": "刷新",
        "New": "新建",
        "New File": "新文件",
        "New Folder": "新目录",
        "Search": "搜索",
        "Upload": "上传",
        "Copy": "复制",
        "Cut": "剪切",
        "Delete": "删除",
        "Rename": "重命名",
        "Download": "下载",
        "Paste": "粘贴",
        "Cancel": "取消",
        "Sort": "排序",
        "Jump": "跳转",
        "Hidden": "隐藏",
        "View": "视图",
        "Empty folder": "此目录为空",
        "Filter ph": "输入关键字过滤当前目录...",
        "No WebDAV": "未检测到可用的 WebDAV 服务, 请输入 WebDAV 地址\n(示例: {url})",
        "Invalid WebDAV": "该地址不可用或不是 WebDAV 服务, 请重新输入",
        "Upload file": "上传文件",
        "Upload failed": "上传失败!",
        "Overwrite confirm": "' 已存在, 确定覆盖? [取消=跳过]",
        "Delete confirm": "确认删除以下文件吗?\n",
        "More suffix": "\n... 等共 {n} 项",
        "Input folder name": "请输入文件夹名称",
        "Default folder name": "新文件夹",
        "Invalid folder name": "文件夹名称非法或文件夹已存在!",
        "Input file name": "请输入文件名称",
        "Default file name": "文件",
        "Invalid file name": "文件名非法或文件已存在!",
        "Input new name": "请输入新文件名:",
        "Jump prompt": "输入要跳转的路径 (相对 WebDAV 根目录):",
        "Readonly upload": "当前为只读模式, 无法上传",
        "Op failed": "操作失败 (HTTP {s}): {n}",
        "Back": "返回",
        "Save (Ctrl+S)": "保存 (Ctrl+S)",
        "Run (Alt+Enter)": "运行 (Alt-Enter)",
        "Loading": "加载中...",
        "Unsupported": "该文件类型暂不支持在线预览, 可点击右上角\"下载\"获取文件。",
        "Missing href": "缺少 href 参数, 请从文件管理页面打开。",
        "Img load failed": "图片加载失败",
        "Load failed": "文件读取失败 (HTTP {s})",
        "Save failed": "保存失败 (HTTP {s})",
        "Unsaved leave": "有未保存的修改, 确定离开?",
        "Preview title": "预览",
        "Switch to EN": "EN",
        "Just now": "刚刚",
        " minutes ago": " 分钟前",
        " hours ago": " 小时前",
        " days ago": " 天前"
    },
    "en": {
        "Select All": "Select All",
        "Refresh": "Refresh",
        "New": "New",
        "New File": "New File",
        "New Folder": "New Folder",
        "Search": "Search",
        "Upload": "Upload",
        "Copy": "Copy",
        "Cut": "Cut",
        "Delete": "Delete",
        "Rename": "Rename",
        "Download": "Download",
        "Paste": "Paste",
        "Cancel": "Cancel",
        "Sort": "Sort",
        "Jump": "Jump",
        "Hidden": "Hidden",
        "View": "View",
        "Empty folder": "This folder is empty",
        "Filter ph": "Type to filter files in current directory...",
        "No WebDAV": "No reachable WebDAV service detected. Enter the WebDAV URL\n(e.g. {url})",
        "Invalid WebDAV": "That address is unreachable or not a WebDAV service. Try again.",
        "Upload file": "Uploading",
        "Upload failed": "Upload failed!",
        "Overwrite confirm": "' already exists. Overwrite? [Cancel = Skip]",
        "Delete confirm": "Delete the following items?\n",
        "More suffix": "\n... and {n} items in total",
        "Input folder name": "Folder name",
        "Default folder name": "New Folder",
        "Invalid folder name": "Invalid folder name or it already exists!",
        "Input file name": "File name",
        "Default file name": "New File",
        "Invalid file name": "Invalid file name or it already exists!",
        "Input new name": "New name:",
        "Jump prompt": "Enter a path to jump to (relative to WebDAV root):",
        "Readonly upload": "Read-only mode: uploading is disabled.",
        "Op failed": "Operation failed (HTTP {s}): {n}",
        "Back": "Back",
        "Save (Ctrl+S)": "Save (Ctrl+S)",
        "Run (Alt+Enter)": "Run (Alt-Enter)",
        "Loading": "Loading...",
        "Unsupported": "This file type cannot be previewed online. Use \"Download\" at the top right to get the file.",
        "Missing href": "Missing \"href\" parameter. Open this page from the file manager.",
        "Img load failed": "Failed to load image",
        "Load failed": "Failed to read file (HTTP {s})",
        "Save failed": "Failed to save (HTTP {s})",
        "Unsaved leave": "You have unsaved changes. Leave anyway?",
        "Preview title": "Preview",
        "Switch to EN": "中文",
        "Just now": "Just now",
        " minutes ago": " minutes ago",
        " hours ago": " hours ago",
        " days ago": " days ago"
    }
};

// 当前语言: localStorage 手动选择优先, 否则按浏览器语言检测 (zh* => 中文, 其余 => 英文)
function getLang() {
    if (typeof cacheLang !== "undefined" && cacheLang) return cacheLang;
    var stored = null;
    try { stored = localStorage.getItem('lang'); } catch (e) {}
    if (stored && i18nData[stored]) {
        cacheLang = stored;
    } else {
        var nav = (navigator.language || navigator.browserLanguage || "en").toLowerCase();
        cacheLang = nav.indexOf('zh') === 0 ? "zh-CN" : "en";
    }
    return cacheLang;
}

// 取词: t('Key') 返回当前语言文本, 缺失时回退键名
function t(key) {
    var lang = getLang();
    return (i18nData[lang] && i18nData[lang][key]) || key;
}

// 应用语言到 DOM: [i18n-key] 替换文本, [data-i18n-ph] 替换 placeholder
function applyI18n() {
    $('.i18n-key').each(function () {
        $(this).text(t($(this).attr('i18n-key')));
    });
    $('[data-i18n-ph]').each(function () {
        $(this).attr('placeholder', t($(this).attr('data-i18n-ph')));
    });
    $('[data-i18n-title]').each(function () {
        $(this).attr('title', t($(this).attr('data-i18n-title')));
    });
    if (document.title === "预览" || document.title === "Preview") document.title = t('Preview title');
}

// 切换语言并持久化; 传参指定语言, 不传参则在中/英间翻转
function changeLang(lang) {
    if (!lang) lang = getLang() === "zh-CN" ? "en" : "zh-CN";
    if (!i18nData[lang]) lang = "zh-CN";
    cacheLang = lang;
    try { localStorage.setItem('lang', lang); } catch (e) {}
    applyI18n();
    if (typeof updateLangBtn === "function") updateLangBtn();
    // 文件行的相对时间等文案是渲染时固化的, 切语言后重载当前目录保持一致
    if (typeof loadDir === "function" && typeof fs !== "undefined" && typeof curPath !== "undefined") {
        loadDir(fs.dir(curPath));
    }
}
