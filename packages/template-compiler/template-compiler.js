const path = Plugin.path;

// The CompileResult type for this CachingCompiler is the return value of
// htmlScanner.scan: a {js, head, body, bodyAttrs} object.
TemplateCompiler = class TemplateCompiler extends CachingCompiler {
  constructor(name, tagScannerClass, tagHandlerClass) {
    super({
      compilerName: name,
      defaultCacheSize: 1024*1024*10,
    });

    this._bodyAttrInfo = null;

    this._tagScannerClass = tagScannerClass;
    this._tagHandlerClass = tagHandlerClass;
  }

  compileResultSize(compileResult) {
    function lengthOrZero(field) {
      return field ? field.length : 0;
    }
    return lengthOrZero(compileResult.head) + lengthOrZero(compileResult.body) +
      lengthOrZero(compileResult.js);
  }

  processFilesForTarget(inputFiles) {
    this._bodyAttrInfo = {};
    super.processFilesForTarget(inputFiles);
  }

  getCacheKey(inputFile) {
    // Note: the path is only used for errors, so it doesn't have to be part
    // of the cache key.
    return inputFile.getSourceHash();
  }

  compileOneFile(inputFile) {
    const contents = inputFile.getContentsAsString();
    const inputPath = inputFile.getPathInPackage();
    try {
      const tagHandler = new this._tagHandlerClass();

      const scanner = new this._tagScannerClass({
        sourceName: inputPath,
        contents: contents,
        tagNames: ["body", "head", "template"],
        tagHandler: tagHandler,
        compileErrorClass: TemplateCompiler.CompileError
      });

      return tagHandler.getResults();
    } catch (e) {
      if (e instanceof TemplateCompiler.CompileError) {
        inputFile.error({
          message: e.message,
          line: e.line
        });
        return null;
      } else {
        throw e;
      }
    }
  }

  addCompileResult(inputFile, compileResult) {
    if (compileResult.head) {
      inputFile.addHtml({ section: "head", data: compileResult.head });
    }

    if (compileResult.body) {
      inputFile.addHtml({ section: "body", data: compileResult.body });
    }

    if (compileResult.js) {
      const filePath = inputFile.getPathInPackage();
      // XXX this path manipulation may be unnecessarily complex
      let pathPart = path.dirname(filePath);
      if (pathPart === '.')
        pathPart = '';
      if (pathPart.length && pathPart !== path.sep)
        pathPart = pathPart + path.sep;
      const ext = path.extname(filePath);
      const basename = path.basename(filePath, ext);

      // XXX generate a source map

      inputFile.addJavaScript({
        path: path.join(pathPart, "template." + basename + ".js"),
        data: compileResult.js
      });
    }

    Object.keys(compileResult.bodyAttrs).forEach((attr) => {
      const value = compileResult.bodyAttrs[attr];
      if (this._bodyAttrInfo.hasOwnProperty(attr) &&
          this._bodyAttrInfo[attr].value !== value) {
        // two conflicting attributes on <body> tags in two different template
        // files
        inputFile.error({
          message:
          `<body> declarations have conflicting values for the '${ attr }' ` +
            `attribute in the following files: ` +
            this._bodyAttrInfo[attr].inputFile.getPathInPackage() +
            `, ${ inputFile.getPathInPackage() }`
        });
      } else {
        this._bodyAttrInfo[attr] = {inputFile, value};
      }
    });
  }
}

TemplateCompiler.CompileError = function () {};
