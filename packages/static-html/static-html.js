Plugin.registerCompiler({
  extensions: ['html'],
  archMatching: 'web',
  isTemplate: true
}, () => new TemplateCompiler("static-html", HtmlScanner, StaticHtmlTagHandler));

class StaticHtmlTagHandler {
  constructor() {
    this.results = {
      head: '',
      body: '',
      js: '',
      bodyAttrs: {}
    };
  }

  getResults() {
    return this.results;
  }

  handleTag(tag, throwCompileError) {
    const {
      tagName,
      attribs,
      contents,
      contentsStartIndex,
      tagStartIndex
    } = tag;

    // do we have 1 or more attribs?
    const hasAttribs = ! _.isEmpty(attribs);

    if (tagName === "head") {
      if (hasAttribs) {
        throwCompileError("Attributes on <head> not supported");
      }

      this.results.head += contents;
      return;
    }


    // <body> or <template>

    try {
      if (tagName === "body") {
        this.addBodyAttrs(attribs, throwCompileError);

        if (hasAttribs) {
          this.results.js += `
Meteor.startup(function() { $('body').attr(${JSON.stringify(attribs)}); });
`;
        }

        // We may be one of many `<body>` tags.
        this.results.body += contents;
      } else {
        throwCompileError("Expected <head> or <body> tag", tagStartIndex);
      }
    } catch (e) {
      if (e.scanner) {
        // The error came from Spacebars
        throwCompileError(e.message, contentsStartIndex + e.offset);
      } else {
        throw e;
      }
    }
  }

  addBodyAttrs(attrs, throwCompileError) {
    Object.keys(attrs).forEach((attr) => {
      const val = attrs[attr];

      if (this.results.bodyAttrs.hasOwnProperty(attr) && this.results.bodyAttrs[attr] !== val) {
        throwCompileError(
          `<body> declarations have conflicting values for the '${attr}' attribute.`);
      }

      this.results.bodyAttrs[attr] = val;
    });
  }
}

