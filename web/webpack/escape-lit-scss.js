module.exports = function(content) {
  var out = JSON.stringify(content);
  return out.substr(1, out.length - 2);
};
