# Steem Witness Price Feed Publishing Tool

## Install nodejs & npm
If you already have nodejs & npm installed you can skip this section, but I wanted to include it here for thoroughness. Run the following commands to install nodejs and npm in order to run the pricefeed software:

```
$ sudo apt-get update
$ curl -sL https://deb.nodesource.com/setup_9.x | sudo -E bash -
$ sudo apt-get install -y nodejs
```

## Setup & Installation
Clone the project repo into the "pricefeed" directory and install using NPM:

```
$ git clone https://github.com/MattyIce/pricefeed.git pricefeed
$ cd pricefeed
$ npm install
```

Update the config.json file with your witness account name and private active key as described in the Configuration section below.

### Run in background with PM2
I suggest using the PM2 software to manage and run your nodejs programs in the background. Use the following commands to install PM2 and run the pricefeed program:

```
$ sudo npm install pm2 -g
$ pm2 start feed.js
$ pm2 logs feed
$ pm2 save
```

If everything worked you should not see any errors in the logs and a price feed transaction should have been published to your account.

### Run in Docker
If you prefer using Docker, use the following commands:

```
docker build -t pricefeed .
docker run -itd --rm --name pricefeed pricefeed

# Check the status with docker logs
docker logs pricefeed
```

## Configuration
```
{
  "rpc_nodes": [											// List of RPC nodes to use
    "https://api.steemit.com",
    "https://rpc.buildteam.io",
    "https://steemd.minnowsupportproject.org",
    "https://steemd.privex.io",
    "https://gtg.steem.house:8090"
  ],
  "account": "witness_account_name",						// Name of your Steem witness account
  "active_key": "witness_account_private_active_key",		// Private active key of your Steem witness account
  "exchanges": ["bittrex", "poloniex", "binance"],  // List of exchanges to use. Will publish an average of all exchanges in the list. If no exchanges are specified it will fall back to coinmarketcap.com as the default.
  "interval": 60,											// Number of minutes between feed publishes
  "peg_multi": 1											// Feed bias setting, quote will be set to 1 / peg_multi
}
```
