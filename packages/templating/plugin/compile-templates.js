Plugin.registerCompiler({
  extensions: ['html'],
  archMatching: 'web',
  isTemplate: true
}, () => new TemplateCompiler(
  "templating",
  TemplatingTools.scanHtmlForTags,
  TemplatingTools.compileTagsWithSpacebars
));
