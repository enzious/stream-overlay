'use strict'

var BEFORE_OPEN_TAG = /[\n\t\r ]+</mg
var AFTER_CLOSE_TAG = />[\n\t\r ]+/mg
var BEFORE_CLOSE_ATTR = /[ ]+>/mg
var MULTI_SPACE = /[\n\t\r ]{2,}/mg
var TRIM_WHITESPACE_PREFIX = /^[\n\t\r ]+/mg
var TRIM_WHITESPACE_SUFFIX = /[\n\t\r ]+$/mg

var babelPluginJsxSyntax = require('babel-plugin-syntax-jsx');
var BabelTypes = require('@babel/types');

var debug = false;

var currentLitElement = null;

module.exports = function () {
  return {
    inherits: babelPluginJsxSyntax,
    visitor: {
      TemplateLiteral: function (path) {
        if (debug) {
          console.log('TemplateLiteral', path.node);
          for (var i = 0; i < path.node.quasis.length; i++) {
            console.log('TemplateLiteral.qausis[' + i + ']', path.node.quasis[i].value)
          }
          //assert(false);
        }
      },
      CallExpression: function (path) {
        if (path.node.callee.name !== 'html') {
          return;
        }
        if (path.node.arguments && path.node.arguments[0] && BabelTypes.isJSXElement(path.node.arguments[0])) {
          currentLitElement = path.node.arguments[0];
          path.replaceWith(path.node.arguments[0]);
        }
      },
      JSXElement: function (path, stats) {

        if (debug) {
          console.log('JSXElement', path.node);
        }

        if (!(path.node && currentLitElement && path.node === currentLitElement)) {
          return;
        }
        currentLitElement = null;

        var output = stringifyJsxType(path.node);

        function stringifyJsxType(element, options)
        {
          var j = 0;

          var output = {
            quasis: [],
            expressions: [],
          };

          if (BabelTypes.isJSXElement(element)) {

            // Start opening element
            output.quasis[j] = (output.quasis[j] || '') + '<' + element.openingElement.name.name;

            // Attributes
            for (var i = 0; i < element.openingElement.attributes.length; i++) {
              var attr = element.openingElement.attributes[i];

              var name = attr.name.name;
              switch (name) {
                case 'className':
                  name = 'class';
                  break;
                default:
              }

              if (/^_prop/.test(name)) {
                name = '.' + name.substr('_prop'.length, 1).toLowerCase() + name.substr('_prop'.length + 1);
              } else if (/^_event/.test(name)) {
                name = '@' + name.substr('_event'.length, 1).toLowerCase() + name.substr('_event'.length + 1);
              }

              if (
                !(
                  name === 'selected'
                  && attr.value && attr.value.expression && attr.value.expression.name === 'undefined'
                )
              ) {
                output.quasis[j] = (output.quasis[j] || '') + ' ' + name;

                // value
                if (BabelTypes.isStringLiteral(attr.value)) {
                  output.quasis[j] = (output.quasis[j] || '') + '="' + attr.value.value.replace(/"/g, '&quot;') + '"';
                } else if (BabelTypes.isJSXElement(attr.value)) {
                } else if (BabelTypes.isJSXExpressionContainer(attr.value)) {
                  output.quasis[j] = (output.quasis[j] || '') + '="';
                  // to do: wrap this in string replace for double quotes.
                  if (name == 'selected') {
                    console.log(attr.value.expression);
                  }
                  output.expressions.push(attr.value.expression);
                  if (output.quasis.length < output.expressions.length) {
                    output.quasis.push('');
                  }
                  j++;
                  output.quasis[j] = (output.quasis[j] || '') + '"';
                }
              }
            }

            // End opening element
            output.quasis[j] = (output.quasis[j] || '') + (element.openingElement.selfClosing ? '/' : '') + '>';

            // Content
            var child;
            for (var i = 0; i < element.children.length; i++) {

              var child = element.children[i];

              var templateLiteral = stringifyJsxType(child, {
                firstChild: i === 0,
                lastChild: i === element.children.length - 1,
              });

              if (templateLiteral.quasis.length > 0) {
                for (var k = 0; k < templateLiteral.quasis.length; k++) {
                  output.quasis[j] = (output.quasis[j] || '') + templateLiteral.quasis[k];
                  if (templateLiteral.expressions[k] !== undefined) {
                    output.expressions.push(templateLiteral.expressions[k]);
                    output.quasis.push('');
                    j++;
                  }
                }
              } else {
                for (var k = 0; k < templateLiteral.expressions.length; k++) {
                  output.expressions.push(templateLiteral.expressions[k]);
                  j++;
                }
              }

              // Need to get this in above.
              /*if (
                !(
                  (i === 0 || i == element.children.length - 1)
                  && BabelTypes.isJSXText(child) && text === ' '
                )
              ) {
                output.quasis[j] += text;
              }*/

            }

            // Closing element
            if (!element.openingElement.selfClosing) {
              output.quasis[j] = (output.quasis[j] || '') + '</' + element.openingElement.name.name + '>';
            }

          } else if (BabelTypes.isJSXText(element)) {

            var value = String(element.value)
              .replace(BEFORE_OPEN_TAG, '<')
              .replace(AFTER_CLOSE_TAG, '>')
              .replace(BEFORE_CLOSE_ATTR, '>')
              .replace(MULTI_SPACE, ' ');

            if (options.firstChild) {
              value = value.replace(TRIM_WHITESPACE_PREFIX, '');
            }
            if (options.lastChild) {
              value = value.replace(TRIM_WHITESPACE_SUFFIX, '');
            }

            output.quasis[j] = (output.quasis[j] || '') + value;

          } else if (BabelTypes.isJSXExpressionContainer(element)) {

            if (debug) {
              console.log('JSXExpression', element);
              //assert(false);
            }

            output.expressions.push(element.expression);
            if (output.quasis.length < output.expressions.length) {
              output.quasis.push('');
            }
            j++;
          }/* else if (BabelTypes.isCallExpression(element)) {

          } else {

          }*/

          return output;
        }

        var quasis = [];
        for (var i = 0; i < output.quasis.length; i++) {
          quasis[i] = BabelTypes.templateElement({ raw: output.quasis[i], cooked: output.quasis[i], });
        }

        if (debug) {
          console.log('TemplateLiteralOutput', output);
          //assert(false);
        }

        let template = BabelTypes.templateLiteral(
          quasis,
          output.expressions,
        );

        path.replaceWith(
          BabelTypes.taggedTemplateExpression(
            BabelTypes.identifier("html"),
            template,
          )
          //BabelTypes.templateLiteral([], [])
        );
      }
    }
  };
};
