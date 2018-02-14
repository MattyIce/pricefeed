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
  if(config.exchanges && config.exchanges.length > 0) {
    var prices = [];

    if(config.exchanges.indexOf('bittrex') >= 0) {
      loadPriceBittrex(function (price) {
        prices.push(price);
      }, 0);
    }

    if(config.exchanges.indexOf('binance') >= 0) {
      loadPriceBinance(function (price) {
        prices.push(price);
      }, 0);
    }

    if(config.exchanges.indexOf('poloniex') >= 0) {
      loadPricePoloniex(function (price) {
        prices.push(price);
      }, 0);
    }

    // Publish the average of all markets that were loaded
    setTimeout(function() { publishFeed(prices.reduce((t, v) => t + v, 0) / prices.length, 0); }, 30 * 1000);
  } else {
    // Load price from coinmarketcap.com if no exchanges are specified.
    loadPriceCMC(function (price) {
      publishFeed(price, 0);
    }, 0);
  }
}

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

      if (retries < 2)
        setTimeout(function () { publishFeed(price, retries + 1); }, 10 * 1000);
    }
  });
}

function loadPriceCMC(callback, retries) {
  log('Loading STEEM price...');

  // Load the price feed data
  request.get('https://api.coinmarketcap.com/v1/ticker/steem/', function (e, r, data) {
    try {
      var steem_price = parseFloat(JSON.parse(data)[0].price_usd);
      log("Loaded STEEM price from CoinMarketCap: " + steem_price);

      if (callback)
        callback(steem_price);
    } catch (err) {
      log('Error loading STEEM price from CoinMarketCap: ' + err);

      if(retries < 2)
        setTimeout(function () { loadPrice(callback, retries + 1); }, 10 * 1000);
    }
  });
}

function loadPriceBittrex(callback, retries) {
  // Load STEEM price in BTC from bittrex and convert that to USD using BTC price in coinmarketcap
  request.get('https://api.coinmarketcap.com/v1/ticker/bitcoin/', function (e, r, data) {
    request.get('https://bittrex.com/api/v1.1/public/getticker?market=BTC-STEEM', function (e, r, btc_data) {
      try {
        steem_price = parseFloat(JSON.parse(data)[0].price_usd) * parseFloat(JSON.parse(btc_data).result.Last);
        log('Loaded STEEM Price from Bittrex: ' + steem_price);

        if (callback)
          callback(steem_price);
      } catch (err) {
        log('Error loading STEEM price from Bittrex: ' + err);

        if(retries < 2)
          setTimeout(function () { loadPriceBittrex(callback, retries + 1); }, 10 * 1000);
      }
    });
  });
}

function loadPriceBinance(callback, retries) {
  // Load STEEM price in BTC from bittrex and convert that to USD using BTC price in coinmarketcap
  request.get('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT', function (e, r, data) {
    request.get('https://api.binance.com/api/v3/ticker/price?symbol=STEEMBTC', function (e, r, btc_data) {
      try {
        steem_price = parseFloat(JSON.parse(data).price) * parseFloat(JSON.parse(btc_data).price);
        log('Loaded STEEM Price from Binance: ' + steem_price);

        if (callback)
          callback(steem_price);
      } catch (err) {
        log('Error loading STEEM price from Binance: ' + err);

        if(retries < 2)
          setTimeout(function () { loadPriceBinance(callback, retries + 1); }, 10 * 1000);
      }
    });
  });
}

function loadPricePoloniex(callback, retries) {
  // Load STEEM price in BTC from bittrex and convert that to USD using BTC price in coinmarketcap
  request.get('https://poloniex.com/public?command=returnTicker', function (e, r, data) {
    try {
      var json_data = JSON.parse(data);
      steem_price = parseFloat(json_data['USDT_BTC'].last) * parseFloat(json_data['BTC_STEEM'].last)
      log('Loaded STEEM Price from Poloniex: ' + steem_price);

      if (callback)
        callback(steem_price);
    } catch (err) {
      log('Error loading STEEM price from Poloniex: ' + err);

      if(retries < 2)
        setTimeout(function () { loadPricePoloniex(callback, retries + 1); }, 10 * 1000);
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
