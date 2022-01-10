function getLang(){undefined
    if(typeof(cacheLang) != "undefined"){
        return cacheLang;
    }
    if (navigator.language) {
        cacheLang = navigator.language.toLowerCase();
        return cacheLang;
    }else {
        cacheLang = navigator.browserLanguage.toLowerCase();
        return cacheLang;
    }
}
var defaultLang = "zh-CN";
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
        "Sort": "排序"
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
        "Sort": "Sort"
    }
};
function changeLang(lang){
    if(!lang) lang = defaultLang;
    $('.i18n-key').each(function(){
        $(this).text(i18nData[lang][$(this).attr('i18n-key')]);
    });
}