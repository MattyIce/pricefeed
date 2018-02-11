# Steem Witness Price Feed Publishing Tool

## Setup & Installation


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
  "interval": 60,											// Number of minutes between feed publishes
  "peg_multi": 1											// Feed bias setting, quote will be set to 1 / peg_multi
}
```