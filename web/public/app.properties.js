var appOptions = window.appOptions = {};

var domain = window.location.hostname;
var port = window.location.port;

appOptions.socketEndpoint = 'ws://' + domain + ':' + port + '/ws';
appOptions.apiEndpoint = 'http://' + domain + ':' + port + '/api';
