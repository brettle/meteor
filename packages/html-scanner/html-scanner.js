HtmlScanner = {
  scan(sourceName, contents, tagNames) {
    const scanInstance = new SingleFileScan(sourceName, contents, tagNames);
    return scanInstance.getResults();
  },

  // Has fields 'message', 'line', 'file'
  ParseError() {},
  BodyAttrsError() {}
}

class SingleFileScan {
  // Scan a template file for <head>, <body>, and <template>
  // tags and extract their contents.
  //
  // This is a primitive, regex-based scanner.  It scans
  // top-level tags, which are allowed to have attributes,
  // and ignores top-level HTML comments.

  // Configure which top-level tags this scanner accepts; all others will cause
  // an error
  constructor(sourceName, contents, tagNames) {
    this.sourceName = sourceName;
    this.contents = contents;
    this.tagNames = tagNames;

    this.rest = contents;
    this.index = 0;

    this.results = {
      head: '',
      body: '',
      js: '',
      bodyAttrs: {}
    };

    tagNameRegex = this.tagNames.join("|");
    const rOpenTag = new RegExp(`^((<(${tagNameRegex})\\b)|(<!--)|(<!DOCTYPE|{{!)|$)`, "i");

    while (this.rest) {
      // skip whitespace first (for better line numbers)
      this.advance(this.rest.match(/^\s*/)[0].length);

      const match = rOpenTag.exec(this.rest);
      if (! match)
        this.throwParseError(`Expected one of: <${this.tagNames.join('>, <')}>`);

      const matchToken = match[1];
      const matchTokenTagName =  match[3];
      const matchTokenComment = match[4];
      const matchTokenUnsupported = match[5];

      const tagStartIndex = this.index;
      this.advance(match.index + match[0].length);

      if (! matchToken)
        break; // matched $ (end of file)
      if (matchTokenComment === '<!--') {
        // top-level HTML comment
        const commentEnd = /--\s*>/.exec(this.rest);
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
      const tagName = matchTokenTagName.toLowerCase();
      const tagAttribs = {}; // bare name -> value dict
      const rTagPart = /^\s*((([a-zA-Z0-9:_-]+)\s*=\s*(["'])(.*?)\4)|(>))/;
      let attr;
      // read attributes
      while ((attr = rTagPart.exec(this.rest))) {
        const attrToken = attr[1];
        const attrKey = attr[3];
        let attrValue = attr[5];
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
      const end = (new RegExp('</'+tagName+'\\s*>', 'i')).exec(this.rest);
      if (! end)
        this.throwParseError("unclosed <"+tagName+">");
      const tagContents = this.rest.slice(0, end.index);
      const contentsStartIndex = this.index;

      if (tagName === 'body') {
        this.addBodyAttrs(tagAttribs);
      }

      // act on the tag
      handleTag(this.results, tagName, tagAttribs, tagContents,
                              this.throwParseError.bind(this), contentsStartIndex,
                              tagStartIndex);

      // advance afterwards, so that line numbers in errors are correct
      this.advance(end.index + end[0].length);
    }
  }

  advance(amount) {
    this.rest = this.rest.substring(amount);
    this.index += amount;
  }

  throwSpecialError(msg, errorClass, overrideIndex) {
    const ret = new errorClass;
    ret.message = msg;
    ret.file = this.sourceName;
    const theIndex = (typeof overrideIndex === 'number' ? overrideIndex : this.index);
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

  addBodyAttrs(attrs) {
    Object.keys(attrs).forEach((attr) => {
      const val = attrs[attr];

      if (this.results.bodyAttrs.hasOwnProperty(attr) && this.results.bodyAttrs[attr] !== val) {
        this.throwBodyAttrsError(
          "<body> declarations have conflicting values for the '" + attr + "' attribute.");
      }

      this.results.bodyAttrs[attr] = val;
    });
  }

  getResults() {
    return this.results;
  }
}
