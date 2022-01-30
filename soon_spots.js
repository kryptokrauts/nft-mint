require('dotenv').config()

const { JsonRpc, Api, JsSignatureProvider } = require('@proton/js')
const fetch = require('node-fetch')

// Constants
const ENDPOINT = process.env.ENDPOINT
const CREATOR = 'powerofsoon'
const CREATOR_PERMISSION = 'active'
const SCHEMA_NAME = 'soonmarket'
const CREATOR_FEE = 0.01
const SCHEMA = {
    series: "uint16",
    image: "string",
    name: "string",
    desc: "string"
}
const SM_COL = "323154322551";

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
            process.exit(-1);
        }
    }
}

const createSMCollection = async () => {
    await transact([{
        account: 'atomicassets',
        name: 'createcol',
        authorization: [{
            actor: CREATOR,
            permission: CREATOR_PERMISSION,
        }],
        data:
        {
            "author": CREATOR,
            "collection_name": SM_COL,
            "allow_notify": true,
            "authorized_accounts": [CREATOR],
            "notify_accounts": [],
            "market_fee": CREATOR_FEE,
            "name": "soon.market",
            "data": []
        }
    }]).then(r => console.log(r));
}

const createSMSchema = async () => {
    console.log("--------------- Creating soon.market Schema ---------------------");
    await transact([
        {
            account: "atomicassets",
            name: "createschema",
            authorization: [{
                actor: CREATOR,
                permission: CREATOR_PERMISSION,
            }],
            "data": {
                "authorized_creator": CREATOR,
                "collection_name": SM_COL,
                "schema_name": SCHEMA_NAME,
                "schema_format": Object.entries(SCHEMA).map(([key, type]) => ({
                    name: key,
                    type: type
                }))
            }
        }
    ]).then(r => console.log(r));
}

const createSMTemplate = async () => {
    await transact([
        {
            account: "atomicassets",
            name: "createtempl",
            authorization: [
                {
                    actor: "atomicassets",
                    permission: CREATOR_PERMISSION
                },
                {
                    actor: CREATOR,
                    permission: CREATOR_PERMISSION
                }
            ],
            "data": {
                "authorized_creator": CREATOR,
                "collection_name": SM_COL,
                "schema_name": SCHEMA_NAME,
                "transferable": true,
                "burnable": true,
                "max_supply": 1,
                "issued_supply": 0,
                "immutable_data": [{ "key": "image", "value": ["string", "QmW85MY69oC1yWoLTivtGULySyNEAaC5kEaRtDZTuzN8YH"] }, { "key": "name", "value": ["string", "gold"] }, { "key": "desc", "value": ["string", "the one and only golden spot"] }]
            }
        }
    ]).then(r => console.log(r));
}

const mintGold = async () => {
    await transact([
        {
            "account": "atomicassets",
            "name": "mintasset",
            "authorization": [{
                actor: "atomicassets",
                permission: CREATOR_PERMISSION
            },
            {
                actor: CREATOR,
                permission: CREATOR_PERMISSION
            }],
            "data": {
                "authorized_minter": CREATOR,
                "collection_name": SM_COL,
                "schema_name": SCHEMA_NAME,
                "template_id": 1,
                "new_asset_owner": CREATOR,
                "immutable_data": [],
                "mutable_data": [],
                "tokens_to_back": []
            }
        }
    ])
}

const MARKETPLACE_NAME = "soonmarket11";

const create_market = async () => {
    await transact([
        {
            account: "atomicmarket",
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
        }]).then(r => console.log(r));
}

/** Register XPR token for atomicmarket */
const add_xpr_to_marketconf = async () => {
    await transact([
        {
            account: "atomicmarket",
            name: "addconftoken",
            authorization: [{
                "actor": "atomicmarket",
                "permission": CREATOR_PERMISSION,
            }],
            data:
            {
                token_contract: "eosio.token",
                token_symbol: "4,XPR"
            }
        }]).then(r => console.log(r));
}

/**transfer nft to another account*/
const transfer = async () => {
    await transact([
        {
            account: "atomicassets",
            name: "transfer",
            "authorization": [{
                actor: "atomicassets",
                permission: CREATOR_PERMISSION
            },
            {
                actor: CREATOR,
                permission: CREATOR_PERMISSION
            }],
            data:
            {
                from: CREATOR,
                to: "mitch",
                asset_ids: [1099511627776],
                memo: "simpletext"
            }
        }]).then(r => console.log(r));
}

/** announce the auction */
const announce = async () => {
    await transact([
        {
            account: "atomicmarket",
            name: "announceauct",
            authorization: [{
                actor: "atomicmarket",
                permission: CREATOR_PERMISSION
            }, {
                actor: "mitch",
                permission: CREATOR_PERMISSION,
            }],
            data:
            {
                seller: "mitch",
                asset_ids: [1099511627776],
                starting_bid: "1.0000 XPR",
                duration: 3600,
                maker_marketplace: MARKETPLACE_NAME
            }
        }]).then(r => console.log(r));
}

const cancel = async () => {
    await transact([
        {
            account: "atomicmarket",
            name: "cancelauct",
            authorization: [{
                actor: "atomicmarket",
                permission: CREATOR_PERMISSION
            }, {
                actor: CREATOR,
                permission: CREATOR_PERMISSION,
            }],
            data:
            {
                auction_id: 3
            }
        }]).then(r => console.log(r));
}

/**transfer nft to to atomicmarket contract to activate auction*/
const transferToMarket = async () => {
    await transact([
        {
            account: "atomicassets",
            name: "transfer",
            authorization: [
                {
                    actor: CREATOR,
                    permission: CREATOR_PERMISSION
                },
                {
                    actor: "atomicmarket",
                    permission: CREATOR_PERMISSION
                },
                {
                    actor: "atomicassets",
                    permission: CREATOR_PERMISSION
                },
                {
                    actor: "mitch",
                    permission: CREATOR_PERMISSION
                }],
            data:
            {
                from: "mitch",
                to: "atomicmarket",
                asset_ids: [1099511627776],
                memo: "auction"
            }
        }]).then(r => console.log(r));
}

const main = async () => {
    // createSMCollection();
    // await new Promise(r => setTimeout(r, 1500));
    // createSMSchema();
    // await new Promise(r => setTimeout(r, 1500));
    // createSMTemplate();
    // await new Promise(r => setTimeout(r, 1500));
    // mintGold();
    // await new Promise(r => setTimeout(r, 1500));
    // create_market();
    // await new Promise(r => setTimeout(r, 1500));
    // add_xpr_to_marketconf();
    // await new Promise(r => setTimeout(r, 1500));
    cancel();
    announce();
    // await new Promise(r => setTimeout(r, 1500));
    transferToMarket();
}

main()