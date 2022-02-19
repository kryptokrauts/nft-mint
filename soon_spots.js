require('dotenv').config()

const { JsonRpc, Api, JsSignatureProvider } = require('@proton/js')
const fetch = require('node-fetch')

// Constants
const atomicassets_contract = "atomicassets"
const atomicmarket_contract = "atomicmarket"

const ENDPOINT = process.env.ENDPOINT
const CREATOR = 'powerofsoon'
const CREATOR_PERMISSION = 'active'
const SCHEMA_NAME = 'baseschema'
const CREATOR_FEE = 0.01
// soon market spots collection name
const SMS_COL = "soonmarketsp";
// name of the marketplace
const MARKETPLACE_NAME = "soonmarket11";
const SCHEMA = {
    series: "uint16",
    image: "string",
    name: "string",
    desc: "string"
}

// RPC
const rpc = new JsonRpc(ENDPOINT, { fetch })
const api = new Api({
    rpc,
    signatureProvider: new JsSignatureProvider([process.env.PRIVATE_KEY])
})

const transact = async (actions) => {
    try {
        const result = await api.transact({ actions }, {
            useLastIrreversible: true,
            expireSeconds: 30
        });
        await new Promise(r => setTimeout(r, 1100));
        return result;
    } catch (e) {
        console.log("Error executing transaction: " + e);
        if (e.message.includes('fetching abi for atomicassets: Read past end of buffer')) {
            console.log("AtomicAssets contract not available, aborting")
        }
        process.exit(-1);
    }
}

const createSMSCollection = async () => {
    console.log("----------------------------- Creating Soon Market Spots collection -----------------------------------")
    await transact([{
        account: atomicassets_contract,
        name: 'createcol',
        authorization: [{
            actor: CREATOR,
            permission: CREATOR_PERMISSION,
        }],
        data:
        {
            "author": CREATOR,
            "collection_name": SMS_COL,
            "allow_notify": true,
            "authorized_accounts": [CREATOR],
            "notify_accounts": [],
            "market_fee": CREATOR_FEE,
            "name": "soon.spots",
            "data": []
        }
    }])
}
// create monsters schema
const createSMSSchema = async () => {
    console.log("--------------- Creating Soon Market Spots Schema ---------------------");
    return await transact([
        {
            account: atomicassets_contract,
            name: "createschema",
            authorization: [{
                actor: CREATOR,
                permission: CREATOR_PERMISSION,
            }],
            "data": {
                "authorized_creator": CREATOR,
                "collection_name": SMS_COL,
                "schema_name": SCHEMA_NAME,
                "schema_format": Object.entries(SCHEMA).map(([key, type]) => ({
                    name: key,
                    type: type
                }))
            }
        }
    ])
}

const createSMSTemplate = async (image, supply, template, desc) => {
    console.log("----------------------------- Creating " + template + " template  -----------------------------------")
    await transact([
        {
            account: atomicassets_contract,
            name: "createtempl",
            authorization: [
                {
                    actor: CREATOR,
                    permission: CREATOR_PERMISSION
                }
            ],
            "data": {
                "authorized_creator": CREATOR,
                "collection_name": SMS_COL,
                "schema_name": SCHEMA_NAME,
                "transferable": true,
                "burnable": true,
                "max_supply": supply,
                "issued_supply": 0,
                "immutable_data": [{ "key": "image", "value": ["string", image] }, { "key": "name", "value": ["string", template] }, { "key": "desc", "value": ["string", desc] }]

            }
        }
    ])
}

const mint = async (template_id, name, cnt, max) => {
    console.log("----------------------------- Minting Soon Spot " + name + " (" + cnt + " of " + max + ") -----------------------------------")
    await transact([
        {
            "account": atomicassets_contract,
            "name": "mintasset",
            "authorization": [
                {
                    actor: CREATOR,
                    permission: CREATOR_PERMISSION
                }],
            "data": {
                "authorized_minter": CREATOR,
                "collection_name": SMS_COL,
                "schema_name": SCHEMA_NAME,
                "template_id": template_id,
                "new_asset_owner": CREATOR,
                "immutable_data": [],
                "mutable_data": [],
                "tokens_to_back": []
            }
        }
    ])
}

const create_market = async () => {
    console.log("----------------------------- Registering soon market  -----------------------------------")
    await transact([
        {
            account: atomicmarket_contract,
            name: "regmarket",
            authorization: [{
                "actor": CREATOR,
                "permission": CREATOR_PERMISSION,
            }],
            data:
            {
                creator: CREATOR,
                marketplace_name: MARKETPLACE_NAME
            }
        }]);
}

/** Register XPR token for atomicmarket */
const add_xpr_to_marketconf = async () => {
    console.log("----------------------------- Adding XPR to soonmarket configuration -----------------------------------")
    await transact([
        {
            account: atomicmarket_contract,
            name: "addconftoken",
            authorization: [{
                "actor": atomicmarket_contract,
                "permission": CREATOR_PERMISSION,
            }],
            data:
            {
                token_contract: "eosio.token",
                token_symbol: "4,XPR"
            }
        }])
}

/**transfer nft to another account*/
const transfer = async (id, from, to, memo) => {
    console.log("----------------------------- Transfer asset with id " + id + " from " + from + " to " + to + " with memo " + memo + " -----------------------------------")
    await transact([
        {
            account: atomicassets_contract,
            name: "transfer",
            "authorization": [
                {
                    actor: from,
                    permission: CREATOR_PERMISSION
                }],
            data:
            {
                from: from,
                to: to,
                asset_ids: [id],
                memo: memo
            }
        }])
}

/** announce the auction */
const announce = async (id, owner, time) => {
    console.log("----------------------------- Announcing auction -----------------------------------")
    if (!time) {
        time = 360000
    }
    console.log("Auction time " + time);
    return await transact([
        {
            account: atomicmarket_contract,
            name: "announceauct",
            authorization: [{
                actor: owner,
                permission: CREATOR_PERMISSION,
            }],
            data:
            {
                seller: owner,
                asset_ids: [id],
                starting_bid: "1.0000 XPR",
                duration: time,
                maker_marketplace: MARKETPLACE_NAME
            }
        }])
}

/** cancel auction of given id */
const cancel = async (id, owner) => {
    await transact([
        {
            account: atomicmarket_contract,
            name: "cancelauct",
            authorization: [{
                actor: owner,
                permission: CREATOR_PERMISSION,
            }, {
                actor: atomicassets_contract,
                permission: CREATOR_PERMISSION
            }],
            data:
            {
                auction_id: id
            }
        }])
}

/**transfer nft to to atomicmarket contract to activate auction*/
const transferToMarket = async (id) => {
    console.log("----------------------------- Transfer gold spot to atomicmarket -----------------------------------")
    await transact([
        {
            account: atomicassets_contract,
            name: "transfer",
            authorization: [
                {
                    actor: CREATOR,
                    permission: "owner"
                }],
            data:
            {
                from: CREATOR,
                to: atomicmarket_contract,
                asset_ids: [id],
                memo: "auction"
            }
        }])
}

const get_atomicassets_table = async (scope, table) => {
    return await rpc.get_table_rows({
        json: true,               // Get the response as json
        code: atomicassets_contract,      // Contract that we target
        scope: scope,         // Account that owns the data
        table: table,        // Table name
        limit: 1000,                // Maximum number of rows that we want to get
        reverse: false,           // Optional: Get reversed data
        show_payer: false          // Optional: Show ram payer
    }).then(r => r.rows)
}

const get_atomicmarket_table = async (scope, table) => {
    return await rpc.get_table_rows({
        json: true,               // Get the response as json
        code: atomicmarket_contract,      // Contract that we target
        scope: scope,         // Account that owns the data
        table: table,        // Table name
        limit: 1000,                // Maximum number of rows that we want to get
        reverse: false,           // Optional: Get reversed data
        show_payer: false          // Optional: Show ram payer
    }).then(r => r.rows)
}

const registerMarket = async () => {
    await create_market();
    await add_xpr_to_marketconf();
}

const createStructs = async () => {
    await createSMSCollection();
    await createSMSSchema();
    await createSMSTemplate("QmW85MY69oC1yWoLTivtGULySyNEAaC5kEaRtDZTuzN8YH", 1, "SOON SPOT - Gold", "This NFT is unique and has a special utility on soon.market - forever! Its owner has the power to promote an auction of choice in the main spotlight on the front page of the market by redeeming it - whenever they want! It is not burnable and as soon as the promoted auction ends this NFT will be auctioned again to find a new owner.");
    await createSMSTemplate("QmXxaXdjzxC9YGgJQFoXUSXaiKfBknrK8UhQs3cQRyPskz", 0, "SOON SPOT - SILVER", "This NFT has a potentially unlimited edition size but we will make sure only a reasonable amount will be in circulation. It will be distributed in various ways: auctions, airdrops, competitions, … The owner can use it to promote an auction of choice in the slider on the bottom of the front page by redeeming it. On redemption the NFT will be burned.");
}

const mintGold = async () => {
    const goldTemplate = (await get_atomicassets_table(SMS_COL, 'templates'))[0].template_id;
    await mint(goldTemplate, "gold", 1, 1);
}

const mintSilver = async (num) => {
    const silverTemplate = (await get_atomicassets_table(SMS_COL, 'templates'))[1].template_id;
    for (i = 1; i <= num; i++) {
        await mint(silverTemplate, "silver", i, num);
    }
}

const createPromotedAuction = async (num, nftOwner, isGold) => {
    for (let index = 0; index < 5; index++) {
        /**announce and transfer first minted nft */
        assets = await get_atomicassets_table(nftOwner, 'assets');
        assetId = assets[assets.length - 1].asset_id;
        ann = await announce(assetId, nftOwner);
        // transfer to atomicmarket
        transfer(assetId, nftOwner, atomicmarket_contract, "auction");

        /** send silver spot to nftOwner and then back to power of soon */
        assets = await get_atomicassets_table(CREATOR, 'assets');
        spotId = assets[assets.length - 1].asset_id;
        if (isGold) {
            spotId = assets[0].asset_id;
        }
        await transfer(silverSpotId, CREATOR, nftOwner);
        auctions = await get_atomicmarket_table('atomicmarket', 'auctions')
        auctionId = auctions[auctions.length - 1].auction_id;
        await transfer(spotId, nftOwner, CREATOR, 'auction ' + auctionId);
    }
}

const announceAuction = async (assetId, seller) => {
    console.log(`${assetId}  ${seller}`)
    await announce(assetId, seller);
    transfer(assetId, seller, atomicmarket_contract, "auction");
}

const promoteAuction = async (spotId, auctionId, seller) => {
    await transfer(spotId, seller, CREATOR, 'auction ' + auctionId);
}

const cancelAuct = async (auctionId, seller) => {
    await cancel(auctionId, seller)
}

const transferSilverSpot = async () => {
    assets = await get_atomicassets_table(CREATOR, 'assets');
    spotId = assets[assets.length - 1].asset_id;
    await transfer(spotId, CREATOR, "mitch");
}

const basicSetup = async () => {
    await registerMarket();
    await createStructs();
    await mintGold();
    await mintSilver(10);
    for (let index = 0; index < 10; index++) {
        await transferSilverSpot()
    }
}

if (process.argv.includes('registerMarket')) {
    registerMarket();
}
else if (process.argv.includes('createStructs')) {
    createStructs();
}
else if (process.argv.includes('mintGold')) {
    mintGold();
}
else if (process.argv.includes('mintSilver')) {
    mintSilver(5);
}
else if (process.argv.includes('transferSpot')) {
    transferSilverSpot();
}
else if (process.argv.includes('createSilverPA')) {
    createPromotedAuction(1, "mitch", false);
}
else if (process.argv.includes('announce')) {
    announceAuction(process.argv[3], process.argv[4]);
}
else if (process.argv.includes('promote')) {
    promoteAuction(process.argv[3], process.argv[4], process.argv[5]);
}
else if (process.argv.includes('cancelAuct')) {
    cancelAuct(process.argv[3], process.argv[4]);
}
else {
    basicSetup();
}



// helper method to mint another nft including transfer of SILVER SPOT
const mint_one = async (time) => {
    owner = "mitch"
    assets = await get_atomicassets_table(owner, 'assets');
    assetId = assets[0].asset_id;
    ann = await announce(assetId, owner, time);

    transfer(assetId, owner, atomicmarket_contract, "auction");

    assets = await get_atomicassets_table(CREATOR, 'assets');
    silverSpotId = assets[0].asset_id;
    transfer(silverSpotId, CREATOR, owner);
    auctions = await get_atomicmarket_table('atomicmarket', 'auctions')
    auctionId = auctions[auctions.length - 1].auction_id;
    transfer(silverSpotId, owner, CREATOR, 'auction ' + auctionId);
}