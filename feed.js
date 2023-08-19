const fs = require("fs");
const steem = require('steem');
const request = require("request");

var config = JSON.parse(fs.readFileSync("config.json"));

// Connect to the specified RPC node
var rpc_node = config.rpc_nodes ? config.rpc_nodes[0] : (config.rpc_node ? config.rpc_node : 'https://api.steemit.com');
steem.api.setOptions({ transport: 'http', uri: rpc_node, url: rpc_node });

setInterval(startProcess, config.interval * 60 * 1000);
startProcess();

function startProcess() {
  if (config.exchanges && config.exchanges.length > 0) {
    var prices = [];

    if (config.exchanges.indexOf('bittrex') >= 0) {
      loadPriceBittrex(function (price) {
        prices.push(price);
        if (prices.length === config.exchanges.length) {
          publishAverageFeed(prices);
        }
      }, 0);
    }

    if (config.exchanges.indexOf('binance') >= 0) {
      loadPriceBinance(function (price) {
        prices.push(price);
        if (prices.length === config.exchanges.length) {
          publishAverageFeed(prices);
        }
      }, 0);
    }
  }
}

function publishAverageFeed(prices) {
  var average_price = prices.reduce((total, price) => total + price, 0) / prices.length;
  var peg_multi = config.peg_multi ? config.peg_multi : 1;
  var exchange_rate = { base: average_price.toFixed(3) + ' SBD', quote: (1 / peg_multi).toFixed(3) + ' STEEM' };

  log('Publishing average feed_publish transaction: ' + JSON.stringify(exchange_rate));

  steem.broadcast.feedPublish(config.active_key, config.account, exchange_rate, function (err, result) {
    if (result && !err) {
      log('Broadcast successful!');
    } else {
      log('Error broadcasting feed_publish transaction: ' + err);
    }
  });
}

function loadPriceBittrex(callback, retries) {
  request.get('https://api.bittrex.com/v3/markets/STEEM-USDT/ticker', function (e, r, usdt_data) {
    try {
      steem_price = parseFloat(JSON.parse(usdt_data).lastTradeRate);
      log('Loaded STEEM Price from Bittrex: ' + steem_price);

      if (callback)
        callback(steem_price);
    } catch (err) {
      log('Error loading STEEM price from Bittrex: ' + err);

      if (retries < 2)
        setTimeout(function () {
          loadPriceBittrex(callback, retries + 1);
        }, 10 * 1000);
    }
  });
}

function loadPriceBinance(callback, retries) {
  request.get('https://api.binance.com/api/v3/ticker/price?symbol=STEEMUSDT', function (e, r, usdt_data) {
    try {
      steem_price = parseFloat(JSON.parse(usdt_data).price);
      log('Loaded STEEM Price from Binance: ' + steem_price);

      if (callback)
        callback(steem_price);
    } catch (err) {
      log('Error loading STEEM price from Binance: ' + err);

      if (retries < 2)
        setTimeout(function () {
          loadPriceBinance(callback, retries + 1);
        }, 10 * 1000);
    }
  });
}

function log(msg) {
  console.log(new Date().toString() + ' - ' + msg);
}
