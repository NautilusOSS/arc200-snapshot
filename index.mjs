import algosdk from "algosdk";
import { arc200 } from "ulujs";
import fs from "fs";

const zeroAddr = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ";

const [, , tokenIdStr, roundStr, addr] = process.argv;

const tokenId = Number(tokenIdStr);

if (isNaN(tokenId)) {
  console.error("Invalid tokenId");
  process.exit(1);
}

let round = Number(roundStr);
if (isNaN(round)) {
  round = Number.MAX_SAFE_INTEGER;
}

const ALGO_SERVER = "https://testnet-api.voi.nodly.io";
const ALGO_INDEXER_SERVER = "https://testnet-idx.voi.nodly.io";

const algodClient = new algosdk.Algodv2(
  process.env.ALGOD_TOKEN || "",
  process.env.ALGOD_SERVER || ALGO_SERVER,
  process.env.ALGOD_PORT || ""
);

const indexerClient = new algosdk.Indexer(
  process.env.INDEXER_TOKEN || "",
  process.env.INDEXER_SERVER || ALGO_INDEXER_SERVER,
  process.env.INDEXER_PORT || ""
);

// create instance of arc200

const ci = new arc200(tokenId, algodClient, indexerClient);

// get metadata

const arc200_nameR = await ci.arc200_name();
if (!arc200_nameR.success) {
  console.error("Error getting metadata");
  process.exit(1);
}
const arc200_name = arc200_nameR.returnValue;
const arc200_symbolR = await ci.arc200_symbol();
if (!arc200_symbolR.success) {
  console.error("Error getting metadata");
  process.exit(1);
}
const arc200_symbol = arc200_symbolR.returnValue;
const arc200_decimalsR = await ci.arc200_decimals();
if (!arc200_decimalsR.success) {
  console.error("Error getting metadata");
  //process.exit(1);
}
const arc200_decimals = arc200_decimalsR?.returnValue || 0;
const arc200_totalSupplyR = await ci.arc200_totalSupply();
if (!arc200_totalSupplyR.success) {
  console.error("Error getting metadata");
  process.exit(1);
}
const arc200_totalSupply = arc200_totalSupplyR.returnValue;

const token = {
  tokenId,
  name: arc200_name,
  symbol: arc200_symbol,
  decimals: Number(arc200_decimals),
  totalSupply: arc200_totalSupply.toString(),
};

if (!fs.existsSync("data")) {
  fs.mkdirSync("data");
}

const filename = `data/arc200_Transfer_${token.symbol}-${token.tokenId}.json`

// if file does not exist then create it
if (!fs.existsSync(filename)) {
  fs.writeFileSync(
    filename,
    JSON.stringify([])
  );
}

const stored_arc200_Transfer = JSON.parse(
  fs.readFileSync(filename, "utf8")
);

const lastRound = stored_arc200_Transfer.reduce(
  (acc, val) => (acc[1] > val[1] ? acc[1] : val[1]),
  0
);

console.log("Last Round", lastRound);

const arc200_TransferR = await ci.arc200_Transfer({
  minRound: lastRound > 0 ? lastRound + 1 : 0,
});

stored_arc200_Transfer.push(...arc200_TransferR);

fs.writeFileSync(
  filename,
  JSON.stringify(
    stored_arc200_Transfer,
    (k, v) => (typeof v === "bigint" ? v.toString() : v),
    2
  )
);

// get snapshot up to round
if (roundStr && !addr) {
  const balance = new Map();

  balance.set(zeroAddr, BigInt(token.totalSupply));
  for (const [
    txID,
    time,
    ts,
    from,
    to,
    amount,
  ] of stored_arc200_Transfer.filter((el) => el[1] <= round)) {
    if (!balance.has(from)) {
      balance.set(from, BigInt(0));
    }
    if (!balance.has(to)) {
      balance.set(to, BigInt(0));
    }
    balance.set(from, balance.get(from) - BigInt(amount));
    balance.set(to, balance.get(to) + BigInt(amount));
  }

  const snapshot = Array.from(balance.entries()).map(([account, amount]) => ({
    account,
    amount: amount.toString(),
  }));

  snapshot.sort((a, b) => Number(b.amount) - Number(a.amount));

  for (const { account, amount } of snapshot) {
    let arc200_balanceOf = amount;
    if (amount < 0) {
      console.error("Negative balance", account); // something went terribly wrong
      process.exit(1);
    }
    console.log(arc200_balanceOf, account);
  }
} else if (addr) {
  const arc200_balanceOfR = await ci.arc200_balanceOf(addr);
  if (!arc200_balanceOfR.success) {
    console.error("Error getting balance");
    process.exit(1);
  }
  const arc200_balanceOf = arc200_balanceOfR.returnValue.toString();
  console.log("Balance", arc200_balanceOf);
  let sum = BigInt(0);
  for (const [
    txID,
    time,
    ts,
    from,
    to,
    amount,
  ] of stored_arc200_Transfer.filter((el) => el[1] <= round)) {
    if (from === addr || to === addr) {
      if (from === addr && to === addr) {
        console.log("[", from, "->", to, amount, "]");
        continue;
      }
      if (to === addr) sum += BigInt(amount);
      if (from === addr) sum -= BigInt(amount);
      console.log(from, "->", to, amount, sum.toString());
    }
  }
  console.log("Balance", sum.toString());
}

process.exit(0);
