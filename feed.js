const fs = require("fs");
const steem = require('steem');
const request = require("request");

var config = JSON.parse(fs.readFileSync("config.json"));

// Connect to the specified RPC node
var rpc_node = config.rpc_nodes ? config.rpc_nodes[0] : (config.rpc_node ? config.rpc_node : 'https://api.steemit.com');
steem.api.setOptions({ transport: 'http', uri: rpc_node, url: rpc_node });

function startProcess() {
  loadPrice(function (price) { publishFeed(price, 0); }, 0);
}
setInterval(startProcess, config.interval * 60 * 1000);
startProcess();

function publishFeed(price, retries) {
  var peg_multi = config.peg_multi ? config.peg_multi : 1;
  var exchange_rate = { base: price.toFixed(3) + ' SBD', quote: (1 / peg_multi).toFixed(3) + ' STEEM' };

  log('Broadcasting feed_publish transaction: ' + JSON.stringify(exchange_rate));

  steem.broadcast.feedPublish(config.active_key, config.account, exchange_rate, function (err, result) {
    if (result && !err) {
      log('Broadcast successful!');
    } else {
      log('Error broadcasting feed_publish transaction: ' + err);

      if (retries == 5)
        failover();

      if (retries < 10)
        setTimeout(function () { publishFeed(price, retries + 1); }, 60 * 1000);
    }
  });
}

function loadPrice(callback, retries) {
  log('Loading STEEM price...');

  // Load the price feed data
  request.get('https://api.coinmarketcap.com/v1/ticker/steem/', function (e, r, data) {
    try {
      var steem_price = parseFloat(JSON.parse(data)[0].price_usd);
      log("Loaded STEEM price: " + steem_price);

      if (callback)  
        callback(steem_price);
    } catch (err) {
      log('Error loading STEEM price: ' + err);

      if(retries < 10)
        setTimeout(function () { loadPrice(callback, retries + 1); }, 60 * 1000);
    }
  });
}

function failover() {
  if (config.rpc_nodes && config.rpc_nodes.length > 1) {
    var cur_node_index = config.rpc_nodes.indexOf(steem.api.options.url) + 1;

    if (cur_node_index == config.rpc_nodes.length)
      cur_node_index = 0;

    var rpc_node = config.rpc_nodes[cur_node_index];

    steem.api.setOptions({ transport: 'http', uri: rpc_node, url: rpc_node });
    utils.log('');
    utils.log('***********************************************');
    utils.log('Failing over to: ' + rpc_node);
    utils.log('***********************************************');
    utils.log('');
  }
}

function log(msg) { console.log(new Date().toString() + ' - ' + msg); }