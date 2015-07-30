Plugin.registerCompiler({
  extensions: ['html'],
  archMatching: 'web',
  isTemplate: true
}, () => new TemplateCompiler("templating", HtmlScanner.scan, compileTagsWithSpacebars));
