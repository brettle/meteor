HtmlScanner = class HtmlScanner {
  // Scan a template file for <head>, <body>, and <template>
  // tags and extract their contents.
  //
  // This is a primitive, regex-based scanner.  It scans
  // top-level tags, which are allowed to have attributes,
  // and ignores top-level HTML comments.

  // Note: source_name is only used for errors (so it's not part of the cache
  // key in compile-templates.js).
  scan(contents, source_name) {
    var rest = contents;
    var index = 0;

    var advance = function(amount) {
      rest = rest.substring(amount);
      index += amount;
    };

    var throwSpecialError = function (msg, errorClass, overrideIndex) {
      var ret = new errorClass;
      ret.message = msg;
      ret.file = source_name;
      var theIndex = (typeof overrideIndex === 'number' ? overrideIndex : index);
      ret.line = contents.substring(0, theIndex).split('\n').length;
      throw ret;
    };
    var throwParseError = function (msg, overrideIndex) {
      throwSpecialError(
        msg || "bad formatting in template file",
        HtmlScanner.ParseError,
        overrideIndex);
    };
    var throwBodyAttrsError = function (msg) {
      throwSpecialError(msg, HtmlScanner.BodyAttrsError);
    };

    var results = {};
    results.head = '';
    results.body = '';
    results.js = '';
    results.bodyAttrs = {};

    tagNames = ["body", "head", "template"].join("|");
    var rOpenTag = new RegExp(`^((<(${tagNames})\\b)|(<!--)|(<!DOCTYPE|{{!)|$)`, "i");

    while (rest) {
      // skip whitespace first (for better line numbers)
      advance(rest.match(/^\s*/)[0].length);

      var match = rOpenTag.exec(rest);
      if (! match)
        throwParseError("Expected <template>, <head>, or <body> tag" +
                        " in template file");

      var matchToken = match[1];
      var matchTokenTagName =  match[3];
      var matchTokenComment = match[4];
      var matchTokenUnsupported = match[5];

      var tagStartIndex = index;
      advance(match.index + match[0].length);

      if (! matchToken)
        break; // matched $ (end of file)
      if (matchTokenComment === '<!--') {
        // top-level HTML comment
        var commentEnd = /--\s*>/.exec(rest);
        if (! commentEnd)
          throwParseError("unclosed HTML comment in template file");
        advance(commentEnd.index + commentEnd[0].length);
        continue;
      }
      if (matchTokenUnsupported) {
        switch (matchTokenUnsupported.toLowerCase()) {
        case '<!doctype':
          throwParseError(
            "Can't set DOCTYPE here.  (Meteor sets <!DOCTYPE html> for you)");
        case '{{!':
          throwParseError(
            "Can't use '{{! }}' outside a template.  Use '<!-- -->'.");
        }
        throwParseError();
      }

      // otherwise, a <tag>
      var tagName = matchTokenTagName.toLowerCase();
      var tagAttribs = {}; // bare name -> value dict
      var rTagPart = /^\s*((([a-zA-Z0-9:_-]+)\s*=\s*(["'])(.*?)\4)|(>))/;
      var attr;
      // read attributes
      while ((attr = rTagPart.exec(rest))) {
        var attrToken = attr[1];
        var attrKey = attr[3];
        var attrValue = attr[5];
        advance(attr.index + attr[0].length);
        if (attrToken === '>')
          break;
        // XXX we don't HTML unescape the attribute value
        // (e.g. to allow "abcd&quot;efg") or protect against
        // collisions with methods of tagAttribs (e.g. for
        // a property named toString)
        attrValue = attrValue.match(/^\s*([\s\S]*?)\s*$/)[1]; // trim
        tagAttribs[attrKey] = attrValue;
      }
      if (! attr) // didn't end on '>'
        throwParseError("Parse error in tag");
      // find </tag>
      var end = (new RegExp('</'+tagName+'\\s*>', 'i')).exec(rest);
      if (! end)
        throwParseError("unclosed <"+tagName+">");
      var tagContents = rest.slice(0, end.index);
      var contentsStartIndex = index;

      if (tagName === 'body') {
        this._addBodyAttrs(results, tagAttribs, throwBodyAttrsError);
      }

      // act on the tag
      handleTag(results, tagName, tagAttribs, tagContents,
                              throwParseError, contentsStartIndex,
                              tagStartIndex);

      // advance afterwards, so that line numbers in errors are correct
      advance(end.index + end[0].length);
    }

    return results;
  }

  _addBodyAttrs(results, attrs, throwBodyAttrsError) {
    Object.keys(attrs).forEach(function (attr) {
      var val = attrs[attr];

      if (results.bodyAttrs.hasOwnProperty(attr) && results.bodyAttrs[attr] !== val) {
        throwBodyAttrsError(
          "<body> declarations have conflicting values for the '" + attr + "' attribute.");
      }

      results.bodyAttrs[attr] = val;
    });
  }
};


// Has fields 'message', 'line', 'file'
HtmlScanner.ParseError = function () {};
HtmlScanner.BodyAttrsError = function () {};
