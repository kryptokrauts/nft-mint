# soon.market local setup
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
***Known issue: proton-node might not start properly due to timeout creating atomic assets contracts - in this case, initializing contracts will fail - a message will indicate this - remove the running node and start again.***

## Start pink-api
```{bash}
docker-compose up -d local-api-filler
docker-compose up -d local-api-server
```

# Code used for minting Monsters from scratch

1. Create collection
2. Create schema
3. Create templates
4. Create assets
