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
        return await api.transact({ actions }, {
            useLastIrreversible: true,
            expireSeconds: 30
        })
    } catch (e) {
        console.log("Error executing transaction " + e);
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
        }])
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
                }, {
                    actor: to,
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
const announce = async (id, owner) => {
    console.log("----------------------------- Announcing auction -----------------------------------")
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
                duration: 360000,
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

const main = async () => {
    /** register market */
    create_market();
    await new Promise(r => setTimeout(r, 1500));
    add_xpr_to_marketconf();

    /** creating soon market spots */
    createSMSCollection();
    await new Promise(r => setTimeout(r, 1500));
    createSMSSchema();
    await new Promise(r => setTimeout(r, 1500));
    createSMSTemplate("QmW85MY69oC1yWoLTivtGULySyNEAaC5kEaRtDZTuzN8YH", 1, "SOON SPOT - Gold", "This NFT is unique and has a special utility on soon.market - forever! Its owner has the power to promote an auction of choice in the main spotlight on the front page of the market by redeeming it - whenever they want! It is not burnable and as soon as the promoted auction ends this NFT will be auctioned again to find a new owner.");
    await new Promise(r => setTimeout(r, 1500));
    createSMSTemplate("QmXxaXdjzxC9YGgJQFoXUSXaiKfBknrK8UhQs3cQRyPskz", 0, "SOON SPOT - SILVER", "This NFT has a potentially unlimited edition size but we will make sure only a reasonable amount will be in circulation. It will be distributed in various ways: auctions, airdrops, competitions, … The owner can use it to promote an auction of choice in the slider on the bottom of the front page by redeeming it. On redemption the NFT will be burned.");
    await new Promise(r => setTimeout(r, 1500));
    const silverTemplate = (await get_atomicassets_table(SMS_COL, 'templates'))[1].template_id;
    for (i = 0; i < 5; i++) {
        await new Promise(r => setTimeout(r, 1000));
        mint(silverTemplate, "silver", i, 5);
    }
    const goldTemplate = (await get_atomicassets_table(SMS_COL, 'templates'))[0].template_id;
    mint(goldTemplate, "gold", 1, 1);

    for (let index = 0; index < 5; index++) {
        await new Promise(r => setTimeout(r, 1000));
        /**announce and transfer first minted nft */
        owner = "mitch"
        assets = await get_atomicassets_table(owner, 'assets');
        assetId = assets[0].asset_id;
        ann = await announce(assetId, owner);
        await new Promise(r => setTimeout(r, 1500));
        transfer(assetId, owner, atomicmarket_contract, "auction");

        /** send silver spot to mitch and then back to power of soon */
        assets = await get_atomicassets_table(CREATOR, 'assets');
        silverSpotId = assets[0].asset_id;
        transfer(silverSpotId, CREATOR, owner);
        auctions = await get_atomicmarket_table('atomicmarket', 'auctions')
        auctionId = auctions[auctions.length - 1].auction_id;
        transfer(silverSpotId, owner, CREATOR, '{"auction_id":' + auctionId + '}');
    }

    await new Promise(r => setTimeout(r, 1000));
    /**announce auction with gold */
    owner = "mitch"
    assets = await get_atomicassets_table(owner, 'assets');
    assetId = assets[0].asset_id;
    ann = await announce(assetId, owner);
    await new Promise(r => setTimeout(r, 1500));
    transfer(assetId, owner, atomicmarket_contract, "auction");

    /** send gold spot to mitch and then back to power of soon */
    assets = await get_atomicassets_table(CREATOR, 'assets');
    goldSpotId = assets[assets.length - 1].asset_id;
    transfer(goldSpotId, CREATOR, owner);
    auctions = await get_atomicmarket_table('atomicmarket', 'auctions')
    auctionId = auctions[auctions.length - 1].auction_id;
    transfer(goldSpotId, owner, CREATOR, '{"auction_id":' + auctionId + '}');
}
main();