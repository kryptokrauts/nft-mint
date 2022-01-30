require('dotenv').config()

const { JsonRpc, Api, JsSignatureProvider } = require('@proton/js')
const fetch = require('node-fetch')

// Constants
const ENDPOINT = process.env.ENDPOINT
const PERMISSION = "active";

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
            console.log("AtomicAssets contract not available not properly deployed, please reset node")
            process.exit(-1);
        }
        if (e.message.includes("deadline exceeded")) {
            return "redo";
        }
    }
}

const initAtomicContract = async (contract) => {
    console.log("--------------- Initializing contract " + contract + " ---------------------");
    return await transact([{
        account: contract,
        name: 'init',
        authorization: [{
            actor: contract,
            permission: PERMISSION,
        }],
        data: {}
    }]).then(response => {
        if (response == "redo") {
            initAtomicContract(contract);
        }
        else {
            console.log(response);
        }
    });
}

const init_contracts = () => {
    initAtomicContract('atomicassets');
    initAtomicContract('atomicmarket');
}

init_contracts()