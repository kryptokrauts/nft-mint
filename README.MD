# Local setup
In order to run the project locally, a local proton node together with deployed atomic contracts is needed. 

# Prerequisites
## Build local proton-node
At first you need an image of the proton node on your system - checkout proton-local project:
```{bash}
git clone git@github.com:kryptokrauts/proton-local.git
```
and build it:
```{bash}
docker build -t proton-local .
```
## Build local eosio-contract-api
Next checkout eosio-contract-api project from pink:
```{bash}
git clone git@github.com:pinknetworkx/eosio-contract-api.git
```
and build the images:
```{bash}
docker-compose build eosio-contract-api-filler
docker-compose build eosio-contract-api-server
```

# Start the environment
## Start local node
```{bash}
docker-compose up -d proton-local
```
## Initialize atomicasset contracts
```{bash}
docker-compose up init_atomic_contracts
```
***Known issue: proton-node might not start properly due to timeout creating atomic assets contracts - in this case, initializing contracts will fail - the following message will indicate this - remove the running node and start again:***
```{bash}
AtomicAssets contract not available not properly deployed, please reset node
``` 

## Start pink-api
```{bash}
docker-compose up -d local-api-filler
docker-compose up -d local-api-server
```
***Hint: server might need a restart due to incomplete start when filler not initialized***

## Mint NFTs
```{bash}
docker-compose up mint_proton_monsters
docker-compose up mint_spots
```
***mint_spots will register a market and thus enable auctioning***

# Cleanup
In case you need a fresh local node remove all containers and clean /mint_nft/docker folder

# Setup anchor wallet for local signing
Download [Anchor Wallet Desktop](https://greymass.com/en/anchor/)
Goto Manage Blockchains -> Add/Remove -> +Custom Blockchain
```
ChainId: 981453d176ddca32aa278ff7b8af9bf4632de00ab49db273db03115705d90c5a
Name of Blockchain: Proton-Local
Default node for this blockchain: http://localhost:8888
Public Key Prefix: EOS
Default Token Symbol: XPR
```

# Setup local soon.market

Following entries in .env need to be set

```{bash}
# chain endpoints
NEXT_PUBLIC_CHAIN_ENDPOINTS='http://localhost:8888'
# pink api endpoint
NEXT_PUBLIC_NFT_MARKET_WEB_API='http://localhost:9000'
# soon.market name
NEXT_PUBLIC_MARKETPLACE='soonmarket11'
# local
NEXT_PUBLIC_CHAIN_ID = '981453d176ddca32aa278ff7b8af9bf4632de00ab49db273db03115705d90c5a'
```

# Code used for minting Monsters from scratch

1. Create collection
2. Create schema
3. Create templates
4. Create assets
