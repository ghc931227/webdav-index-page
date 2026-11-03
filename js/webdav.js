// A raw WebDAV interface
var WebDAV = {

  OPTIONS: function(url, callback) {
    return this.request('OPTIONS', url, {}, null, 'text', callback);
  },

  GET: function(url, callback) {
    return this.request('GET', url, {}, null, 'text', callback);
  },

  PROPFIND: function(url, callback) {
    return this.request('PROPFIND', url, {Depth: "1"}, null, 'xml', callback);
  },

  MKCOL: function(url, callback) {
    return this.request('MKCOL', url, {}, null, 'text', callback);
  },
  
  DELETE: function(url, callback) {
    return this.request('DELETE', url, {}, null, 'text', callback);
  },

  COPY: function(url, tourl, callback) {
    return this.request('COPY', url, {'Overwrite': 'T', 'Destination': tourl}, null, 'text', callback);
  },

  MOVE: function(url, tourl, callback) {
    return this.request('MOVE', url, {'Overwrite': 'T', 'Destination': tourl}, null, 'text', callback);
  },

  PUT: function(url, data, callback, onload, onerror, onuploadstart, onuploadprogress) {
    return this.request('PUT', url, {}, data, 'text', callback, onload, onerror, onuploadstart, onuploadprogress);
  },

  STSTUS_CODE:  {
    '100': 'Continue',
    '101': 'Switching Protocols',
    '102': 'Processing',
    '200': 'OK',
    '201': 'Created',
    '202': 'Accepted',
    '203': 'None-Authoritive Information',
    '204': 'No Content',
    '205': 'Reset Content',
    '206': 'Partial Content',
    '207': 'Multi-Status',
    '300': 'Multiple Choices',
    '301': 'Moved Permanently',
    '302': 'Found',
    '303': 'See Other',
    '304': 'Not Modified',
    '305': 'Use Proxy',
    '307': 'Redirect',
    '400': 'Bad Request',
    '401': 'Unauthorized',
    '402': 'Payment Required',
    '403': 'Forbidden',
    '404': 'Not Found',
    '405': 'Method Not Allowed',
    '406': 'Not Acceptable',
    '407': 'Proxy Authentication Required',
    '408': 'Request Time-out',
    '409': 'Conflict',
    '410': 'Gone',
    '411': 'Length Required',
    '412': 'Precondition Failed',
    '413': 'Request Entity Too Large',
    '414': 'Request-URI Too Large',
    '415': 'Unsupported Media Type',
    '416': 'Requested range not satisfiable',
    '417': 'Expectation Failed',
    '422': 'Unprocessable Entity',
    '423': 'Locked',
    '424': 'Failed Dependency',
    '500': '',
    '501': 'Not Implemented',
    '502': 'Bad Gateway',
    '503': 'Service Unavailable',
    '504': 'Gateway Time-out',
    '505': 'HTTP Version not supported',
    '507': 'Insufficient Storage'
  },

  EXPECT_CODE: {
    'PROPFIND': '207',
    'MKCOL': '201',
    'MOVE': '201',
    'COPY': '201',
    'DELETE': '204',
    'PUT': '201'
  },

  request: function(verb, url, headers, data, type, callback, onload, onerror, onuploadstart, onuploadprogress) {
    try{
      var xhr = new XMLHttpRequest();
      var body = function() {
        var resbody = xhr.responseText;
        if (type == 'xml') {
          var xml = xhr.responseXML;
          if(!xml) {
            resbody = resbody.replace('Internal Server Error', '');
            var parser = new DOMParser;
            xml = parser.parseFromString(resbody, 'text/xml');
          }
          resbody = xml.firstChild.nextSibling ? xml.firstChild.nextSibling : xml.firstChild;
        }
        return resbody;
      };

      if(callback) {
        xhr.onreadystatechange = function() {
          if(xhr.readyState == 4) { // complete.
            const status = xhr.status.toString();
            if(status === '401' && !WebDAV._unauthorizedAlerted) {
              WebDAV._unauthorizedAlerted = true;
              alert('WebDAV 认证失败 (401): 用户名或密码错误, 或无访问权限');
            }
            const resbody = body();
            if(resbody || resbody === '') {
              callback(resbody, status);
            }
          }
        };
      }

      xhr.upload.onloadstart = onuploadstart;
      xhr.upload.onprogress = onuploadprogress;
      xhr.onload = onload;
      xhr.onerror = onerror;

      xhr.open(verb, url, !!callback);
      xhr.setRequestHeader("Content-Type", "text/xml; charset=UTF-8");
      for (var header in headers) {
        xhr.setRequestHeader(header, headers[header]);
      }

      xhr.send(data);

      if(!callback) {
        return body();
      }
    }catch (e) {
      if(onerror){
        onerror(e);
      }else{
        var msg = 'Unable to call remote server';
        if (e.message) {
          msg += ', ' + e.message;
        }
        alert(e.name + ': ' + msg);
      }
    }
  }
};

// 按局部名查找第一个后代元素(兼容不同命名空间前缀: D:/d:/默认命名空间)
function firstByLocalName(elem, localName) {
  var nodes = elem.getElementsByTagNameNS('*', localName);
  return nodes.length ? nodes[0] : null;
}

// An Object-oriented API around WebDAV.
WebDAV.Fs = function(rootUrl) {
  this.rootUrl = rootUrl;
  var fs = this;
  
  this.file = function(href) {
    this.type = 'file';

    this.url = fs.urlFor(href);

    this.name = fs.nameFor(this.url);

    this.doctype = fs.doctypeFor(this.name);

    this.read = function(callback) {
      return WebDAV.GET(this.url + '?time=' + new Date().getTime(), callback);
    };

    this.write = function(data, callback) {
      return WebDAV.PUT(this.url, data, callback);
    };

    this.rm = function(callback) {
      return WebDAV.DELETE(this.url, callback);
    };

    return this;
  };
  
  this.dir = function(href) {
    this.type = 'dir';

    this.url = fs.urlFor(href);

    this.name = fs.nameFor(this.url);

    this.children = function(callback) {
      var childrenFunc = function(doc) {
        if(doc.childNodes == null) {
          throw('No such directory: ' + doc);
        }
        var result = [];
        var responses = doc.getElementsByTagNameNS('*', 'response');
        // Start at 1, because the 0th is the same as self.
        for(var i=1; i < responses.length; i++) {
          var response = responses[i];
          var hrefEl   = firstByLocalName(response, 'href');
          if(!hrefEl || !hrefEl.firstChild) continue;
          var href     = hrefEl.firstChild.nodeValue;
          href = href.replace(/\/$/, ''); // Strip trailing slash
          var prop          = firstByLocalName(response, 'prop');
          var contentlength = prop ? firstByLocalName(prop, 'getcontentlength') : null;
          if(contentlength && contentlength.firstChild){
            contentlength = contentlength.firstChild.nodeValue;
          } else {
            contentlength = null;
          }
          var lastmodifiedEl = prop ? firstByLocalName(prop, 'getlastmodified') : null;
          var lastmodified   = (lastmodifiedEl && lastmodifiedEl.firstChild) ? lastmodifiedEl.firstChild.nodeValue : '';
          var resourcetype   = prop ? firstByLocalName(prop, 'resourcetype') : null;
          var collection     = resourcetype ? firstByLocalName(resourcetype, 'collection') : null;

          var obj;
          if(collection) {
            obj = new fs.dir(href);
          } else {
            obj = new fs.file(href);
          }
          obj.contentlength = parseInt(contentlength) || 0;
          obj.size = fs.sizeFor(contentlength);
          obj.time = (new Date(lastmodified) || new Date(0)).getTime();
          obj.lastmodified = lastmodified ? fs.timeFor(lastmodified) : '';
          result.push(obj);
        }
        return result;
      };

      
      if(callback) {
        WebDAV.PROPFIND(this.url, function(doc) {
          callback(childrenFunc(doc));
        });
      } else {
        return childrenFunc(WebDAV.PROPFIND(this.url));
      }
    };

    this.rm = function(callback) {
      return WebDAV.DELETE(this.url, callback);
    };

    this.upload = function(filename, filedata, callback, onload, onerror, onuploadstart, onuploadprogress) {
      return WebDAV.PUT(this.url + '/' + encodeURIComponent(filename), filedata, callback, onload, onerror, onuploadstart, onuploadprogress);
    };

    this.mkdir = function(dirname, callback) {
      return WebDAV.MKCOL(this.url + '/' + encodeURIComponent(dirname), callback);
    };

    return this;
  };
  
  this.urlFor = function(href) {
    if(/^http/.test(href)) return href;
    // href 为服务器绝对路径时, 去掉与 root 重复的路径部分, 避免路径翻倍
    var rootPath = this.rootUrl.replace(/^https?:\/\/[^\/]+/, '');
    if(rootPath && href.indexOf(rootPath) === 0){
      href = href.substring(rootPath.length);
    }
    return this.rootUrl + href;
  };
  
  this.nameFor = function(url) {
    return decodeURIComponent(url.replace(/.*\/(.*)/, '$1'));
  };

  this.doctypeFor = function(name) {
    var spl = name.split('.');
    var ext = spl[spl.length - 1].toLowerCase();
    if(['png', 'jpg', 'jpeg', 'bmp', 'gif', 'webp', 'psd', 'svg', 'tiff', 'ico'].indexOf(ext) !== -1){
      return 'image';
    }
    if(['mp4', 'avi', 'flv', 'mpeg', 'mpg', 'mkv', 'wmv', '3gp', 'mov', 'm4v', 'webm', 'ts'].indexOf(ext) !== -1){
      return 'video';
    }
    if(['mp3', 'aac', 'wma', 'flac', 'ogg', 'wav', 'm4a', 'opus', 'ape'].indexOf(ext) !== -1){
      return 'audio';
    }
    if(ext === 'pdf'){
      return 'pdf';
    }
    if(['txt', 'log', 'json', 'out', 'xml', 'cmd', 'bat', 'ps1', 'sh', 'config', 'md', 'markdown', 'conf', 'ini', 'properties', 'pid', 'yml', 'yaml', 'toml', 'pl', 'vim', 'dict', 'html', 'htm', 'js', 'css', 'sql', 'csv', 'java', 'ahk', 'c', 'cpp', 'hpp', 'h', 'go', 'py', 'php', 'rb', 'rs', 'diff', 'license', 'readme', 'env', 'gitignore'].indexOf(ext) !== -1){
      return  'text';
    }
    return '';
  };

  this.sizeFor = function(contentlength) {
    // 目录/缺失 getcontentlength 时返回 null, 由调用方显示 '--'
    if(contentlength === null || contentlength === undefined || isNaN(contentlength)) return null;
    var bytes = parseInt(contentlength);
    var symbols = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    var exp = Math.floor(Math.log(bytes)/Math.log(2));
    if (exp < 1) {
        exp = 0;
    }
    var i = Math.floor(exp / 10);
    bytes = bytes / Math.pow(2, 10 * i);

    if (bytes.toString().length > bytes.toFixed(2).toString().length) {
        bytes = bytes.toFixed(2);
    }
    return bytes + ' ' + symbols[i];
  };

  this.timeFor = function(lastmodified){
    var date = new Date(lastmodified);
    if(date.getTime() > 0 || date.getTime() < 0 || date.getTime() == 0){
      return date.getFullYear() + '-' + 
            ((date.getMonth() + 1 + '').length == 1 ? '0' + (date.getMonth() + 1) : (date.getMonth() + 1)) + '-' + 
            ((date.getDate() + '').length == 1 ? '0' + date.getDate() : date.getDate()) + ' ' + 
            ((date.getHours() + '').length == 1 ? '0' + date.getHours() : date.getHours()) + ':' + 
            ((date.getMinutes() + '').length == 1 ? '0' + date.getMinutes() : date.getMinutes()) + ':' + 
            ((date.getSeconds() + '').length == 1 ? '0' + date.getSeconds() : date.getSeconds());
    }
     return '';
  };

  return this;
};