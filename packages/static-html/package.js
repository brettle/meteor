Package.describe({
  name: 'static-html',
  version: '0.0.1',
  // Brief, one-line summary of the package.
  summary: 'Allows static content to be defined in .html files',
  // URL to the Git repository containing the source code for this package.
  git: '',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: 'README.md'
});

Package.registerBuildPlugin({
  name: "compileStaticHtmlBatch",
  use: [
    'template-compiler',
    'ecmascript',
    'html-scanner',
    'underscore'
  ],
  sources: [
    'static-html.js'
  ]
});

Package.onUse(function(api) {
  api.use('isobuild:compiler-plugin@1.0.0');

  // Body attributes are compiled to code that uses Meteor.startup
  api.imply('meteor', 'client');
});
