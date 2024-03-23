# ARC200 Snapshot
Script to take snapshot of arc200 token

## quickstart

```
git clone https://github.com/NautilusOSS/arc200-snapshot.git arc200-snapshot
cd ${_}
npm i
```

## usage

```
node index.mjs TOKEN_ID
```

**example**

Download VIA transaction data

```
node index.mjs 6779767 
```

**example**

Generate current snapshot of token

```
node index.mjs 6779767 -
```

**example**

Generate snapshot of token at block 2Mi

```
node index.mjs 6779767 2000000
```

**example**

Display transaction data for account up to specific block

```
node index.mjs 6779767 2000000 7RPOFROHMQGWB5OYDS5LG3CBGYWROEZRJEJHEZAQ6LN2GOAISOFABCW2FE
```
