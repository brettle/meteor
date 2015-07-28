Plugin.registerCompiler({
  extensions: ['html'],
  archMatching: 'web',
  isTemplate: true
}, () => new TemplateCompiler("static-html", HtmlScanner, StaticHtmlTagHandler));
