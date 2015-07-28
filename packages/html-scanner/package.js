Package.describe({
  version: '1.0.0',
  // Brief, one-line summary of the package.
  summary: 'Scan an HTML file for top-level tags and attributes',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.addFiles('html-scanner.js');
  api.export('HtmlScanner');

  api.use([
    'spacebars-compiler'
  ]);
});

Package.onTest(function(api) {
  api.use([
    'tinytest',
    'html-scanner',

    // minifiers is a weak dependency of spacebars-compiler; adding it here
    // ensures that the output is minified.  (Having it as a weak dependency means
    // that we don't ship uglify etc with built apps just because
    // boilerplate-generator uses spacebars-compiler.)
    // XXX maybe uglify should be applied by this plugin instead of via magic
    // weak dependency.
    'minifiers'
  ]);
  api.addFiles('html-scanner-tests.js', 'server');
});
