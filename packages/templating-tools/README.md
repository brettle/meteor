# templating-tools

Has some conveniently abstracted functions that are used together with the `caching-html-compiler` package to implement different template compilers:

1. `templating`
2. `static-html`

---------

### TemplatingTools.scanHtmlForTags(options)

Scan an HTML file for top-level tags as specified by `options.tagNames`, and return an array of `Tag` objects. See more about `Tag` objects below.

#### Options

1. `sourceName` the name of the input file, used when throwing errors.
2. `contents` the contents of the input file, these are parsed to find the top-level tags
3. `tagNames` the top-level tags to look for in the HTML.

#### Example

```js
const tags = scanHtmlForTags({
  sourceName: inputPath,
  contents: contents,
  tagNames: ["body", "head", "template"]
});
```

### TemplatingTools.compileTagsWithSpacebars(tags)

Transform an array of tags into a result object of the following form:

```js
{
  js: String,
  body: "",
  head: String,
  bodyAttrs: {
    [attrName]: String
  }
}
```

1. The contents of every `<template>` and `<body>` tag will be compiled into JavaScript with `spacebars-compiler`, and the code appended to the `js` field of the result.
2. The contents of every `<head>` tag will be concatenated into the `head` field of the result.
3. Any attributes found on `<body>` tags will be added to the `bodyAtts` field of the result.
4. Every `<template>` tag is required to have a `name` attribute, and no other attributes.
5. The `<head>` tag is not allowed to have any attributes.

### TemplatingTools.CompileError

This error is thrown when a compilation error happens.

### Tag object

The `scanHtml` and `compileTagsWithSpacebars` functions communicate via an array of Tag objects, which have the following form:

```js
{
  // Name of the tag - "body", "head", "template", etc
  tagName: String,
  
  // Attributes on the tag
  attribs: { [attrName]: String },
  
  // Contents of the tag
  contents: String,
  
  // Starting index of the opening tag in the source file
  // (used to throw informative errors)
  tagStartIndex: Number,
  
  // Starting index of the contents of the tag in the source file
  // (used to throw informative errors)
  contentsStartIndex: Number,
  
  // The contents of the entire source file, should be used only to
  // throw informative errors (for example, this can be used to
  // determine the line number for an error)
  fileContents: String,
  
  // The file name of the initial source file, used to throw errors
  sourceName: String
};
```