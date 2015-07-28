SpacebarsTagHandler = class SpacebarsTagHandler {
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
      if (tagName === "template") {
        const name = attribs.name;

        if (! name) {
          throwCompileError("Template has no 'name' attribute");
        }

        if (SpacebarsCompiler.isReservedName(name)) {
          throwCompileError(`Template can't be named "${name}"`);
        }

        const renderFuncCode = SpacebarsCompiler.compile(contents, {
          isTemplate: true,
          sourceName: `Template "${name}"`
        });

        const nameLiteral = JSON.stringify(name);
        const templateDotNameLiteral = JSON.stringify(`Template.${name}`);

        this.results.js += `
Template.__checkName(${nameLiteral});
Template[${nameLiteral}] = new Template(${templateDotNameLiteral}, ${renderFuncCode});
`;
      } else if (tagName === "body") {
        this.addBodyAttrs(attribs, throwCompileError);

        // <body>
        if (hasAttribs) {
          this.results.js += `
Meteor.startup(function() { $('body').attr(${JSON.stringify(attribs)}); });
`;
        }

        const renderFuncCode = SpacebarsCompiler.compile(contents, {
          isBody: true,
          sourceName: "<body>"
        });

        // We may be one of many `<body>` tags.
        this.results.js += `
Template.body.addContent(${renderFuncCode});
Meteor.startup(Template.body.renderToDocument);
`;
      } else {
        throwCompileError("Expected <template>, <head>, or <body> tag in template file", tagStartIndex);
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
