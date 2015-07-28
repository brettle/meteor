handleTag = function handleTag(results, tagName, attribs, contents, throwParseError,
                        contentsStartIndex, tagStartIndex) {
  // trim the tag contents.
  // this is a courtesy and is also relied on by some unit tests.
  var m = contents.match(/^([ \t\r\n]*)([\s\S]*?)[ \t\r\n]*$/);
  contentsStartIndex += m[1].length;
  contents = m[2];

  // do we have 1 or more attribs?
  var hasAttribs = false;
  for(var k in attribs) {
    if (attribs.hasOwnProperty(k)) {
      hasAttribs = true;
      break;
    }
  }

  if (tagName === "head") {
    if (hasAttribs)
      throwParseError("Attributes on <head> not supported");
    results.head += contents;
    return;
  }


  // <body> or <template>

  try {
    if (tagName === "template") {
      var name = attribs.name;
      if (! name)
        throwParseError("Template has no 'name' attribute");

      if (SpacebarsCompiler.isReservedName(name))
        throwParseError("Template can't be named \"" + name + "\"");

      var renderFuncCode = SpacebarsCompiler.compile(
        contents, {
          isTemplate: true,
          sourceName: 'Template "' + name + '"'
        });

      var nameLiteral = JSON.stringify(name);
      var templateDotNameLiteral = JSON.stringify("Template." + name);

      results.js += "\nTemplate.__checkName(" + nameLiteral + ");\n" +
        "Template[" + nameLiteral + "] = new Template(" +
        templateDotNameLiteral + ", " + renderFuncCode + ");\n";
    } else if (tagName === "body") {
      addBodyAttrs(results, attribs, throwParseError);

      // <body>
      if (hasAttribs) {
        results.js += "\nMeteor.startup(function() { $('body').attr(" + JSON.stringify(attribs) + "); });\n";
      }

      var renderFuncCode = SpacebarsCompiler.compile(
        contents, {
          isBody: true,
          sourceName: "<body>"
        });

      // We may be one of many `<body>` tags.
      results.js += "\nTemplate.body.addContent(" + renderFuncCode + ");\nMeteor.startup(Template.body.renderToDocument);\n";
    } else {
      throwParseError("Expected <template>, <head>, or <body> tag in template file", tagStartIndex);
    }
  } catch (e) {
    if (e.scanner) {
      // The error came from Spacebars
      throwParseError(e.message, contentsStartIndex + e.offset);
    } else {
      throw e;
    }
  }
}

function addBodyAttrs(results, attrs, throwParseError) {
  Object.keys(attrs).forEach((attr) => {
    const val = attrs[attr];

    if (results.bodyAttrs.hasOwnProperty(attr) && results.bodyAttrs[attr] !== val) {
      throwParseError(
        "<body> declarations have conflicting values for the '" + attr + "' attribute.");
    }

    results.bodyAttrs[attr] = val;
  });
}
