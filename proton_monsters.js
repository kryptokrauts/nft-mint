require('dotenv').config()

const { JsonRpc, Api, JsSignatureProvider } = require('@proton/js')
const fetch = require('node-fetch')

// Constants
const ENDPOINT = process.env.ENDPOINT
const CREATOR = 'powerofsoon'
const CREATOR_PERMISSION = 'active'
const COLLECTION_NAME = 'monsterscoll' // COLLECTION_NAME must be 12 chars
const SCHEMA_NAME = 'baseschema'
const CREATOR_FEE = 0.01
const SCHEMA = {
    series: "uint16",
    image: "string",
    name: "string",
    desc: "string"
}

// NOTE: template_id must be manually inputted after `createTemplates()` is called, check proton.bloks.io
const templates = [
    { template_id: 1, max_supply: 2, series: 1, name: 'Dulahann', image: 'QmT35anF2vLjjfgCQXBXfXqGgXXj4rJrsjcXWYLm9HDfWL' },
    { template_id: 2, max_supply: 2, series: 1, name: 'Minotaur', image: 'Qmd3fNhjZGqKrLjLKNrRue7WqfNErnqgovrVFmS6xCumY6' },
    { template_id: 3, max_supply: 2, series: 1, name: 'Jersey Devil', image: 'QmXM5JC5jhmKNZEfQRazAfEksWmN6YEUDizCWsoGAD1isk' },
    { template_id: 4, max_supply: 2, series: 1, name: 'Misthag', image: 'QmeMzdUpyjPtBpZYgBnxApWETh4Cuo3HavUL63RzAwRcqT' },
    { template_id: 5, max_supply: 2, series: 1, name: 'Draugr', image: 'QmTpSH94BkNJCf82R1WFdPo6NcaiCZJmUdxCgGM2ka2Eue' },
    { template_id: 6, max_supply: 3, series: 1, name: 'Cropsey', image: 'QmPfkthP29F3a4RauRSZnGuMy4QV7bKfS4fvdkUTvGL7Hi' },
    { template_id: 7, max_supply: 3, series: 1, name: 'Typhon', image: 'QmYKrwqVbZAAHjT2BMhzeuFboSybKU7tNGFNgVj15CBy3F' },
    { template_id: 8, max_supply: 3, series: 1, name: 'Ghoul', image: 'QmXniR5MRo7QXG3Eb64jDpz5jyLw14796aAH8A19koHmez' },
    { template_id: 9, max_supply: 3, series: 1, name: 'Wendigo', image: 'QmbaX33qayCBmVqY3xaEX951DgG4nK1osN2RLtetvUdgPi' },
    { template_id: 10, max_supply: 3, series: 1, name: 'Cerberus', image: 'QmejwojCLwjbNxqVNwBhyvKj5jUM4kGsm4tGM2U8CbniXy' },
]

// RPC
const rpc = new JsonRpc(ENDPOINT, { fetch })
const api = new Api({
    rpc,
    signatureProvider: new JsSignatureProvider([process.env.PRIVATE_KEY])
})

// transact method
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

/**transfer a token between to participants */
const transfer = async (from_actor, to_actor) => {
    const result = await api.transact({
        actions: [{
            account: 'eosio.token',
            name: 'transfer',
            authorization: [{
                actor: from_actor,
                permission: 'active',
            }],
            data: {
                from: from_actor,
                to: to_actor,
                quantity: '1.0000 XPR',
                memo: '',
            },
        }]
    }, {
        blocksBehind: 3,
        expireSeconds: 30,
    });
    console.log(result);
}

const getTxHistory = async (transaction_id, block_num) => {
    return await rpc.history_get_transaction(transaction_id, block_num)
}

// create monsters collection
const createCollection = async () => {
    console.log("--------------- Creating Monsters Collection ---------------------");
    return await transact([{
        account: 'atomicassets',
        name: 'createcol',
        authorization: [{
            actor: CREATOR,
            permission: CREATOR_PERMISSION,
        }],
        data:
        {
            "author": CREATOR,
            "collection_name": COLLECTION_NAME,
            "allow_notify": true,
            "authorized_accounts": [CREATOR],
            "notify_accounts": [],
            "market_fee": CREATOR_FEE,
            "name": "monsters",
            "data": []
        }
    }])
}

// create monsters schema
const createSchema = async () => {
    console.log("--------------- Creating Monsters Schema ---------------------");
    return await transact([
        {
            account: "atomicassets",
            name: "createschema",
            authorization: [{
                actor: CREATOR,
                permission: CREATOR_PERMISSION,
            }],
            "data": {
                "authorized_creator": CREATOR,
                "collection_name": COLLECTION_NAME,
                "schema_name": SCHEMA_NAME,
                "schema_format": Object.entries(SCHEMA).map(([key, type]) => ({
                    name: key,
                    type: type
                }))
            }
        }
    ])
}

// create template
const createTemplates = async () => {
    for (const template of templates) {
        console.log("----------------------------- Creating template for " + template.name + " -----------------------------------")
        {
            await transact([
                {
                    account: "atomicassets",
                    name: "createtempl",
                    authorization: [
                        {
                            actor: CREATOR,
                            permission: CREATOR_PERMISSION
                        }
                    ],
                    "data": {
                        "authorized_creator": CREATOR,
                        "collection_name": COLLECTION_NAME,
                        "schema_name": SCHEMA_NAME,
                        "transferable": true,
                        "burnable": true,
                        "max_supply": template.max_supply,
                        "issued_supply": 0,
                        "immutable_data": Object.entries(SCHEMA).map(([key, type]) => ({
                            key: key,
                            value: [type, template[key]]
                        }))
                    }
                }
            ])
        }
    }
}

// mint monsters
const mintAssets = async () => {
    console.log("--------------- Minting Assets ---------------------");
    const highToLowMint = templates.sort((t1, t2) => t2 - t1)

    for (const template of templates) {
        for (let i = 0; i < template.max_supply; i++) {
            // sleep to avoid duplicate transactions
            await new Promise(r => setTimeout(r, 500));
            console.log("Minting " + template.name + " (" + (i + 1) + " of " + template.max_supply + ")");

            await transact([
                {
                    "account": "atomicassets",
                    "name": "mintasset",
                    "authorization": [
                        {
                            actor: CREATOR,
                            permission: CREATOR_PERMISSION
                        }],
                    "data": {
                        "authorized_minter": CREATOR,
                        "collection_name": COLLECTION_NAME,
                        "schema_name": SCHEMA_NAME,
                        "template_id": template.template_id,
                        "new_asset_owner": CREATOR,
                        "immutable_data": [],
                        "mutable_data": [],
                        "tokens_to_back": []
                    }
                }
            ])
        }
    }
}

const get_atomicassets_table = async (scope, table) => {
    return await rpc.get_table_rows({
        json: true,               // Get the response as json
        code: 'atomicassets',      // Contract that we target
        scope: scope,         // Account that owns the data
        table: table,        // Table name
        limit: 1000,                // Maximum number of rows that we want to get
        reverse: false,           // Optional: Get reversed data
        show_payer: false          // Optional: Show ram payer
    });
}

// print all tables
const get_atomicassets_tables = async () => {

    console.log("------------- collections --------------------")
    console.log(await get_atomicassets_table('atomicassets', 'collections'));

    console.log("------------- schemas --------------------")
    console.log(await get_atomicassets_table(COLLECTION_NAME, 'schemas'));

    console.log("------------- tokenconfigs --------------------")
    console.log(await get_atomicassets_table('atomicassets', 'tokenconfigs'));

    console.log("------------- config --------------------")
    console.log(await get_atomicassets_table('atomicassets', 'config'));

    console.log("------------- templates --------------------")
    console.log(await get_atomicassets_table(COLLECTION_NAME, 'templates'));

    console.log("------------- minted nfts --------------------")
    console.log(await get_atomicassets_table(CREATOR, 'assets'));
}

const create_and_mint = async () => {
    await createCollection();
    await createSchema();
    await createTemplates();
    await mintAssets();
}

const main = () => {
    create_and_mint();
    /** print tables */
    // get_atomicassets_tables();
}

main()