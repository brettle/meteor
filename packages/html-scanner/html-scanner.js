HtmlScanner = class HtmlScanner {
  // Scan a template file for <head>, <body>, and <template>
  // tags and extract their contents.
  //
  // This is a primitive, regex-based scanner.  It scans
  // top-level tags, which are allowed to have attributes,
  // and ignores top-level HTML comments.

  // Note: source_name is only used for errors (so it's not part of the cache
  // key in compile-templates.js).
  scan(contents, sourceName) {
    this.rest = contents;
    this.index = 0;
    this.sourceName = sourceName;
    this.contents = contents;

    var results = {};
    results.head = '';
    results.body = '';
    results.js = '';
    results.bodyAttrs = {};

    tagNames = ["body", "head", "template"].join("|");
    var rOpenTag = new RegExp(`^((<(${tagNames})\\b)|(<!--)|(<!DOCTYPE|{{!)|$)`, "i");

    while (this.rest) {
      // skip whitespace first (for better line numbers)
      this.advance(this.rest.match(/^\s*/)[0].length);

      var match = rOpenTag.exec(this.rest);
      if (! match)
        this.throwParseError("Expected <template>, <head>, or <body> tag" +
                        " in template file");

      var matchToken = match[1];
      var matchTokenTagName =  match[3];
      var matchTokenComment = match[4];
      var matchTokenUnsupported = match[5];

      var tagStartIndex = this.index;
      this.advance(match.index + match[0].length);

      if (! matchToken)
        break; // matched $ (end of file)
      if (matchTokenComment === '<!--') {
        // top-level HTML comment
        var commentEnd = /--\s*>/.exec(this.rest);
        if (! commentEnd)
          this.throwParseError("unclosed HTML comment in template file");
        this.advance(commentEnd.index + commentEnd[0].length);
        continue;
      }
      if (matchTokenUnsupported) {
        switch (matchTokenUnsupported.toLowerCase()) {
        case '<!doctype':
          this.throwParseError(
            "Can't set DOCTYPE here.  (Meteor sets <!DOCTYPE html> for you)");
        case '{{!':
          this.throwParseError(
            "Can't use '{{! }}' outside a template.  Use '<!-- -->'.");
        }
        this.throwParseError();
      }

      // otherwise, a <tag>
      var tagName = matchTokenTagName.toLowerCase();
      var tagAttribs = {}; // bare name -> value dict
      var rTagPart = /^\s*((([a-zA-Z0-9:_-]+)\s*=\s*(["'])(.*?)\4)|(>))/;
      var attr;
      // read attributes
      while ((attr = rTagPart.exec(this.rest))) {
        var attrToken = attr[1];
        var attrKey = attr[3];
        var attrValue = attr[5];
        this.advance(attr.index + attr[0].length);
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
        this.throwParseError("Parse error in tag");
      // find </tag>
      var end = (new RegExp('</'+tagName+'\\s*>', 'i')).exec(this.rest);
      if (! end)
        this.throwParseError("unclosed <"+tagName+">");
      var tagContents = this.rest.slice(0, end.index);
      var contentsStartIndex = this.index;

      if (tagName === 'body') {
        this.addBodyAttrs(results, tagAttribs);
      }

      // act on the tag
      handleTag(results, tagName, tagAttribs, tagContents,
                              this.throwParseError.bind(this), contentsStartIndex,
                              tagStartIndex);

      // advance afterwards, so that line numbers in errors are correct
      this.advance(end.index + end[0].length);
    }

    return results;
  }

  advance(amount) {
    this.rest = this.rest.substring(amount);
    this.index += amount;
  }

  throwSpecialError(msg, errorClass, overrideIndex) {
    var ret = new errorClass;
    ret.message = msg;
    ret.file = this.sourceName;
    var theIndex = (typeof overrideIndex === 'number' ? overrideIndex : this.index);
    ret.line = this.contents.substring(0, theIndex).split('\n').length;
    throw ret;
  }

  throwParseError(msg, overrideIndex) {
    this.throwSpecialError(
      msg || "bad formatting in template file",
      HtmlScanner.ParseError,
      overrideIndex);
  }

  throwBodyAttrsError(msg) {
    this.throwSpecialError(msg, HtmlScanner.BodyAttrsError);
  }

  addBodyAttrs(results, attrs) {
    Object.keys(attrs).forEach((attr) => {
      var val = attrs[attr];

      if (results.bodyAttrs.hasOwnProperty(attr) && results.bodyAttrs[attr] !== val) {
        this.throwBodyAttrsError(
          "<body> declarations have conflicting values for the '" + attr + "' attribute.");
      }

      results.bodyAttrs[attr] = val;
    });
  }
};


// Has fields 'message', 'line', 'file'
HtmlScanner.ParseError = function () {};
HtmlScanner.BodyAttrsError = function () {};
