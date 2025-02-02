var express = require("express");
var bodyParser = require("body-parser");
var http = require('http');
var https = require('https');
var fs = require('fs');
var app = express();
var MongoClient = require("mongodb").MongoClient;
var exec = require('child_process').exec;
var cryptocurrency = require('./cryptocurrency');

// notes the callback in the middle will usually end last
// notes make sure for each callback at the end you have res.end because if it errors and never makes it to the last callback, it still needs to res.end

// constants
const DAEMON_HOSTNAME_AND_PORT = {hostname: "localhost",port: 18281,path: "/json_rpc",method: "POST", headers: {"Content-Type": "application/json"}};
const DAEMON_HOSTNAME_AND_PORT_GET_TRANSACTION_DATA = {hostname: "localhost",port: 18281,path: "/get_transactions",method: "POST", headers: {"Content-Type": "application/json"}};
const DAEMON_HOSTNAME_AND_PORT_GET_RING_ADDRESSES_DATA = {hostname: "localhost",port: 18281,path: "/get_outs",method: "POST", headers: {"Content-Type": "application/json"}};
const DAEMON_HOSTNAME_AND_PORT_GET_TRANSACTION_POOL_DATA = {hostname: "localhost",port: 18281,path: "/get_transaction_pool",method: "POST", headers: {"Content-Type": "application/json"}};
const DAEMON_HOSTNAME_AND_PORT_SEND_HEXADECIMAL_TRANSACTION = {hostname: "localhost",port: 18281,path: "/send_raw_transaction",method: "POST", headers: {"Content-Type": "application/json"}};
const DAEMON_HOSTNAME_AND_PORT_GET_NODES_LIST = {hostname: "localhost",port: 18281,path: "/get_peer_list",method: "POST", headers: {"Content-Type": "application/json"}};
const WALLET_HOSTNAME_AND_PORT = {hostname: "localhost",port: 18285,path: "/json_rpc",method: "POST", headers: {"Content-Type": "application/json"}};

const MININGPOOL_API = {hostname: "minexcash.com",port: 8117,path: "/live_stats",method: "GET"};
const CRYPTOPIA_BTC_PRICE = {hostname: "cryptopia.co.nz",port: 443,path: "/api/GetMarket/XCASH_BTC",method: "GET"};
const CRYPTOPIA_LTC_PRICE = {hostname: "cryptopia.co.nz",port: 443,path: "/api/GetMarket/XCASH_LTC",method: "GET"};
const CRYPTOPIA_LTC_USDT_PRICE = {hostname: "cryptopia.co.nz",port: 443,path: "/api/GetMarket/LTC_USDT",method: "GET"};

const API_GET_MARKET_DATA = {hostname: "api.coingecko.com",port: 443,path: "/api/v3/simple/price?ids=X-CASH&vs_currencies=BTC%2CLTC%2CUSD&include_market_cap=true&include_24hr_vol=true&include_24hr_change=false&include_last_updated_at=false",method: "GET"};
const API_GET_HISTORICAL_MARKET_DATA = {hostname: "api.coingecko.com",port: 443,path: "/api/v3/coins/x-cash/market_chart?vs_currency=USD&days=max",method: "GET"};

const HTTP_REQUEST_TIMEOUT = 60000;
const WALLET_DECIMAL_PLACES_AMOUNT = 1000000;
const MAXIMUM_SUPPLY = 100000000000;
const PREMINE_TOTAL_SUPPLY = 40000000000;
const PREMINE_CIRCULATING_SUPPLY = 14200000000;
const STARTING_BLOCK_REWARD_BEFORE_PREMINE_BLOCK_REWARD = 190734.863;
const MAXIMUM_TX_POOL_SIZE = 10;
const UNENCRYPTED_PAYMENT_ID = "022100";
const ENCRYPTED_PAYMENT_ID = "020901";

const BLOCKCHAIN_CURRENT_VERSION = 12;
const BLOCKCHAIN_CURRENT_VERSION_BLOCK_HEIGHT = 281000;
const BLOCKCHAIN_ALGORITHM = "Cryptonight HeavyX";
const BLOCKCHAIN_CURRENT_VERSION_ESTIMATED_DATE = "15-02-2019";
const BLOCKCHAIN_NEXT_VERSION = 13;
const BLOCKCHAIN_NEXT_VERSION_BLOCK_HEIGHT = "0";
const BLOCKCHAIN_NEXT_VERSION_ESTIMATED_DATE = "N/A";

const PREMINE_FUNDS_ALL_WALLETS = ["XCA1bpckHu6c7k2takLVjQ4rFVVv29pZrNtKSaHxFK9wFj8vQom425fCAFxKv1Ug2tLQ2egampmop3BhHsnZwNp3AaJn7ZDhVJ","XCA1WwDur8KhtXk9FpmkgmC8XYcYkS6xNRcZXonDkjxZ2ymeK5Zgh6CDgZcNksk4TBLt68TUmnwJhR1reh3cZ67c9S73aGtPzx","XCA1Sg2ByXygMcLUbT915R854R6J2J2H7Vo7cRLxyJ3qEVa26hxPDjaUdZPCQjmthbYBxXK8z13sFBPG16LLxF8Y5T5m6x5Dfp","XCA1YGuHuuS2j6B6SHDJLJDx5hcsYjxh5MjG6iFMMHz1H8iw7YniuPQKrZBLToa5SV4K6kXhXYiVKdwZGdsGCxXw4J6my27tSz"];
const PREMINE_FUNDS_ALL_WALLETS_RESERVE_PROOFS = ["ReserveProofV11BZ23sBt9sZJeGccf84mzyAmNCP3KzYbE1111112VKmH111118P6LgD7BAjqhyL7M1Z2B5kgbFGBDermoGYS8QrMY4syWc78oz7113USpZr44JXGn25zdWseLYR2Mtt93o8XNp7TsQqo8TMBMKdiUSafDjiyoEDh4vgELYLTtQA9qq1fMERR8XQsZzyFi7SedxaJtw113ki2J3n4uMchds1y5YfaW79R6g1zpKpRJ7kgKbdhCTMYWkNPiDEMac7Gw3yhL91WPa28ACobPMCHPiHBpFthk7G5KtdQazFyM5LqHFEChJq13MNVZkFPFWzXBpaFAsYabhcuXo8LSBE3eNoMRbueGBuxLWcXnHvWfYtDPYVrjghnXUfgwHUTmjjbN1Ak9bziaeySc7k2takLVjQ4rFVVv29pZrNtKSaHxFK9wFj8vPDeNWbaNs9r228JpS6LzYrZvHsMkjANLi88KvLLf3Yan48SMm4T37Q2Er71iYWVMKF4qCKMWrBsD2JNLMkv3GGFXr7R","ReserveProofV11BZ23sBt9sZJeGccf84mzyAmNCP3KzYbE1111112WLD5111118NEcQ8EJb5Z2G1KkrPXQ9J19fjuaDUa5f9JojsPf8g395LepNj113UsugvsPkJLFrkzFiVo7RCrbFWwUMEQJfyTqJMHJtUN3sLBRDavPJYrqz9x94tdAiSSE98PMHEF3MYekc5juUT3WUtDZmov5u113kPzF32n9Bc38fqt6sx5Foq3ePK2YRaEd5qtaUaEPqgZGngHSpxrxfegwDAR3pxnMQR3RcDq14VgmqJvhFbaf8UYJG2prSyxGHAPNV4wYkCWVKJEptEMVMQEcLhZeyoGV6XeCUoAunEsjGET3amUdf4XDDAaZBf5q26YfQQB3jRiDhfWEVPqWBUhmUKLj38kJXVBhJjBcuuiABf7xaEdEF94gALxC3L6pChSp1Ak9huDWow55btPGfWri3nakb2HbHpTb93CkR9n8apFBUS7bJUfVjRAQ21ko9thhTwPGHT6fyH2QGKeGdj9JZWT7BB67wzswTZme9p4PSUmNk3YBi3tTU87DDhfJqxvokSwFcGQjecFLhwuhHLezSX38Gq21fxJBiaaxvSrFJpYYkb5LJUy7mT1fdWpBsN5dHuMtMZiVoZXDBXnMbAptsks2vCqPC8Thi4Eu2ng3dwVmSpz1uoFvNfBecpVeXhKerALq8zyp2xjApmMVjw821FWX75rfEDSrocRwjo2tLW6dyXWwudCpS9jdsNiDukS6FBLnQURCC6EEGVyqGqR1MevRtyx8FydLczqAyy3ET4CYGGpjvUmtKqNqhLdHiRhdgE7mwZKB9yLFatqQVVJxLs1P1pEjgZi3kN1D9cQ9Ko4qZLC216AciQBFAMAUMN4qT21FZPqBfuZPtFMQzwQ5x3TSAJWdZ556ZK4eFdgUw82x1bmhNhfsRQFDtdddmK5J4zdoyF3TXwRwtjB7jVMA1nVnoQxXXr3tsiN9DrAZB3LoEDGXGF6twKVp7kz777hwsidUYdz146gTxqorfsjcG2fwjrcNMKeM3sfDwnwxJjY4KF4qWhbMMK32niKqYaJtyMidiqfXE6Wp1hH62apRdpNKXLqn1PcHp2oVw5vNZiJUJHKkQcGw2KuHVQSQ8JE2Cz6iR89McnFQEqLmrrx5uidiz8JyxKaef2UBbojEia3WVjzDP1wJBXk4GFqVoJvd1SGXWTMKDuEZCMmvWtr8EzbnN2oEjikbt7d8aS8SknaWowA2VDoo5via2f29L6eiXk9nYhUehCawRbJJpzut2oxPJRfiZNqU4BvL1E3VMKsbmDkzbmxxYThoh4iH21zMiaB2vai8eZHFHPx4S2oKZ74fDJJb113Cyt29KMYA6zoP3RF1AfRcEPbcjoKfnK9GTxr4rCLpb43Lo7AVrisRue6ZGpkZ9GGwRZ4bNP6NedmF69yxq49QFCFyYxc1JK1NkZw7ovGZYhJEniZteaz4kMZxKe6CzLsu96MvhRNhV6","ReserveProofV11BZ23sBt9sZJeGccf84mzyAmNCP3KzYbE1111112Vzj9111118PMkfNgDbDaypF5o5N7R3Q1wmsb93572DoBEu5xLGEsA9eZyVy1Bw946C5Dhc7CKW6xCATuWK8kDv8jBDpE9brcABSEra2jH9Jh1QtmgM5jf9Sd3N31g8viZznD5V13WtT7aP12MHU7z9zHKjGwHH1D8qEpCfiSpf7DDTd5ZGYjhzModqjmttcXNFPYpTGo1VanofLD47NWfXgd9odmzhpe6NynotLb3bWdFtYwnWfCHdLEgZhsWQTHqCxgGDwT6XTzJy7NzUkTa5xEi1qmfGRSk4J6wXsJYiNCt74w4r8yYZ6bdXTCrKW7cg1RTYq2t1XQQpaRbgwwVygqpWXHRcG1g8t12pFVqRTV7KEViheTTStb4qBpZRUtY8C8x6UJEtBvPDRcfzSy6W9V6ZxHJL9wsLRvwvYjvJai72VrySbLPjmYMVMTiXeeYkbtgPtVkgFYLr8MjxK6zZLJNLgdzhgbTsFSXHKUHgyiManHKAB6kkh9dF8Q8bK8ejPNGCKsnWWV6aCmFqqvgjzDiWcbs7rQfnq9h6Z3zxe3V7ujqdnDxQffXWBNu2n33vokWwR9qW6Npe9xUABFU5XwpXAvfiryci4jZWDNyxZ9ZcpoesksLFGGziirbq3DHUFFLzYb4stWRdJLWYE8uZoe6TyMwJhrdtMiFerRZmptT76JsdWVYE2n6FLvxp8criSva7rCKQxDHznTnhmY6LyauXUhyptWJ59NQD3UZzZzdVXW8TgJAvo1FDuYdUFZc7uUTDbZnCy7eUhfYEyJD4gQTUJDFzB6hpz61EPFUrSP3iqEimGPNzoaRgKz1Wpv6JD9DNYtdK5QsMpwWvGKvxvDZWbhoLcKBNH5XBAyMKRxV91DXGo6J2Px9HcwMYN1D8TQ17Dck7bG3Ee3NFoGmK7Jywzos4zH4kMREk8NSZbb86UeBTYLL4Jr969rGJjaxHXbe6yhm7bED82eNJpBgQARvgDUdS7WUo2PSuR44jBFLRyic9yaB32dM2jHpf596g26oveXoGi5mN1DA3ZgVAVgc16vU6h23TdvZBDCYXyBaVw6cZVA6mcQXLANT6q1SEMiBQZTQBo2WjJYavda2Huq7C6BxGJufoPB2ZDnY","ReserveProofV11BZ23sBt9sZJeGccf84mzyAmNCP3KzYbE1111112Wfh1111118N1Y8YF1eGN1ng2DQTruHqGyAYWU1hGaBPS71wPM2Ad1S5dKcB1BvB73MgpugRM74chfNvcQFNmk9F2iXUvD7CTt7L6FZCDyeHfqZkBMv7SEJb4s96f9jdiuvh27M267o2oCK9i3Jm6p7bn3UzyEP1D9fR3z7awjhDr8GEVuFt37z9NhKobRkoKSMqg8Y2dnk4Wketv2P5HpAyxrDimuJgTh5LPrmyD5yp7vQDV9yaJZqc8R4U8r34X6Ljvgq5bFHXQPRJ5redkwTRUMLDox948WzJqqcpSJWUYFWWoDcyRwUFRgxeK9vo1K9BUPxuAXNADci4Kp8QHmiCvNQZtPG1b2wg8HntpNWLqY2ya3Ru7N9gkjidwZc1tnMNtp1BwLh4RDj4CEZz7dNMxAfU72oX6WwN6fGQwRxxhm6X1ReTAw9SpRihkcU1vZqcD3Hy9LfeaqVY2G3539BuzSRz89HMuMKj33hM2TR2uS9MRPwW9vj9v9dMZENCffFKcb5uhVbRHcNpLHcmHfRmsWJcNP5WfbbAjTdrnntRdjfnMo7cJZFNBxyzCV15hNe9TZsweHBidqs3UbtFkBq8ttC3KrAidoBv9Bk4K6cGmh7kBRvzReexeX2Apu1Kfkcd347n7DwsWa2G6A6QvyJin1BvQRCUqrSjT2jBqX6i518gDaUpsLuE53NfraoeF7TYGYkJi97UtDa4A5jArhjLmB2VFNjnjJp6Q7Z4r266Qtrm7aWk2SSuSe6E4npRTvSH5koNCgCV43pNF74eU1kujKq2tXKWiWmuw7rYBmWqvHxUc3xhRiVikjbwK9gfS1NmSHnTqaJzjcFdMYNG2dmYadmF8QmF7bHkMSDY9mesj6xowQKEbgxhRNev55F71qZ7XxQhVoH9s6SoHRkWH49H2aGVZpfjYDpm89aTESb7SUKYB6v5Wwgj9SnrsFeZHn1PrsWHhBguLHcgpe7fZyf6CihGfKiumC3cpgqHHAXSGRD5HGFgxsy7PavzhJtjhXMQ3Ezdhd9Lk5N6QaXg2cEuVR3cweenQMNxfLy9omvycXis1L2afVb9SKVSbLPrfGGLwTFGuFHfWF5DpeWLgw6qGCM28CnMdsKAj4m74BuNU8oJzNgkev2msLWXo19CXtwck4QNEBxEErA64485UJuuaHDyhw7VoCxdWGk8KgUNHpUYk1ZSRFZuff1phhqU8gVMfZrfZxSXnKiZfdPiiTUky9KeRe7q1kvVuzkBhSNVVthDwNhDhE44dctHGFwLLYq1yEpcYgHQ4gtDZwd785cDTVd3Apbjb66Qvu933J6dCR18mLCE9XExQ3VLZ3BgFQK6jsPPTY8ci7JEGVR2NnAyma6UDBoFCXgLMNAN6QdC7HU8mdo1ykVop8N4hS1hMWQMUcDAGQoEbe8ZdwnwRnTD6KedgA1tvzJHQeiEsVih1zX3nBmBEfo1cP731xbC3CpC4gffCFkdaC38v1dmiryarkovC2Suup1ZJSKscpQPuDqoX8b4kmNcxfZ9vucXnb48T23zJ1frSsMUPxURMCsX94FEe2nDeQPEZ6nHZbN99VFhoCt9Jh9wpDy4uyrLBpXhpjsKvSVX3YoUvUfucf3tcpuCx9JCpAZ2tkGHL9da6Pdskw2QWh695BhVrxcAxiadhx354giQkVFhWU4rkAZ98hJh7aLA5EJikzdYpaPreEDHLMS17Gt5tU7Bwiaejm1bGbE4HAXsQEUdAJXDno7sGCQrs8kbqkBXbTpXxB2BXAKf2Ddgp"];

const PREMINE_FUNDS_AIRDROP_WALLETS = ["XCA1WwDur8KhtXk9FpmkgmC8XYcYkS6xNRcZXonDkjxZ2ymeK5Zgh6CDgZcNksk4TBLt68TUmnwJhR1reh3cZ67c9S73aGtPzx"];
const PREMINE_FUNDS_AIRDROP_WALLETS_RESERVE_PROOFS = ["ReserveProofV11BZ23sBt9sZJeGccf84mzyAmNCP3KzYbE1111112VfFD111118N2t2D31N1C7zqzewhT6mLK4r4GHU5JLKDSZPH7BEsBthds2vB1BwQsSxKoYsbRVwfnrvVvsD44uPvzrKYQY521imjsRvPFfVNP4JrX8kjhu1uiC6KbQSDCdUgGP7FY6A8agsAfiNQ1q8ZnRgVKBd1DAPChXZ4KMiBJtZSwZsudaytWjtzqqsqLyXN6SaifPfJjuYs1Ba8LuD24DCXoPar9NMemgBmKTNreNvu9a4AeqsAiEzdz7fvZVjhxsQuoVUujNnBHrt8vrN7dawnLdQwJMHLd2CsYEiqE6MPakLRoMcX51A3358RGCBCZGbFv5oibPcVoCKFP84YrmKeM3sfDwnwxJjY4KF4qWhbMMK32niKqYaJtyMidiqfXE6Wp1hH62apRdpNKXLqn1PcHp2oVw5vNZiJUJHKkQcGw2KuHVQSQ8JE2Cz6iR89McnFQEqLmrrx5uidiz8JyxKaef2UBbojDz3ZhKHSHgsVq1GxRaN17UAFZpLEtQXwav3fJWBczwrn7puGnTxKsFviGQc9HbC4GxeksZfUXJHdXmR1sv5enMhiK8xmrgS3E8eJRaxBi5JTSkPhjQyLbHnR4TUHnHDxdNLyGw1Yj1Ah16u3gHNWbPiTit6V2W53vaLAtwDj6ad2TdQsxj1TV113Cyt29KMYA6zoP3RF1AfRcEPbcjoKfnK9GTxr4rCLpb43Lo7AVrjc896zNA6HWV4HGXRzdDNgfHDASivzzqCWPU9E3k8yS66Ph3Gd34d4SQgZx6iU3rcaRiaYniA11p6G7ACAEq4c3V4"];
const PREMINE_FUNDS_XCASH_WALLETS = ["XCA1Sg2ByXygMcLUbT915R854R6J2J2H7Vo7cRLxyJ3qEVa26hxPDjaUdZPCQjmthbYBxXK8z13sFBPG16LLxF8Y5T5m6x5Dfp"];
const PREMINE_FUNDS_XCASH_WALLETS_RESERVE_PROOFS = ["ReserveProofV11BZ23sBt9sZJeGccf84mzyAmNCP3KzYbE1111112WLD5111118PMkfNgDbDaypF5o5N7R3Q1wmsb93572DoBEu5xLGEsA9eZyVy1Bw946C5Dhc7CKW6xCATuWK8kDv8jBDpE9brcABSEra2jH9Jh1QtmgM5jf9Sd3N31g8viZznD5V13WtT7aP12MHU7z9zHKjGwHH1D8oMZheR2t437YrKSeDe9VS1hNsmLXRiMkHBMsZ8KbUXHFwX5WKi8vb1RWKmAwS8qLZ67zza7xkBXZQDdb6va9z8Xfsh9VGxsaT6XAHzRvv9EZcbPvY2HjUEezptGnu9ZSF6aFfLS4vpEof3ZmhQrzwkcPzLaVXcFPDMRVZ1X26yoiYjnCLT4fcEKkWXHRcG1g8t12pFVqRTV7KEViheTTStb4qBpZRUtY8C8x6UJEtBvPDRcfzSy6W9V6ZxHJL9wsLRvwvYjvJai72VrySbLPjmYMVMTiXeeYkbtgPtVkgFYLr8MjxK6zZLJNLgdzhgbTsFTANZBBrTQyDsE2kPb8FPPbnBMV53tT1iAaqCYdDkoFoZW8ZSSGA2tbrsksjJZMgkvizvDs71dArC9juVB3gE4X521gS5F5mbdek6qBbqPaz4SGk6HEog3E9KCRD1BM51te6WWDYQx7tkBmx3MXqGaxDSGQ2943oU47XQ7VN7B57zaNZvArUnk6TyMwJhrdtMiFerRZmptT76JsdWVYE2n6FLvxp8criSva7rCKQxDHznTnhmY6LyauXUhyptWJ59NQD3UZzZzdVXW8TgJAvo1FDuYdUFZc7uUTDbZnCy7eUhfYEyJD4gQTUJDFzB6hpz61EPYH5SYBcZz1PjNK2VAnio1vaoMJDHvDeAf1DC7fmaMpdLHGzuoPDJv5YQAGs6WUBFzGKvm2ydu6x6m1ipvvBNDBBo1D8k4cttPeS6dBSEvTG4mkfzipw7xmfcYT4TutgvWBu8KuQxeBtM7qL1y3BhmeAPfHg1ZYYfwBNRGDBGPyp4xwJFNQm7LrJ5p98KBgE873hSyAaEDShFjs6enbPwQEjxgWLqM5WsDUAe4XRECJzMszCLNpH2TgWqNQbGbBgAPuMXJ4eE9LkzXK2nTP66UBMFNW5z99HBUayUWkGx4aFK6ke48BXFh3BmU6A3fHQLuVoMLgTrMSKcvUQ2Hp9w9AoNggwyKDrnJaHvMDAHmpy68FgMrd4YGA2YcSQxDv1v8jSdKndEb6Dj11Gbf9f1beMXGFJM42WcSUFTKkVZN7RzNJSWafabdNgH7LjMpY381v6MQgadupJo9Ha5UQVy3m66vNe7jmVhmtp2GAfEhzBiyuTXPWCu1A1y5i1Ak9Sr82LcKgMcLUbT915R854R6J2J2H7Vo7cRLxyJ3qEVa1wNij2JnQMLuPy35h6eZi6zuHozoeaZQx1HJYC3Y9Po43ofngQHX3Vpr51P3CYabC2V439mgsqVuj1uNSsLiG73z7mf3"];
const PREMINE_FUNDS_XCASH_REWARD_WALLETS = ["XCA1YGuHuuS2j6B6SHDJLJDx5hcsYjxh5MjG6iFMMHz1H8iw7YniuPQKrZBLToa5SV4K6kXhXYiVKdwZGdsGCxXw4J6my27tSz"];
const PREMINE_FUNDS_XCASH_REWARD_WALLETS_RESERVE_PROOFS = ["ReserveProofV11BZ23sBt9sZJeGccf84mzyAmNCP3KzYbE1111112Wfh1111118N1Y8YF1eGN1ng2DQTruHqGyAYWU1hGaBPS71wPM2Ad1S5dKcB1BvB73MgpugRM74chfNvcQFNmk9F2iXUvD7CTt7L6FZCDyeHfqZkBMv7SEJb4s96f9jdiuvh27M267o2oCK9i3Jm6p7bn3UzyEP1D9fR3z7awjhDr8GEVuFt37z9NhKobRkoKSMqg8Y2dnk4Wketv2P5HpAyxrDimuJgTh5LPrmyD5yp7vQDV9yaJZqc8R4U8r34X6Ljvgq5bFHXQPRJ5redkwTRUMLDox948WzJqqcpSJWUYFWWoDcyRwUFRgxeK9vo1K9BUPxuAXNADci4Kp8QHmiCvNQZtPG1b2wg8HntpNWLqY2ya3Ru7N9gkjidwZc1tnMNtp1BwLh4RDj4CEZz7dNMxAfU72oX6WwN6fGQwRxxhm6X1ReTAw9SpRihkcU1vZqcD3Hy9LfeaqVY2G3539BuzSRz89HMuMKj33hM2TR2uS9MRPwW9vj9v9dMZENCffFKcb5uhVbRHcNpLHcmHfRmsWJcNP5WfbbAjTdrnntRdjfnMo7cJZFNBxyzCV15hNe9TZsweHBidqs3UbtFkBq8ttC3KrAidoBv9Bk4K6cGmh7kBRvzReexeX2Apu1Kfkcd347n7DwsWa2G6A6QvyJin1BvQRCUqrSjT2jBqX6i518gDaUpsLuE53NfraoeF7TYGYkJi97UtDa4A5jArhjLmB2VFNjnjJp6Q7Z4r266Qtrm7aWk2SSuSe6E4npRTvSH5koNCgCV43pNF74eU1kujKq2tXKWiWmuw7rYBmWqvHxUc3xhRiVikjbwK9gfS1NmSHnTqaJzjcFdMYNG2dmYadmF8QmF7bHkMSDY9mesj6xowQKEbgxhRNev55F71qZ7XxQhVoH9s6SoHRkWH49H2aGVZpfjYDpm89aTESb7SUKYB6v5Wwgj9SnrsFeZHn1PrsWHhBguLHcgpe7fZyf6CihGfKiumC3cpgqHHAXSGRD5HGFgxsy7PavzhJtjhXMQ3Ezdhd9Lk5N6QaXg2cEuVR3cweenQMNxfLy9omvycXis1L2afVb9SKVSbLPrfGGLwTFGuFHfWF5DpeWLgw6qGCM28CnMdsKAj4m74BuNU8oJzNgkev2msLWXo19CXtwck4QNEBxEErA64485UJuuaHDyhw7VoCxdWGk8KgUNHpUYk1ZSRFZuff1phhqU8gVMfZrfZxSXnKiZfdPiiTUky9KeRe7q1kvVuzkBhSNVVthDwNhDhE44dctHGFwLLYq1yEpcYgHQ4gtDZwd785cDTVd3Apbjb66Qvu933J6dCR18mLCE9XExQ3VLZ3BgFQK6jsPPTY8ci7JEGVR2NnAyma6UDBoFCXgLMNAN6QdC7HU8mdo1ykVop8N4hS1hMWQMUcDAGQoEbe8ZdwnwRnTD6KedgA1tvzJHQeiEsVih1zX3nBmBEfo1cP731xbC3CpC4gffCFkdaC38v1dmiryarkovC2Suup1ZJSKscpQPuDqoX8b4kmNcxfZ9vucXnb48T23zJ1frSsMUPxURMCsX94FEe2nDeQPEZ6nHZbN99VFhoCt9Jh9wpDy4uyrLBpXhpjsKvSVX3YoUvUfucf3tcpuCx9JCpAZ2tkGHL9da6Pdskw2QWh695BhVrxcAxiadhx354giQkVFhWU4rkAZ98hJh7aLA5EJikzdYpaPreEDHLMS17Gt5tU7Bwiaejm1bGbE4HAXsQEUdAJXDno7sGCQrs8kbqkBXbTpXxB2BXAKf2Ddgp"];
const PREMINE_FUNDS_XCASH_INVESTORS_WALLETS = ["XCA1bpckHu6c7k2takLVjQ4rFVVv29pZrNtKSaHxFK9wFj8vQom425fCAFxKv1Ug2tLQ2egampmop3BhHsnZwNp3AaJn7ZDhVJ"];
const PREMINE_FUNDS_XCASH_INVESTORS_WALLETS_RESERVE_PROOFS = ["ReserveProofV11BZ23sBt9sZJeGccf84mzyAmNCP3KzYbE1111112VKmH111118P6LgD7BAjqhyL7M1Z2B5kgbFGBDermoGYS8QrMY4syWc78oz7113USpZr44JXGn25zdWseLYR2Mtt93o8XNp7TsQqo8TMBMKdiUSafDjiyoEDh4vgELYLTtQA9qq1fMERR8XQsZzyFi7SedxaJtw113ki2J3n4uMchds1y5YfaW79R6g1zpKpRJ7kgKbdhCTMYWkNPiDEMac7Gw3yhL91WPa28ACobPMCHPiHBpFthk7G5KtdQazFyM5LqHFEChJq13MNVZkFPFWzXBpaFAsYabhcuXo8LSBE3eNoMRbueGBuxLWcXnHvWfYtDPYVrjghnXUfgwHUTmjjbN1Ak9bziaeySc7k2takLVjQ4rFVVv29pZrNtKSaHxFK9wFj8vPDeNWbaNs9r228JpS6LzYrZvHsMkjANLi88KvLLf3Yan48SMm4T37Q2Er71iYWVMKF4qCKMWrBsD2JNLMkv3GGFXr7R"];

const GET_BLOCK_COUNT = JSON.stringify({"jsonrpc":"2.0","id":"0","method":"get_block_count"});
const GET_BLOCK_HASH = JSON.stringify({"jsonrpc":"2.0","id":"0","method":"on_get_block_hash","params":["block_height"]});
const GET_LAST_BLOCK_DATA = JSON.stringify({"jsonrpc":"2.0","id":"0","method":"get_last_block_header"});
const GET_BLOCK_DATA_FROM_BLOCK_HEIGHT = JSON.stringify({"jsonrpc":"2.0","id":"0","method":"get_block_header_by_height","params":{"height":"block_height"}});
const GET_BLOCK_DATA_FROM_BLOCK_HASH = JSON.stringify({"jsonrpc":"2.0","id":"0","method":"get_block_header_by_hash","params":{"hash":"block_hash"}});
const GET_BLOCK_TRANSACTION_DATA = JSON.stringify({"jsonrpc":"2.0","id":"0","method":"get_block","params":{"get_block_transaction_data_parameter":"get_block_transaction_data_settings"}});
const GET_BLOCKCHAIN_DATA = JSON.stringify({"jsonrpc":"2.0","id":"0","method":"get_info"});
const GET_BLOCKCHAIN_VERSION_DATA = JSON.stringify({"jsonrpc":"2.0","id":"0","method":"hard_fork_info"});
const GET_TRANSACTION_DATA = JSON.stringify({"txs_hashes":["transaction_hash"],"decode_as_json":true});
const VERIFY_RESERVE_PROOF = JSON.stringify({"jsonrpc":"2.0","id":"0","method":"check_reserve_proof","params":{"address":"public_address","message":"data","signature":"reserve_proof"}});
const GET_TRANSACTION_CONFIRMATIONS_DATA = JSON.stringify({"txs_hashes":["transaction_hash"],"prune":false});
const GET_KEY_IMAGES_RING_ADDRESS_DATA = JSON.stringify({"txs_hashes":["transaction_hash"],"decode_as_json":true,"prune":false});
const SEND_HEXADECIMAL_TRANSACTION = JSON.stringify({"tx_as_hex":"tx_data_hexadecimal", "do_not_relay":false});
const VALIDATE_HEXADECIMAL_TRANSACTION = JSON.stringify({"tx_as_hex":"tx_data_hexadecimal", "do_not_relay":true});
const GET_GENERATED_SUPPLY = JSON.stringify({"jsonrpc":"2.0","id":"0","method":"get_coinbase_tx_sum","params":{"height":0,"count":"block_height"}});

const GET_BLOCK_COUNT_ERROR = {"Error":"Could not get block height"};
const GET_BLOCK_HASH_ERROR = {"Error":"Could not get block hash"};
const GET_LAST_BLOCK_DATA_ERROR = {"Error":"Could not get block data"};
const GET_BLOCK_DATA_FROM_BLOCK_HEIGHT_ERROR = {"Error":"Could not get block data"};
const GET_TRANSACTION_DATA_SEARCH_RESULTS = {"Error":"Could not get transaction data"};
const GET_BLOCK_DATA_FROM_BLOCK_HASH_ERROR = {"Error":"Could not get block data"};
const GET_BLOCK_TRANSACTION_DATA_ERROR = {"Error":"Could not get block transaction data"};
const GET_BLOCKCHAIN_DATA_ERROR = {"Error":"Could not get blockchain data"};
const GET_TRANSACTION_DATA_ERROR = {"Error":"Could not get transaction data"};
const GET_TRANSACTION_CONFIRMATIONS_DATA_ERROR = {"Error":"Could not get transaction confirmation data"};
const VERIFY_RESERVE_PROOF_ERROR = {"Error":"Could not verify reserve_proof"};
const CREATE_INTEGRATED_ADDRESS_ERROR = {"Error":"Could not create integrated address"};
const GET_KEY_IMAGES_RING_ADDRESS_DATA_ERROR = {"Error":"Could not get key images ring address data"};
const GET_TRANSACTION_POOL_DATA_ERROR = {"Error":"Could not get transaction pool data"};
const GET_BLOCKCHAIN_DATA_SETTINGS_ERROR = {"Error":"Invalid parameters. Valid parameters are block height, block hash, block reward tx hash, tx hash"};
const SEND_HEXADECIMIAL_TRANSACTION_SUCCESS = {"send_hexadecimal_transaction_results":"Success"};
const SEND_HEXADECIMIAL_TRANSACTION_ERROR = {"send_hexadecimal_transaction_results":"Error"};

// Create application/x-www-form-urlencoded parser and JSON parser
var urlencodedParser = bodyParser.urlencoded({ extended: false });
var jsonParser = bodyParser.json();

app.use(express.static('/var/www/html'),function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

var database;
var collection;
var nodes_list = "";
var xcash_proof_of_stake_nodes_list = "";

// connect to the mongo database
MongoClient.connect("mongodb://localhost/database", { useNewUrlParser: true }, function(error, db) {
try
{
if (error)
{
throw("error");
}
}
catch (error)
{
return;
}
database = db.db("database");
collection = database.collection('transactions');
});

function randString(length) {
var str = '';
var charset='0123456789abcdef';
while (length--) {
str += charset[Math.floor((Math.random() * charset.length))];
}
return str;
}

var previousblockheight;
var currentblockheight;
var resetcounter = 0;

function addtransactionstodatabase(block_height)
{
var get_block_transaction_data = GET_BLOCK_TRANSACTION_DATA;
get_block_transaction_data = get_block_transaction_data.replace("get_block_transaction_data_parameter","height");
get_block_transaction_data = get_block_transaction_data.replace("get_block_transaction_data_settings",block_height);
var httprequest = new http.ClientRequest(DAEMON_HOSTNAME_AND_PORT);
httprequest.end(get_block_transaction_data);

httprequest.on('response', function (response) {
  response.setEncoding('utf8');
  var result = "";
  response.on('data', chunk => result += chunk);
  response.on('end', function () {
    try
    { 
      var obj = JSON.parse(result);
      if (result == "" || result.indexOf("error") != -1)
      {
        throw("error");
      } 
      var block_transaction_data = JSON.parse(obj.result.json); 
      var tx_hashes = "";
      var get_transaction_data = {"txs_hashes":[],"decode_as_json":true}; 
      for (var count = 0; count < block_transaction_data.tx_hashes.length; count++)
      {
        tx_hashes += block_transaction_data.tx_hashes[count] + "|";
        get_transaction_data.txs_hashes[count] = block_transaction_data.tx_hashes[count];
      } 
      tx_hashes = tx_hashes.substr(0,tx_hashes.length - 1); 
            var post_request = new http.ClientRequest(DAEMON_HOSTNAME_AND_PORT_GET_TRANSACTION_DATA);
            post_request.end(JSON.stringify(get_transaction_data));
            post_request.on('response', function (response) {
            response.setEncoding('utf8');
            var result = "";
            response.on('data', chunk => result += chunk);
            response.on('end', function () {
            try
            { 
              var tx_hash_data = JSON.parse(result);
              var tx_hash_data_results;
              if (result == "" || result.indexOf("error") != -1)
              {
                throw("error");
              } 
              
              for (count1 = 0; count1 < block_transaction_data.tx_hashes.length; count1++)
              {
              var block_tx = "";
              var block_tx_ringsize = "";
              var block_tx_fee = "";
              var block_tx_size = "";
              var block_tx_paymentid = "";
              var block_tx_paymentid_settings = "";
              var block_tx_privacy_settings = "";
              var block_tx_addresses = "";
              var block_tx_public_addresses = "";
              var block_tx_signature = "";
              var block_tx_ecdh_data = "";
              var block_tx_public_key = "";
              var block_tx_private_key = "";
              var block_tx_timestamp = "";
                tx_hash_data_results = JSON.parse(tx_hash_data.txs[count1].as_json);
                block_tx = tx_hash_data.txs[count1].tx_hash;
                var tx_extra = Buffer.from(tx_hash_data_results.extra).toString("hex");
                
                if (tx_extra.length >= 256)
                {
                  var count3 = tx_extra.indexOf("02647c584341");
                  block_tx_private_key = tx_extra.substr(tx_extra.indexOf("02227c") + 6,64);
                  block_tx_signature = Buffer.from(tx_extra.substr(tx_extra.indexOf("025f7c536967") + 6,186), 'hex').toString('utf8');
                  block_tx_public_addresses = Buffer.from(tx_extra.substr(count3 + 6,196), 'hex').toString('utf8') + "|";
                  block_tx_public_addresses += Buffer.from(tx_extra.substr(tx_extra.indexOf("02647c584341",count3+12) + 6,196), 'hex').toString('utf8');
                }
                else
                {
                  block_tx_private_key = "none";
                  block_tx_signature = "none";
                  block_tx_public_addresses = "none";
                  block_tx_signature = "none";
                }

                for (var count2 = 0; count2 < tx_hash_data_results.vout.length; count2++)
                { 
                  block_tx_addresses += tx_hash_data_results.vout[count2].target.key + "|";
                }
                block_tx_addresses = block_tx_addresses.substr(0,block_tx_addresses.length - 1);
                
                block_tx_ringsize = tx_hash_data_results.vin[0].key.key_offsets.length;
                block_tx_fee = tx_hash_data_results.rct_signatures.txnFee; 
                block_tx_size = (tx_hash_data.txs[count1].as_hex.length / 1024 / 2);    
                block_tx_paymentid_settings = tx_extra.substr(0,6) === UNENCRYPTED_PAYMENT_ID ? "unencrypted" : tx_extra.substr(0,6) === ENCRYPTED_PAYMENT_ID ? "encrypted" : "none";
                block_tx_paymentid = tx_extra.substr(0,6) === UNENCRYPTED_PAYMENT_ID ? tx_extra.substr(6,64) : tx_extra.substr(0,6) === ENCRYPTED_PAYMENT_ID ? tx_extra.substr(6,16) : "none";
                block_tx_privacy_settings = tx_extra.length >= 256 ? "public" : "private";  
                block_tx_public_key = tx_extra.substr(tx_extra.length - 64);
                block_tx_ecdh_data = JSON.stringify(tx_hash_data_results.rct_signatures); 
                block_tx_timestamp = tx_hash_data.txs[count1].block_timestamp;

var tx_data = {
"tx":block_tx,
"tx_ringsize":block_tx_ringsize,
"tx_fee":block_tx_fee,
"tx_size":block_tx_size,
"tx_paymentid":block_tx_paymentid,
"tx_paymentid_settings":block_tx_paymentid_settings,
"tx_privacy_settings":block_tx_privacy_settings,
"tx_addresses":block_tx_addresses,
"tx_public_addresses":block_tx_public_addresses,
"tx_signature":block_tx_signature,
"tx_ecdh_data":block_tx_ecdh_data,
"tx_public_key":block_tx_public_key,
"tx_private_key":block_tx_private_key,
"tx_timestamp":block_tx_timestamp
}


additemtodatabase(tx_data);                  
                    







 
              }
            
      
        }
    catch (error)
    {
      
    }    
  });
});
post_request.setTimeout(HTTP_REQUEST_TIMEOUT, () => post_request.abort());
post_request.on('error', response => {console.log("error at block " + block_height);});
    }
    catch (error)
    {
      return;
    }    
  });
});
httprequest.setTimeout(HTTP_REQUEST_TIMEOUT, () => httprequest.abort());
httprequest.on('error', response => {console.log("error at block " + block_height);});
}



function additemtodatabase(item)
{
collection.countDocuments({"tx":item.tx}, function(error, databasecount)
{
try
{
if (error)
{
throw("error");
}
}
catch (error)
{
return;
}


if (databasecount == 0)
{
console.log("adding tx " + item.tx);
collection.insertOne(item, function(error, result) {
try
{
if (error)
{
throw("error");
}
}
catch (error)
{
return;
}
});
}


});
}



function convert_number_to_ip_address(number) 
{
    var ip_address = number%256;
    for (var i = 3; i > 0; i--) 
    { 
        number = Math.floor(number/256);
        ip_address = number%256 + '.' + ip_address;
    }
    return ip_address;
}

function get_node(latitude,longitude)
{
const nodes_array = [
{"id":"0","latitude":110.3,"longitude":826.1},
{"id":"1","latitude":110.3,"longitude":819.3},
{"id":"2","latitude":117.1,"longitude":819.3},
{"id":"3","latitude":90,"longitude":812.6},
{"id":"4","latitude":103.5,"longitude":812.6},
{"id":"5","latitude":110.3,"longitude":812.6},
{"id":"6","latitude":90,"longitude":805.8},
{"id":"7","latitude":103.5,"longitude":805.8},
{"id":"8","latitude":110.3,"longitude":805.8},
{"id":"9","latitude":117.1,"longitude":805.8},
{"id":"10","latitude":123.9,"longitude":805.8},
{"id":"11","latitude":381.6,"longitude":805.8},
{"id":"12","latitude":96.7,"longitude":799},
{"id":"13","latitude":103.5,"longitude":799},
{"id":"14","latitude":110.3,"longitude":799},
{"id":"15","latitude":117.1,"longitude":799},
{"id":"16","latitude":123.9,"longitude":799},
{"id":"17","latitude":374.8,"longitude":799},
{"id":"18","latitude":381.6,"longitude":799},
{"id":"19","latitude":388.4,"longitude":799},
{"id":"20","latitude":96.7,"longitude":792.2},
{"id":"21","latitude":103.5,"longitude":792.2},
{"id":"22","latitude":110.3,"longitude":792.2},
{"id":"23","latitude":117.1,"longitude":792.2},
{"id":"24","latitude":123.9,"longitude":792.2},
{"id":"25","latitude":368,"longitude":792.2},
{"id":"26","latitude":374.8,"longitude":792.2},
{"id":"27","latitude":381.6,"longitude":792.2},
{"id":"28","latitude":388.4,"longitude":792.2},
{"id":"29","latitude":395.2,"longitude":792.2},
{"id":"30","latitude":96.7,"longitude":785.4},
{"id":"31","latitude":103.5,"longitude":785.4},
{"id":"32","latitude":110.3,"longitude":785.4},
{"id":"33","latitude":117.1,"longitude":785.4},
{"id":"34","latitude":123.9,"longitude":785.4},
{"id":"35","latitude":130.7,"longitude":785.4},
{"id":"36","latitude":395.2,"longitude":785.4},
{"id":"37","latitude":402,"longitude":785.4},
{"id":"38","latitude":96.7,"longitude":778.7},
{"id":"39","latitude":103.5,"longitude":778.7},
{"id":"40","latitude":110.3,"longitude":778.7},
{"id":"41","latitude":117.1,"longitude":778.7},
{"id":"42","latitude":123.9,"longitude":778.7},
{"id":"43","latitude":130.7,"longitude":778.7},
{"id":"44","latitude":334.1,"longitude":778.7},
{"id":"45","latitude":340.9,"longitude":778.7},
{"id":"46","latitude":395.2,"longitude":778.7},
{"id":"47","latitude":402,"longitude":778.7},
{"id":"48","latitude":96.7,"longitude":771.9},
{"id":"49","latitude":103.5,"longitude":771.9},
{"id":"50","latitude":110.3,"longitude":771.9},
{"id":"51","latitude":117.1,"longitude":771.9},
{"id":"52","latitude":123.9,"longitude":771.9},
{"id":"53","latitude":130.7,"longitude":771.9},
{"id":"54","latitude":334.1,"longitude":771.9},
{"id":"55","latitude":340.9,"longitude":771.9},
{"id":"56","latitude":96.7,"longitude":765.1},
{"id":"57","latitude":103.5,"longitude":765.1},
{"id":"58","latitude":110.3,"longitude":765.1},
{"id":"59","latitude":117.1,"longitude":765.1},
{"id":"60","latitude":123.9,"longitude":765.1},
{"id":"61","latitude":130.7,"longitude":765.1},
{"id":"62","latitude":137.4,"longitude":765.1},
{"id":"63","latitude":144.2,"longitude":765.1},
{"id":"64","latitude":151,"longitude":765.1},
{"id":"65","latitude":96.7,"longitude":758.3},
{"id":"66","latitude":103.5,"longitude":758.3},
{"id":"67","latitude":110.3,"longitude":758.3},
{"id":"68","latitude":117.1,"longitude":758.3},
{"id":"69","latitude":123.9,"longitude":758.3},
{"id":"70","latitude":137.4,"longitude":758.3},
{"id":"71","latitude":144.2,"longitude":758.3},
{"id":"72","latitude":151,"longitude":758.3},
{"id":"73","latitude":157.8,"longitude":758.3},
{"id":"74","latitude":307,"longitude":758.3},
{"id":"75","latitude":96.7,"longitude":751.5},
{"id":"76","latitude":103.5,"longitude":751.5},
{"id":"77","latitude":110.3,"longitude":751.5},
{"id":"78","latitude":117.1,"longitude":751.5},
{"id":"79","latitude":123.9,"longitude":751.5},
{"id":"80","latitude":130.7,"longitude":751.5},
{"id":"81","latitude":151,"longitude":751.5},
{"id":"82","latitude":307,"longitude":751.5},
{"id":"83","latitude":90,"longitude":744.7},
{"id":"84","latitude":96.7,"longitude":744.7},
{"id":"85","latitude":103.5,"longitude":744.7},
{"id":"86","latitude":110.3,"longitude":744.7},
{"id":"87","latitude":117.1,"longitude":744.7},
{"id":"88","latitude":123.9,"longitude":744.7},
{"id":"89","latitude":130.7,"longitude":744.7},
{"id":"90","latitude":300.2,"longitude":744.7},
{"id":"91","latitude":347.7,"longitude":744.7},
{"id":"92","latitude":354.5,"longitude":744.7},
{"id":"93","latitude":361.3,"longitude":744.7},
{"id":"94","latitude":76.4,"longitude":738},
{"id":"95","latitude":90,"longitude":738},
{"id":"96","latitude":96.7,"longitude":738},
{"id":"97","latitude":103.5,"longitude":738},
{"id":"98","latitude":110.3,"longitude":738},
{"id":"99","latitude":117.1,"longitude":738},
{"id":"100","latitude":123.9,"longitude":738},
{"id":"101","latitude":130.7,"longitude":738},
{"id":"102","latitude":300.2,"longitude":738},
{"id":"103","latitude":313.8,"longitude":738},
{"id":"104","latitude":340.9,"longitude":738},
{"id":"105","latitude":347.7,"longitude":738},
{"id":"106","latitude":354.5,"longitude":738},
{"id":"107","latitude":361.3,"longitude":738},
{"id":"108","latitude":368,"longitude":738},
{"id":"109","latitude":374.8,"longitude":738},
{"id":"110","latitude":76.4,"longitude":731.2},
{"id":"111","latitude":90,"longitude":731.2},
{"id":"112","latitude":96.7,"longitude":731.2},
{"id":"113","latitude":103.5,"longitude":731.2},
{"id":"114","latitude":110.3,"longitude":731.2},
{"id":"115","latitude":117.1,"longitude":731.2},
{"id":"116","latitude":123.9,"longitude":731.2},
{"id":"117","latitude":130.7,"longitude":731.2},
{"id":"118","latitude":300.2,"longitude":731.2},
{"id":"119","latitude":307,"longitude":731.2},
{"id":"120","latitude":327.3,"longitude":731.2},
{"id":"121","latitude":334.1,"longitude":731.2},
{"id":"122","latitude":340.9,"longitude":731.2},
{"id":"123","latitude":347.7,"longitude":731.2},
{"id":"124","latitude":354.5,"longitude":731.2},
{"id":"125","latitude":361.3,"longitude":731.2},
{"id":"126","latitude":368,"longitude":731.2},
{"id":"127","latitude":374.8,"longitude":731.2},
{"id":"128","latitude":381.6,"longitude":731.2},
{"id":"129","latitude":388.4,"longitude":731.2},
{"id":"130","latitude":69.6,"longitude":724.4},
{"id":"131","latitude":76.4,"longitude":724.4},
{"id":"132","latitude":83.2,"longitude":724.4},
{"id":"133","latitude":90,"longitude":724.4},
{"id":"134","latitude":96.7,"longitude":724.4},
{"id":"135","latitude":103.5,"longitude":724.4},
{"id":"136","latitude":110.3,"longitude":724.4},
{"id":"137","latitude":117.1,"longitude":724.4},
{"id":"138","latitude":123.9,"longitude":724.4},
{"id":"139","latitude":130.7,"longitude":724.4},
{"id":"140","latitude":157.8,"longitude":724.4},
{"id":"141","latitude":164.6,"longitude":724.4},
{"id":"142","latitude":171.3,"longitude":724.4},
{"id":"143","latitude":178.1,"longitude":724.4},
{"id":"144","latitude":184.9,"longitude":724.4},
{"id":"145","latitude":300.2,"longitude":724.4},
{"id":"146","latitude":307,"longitude":724.4},
{"id":"147","latitude":320.6,"longitude":724.4},
{"id":"148","latitude":327.3,"longitude":724.4},
{"id":"149","latitude":334.1,"longitude":724.4},
{"id":"150","latitude":340.9,"longitude":724.4},
{"id":"151","latitude":347.7,"longitude":724.4},
{"id":"152","latitude":354.5,"longitude":724.4},
{"id":"153","latitude":361.3,"longitude":724.4},
{"id":"154","latitude":368,"longitude":724.4},
{"id":"155","latitude":374.8,"longitude":724.4},
{"id":"156","latitude":381.6,"longitude":724.4},
{"id":"157","latitude":69.6,"longitude":717.6},
{"id":"158","latitude":76.4,"longitude":717.6},
{"id":"159","latitude":83.2,"longitude":717.6},
{"id":"160","latitude":90,"longitude":717.6},
{"id":"161","latitude":96.7,"longitude":717.6},
{"id":"162","latitude":103.5,"longitude":717.6},
{"id":"163","latitude":110.3,"longitude":717.6},
{"id":"164","latitude":117.1,"longitude":717.6},
{"id":"165","latitude":123.9,"longitude":717.6},
{"id":"166","latitude":130.7,"longitude":717.6},
{"id":"167","latitude":137.4,"longitude":717.6},
{"id":"168","latitude":151,"longitude":717.6},
{"id":"169","latitude":157.8,"longitude":717.6},
{"id":"170","latitude":164.6,"longitude":717.6},
{"id":"171","latitude":171.3,"longitude":717.6},
{"id":"172","latitude":178.1,"longitude":717.6},
{"id":"173","latitude":184.9,"longitude":717.6},
{"id":"174","latitude":191.7,"longitude":717.6},
{"id":"175","latitude":198.5,"longitude":717.6},
{"id":"176","latitude":205.3,"longitude":717.6},
{"id":"177","latitude":293.4,"longitude":717.6},
{"id":"178","latitude":300.2,"longitude":717.6},
{"id":"179","latitude":307,"longitude":717.6},
{"id":"180","latitude":327.3,"longitude":717.6},
{"id":"181","latitude":334.1,"longitude":717.6},
{"id":"182","latitude":340.9,"longitude":717.6},
{"id":"183","latitude":347.7,"longitude":717.6},
{"id":"184","latitude":354.5,"longitude":717.6},
{"id":"185","latitude":361.3,"longitude":717.6},
{"id":"186","latitude":368,"longitude":717.6},
{"id":"187","latitude":374.8,"longitude":717.6},
{"id":"188","latitude":69.6,"longitude":710.8},
{"id":"189","latitude":76.4,"longitude":710.8},
{"id":"190","latitude":90,"longitude":710.8},
{"id":"191","latitude":96.7,"longitude":710.8},
{"id":"192","latitude":103.5,"longitude":710.8},
{"id":"193","latitude":110.3,"longitude":710.8},
{"id":"194","latitude":117.1,"longitude":710.8},
{"id":"195","latitude":123.9,"longitude":710.8},
{"id":"196","latitude":130.7,"longitude":710.8},
{"id":"197","latitude":137.4,"longitude":710.8},
{"id":"198","latitude":144.2,"longitude":710.8},
{"id":"199","latitude":151,"longitude":710.8},
{"id":"200","latitude":157.8,"longitude":710.8},
{"id":"201","latitude":164.6,"longitude":710.8},
{"id":"202","latitude":171.3,"longitude":710.8},
{"id":"203","latitude":178.1,"longitude":710.8},
{"id":"204","latitude":198.5,"longitude":710.8},
{"id":"205","latitude":205.3,"longitude":710.8},
{"id":"206","latitude":293.4,"longitude":710.8},
{"id":"207","latitude":300.2,"longitude":710.8},
{"id":"208","latitude":307,"longitude":710.8},
{"id":"209","latitude":327.3,"longitude":710.8},
{"id":"210","latitude":334.1,"longitude":710.8},
{"id":"211","latitude":340.9,"longitude":710.8},
{"id":"212","latitude":347.7,"longitude":710.8},
{"id":"213","latitude":354.5,"longitude":710.8},
{"id":"214","latitude":361.3,"longitude":710.8},
{"id":"215","latitude":368,"longitude":710.8},
{"id":"216","latitude":90,"longitude":704},
{"id":"217","latitude":96.7,"longitude":704},
{"id":"218","latitude":103.5,"longitude":704},
{"id":"219","latitude":110.3,"longitude":704},
{"id":"220","latitude":117.1,"longitude":704},
{"id":"221","latitude":123.9,"longitude":704},
{"id":"222","latitude":130.7,"longitude":704},
{"id":"223","latitude":137.4,"longitude":704},
{"id":"224","latitude":144.2,"longitude":704},
{"id":"225","latitude":151,"longitude":704},
{"id":"226","latitude":157.8,"longitude":704},
{"id":"227","latitude":164.6,"longitude":704},
{"id":"228","latitude":171.3,"longitude":704},
{"id":"229","latitude":178.1,"longitude":704},
{"id":"230","latitude":184.9,"longitude":704},
{"id":"231","latitude":205.3,"longitude":704},
{"id":"232","latitude":293.4,"longitude":704},
{"id":"233","latitude":300.2,"longitude":704},
{"id":"234","latitude":307,"longitude":704},
{"id":"235","latitude":320.6,"longitude":704},
{"id":"236","latitude":327.3,"longitude":704},
{"id":"237","latitude":334.1,"longitude":704},
{"id":"238","latitude":340.9,"longitude":704},
{"id":"239","latitude":347.7,"longitude":704},
{"id":"240","latitude":354.5,"longitude":704},
{"id":"241","latitude":361.3,"longitude":704},
{"id":"242","latitude":368,"longitude":704},
{"id":"243","latitude":90,"longitude":697.3},
{"id":"244","latitude":96.7,"longitude":697.3},
{"id":"245","latitude":103.5,"longitude":697.3},
{"id":"246","latitude":110.3,"longitude":697.3},
{"id":"247","latitude":117.1,"longitude":697.3},
{"id":"248","latitude":123.9,"longitude":697.3},
{"id":"249","latitude":130.7,"longitude":697.3},
{"id":"250","latitude":137.4,"longitude":697.3},
{"id":"251","latitude":144.2,"longitude":697.3},
{"id":"252","latitude":151,"longitude":697.3},
{"id":"253","latitude":157.8,"longitude":697.3},
{"id":"254","latitude":164.6,"longitude":697.3},
{"id":"255","latitude":171.3,"longitude":697.3},
{"id":"256","latitude":178.1,"longitude":697.3},
{"id":"257","latitude":184.9,"longitude":697.3},
{"id":"258","latitude":205.3,"longitude":697.3},
{"id":"259","latitude":212,"longitude":697.3},
{"id":"260","latitude":218.8,"longitude":697.3},
{"id":"261","latitude":293.4,"longitude":697.3},
{"id":"262","latitude":307,"longitude":697.3},
{"id":"263","latitude":313.8,"longitude":697.3},
{"id":"264","latitude":320.6,"longitude":697.3},
{"id":"265","latitude":327.3,"longitude":697.3},
{"id":"266","latitude":334.1,"longitude":697.3},
{"id":"267","latitude":340.9,"longitude":697.3},
{"id":"268","latitude":347.7,"longitude":697.3},
{"id":"269","latitude":354.5,"longitude":697.3},
{"id":"270","latitude":361.3,"longitude":697.3},
{"id":"271","latitude":83.2,"longitude":690.5},
{"id":"272","latitude":90,"longitude":690.5},
{"id":"273","latitude":96.7,"longitude":690.5},
{"id":"274","latitude":103.5,"longitude":690.5},
{"id":"275","latitude":110.3,"longitude":690.5},
{"id":"276","latitude":117.1,"longitude":690.5},
{"id":"277","latitude":123.9,"longitude":690.5},
{"id":"278","latitude":130.7,"longitude":690.5},
{"id":"279","latitude":137.4,"longitude":690.5},
{"id":"280","latitude":144.2,"longitude":690.5},
{"id":"281","latitude":151,"longitude":690.5},
{"id":"282","latitude":157.8,"longitude":690.5},
{"id":"283","latitude":164.6,"longitude":690.5},
{"id":"284","latitude":171.3,"longitude":690.5},
{"id":"285","latitude":178.1,"longitude":690.5},
{"id":"286","latitude":184.9,"longitude":690.5},
{"id":"287","latitude":191.7,"longitude":690.5},
{"id":"288","latitude":198.5,"longitude":690.5},
{"id":"289","latitude":205.3,"longitude":690.5},
{"id":"290","latitude":225.6,"longitude":690.5},
{"id":"291","latitude":286.6,"longitude":690.5},
{"id":"292","latitude":293.4,"longitude":690.5},
{"id":"293","latitude":320.6,"longitude":690.5},
{"id":"294","latitude":327.3,"longitude":690.5},
{"id":"295","latitude":334.1,"longitude":690.5},
{"id":"296","latitude":340.9,"longitude":690.5},
{"id":"297","latitude":347.7,"longitude":690.5},
{"id":"298","latitude":354.5,"longitude":690.5},
{"id":"299","latitude":361.3,"longitude":690.5},
{"id":"300","latitude":83.2,"longitude":683.7},
{"id":"301","latitude":90,"longitude":683.7},
{"id":"302","latitude":96.7,"longitude":683.7},
{"id":"303","latitude":103.5,"longitude":683.7},
{"id":"304","latitude":110.3,"longitude":683.7},
{"id":"305","latitude":117.1,"longitude":683.7},
{"id":"306","latitude":123.9,"longitude":683.7},
{"id":"307","latitude":130.7,"longitude":683.7},
{"id":"308","latitude":137.4,"longitude":683.7},
{"id":"309","latitude":144.2,"longitude":683.7},
{"id":"310","latitude":151,"longitude":683.7},
{"id":"311","latitude":157.8,"longitude":683.7},
{"id":"312","latitude":164.6,"longitude":683.7},
{"id":"313","latitude":171.3,"longitude":683.7},
{"id":"314","latitude":178.1,"longitude":683.7},
{"id":"315","latitude":184.9,"longitude":683.7},
{"id":"316","latitude":191.7,"longitude":683.7},
{"id":"317","latitude":198.5,"longitude":683.7},
{"id":"318","latitude":259.5,"longitude":683.7},
{"id":"319","latitude":266.3,"longitude":683.7},
{"id":"320","latitude":273.1,"longitude":683.7},
{"id":"321","latitude":286.6,"longitude":683.7},
{"id":"322","latitude":293.4,"longitude":683.7},
{"id":"323","latitude":300.2,"longitude":683.7},
{"id":"324","latitude":307,"longitude":683.7},
{"id":"325","latitude":320.6,"longitude":683.7},
{"id":"326","latitude":327.3,"longitude":683.7},
{"id":"327","latitude":334.1,"longitude":683.7},
{"id":"328","latitude":340.9,"longitude":683.7},
{"id":"329","latitude":347.7,"longitude":683.7},
{"id":"330","latitude":354.5,"longitude":683.7},
{"id":"331","latitude":361.3,"longitude":683.7},
{"id":"332","latitude":83.2,"longitude":676.9},
{"id":"333","latitude":90,"longitude":676.9},
{"id":"334","latitude":96.7,"longitude":676.9},
{"id":"335","latitude":103.5,"longitude":676.9},
{"id":"336","latitude":110.3,"longitude":676.9},
{"id":"337","latitude":117.1,"longitude":676.9},
{"id":"338","latitude":123.9,"longitude":676.9},
{"id":"339","latitude":130.7,"longitude":676.9},
{"id":"340","latitude":137.4,"longitude":676.9},
{"id":"341","latitude":144.2,"longitude":676.9},
{"id":"342","latitude":151,"longitude":676.9},
{"id":"343","latitude":157.8,"longitude":676.9},
{"id":"344","latitude":164.6,"longitude":676.9},
{"id":"345","latitude":171.3,"longitude":676.9},
{"id":"346","latitude":178.1,"longitude":676.9},
{"id":"347","latitude":184.9,"longitude":676.9},
{"id":"348","latitude":191.7,"longitude":676.9},
{"id":"349","latitude":246,"longitude":676.9},
{"id":"350","latitude":252.7,"longitude":676.9},
{"id":"351","latitude":259.5,"longitude":676.9},
{"id":"352","latitude":266.3,"longitude":676.9},
{"id":"353","latitude":273.1,"longitude":676.9},
{"id":"354","latitude":286.6,"longitude":676.9},
{"id":"355","latitude":293.4,"longitude":676.9},
{"id":"356","latitude":300.2,"longitude":676.9},
{"id":"357","latitude":307,"longitude":676.9},
{"id":"358","latitude":313.8,"longitude":676.9},
{"id":"359","latitude":327.3,"longitude":676.9},
{"id":"360","latitude":334.1,"longitude":676.9},
{"id":"361","latitude":340.9,"longitude":676.9},
{"id":"362","latitude":347.7,"longitude":676.9},
{"id":"363","latitude":354.5,"longitude":676.9},
{"id":"364","latitude":361.3,"longitude":676.9},
{"id":"365","latitude":368,"longitude":676.9},
{"id":"366","latitude":83.2,"longitude":670.1},
{"id":"367","latitude":90,"longitude":670.1},
{"id":"368","latitude":96.7,"longitude":670.1},
{"id":"369","latitude":103.5,"longitude":670.1},
{"id":"370","latitude":110.3,"longitude":670.1},
{"id":"371","latitude":117.1,"longitude":670.1},
{"id":"372","latitude":123.9,"longitude":670.1},
{"id":"373","latitude":130.7,"longitude":670.1},
{"id":"374","latitude":137.4,"longitude":670.1},
{"id":"375","latitude":144.2,"longitude":670.1},
{"id":"376","latitude":151,"longitude":670.1},
{"id":"377","latitude":157.8,"longitude":670.1},
{"id":"378","latitude":164.6,"longitude":670.1},
{"id":"379","latitude":171.3,"longitude":670.1},
{"id":"380","latitude":178.1,"longitude":670.1},
{"id":"381","latitude":184.9,"longitude":670.1},
{"id":"382","latitude":191.7,"longitude":670.1},
{"id":"383","latitude":198.5,"longitude":670.1},
{"id":"384","latitude":205.3,"longitude":670.1},
{"id":"385","latitude":212,"longitude":670.1},
{"id":"386","latitude":218.8,"longitude":670.1},
{"id":"387","latitude":225.6,"longitude":670.1},
{"id":"388","latitude":232.4,"longitude":670.1},
{"id":"389","latitude":246,"longitude":670.1},
{"id":"390","latitude":252.7,"longitude":670.1},
{"id":"391","latitude":259.5,"longitude":670.1},
{"id":"392","latitude":286.6,"longitude":670.1},
{"id":"393","latitude":293.4,"longitude":670.1},
{"id":"394","latitude":300.2,"longitude":670.1},
{"id":"395","latitude":307,"longitude":670.1},
{"id":"396","latitude":313.8,"longitude":670.1},
{"id":"397","latitude":327.3,"longitude":670.1},
{"id":"398","latitude":334.1,"longitude":670.1},
{"id":"399","latitude":340.9,"longitude":670.1},
{"id":"400","latitude":347.7,"longitude":670.1},
{"id":"401","latitude":354.5,"longitude":670.1},
{"id":"402","latitude":361.3,"longitude":670.1},
{"id":"403","latitude":368,"longitude":670.1},
{"id":"404","latitude":83.2,"longitude":663.4},
{"id":"405","latitude":90,"longitude":663.4},
{"id":"406","latitude":96.7,"longitude":663.4},
{"id":"407","latitude":103.5,"longitude":663.4},
{"id":"408","latitude":110.3,"longitude":663.4},
{"id":"409","latitude":117.1,"longitude":663.4},
{"id":"410","latitude":123.9,"longitude":663.4},
{"id":"411","latitude":130.7,"longitude":663.4},
{"id":"412","latitude":137.4,"longitude":663.4},
{"id":"413","latitude":144.2,"longitude":663.4},
{"id":"414","latitude":151,"longitude":663.4},
{"id":"415","latitude":157.8,"longitude":663.4},
{"id":"416","latitude":164.6,"longitude":663.4},
{"id":"417","latitude":171.3,"longitude":663.4},
{"id":"418","latitude":178.1,"longitude":663.4},
{"id":"419","latitude":184.9,"longitude":663.4},
{"id":"420","latitude":191.7,"longitude":663.4},
{"id":"421","latitude":198.5,"longitude":663.4},
{"id":"422","latitude":205.3,"longitude":663.4},
{"id":"423","latitude":212,"longitude":663.4},
{"id":"424","latitude":218.8,"longitude":663.4},
{"id":"425","latitude":225.6,"longitude":663.4},
{"id":"426","latitude":232.4,"longitude":663.4},
{"id":"427","latitude":273.1,"longitude":663.4},
{"id":"428","latitude":279.9,"longitude":663.4},
{"id":"429","latitude":286.6,"longitude":663.4},
{"id":"430","latitude":293.4,"longitude":663.4},
{"id":"431","latitude":307,"longitude":663.4},
{"id":"432","latitude":340.9,"longitude":663.4},
{"id":"433","latitude":347.7,"longitude":663.4},
{"id":"434","latitude":354.5,"longitude":663.4},
{"id":"435","latitude":361.3,"longitude":663.4},
{"id":"436","latitude":368,"longitude":663.4},
{"id":"437","latitude":69.6,"longitude":656.6},
{"id":"438","latitude":76.4,"longitude":656.6},
{"id":"439","latitude":83.2,"longitude":656.6},
{"id":"440","latitude":90,"longitude":656.6},
{"id":"441","latitude":96.7,"longitude":656.6},
{"id":"442","latitude":103.5,"longitude":656.6},
{"id":"443","latitude":110.3,"longitude":656.6},
{"id":"444","latitude":117.1,"longitude":656.6},
{"id":"445","latitude":123.9,"longitude":656.6},
{"id":"446","latitude":130.7,"longitude":656.6},
{"id":"447","latitude":137.4,"longitude":656.6},
{"id":"448","latitude":144.2,"longitude":656.6},
{"id":"449","latitude":151,"longitude":656.6},
{"id":"450","latitude":157.8,"longitude":656.6},
{"id":"451","latitude":164.6,"longitude":656.6},
{"id":"452","latitude":171.3,"longitude":656.6},
{"id":"453","latitude":178.1,"longitude":656.6},
{"id":"454","latitude":184.9,"longitude":656.6},
{"id":"455","latitude":191.7,"longitude":656.6},
{"id":"456","latitude":198.5,"longitude":656.6},
{"id":"457","latitude":205.3,"longitude":656.6},
{"id":"458","latitude":212,"longitude":656.6},
{"id":"459","latitude":218.8,"longitude":656.6},
{"id":"460","latitude":225.6,"longitude":656.6},
{"id":"461","latitude":232.4,"longitude":656.6},
{"id":"462","latitude":279.9,"longitude":656.6},
{"id":"463","latitude":286.6,"longitude":656.6},
{"id":"464","latitude":293.4,"longitude":656.6},
{"id":"465","latitude":307,"longitude":656.6},
{"id":"466","latitude":340.9,"longitude":656.6},
{"id":"467","latitude":347.7,"longitude":656.6},
{"id":"468","latitude":354.5,"longitude":656.6},
{"id":"469","latitude":69.6,"longitude":649.8},
{"id":"470","latitude":76.4,"longitude":649.8},
{"id":"471","latitude":83.2,"longitude":649.8},
{"id":"472","latitude":90,"longitude":649.8},
{"id":"473","latitude":96.7,"longitude":649.8},
{"id":"474","latitude":103.5,"longitude":649.8},
{"id":"475","latitude":110.3,"longitude":649.8},
{"id":"476","latitude":117.1,"longitude":649.8},
{"id":"477","latitude":123.9,"longitude":649.8},
{"id":"478","latitude":130.7,"longitude":649.8},
{"id":"479","latitude":137.4,"longitude":649.8},
{"id":"480","latitude":144.2,"longitude":649.8},
{"id":"481","latitude":151,"longitude":649.8},
{"id":"482","latitude":157.8,"longitude":649.8},
{"id":"483","latitude":164.6,"longitude":649.8},
{"id":"484","latitude":171.3,"longitude":649.8},
{"id":"485","latitude":178.1,"longitude":649.8},
{"id":"486","latitude":184.9,"longitude":649.8},
{"id":"487","latitude":191.7,"longitude":649.8},
{"id":"488","latitude":198.5,"longitude":649.8},
{"id":"489","latitude":205.3,"longitude":649.8},
{"id":"490","latitude":212,"longitude":649.8},
{"id":"491","latitude":218.8,"longitude":649.8},
{"id":"492","latitude":225.6,"longitude":649.8},
{"id":"493","latitude":232.4,"longitude":649.8},
{"id":"494","latitude":239.2,"longitude":649.8},
{"id":"495","latitude":246,"longitude":649.8},
{"id":"496","latitude":286.6,"longitude":649.8},
{"id":"497","latitude":293.4,"longitude":649.8},
{"id":"498","latitude":307,"longitude":649.8},
{"id":"499","latitude":69.6,"longitude":643},
{"id":"500","latitude":76.4,"longitude":643},
{"id":"501","latitude":83.2,"longitude":643},
{"id":"502","latitude":90,"longitude":643},
{"id":"503","latitude":96.7,"longitude":643},
{"id":"504","latitude":103.5,"longitude":643},
{"id":"505","latitude":110.3,"longitude":643},
{"id":"506","latitude":117.1,"longitude":643},
{"id":"507","latitude":123.9,"longitude":643},
{"id":"508","latitude":130.7,"longitude":643},
{"id":"509","latitude":137.4,"longitude":643},
{"id":"510","latitude":144.2,"longitude":643},
{"id":"511","latitude":151,"longitude":643},
{"id":"512","latitude":157.8,"longitude":643},
{"id":"513","latitude":164.6,"longitude":643},
{"id":"514","latitude":171.3,"longitude":643},
{"id":"515","latitude":178.1,"longitude":643},
{"id":"516","latitude":184.9,"longitude":643},
{"id":"517","latitude":191.7,"longitude":643},
{"id":"518","latitude":198.5,"longitude":643},
{"id":"519","latitude":205.3,"longitude":643},
{"id":"520","latitude":212,"longitude":643},
{"id":"521","latitude":218.8,"longitude":643},
{"id":"522","latitude":225.6,"longitude":643},
{"id":"523","latitude":232.4,"longitude":643},
{"id":"524","latitude":239.2,"longitude":643},
{"id":"525","latitude":252.7,"longitude":643},
{"id":"526","latitude":259.5,"longitude":643},
{"id":"527","latitude":300.2,"longitude":643},
{"id":"528","latitude":307,"longitude":643},
{"id":"529","latitude":56,"longitude":636.2},
{"id":"530","latitude":62.8,"longitude":636.2},
{"id":"531","latitude":69.6,"longitude":636.2},
{"id":"532","latitude":76.4,"longitude":636.2},
{"id":"533","latitude":83.2,"longitude":636.2},
{"id":"534","latitude":90,"longitude":636.2},
{"id":"535","latitude":96.7,"longitude":636.2},
{"id":"536","latitude":103.5,"longitude":636.2},
{"id":"537","latitude":110.3,"longitude":636.2},
{"id":"538","latitude":117.1,"longitude":636.2},
{"id":"539","latitude":123.9,"longitude":636.2},
{"id":"540","latitude":130.7,"longitude":636.2},
{"id":"541","latitude":137.4,"longitude":636.2},
{"id":"542","latitude":144.2,"longitude":636.2},
{"id":"543","latitude":151,"longitude":636.2},
{"id":"544","latitude":157.8,"longitude":636.2},
{"id":"545","latitude":164.6,"longitude":636.2},
{"id":"546","latitude":171.3,"longitude":636.2},
{"id":"547","latitude":178.1,"longitude":636.2},
{"id":"548","latitude":184.9,"longitude":636.2},
{"id":"549","latitude":191.7,"longitude":636.2},
{"id":"550","latitude":198.5,"longitude":636.2},
{"id":"551","latitude":205.3,"longitude":636.2},
{"id":"552","latitude":212,"longitude":636.2},
{"id":"553","latitude":218.8,"longitude":636.2},
{"id":"554","latitude":225.6,"longitude":636.2},
{"id":"555","latitude":232.4,"longitude":636.2},
{"id":"556","latitude":239.2,"longitude":636.2},
{"id":"557","latitude":246,"longitude":636.2},
{"id":"558","latitude":252.7,"longitude":636.2},
{"id":"559","latitude":259.5,"longitude":636.2},
{"id":"560","latitude":266.3,"longitude":636.2},
{"id":"561","latitude":279.9,"longitude":636.2},
{"id":"562","latitude":286.6,"longitude":636.2},
{"id":"563","latitude":293.4,"longitude":636.2},
{"id":"564","latitude":300.2,"longitude":636.2},
{"id":"565","latitude":56,"longitude":629.4},
{"id":"566","latitude":62.8,"longitude":629.4},
{"id":"567","latitude":69.6,"longitude":629.4},
{"id":"568","latitude":76.4,"longitude":629.4},
{"id":"569","latitude":83.2,"longitude":629.4},
{"id":"570","latitude":90,"longitude":629.4},
{"id":"571","latitude":96.7,"longitude":629.4},
{"id":"572","latitude":103.5,"longitude":629.4},
{"id":"573","latitude":110.3,"longitude":629.4},
{"id":"574","latitude":117.1,"longitude":629.4},
{"id":"575","latitude":123.9,"longitude":629.4},
{"id":"576","latitude":130.7,"longitude":629.4},
{"id":"577","latitude":137.4,"longitude":629.4},
{"id":"578","latitude":144.2,"longitude":629.4},
{"id":"579","latitude":151,"longitude":629.4},
{"id":"580","latitude":157.8,"longitude":629.4},
{"id":"581","latitude":164.6,"longitude":629.4},
{"id":"582","latitude":171.3,"longitude":629.4},
{"id":"583","latitude":178.1,"longitude":629.4},
{"id":"584","latitude":184.9,"longitude":629.4},
{"id":"585","latitude":191.7,"longitude":629.4},
{"id":"586","latitude":198.5,"longitude":629.4},
{"id":"587","latitude":205.3,"longitude":629.4},
{"id":"588","latitude":212,"longitude":629.4},
{"id":"589","latitude":218.8,"longitude":629.4},
{"id":"590","latitude":225.6,"longitude":629.4},
{"id":"591","latitude":232.4,"longitude":629.4},
{"id":"592","latitude":239.2,"longitude":629.4},
{"id":"593","latitude":246,"longitude":629.4},
{"id":"594","latitude":252.7,"longitude":629.4},
{"id":"595","latitude":259.5,"longitude":629.4},
{"id":"596","latitude":273.1,"longitude":629.4},
{"id":"597","latitude":279.9,"longitude":629.4},
{"id":"598","latitude":286.6,"longitude":629.4},
{"id":"599","latitude":293.4,"longitude":629.4},
{"id":"600","latitude":49.3,"longitude":622.7},
{"id":"601","latitude":56,"longitude":622.7},
{"id":"602","latitude":69.6,"longitude":622.7},
{"id":"603","latitude":76.4,"longitude":622.7},
{"id":"604","latitude":83.2,"longitude":622.7},
{"id":"605","latitude":90,"longitude":622.7},
{"id":"606","latitude":96.7,"longitude":622.7},
{"id":"607","latitude":103.5,"longitude":622.7},
{"id":"608","latitude":110.3,"longitude":622.7},
{"id":"609","latitude":117.1,"longitude":622.7},
{"id":"610","latitude":123.9,"longitude":622.7},
{"id":"611","latitude":130.7,"longitude":622.7},
{"id":"612","latitude":137.4,"longitude":622.7},
{"id":"613","latitude":144.2,"longitude":622.7},
{"id":"614","latitude":151,"longitude":622.7},
{"id":"615","latitude":157.8,"longitude":622.7},
{"id":"616","latitude":164.6,"longitude":622.7},
{"id":"617","latitude":171.3,"longitude":622.7},
{"id":"618","latitude":178.1,"longitude":622.7},
{"id":"619","latitude":184.9,"longitude":622.7},
{"id":"620","latitude":191.7,"longitude":622.7},
{"id":"621","latitude":198.5,"longitude":622.7},
{"id":"622","latitude":205.3,"longitude":622.7},
{"id":"623","latitude":212,"longitude":622.7},
{"id":"624","latitude":218.8,"longitude":622.7},
{"id":"625","latitude":225.6,"longitude":622.7},
{"id":"626","latitude":232.4,"longitude":622.7},
{"id":"627","latitude":239.2,"longitude":622.7},
{"id":"628","latitude":246,"longitude":622.7},
{"id":"629","latitude":252.7,"longitude":622.7},
{"id":"630","latitude":259.5,"longitude":622.7},
{"id":"631","latitude":266.3,"longitude":622.7},
{"id":"632","latitude":273.1,"longitude":622.7},
{"id":"633","latitude":279.9,"longitude":622.7},
{"id":"634","latitude":286.6,"longitude":622.7},
{"id":"635","latitude":42.5,"longitude":615.9},
{"id":"636","latitude":49.3,"longitude":615.9},
{"id":"637","latitude":56,"longitude":615.9},
{"id":"638","latitude":69.6,"longitude":615.9},
{"id":"639","latitude":76.4,"longitude":615.9},
{"id":"640","latitude":83.2,"longitude":615.9},
{"id":"641","latitude":90,"longitude":615.9},
{"id":"642","latitude":96.7,"longitude":615.9},
{"id":"643","latitude":103.5,"longitude":615.9},
{"id":"644","latitude":110.3,"longitude":615.9},
{"id":"645","latitude":117.1,"longitude":615.9},
{"id":"646","latitude":123.9,"longitude":615.9},
{"id":"647","latitude":130.7,"longitude":615.9},
{"id":"648","latitude":137.4,"longitude":615.9},
{"id":"649","latitude":144.2,"longitude":615.9},
{"id":"650","latitude":151,"longitude":615.9},
{"id":"651","latitude":157.8,"longitude":615.9},
{"id":"652","latitude":164.6,"longitude":615.9},
{"id":"653","latitude":171.3,"longitude":615.9},
{"id":"654","latitude":178.1,"longitude":615.9},
{"id":"655","latitude":184.9,"longitude":615.9},
{"id":"656","latitude":191.7,"longitude":615.9},
{"id":"657","latitude":198.5,"longitude":615.9},
{"id":"658","latitude":205.3,"longitude":615.9},
{"id":"659","latitude":212,"longitude":615.9},
{"id":"660","latitude":218.8,"longitude":615.9},
{"id":"661","latitude":225.6,"longitude":615.9},
{"id":"662","latitude":232.4,"longitude":615.9},
{"id":"663","latitude":239.2,"longitude":615.9},
{"id":"664","latitude":246,"longitude":615.9},
{"id":"665","latitude":279.9,"longitude":615.9},
{"id":"666","latitude":49.3,"longitude":609.1},
{"id":"667","latitude":69.6,"longitude":609.1},
{"id":"668","latitude":76.4,"longitude":609.1},
{"id":"669","latitude":83.2,"longitude":609.1},
{"id":"670","latitude":90,"longitude":609.1},
{"id":"671","latitude":96.7,"longitude":609.1},
{"id":"672","latitude":103.5,"longitude":609.1},
{"id":"673","latitude":110.3,"longitude":609.1},
{"id":"674","latitude":117.1,"longitude":609.1},
{"id":"675","latitude":123.9,"longitude":609.1},
{"id":"676","latitude":130.7,"longitude":609.1},
{"id":"677","latitude":137.4,"longitude":609.1},
{"id":"678","latitude":144.2,"longitude":609.1},
{"id":"679","latitude":151,"longitude":609.1},
{"id":"680","latitude":157.8,"longitude":609.1},
{"id":"681","latitude":164.6,"longitude":609.1},
{"id":"682","latitude":171.3,"longitude":609.1},
{"id":"683","latitude":178.1,"longitude":609.1},
{"id":"684","latitude":184.9,"longitude":609.1},
{"id":"685","latitude":191.7,"longitude":609.1},
{"id":"686","latitude":198.5,"longitude":609.1},
{"id":"687","latitude":205.3,"longitude":609.1},
{"id":"688","latitude":212,"longitude":609.1},
{"id":"689","latitude":218.8,"longitude":609.1},
{"id":"690","latitude":225.6,"longitude":609.1},
{"id":"691","latitude":232.4,"longitude":609.1},
{"id":"692","latitude":239.2,"longitude":609.1},
{"id":"693","latitude":76.4,"longitude":602.3},
{"id":"694","latitude":83.2,"longitude":602.3},
{"id":"695","latitude":90,"longitude":602.3},
{"id":"696","latitude":96.7,"longitude":602.3},
{"id":"697","latitude":103.5,"longitude":602.3},
{"id":"698","latitude":110.3,"longitude":602.3},
{"id":"699","latitude":117.1,"longitude":602.3},
{"id":"700","latitude":123.9,"longitude":602.3},
{"id":"701","latitude":130.7,"longitude":602.3},
{"id":"702","latitude":137.4,"longitude":602.3},
{"id":"703","latitude":144.2,"longitude":602.3},
{"id":"704","latitude":151,"longitude":602.3},
{"id":"705","latitude":157.8,"longitude":602.3},
{"id":"706","latitude":164.6,"longitude":602.3},
{"id":"707","latitude":171.3,"longitude":602.3},
{"id":"708","latitude":178.1,"longitude":602.3},
{"id":"709","latitude":184.9,"longitude":602.3},
{"id":"710","latitude":191.7,"longitude":602.3},
{"id":"711","latitude":198.5,"longitude":602.3},
{"id":"712","latitude":205.3,"longitude":602.3},
{"id":"713","latitude":212,"longitude":602.3},
{"id":"714","latitude":218.8,"longitude":602.3},
{"id":"715","latitude":225.6,"longitude":602.3},
{"id":"716","latitude":232.4,"longitude":602.3},
{"id":"717","latitude":239.2,"longitude":602.3},
{"id":"718","latitude":76.4,"longitude":595.5},
{"id":"719","latitude":83.2,"longitude":595.5},
{"id":"720","latitude":90,"longitude":595.5},
{"id":"721","latitude":96.7,"longitude":595.5},
{"id":"722","latitude":103.5,"longitude":595.5},
{"id":"723","latitude":110.3,"longitude":595.5},
{"id":"724","latitude":117.1,"longitude":595.5},
{"id":"725","latitude":123.9,"longitude":595.5},
{"id":"726","latitude":130.7,"longitude":595.5},
{"id":"727","latitude":137.4,"longitude":595.5},
{"id":"728","latitude":144.2,"longitude":595.5},
{"id":"729","latitude":151,"longitude":595.5},
{"id":"730","latitude":157.8,"longitude":595.5},
{"id":"731","latitude":164.6,"longitude":595.5},
{"id":"732","latitude":171.3,"longitude":595.5},
{"id":"733","latitude":178.1,"longitude":595.5},
{"id":"734","latitude":184.9,"longitude":595.5},
{"id":"735","latitude":191.7,"longitude":595.5},
{"id":"736","latitude":198.5,"longitude":595.5},
{"id":"737","latitude":205.3,"longitude":595.5},
{"id":"738","latitude":212,"longitude":595.5},
{"id":"739","latitude":218.8,"longitude":595.5},
{"id":"740","latitude":225.6,"longitude":595.5},
{"id":"741","latitude":232.4,"longitude":595.5},
{"id":"742","latitude":239.2,"longitude":595.5},
{"id":"743","latitude":83.2,"longitude":588.7},
{"id":"744","latitude":90,"longitude":588.7},
{"id":"745","latitude":96.7,"longitude":588.7},
{"id":"746","latitude":103.5,"longitude":588.7},
{"id":"747","latitude":110.3,"longitude":588.7},
{"id":"748","latitude":117.1,"longitude":588.7},
{"id":"749","latitude":123.9,"longitude":588.7},
{"id":"750","latitude":130.7,"longitude":588.7},
{"id":"751","latitude":137.4,"longitude":588.7},
{"id":"752","latitude":144.2,"longitude":588.7},
{"id":"753","latitude":151,"longitude":588.7},
{"id":"754","latitude":157.8,"longitude":588.7},
{"id":"755","latitude":164.6,"longitude":588.7},
{"id":"756","latitude":171.3,"longitude":588.7},
{"id":"757","latitude":178.1,"longitude":588.7},
{"id":"758","latitude":184.9,"longitude":588.7},
{"id":"759","latitude":191.7,"longitude":588.7},
{"id":"760","latitude":198.5,"longitude":588.7},
{"id":"761","latitude":205.3,"longitude":588.7},
{"id":"762","latitude":212,"longitude":588.7},
{"id":"763","latitude":218.8,"longitude":588.7},
{"id":"764","latitude":225.6,"longitude":588.7},
{"id":"765","latitude":232.4,"longitude":588.7},
{"id":"766","latitude":239.2,"longitude":588.7},
{"id":"767","latitude":246,"longitude":588.7},
{"id":"768","latitude":83.2,"longitude":582},
{"id":"769","latitude":90,"longitude":582},
{"id":"770","latitude":96.7,"longitude":582},
{"id":"771","latitude":103.5,"longitude":582},
{"id":"772","latitude":110.3,"longitude":582},
{"id":"773","latitude":117.1,"longitude":582},
{"id":"774","latitude":123.9,"longitude":582},
{"id":"775","latitude":130.7,"longitude":582},
{"id":"776","latitude":137.4,"longitude":582},
{"id":"777","latitude":144.2,"longitude":582},
{"id":"778","latitude":151,"longitude":582},
{"id":"779","latitude":157.8,"longitude":582},
{"id":"780","latitude":164.6,"longitude":582},
{"id":"781","latitude":171.3,"longitude":582},
{"id":"782","latitude":178.1,"longitude":582},
{"id":"783","latitude":184.9,"longitude":582},
{"id":"784","latitude":191.7,"longitude":582},
{"id":"785","latitude":198.5,"longitude":582},
{"id":"786","latitude":205.3,"longitude":582},
{"id":"787","latitude":212,"longitude":582},
{"id":"788","latitude":218.8,"longitude":582},
{"id":"789","latitude":225.6,"longitude":582},
{"id":"790","latitude":232.4,"longitude":582},
{"id":"791","latitude":239.2,"longitude":582},
{"id":"792","latitude":246,"longitude":582},
{"id":"793","latitude":252.7,"longitude":582},
{"id":"794","latitude":259.5,"longitude":582},
{"id":"795","latitude":273.1,"longitude":582},
{"id":"796","latitude":83.2,"longitude":575.2},
{"id":"797","latitude":90,"longitude":575.2},
{"id":"798","latitude":96.7,"longitude":575.2},
{"id":"799","latitude":103.5,"longitude":575.2},
{"id":"800","latitude":110.3,"longitude":575.2},
{"id":"801","latitude":117.1,"longitude":575.2},
{"id":"802","latitude":123.9,"longitude":575.2},
{"id":"803","latitude":130.7,"longitude":575.2},
{"id":"804","latitude":137.4,"longitude":575.2},
{"id":"805","latitude":144.2,"longitude":575.2},
{"id":"806","latitude":151,"longitude":575.2},
{"id":"807","latitude":157.8,"longitude":575.2},
{"id":"808","latitude":164.6,"longitude":575.2},
{"id":"809","latitude":171.3,"longitude":575.2},
{"id":"810","latitude":178.1,"longitude":575.2},
{"id":"811","latitude":184.9,"longitude":575.2},
{"id":"812","latitude":191.7,"longitude":575.2},
{"id":"813","latitude":198.5,"longitude":575.2},
{"id":"814","latitude":205.3,"longitude":575.2},
{"id":"815","latitude":212,"longitude":575.2},
{"id":"816","latitude":218.8,"longitude":575.2},
{"id":"817","latitude":225.6,"longitude":575.2},
{"id":"818","latitude":232.4,"longitude":575.2},
{"id":"819","latitude":239.2,"longitude":575.2},
{"id":"820","latitude":246,"longitude":575.2},
{"id":"821","latitude":252.7,"longitude":575.2},
{"id":"822","latitude":259.5,"longitude":575.2},
{"id":"823","latitude":266.3,"longitude":575.2},
{"id":"824","latitude":83.2,"longitude":568.4},
{"id":"825","latitude":90,"longitude":568.4},
{"id":"826","latitude":96.7,"longitude":568.4},
{"id":"827","latitude":103.5,"longitude":568.4},
{"id":"828","latitude":110.3,"longitude":568.4},
{"id":"829","latitude":117.1,"longitude":568.4},
{"id":"830","latitude":123.9,"longitude":568.4},
{"id":"831","latitude":130.7,"longitude":568.4},
{"id":"832","latitude":137.4,"longitude":568.4},
{"id":"833","latitude":144.2,"longitude":568.4},
{"id":"834","latitude":151,"longitude":568.4},
{"id":"835","latitude":157.8,"longitude":568.4},
{"id":"836","latitude":164.6,"longitude":568.4},
{"id":"837","latitude":171.3,"longitude":568.4},
{"id":"838","latitude":178.1,"longitude":568.4},
{"id":"839","latitude":184.9,"longitude":568.4},
{"id":"840","latitude":191.7,"longitude":568.4},
{"id":"841","latitude":198.5,"longitude":568.4},
{"id":"842","latitude":205.3,"longitude":568.4},
{"id":"843","latitude":212,"longitude":568.4},
{"id":"844","latitude":218.8,"longitude":568.4},
{"id":"845","latitude":225.6,"longitude":568.4},
{"id":"846","latitude":232.4,"longitude":568.4},
{"id":"847","latitude":239.2,"longitude":568.4},
{"id":"848","latitude":246,"longitude":568.4},
{"id":"849","latitude":252.7,"longitude":568.4},
{"id":"850","latitude":259.5,"longitude":568.4},
{"id":"851","latitude":83.2,"longitude":561.6},
{"id":"852","latitude":90,"longitude":561.6},
{"id":"853","latitude":96.7,"longitude":561.6},
{"id":"854","latitude":103.5,"longitude":561.6},
{"id":"855","latitude":110.3,"longitude":561.6},
{"id":"856","latitude":117.1,"longitude":561.6},
{"id":"857","latitude":123.9,"longitude":561.6},
{"id":"858","latitude":130.7,"longitude":561.6},
{"id":"859","latitude":137.4,"longitude":561.6},
{"id":"860","latitude":144.2,"longitude":561.6},
{"id":"861","latitude":151,"longitude":561.6},
{"id":"862","latitude":157.8,"longitude":561.6},
{"id":"863","latitude":164.6,"longitude":561.6},
{"id":"864","latitude":171.3,"longitude":561.6},
{"id":"865","latitude":178.1,"longitude":561.6},
{"id":"866","latitude":184.9,"longitude":561.6},
{"id":"867","latitude":191.7,"longitude":561.6},
{"id":"868","latitude":198.5,"longitude":561.6},
{"id":"869","latitude":205.3,"longitude":561.6},
{"id":"870","latitude":212,"longitude":561.6},
{"id":"871","latitude":218.8,"longitude":561.6},
{"id":"872","latitude":225.6,"longitude":561.6},
{"id":"873","latitude":232.4,"longitude":561.6},
{"id":"874","latitude":239.2,"longitude":561.6},
{"id":"875","latitude":69.6,"longitude":554.8},
{"id":"876","latitude":83.2,"longitude":554.8},
{"id":"877","latitude":90,"longitude":554.8},
{"id":"878","latitude":96.7,"longitude":554.8},
{"id":"879","latitude":49.3,"longitude":541.3},
{"id":"880","latitude":49.3,"longitude":548.1},
{"id":"881","latitude":42.5,"longitude":534.5},
{"id":"882","latitude":49.3,"longitude":534.5},
{"id":"883","latitude":42.5,"longitude":527.7},
{"id":"884","latitude":49.3,"longitude":527.7},
{"id":"885","latitude":49.3,"longitude":520.9},
{"id":"886","latitude":49.3,"longitude":507.4},
{"id":"887","latitude":42.5,"longitude":500.6},
{"id":"888","latitude":49.3,"longitude":500.6},
{"id":"889","latitude":42.5,"longitude":493.8},
{"id":"890","latitude":103.5,"longitude":554.8},
{"id":"891","latitude":110.3,"longitude":554.8},
{"id":"892","latitude":117.1,"longitude":554.8},
{"id":"893","latitude":123.9,"longitude":554.8},
{"id":"894","latitude":130.7,"longitude":554.8},
{"id":"895","latitude":137.4,"longitude":554.8},
{"id":"896","latitude":144.2,"longitude":554.8},
{"id":"897","latitude":151,"longitude":554.8},
{"id":"898","latitude":157.8,"longitude":554.8},
{"id":"899","latitude":164.6,"longitude":554.8},
{"id":"900","latitude":171.3,"longitude":554.8},
{"id":"901","latitude":178.1,"longitude":554.8},
{"id":"902","latitude":184.9,"longitude":554.8},
{"id":"903","latitude":191.7,"longitude":554.8},
{"id":"904","latitude":198.5,"longitude":554.8},
{"id":"905","latitude":205.3,"longitude":554.8},
{"id":"906","latitude":212,"longitude":554.8},
{"id":"907","latitude":218.8,"longitude":554.8},
{"id":"908","latitude":225.6,"longitude":554.8},
{"id":"909","latitude":232.4,"longitude":554.8},
{"id":"910","latitude":239.2,"longitude":554.8},
{"id":"911","latitude":69.6,"longitude":548.1},
{"id":"912","latitude":90,"longitude":548.1},
{"id":"913","latitude":96.7,"longitude":548.1},
{"id":"914","latitude":103.5,"longitude":548.1},
{"id":"915","latitude":110.3,"longitude":548.1},
{"id":"916","latitude":117.1,"longitude":548.1},
{"id":"917","latitude":123.9,"longitude":548.1},
{"id":"918","latitude":130.7,"longitude":548.1},
{"id":"919","latitude":137.4,"longitude":548.1},
{"id":"920","latitude":144.2,"longitude":548.1},
{"id":"921","latitude":151,"longitude":548.1},
{"id":"922","latitude":157.8,"longitude":548.1},
{"id":"923","latitude":164.6,"longitude":548.1},
{"id":"924","latitude":171.3,"longitude":548.1},
{"id":"925","latitude":178.1,"longitude":548.1},
{"id":"926","latitude":184.9,"longitude":548.1},
{"id":"927","latitude":191.7,"longitude":548.1},
{"id":"928","latitude":198.5,"longitude":548.1},
{"id":"929","latitude":205.3,"longitude":548.1},
{"id":"930","latitude":212,"longitude":548.1},
{"id":"931","latitude":218.8,"longitude":548.1},
{"id":"932","latitude":225.6,"longitude":548.1},
{"id":"933","latitude":69.6,"longitude":541.3},
{"id":"934","latitude":96.7,"longitude":541.3},
{"id":"935","latitude":103.5,"longitude":541.3},
{"id":"936","latitude":110.3,"longitude":541.3},
{"id":"937","latitude":117.1,"longitude":541.3},
{"id":"938","latitude":123.9,"longitude":541.3},
{"id":"939","latitude":130.7,"longitude":541.3},
{"id":"940","latitude":137.4,"longitude":541.3},
{"id":"941","latitude":144.2,"longitude":541.3},
{"id":"942","latitude":151,"longitude":541.3},
{"id":"943","latitude":157.8,"longitude":541.3},
{"id":"944","latitude":164.6,"longitude":541.3},
{"id":"945","latitude":171.3,"longitude":541.3},
{"id":"946","latitude":178.1,"longitude":541.3},
{"id":"947","latitude":184.9,"longitude":541.3},
{"id":"948","latitude":191.7,"longitude":541.3},
{"id":"949","latitude":198.5,"longitude":541.3},
{"id":"950","latitude":205.3,"longitude":541.3},
{"id":"951","latitude":212,"longitude":541.3},
{"id":"952","latitude":218.8,"longitude":541.3},
{"id":"953","latitude":225.6,"longitude":541.3},
{"id":"954","latitude":69.6,"longitude":534.5},
{"id":"955","latitude":76.4,"longitude":534.5},
{"id":"956","latitude":96.7,"longitude":534.5},
{"id":"957","latitude":103.5,"longitude":534.5},
{"id":"958","latitude":110.3,"longitude":534.5},
{"id":"959","latitude":117.1,"longitude":534.5},
{"id":"960","latitude":123.9,"longitude":534.5},
{"id":"961","latitude":130.7,"longitude":534.5},
{"id":"962","latitude":137.4,"longitude":534.5},
{"id":"963","latitude":144.2,"longitude":534.5},
{"id":"964","latitude":151,"longitude":534.5},
{"id":"965","latitude":157.8,"longitude":534.5},
{"id":"966","latitude":164.6,"longitude":534.5},
{"id":"967","latitude":171.3,"longitude":534.5},
{"id":"968","latitude":178.1,"longitude":534.5},
{"id":"969","latitude":184.9,"longitude":534.5},
{"id":"970","latitude":191.7,"longitude":534.5},
{"id":"971","latitude":198.5,"longitude":534.5},
{"id":"972","latitude":205.3,"longitude":534.5},
{"id":"973","latitude":212,"longitude":534.5},
{"id":"974","latitude":218.8,"longitude":534.5},
{"id":"975","latitude":225.6,"longitude":534.5},
{"id":"976","latitude":76.4,"longitude":527.7},
{"id":"977","latitude":83.2,"longitude":527.7},
{"id":"978","latitude":90,"longitude":527.7},
{"id":"979","latitude":103.5,"longitude":527.7},
{"id":"980","latitude":110.3,"longitude":527.7},
{"id":"981","latitude":117.1,"longitude":527.7},
{"id":"982","latitude":123.9,"longitude":527.7},
{"id":"983","latitude":130.7,"longitude":527.7},
{"id":"984","latitude":137.4,"longitude":527.7},
{"id":"985","latitude":144.2,"longitude":527.7},
{"id":"986","latitude":151,"longitude":527.7},
{"id":"987","latitude":157.8,"longitude":527.7},
{"id":"988","latitude":164.6,"longitude":527.7},
{"id":"989","latitude":171.3,"longitude":527.7},
{"id":"990","latitude":178.1,"longitude":527.7},
{"id":"991","latitude":184.9,"longitude":527.7},
{"id":"992","latitude":191.7,"longitude":527.7},
{"id":"993","latitude":198.5,"longitude":527.7},
{"id":"994","latitude":205.3,"longitude":527.7},
{"id":"995","latitude":212,"longitude":527.7},
{"id":"996","latitude":218.8,"longitude":527.7},
{"id":"997","latitude":225.6,"longitude":527.7},
{"id":"998","latitude":239.2,"longitude":527.7},
{"id":"999","latitude":83.2,"longitude":520.9},
{"id":"1000","latitude":90,"longitude":520.9},
{"id":"1001","latitude":103.5,"longitude":520.9},
{"id":"1002","latitude":110.3,"longitude":520.9},
{"id":"1003","latitude":117.1,"longitude":520.9},
{"id":"1004","latitude":123.9,"longitude":520.9},
{"id":"1005","latitude":130.7,"longitude":520.9},
{"id":"1006","latitude":137.4,"longitude":520.9},
{"id":"1007","latitude":144.2,"longitude":520.9},
{"id":"1008","latitude":151,"longitude":520.9},
{"id":"1009","latitude":157.8,"longitude":520.9},
{"id":"1010","latitude":164.6,"longitude":520.9},
{"id":"1011","latitude":171.3,"longitude":520.9},
{"id":"1012","latitude":178.1,"longitude":520.9},
{"id":"1013","latitude":184.9,"longitude":520.9},
{"id":"1014","latitude":191.7,"longitude":520.9},
{"id":"1015","latitude":198.5,"longitude":520.9},
{"id":"1016","latitude":205.3,"longitude":520.9},
{"id":"1017","latitude":212,"longitude":520.9},
{"id":"1018","latitude":218.8,"longitude":520.9},
{"id":"1019","latitude":225.6,"longitude":520.9},
{"id":"1020","latitude":239.2,"longitude":520.9},
{"id":"1021","latitude":246,"longitude":520.9},
{"id":"1022","latitude":90,"longitude":514.1},
{"id":"1023","latitude":103.5,"longitude":514.1},
{"id":"1024","latitude":110.3,"longitude":514.1},
{"id":"1025","latitude":117.1,"longitude":514.1},
{"id":"1026","latitude":123.9,"longitude":514.1},
{"id":"1027","latitude":130.7,"longitude":514.1},
{"id":"1028","latitude":137.4,"longitude":514.1},
{"id":"1029","latitude":144.2,"longitude":514.1},
{"id":"1030","latitude":151,"longitude":514.1},
{"id":"1031","latitude":157.8,"longitude":514.1},
{"id":"1032","latitude":164.6,"longitude":514.1},
{"id":"1033","latitude":171.3,"longitude":514.1},
{"id":"1034","latitude":178.1,"longitude":514.1},
{"id":"1035","latitude":184.9,"longitude":514.1},
{"id":"1036","latitude":191.7,"longitude":514.1},
{"id":"1037","latitude":198.5,"longitude":514.1},
{"id":"1038","latitude":205.3,"longitude":514.1},
{"id":"1039","latitude":212,"longitude":514.1},
{"id":"1040","latitude":218.8,"longitude":514.1},
{"id":"1041","latitude":232.4,"longitude":514.1},
{"id":"1042","latitude":239.2,"longitude":514.1},
{"id":"1043","latitude":246,"longitude":514.1},
{"id":"1044","latitude":252.7,"longitude":514.1},
{"id":"1045","latitude":266.3,"longitude":514.1},
{"id":"1046","latitude":273.1,"longitude":514.1},
{"id":"1047","latitude":320.6,"longitude":514.1},
{"id":"1048","latitude":96.7,"longitude":507.4},
{"id":"1049","latitude":103.5,"longitude":507.4},
{"id":"1050","latitude":110.3,"longitude":507.4},
{"id":"1051","latitude":117.1,"longitude":507.4},
{"id":"1052","latitude":123.9,"longitude":507.4},
{"id":"1053","latitude":130.7,"longitude":507.4},
{"id":"1054","latitude":137.4,"longitude":507.4},
{"id":"1055","latitude":144.2,"longitude":507.4},
{"id":"1056","latitude":151,"longitude":507.4},
{"id":"1057","latitude":157.8,"longitude":507.4},
{"id":"1058","latitude":164.6,"longitude":507.4},
{"id":"1059","latitude":171.3,"longitude":507.4},
{"id":"1060","latitude":178.1,"longitude":507.4},
{"id":"1061","latitude":184.9,"longitude":507.4},
{"id":"1062","latitude":191.7,"longitude":507.4},
{"id":"1063","latitude":198.5,"longitude":507.4},
{"id":"1064","latitude":205.3,"longitude":507.4},
{"id":"1065","latitude":212,"longitude":507.4},
{"id":"1066","latitude":218.8,"longitude":507.4},
{"id":"1067","latitude":225.6,"longitude":507.4},
{"id":"1068","latitude":232.4,"longitude":507.4},
{"id":"1069","latitude":239.2,"longitude":507.4},
{"id":"1070","latitude":246,"longitude":507.4},
{"id":"1071","latitude":252.7,"longitude":507.4},
{"id":"1072","latitude":266.3,"longitude":507.4},
{"id":"1073","latitude":273.1,"longitude":507.4},
{"id":"1074","latitude":320.6,"longitude":507.4},
{"id":"1075","latitude":327.3,"longitude":507.4},
{"id":"1076","latitude":334.1,"longitude":507.4},
{"id":"1077","latitude":340.9,"longitude":507.4},
{"id":"1078","latitude":103.5,"longitude":500.6},
{"id":"1079","latitude":110.3,"longitude":500.6},
{"id":"1080","latitude":117.1,"longitude":500.6},
{"id":"1081","latitude":123.9,"longitude":500.6},
{"id":"1082","latitude":130.7,"longitude":500.6},
{"id":"1083","latitude":137.4,"longitude":500.6},
{"id":"1084","latitude":144.2,"longitude":500.6},
{"id":"1085","latitude":151,"longitude":500.6},
{"id":"1086","latitude":157.8,"longitude":500.6},
{"id":"1087","latitude":164.6,"longitude":500.6},
{"id":"1088","latitude":171.3,"longitude":500.6},
{"id":"1089","latitude":178.1,"longitude":500.6},
{"id":"1090","latitude":184.9,"longitude":500.6},
{"id":"1091","latitude":157.8,"longitude":405.6},
{"id":"1092","latitude":151,"longitude":398.8},
{"id":"1093","latitude":130.7,"longitude":392.1},
{"id":"1094","latitude":130.7,"longitude":398.8},
{"id":"1095","latitude":137.4,"longitude":392.1},
{"id":"1096","latitude":144.2,"longitude":392.1},
{"id":"1097","latitude":151,"longitude":392.1},
{"id":"1098","latitude":157.8,"longitude":392.1},
{"id":"1099","latitude":137.4,"longitude":385.3},
{"id":"1100","latitude":144.2,"longitude":385.3},
{"id":"1101","latitude":151,"longitude":385.3},
{"id":"1102","latitude":157.8,"longitude":385.3},
{"id":"1103","latitude":123.9,"longitude":378.5},
{"id":"1104","latitude":144.2,"longitude":378.5},
{"id":"1105","latitude":151,"longitude":378.5},
{"id":"1106","latitude":151,"longitude":371.7},
{"id":"1107","latitude":191.7,"longitude":500.6},
{"id":"1108","latitude":198.5,"longitude":500.6},
{"id":"1109","latitude":205.3,"longitude":500.6},
{"id":"1110","latitude":212,"longitude":500.6},
{"id":"1111","latitude":218.8,"longitude":500.6},
{"id":"1112","latitude":225.6,"longitude":500.6},
{"id":"1113","latitude":232.4,"longitude":500.6},
{"id":"1114","latitude":239.2,"longitude":500.6},
{"id":"1115","latitude":246,"longitude":500.6},
{"id":"1116","latitude":252.7,"longitude":500.6},
{"id":"1117","latitude":259.5,"longitude":500.6},
{"id":"1118","latitude":266.3,"longitude":500.6},
{"id":"1119","latitude":273.1,"longitude":500.6},
{"id":"1120","latitude":279.9,"longitude":500.6},
{"id":"1121","latitude":327.3,"longitude":500.6},
{"id":"1122","latitude":334.1,"longitude":500.6},
{"id":"1123","latitude":340.9,"longitude":500.6},
{"id":"1124","latitude":347.7,"longitude":500.6},
{"id":"1125","latitude":103.5,"longitude":493.8},
{"id":"1126","latitude":110.3,"longitude":493.8},
{"id":"1127","latitude":117.1,"longitude":493.8},
{"id":"1128","latitude":123.9,"longitude":493.8},
{"id":"1129","latitude":130.7,"longitude":493.8},
{"id":"1130","latitude":137.4,"longitude":493.8},
{"id":"1131","latitude":144.2,"longitude":493.8},
{"id":"1132","latitude":151,"longitude":493.8},
{"id":"1133","latitude":157.8,"longitude":493.8},
{"id":"1134","latitude":164.6,"longitude":493.8},
{"id":"1135","latitude":171.3,"longitude":493.8},
{"id":"1136","latitude":178.1,"longitude":493.8},
{"id":"1137","latitude":184.9,"longitude":493.8},
{"id":"1138","latitude":191.7,"longitude":493.8},
{"id":"1139","latitude":198.5,"longitude":493.8},
{"id":"1140","latitude":205.3,"longitude":493.8},
{"id":"1141","latitude":212,"longitude":493.8},
{"id":"1142","latitude":218.8,"longitude":493.8},
{"id":"1143","latitude":225.6,"longitude":493.8},
{"id":"1144","latitude":232.4,"longitude":493.8},
{"id":"1145","latitude":239.2,"longitude":493.8},
{"id":"1146","latitude":246,"longitude":493.8},
{"id":"1147","latitude":259.5,"longitude":493.8},
{"id":"1148","latitude":266.3,"longitude":493.8},
{"id":"1149","latitude":273.1,"longitude":493.8},
{"id":"1150","latitude":279.9,"longitude":493.8},
{"id":"1151","latitude":286.6,"longitude":493.8},
{"id":"1152","latitude":103.5,"longitude":487},
{"id":"1153","latitude":110.3,"longitude":487},
{"id":"1154","latitude":117.1,"longitude":487},
{"id":"1155","latitude":123.9,"longitude":487},
{"id":"1156","latitude":130.7,"longitude":487},
{"id":"1157","latitude":137.4,"longitude":487},
{"id":"1158","latitude":144.2,"longitude":487},
{"id":"1159","latitude":151,"longitude":487},
{"id":"1160","latitude":157.8,"longitude":487},
{"id":"1161","latitude":164.6,"longitude":487},
{"id":"1162","latitude":171.3,"longitude":487},
{"id":"1163","latitude":178.1,"longitude":487},
{"id":"1164","latitude":191.7,"longitude":487},
{"id":"1165","latitude":198.5,"longitude":487},
{"id":"1166","latitude":205.3,"longitude":487},
{"id":"1167","latitude":212,"longitude":487},
{"id":"1168","latitude":218.8,"longitude":487},
{"id":"1169","latitude":225.6,"longitude":487},
{"id":"1170","latitude":232.4,"longitude":487},
{"id":"1171","latitude":239.2,"longitude":487},
{"id":"1172","latitude":252.7,"longitude":487},
{"id":"1173","latitude":259.5,"longitude":487},
{"id":"1174","latitude":266.3,"longitude":487},
{"id":"1175","latitude":273.1,"longitude":487},
{"id":"1176","latitude":279.9,"longitude":487},
{"id":"1177","latitude":286.6,"longitude":487},
{"id":"1178","latitude":293.4,"longitude":487},
{"id":"1179","latitude":300.2,"longitude":487},
{"id":"1180","latitude":307,"longitude":487},
{"id":"1181","latitude":313.8,"longitude":487},
{"id":"1182","latitude":320.6,"longitude":487},
{"id":"1183","latitude":327.3,"longitude":487},
{"id":"1184","latitude":103.5,"longitude":480.2},
{"id":"1185","latitude":110.3,"longitude":480.2},
{"id":"1186","latitude":117.1,"longitude":480.2},
{"id":"1187","latitude":123.9,"longitude":480.2},
{"id":"1188","latitude":130.7,"longitude":480.2},
{"id":"1189","latitude":137.4,"longitude":480.2},
{"id":"1190","latitude":144.2,"longitude":480.2},
{"id":"1191","latitude":151,"longitude":480.2},
{"id":"1192","latitude":157.8,"longitude":480.2},
{"id":"1193","latitude":110.3,"longitude":358.1},
{"id":"1194","latitude":110.3,"longitude":351.4},
{"id":"1195","latitude":117.1,"longitude":351.4},
{"id":"1196","latitude":110.3,"longitude":344.6},
{"id":"1197","latitude":117.1,"longitude":344.6},
{"id":"1198","latitude":164.6,"longitude":480.2},
{"id":"1199","latitude":171.3,"longitude":480.2},
{"id":"1200","latitude":178.1,"longitude":480.2},
{"id":"1201","latitude":191.7,"longitude":480.2},
{"id":"1202","latitude":198.5,"longitude":480.2},
{"id":"1203","latitude":205.3,"longitude":480.2},
{"id":"1204","latitude":212,"longitude":480.2},
{"id":"1205","latitude":218.8,"longitude":480.2},
{"id":"1206","latitude":225.6,"longitude":480.2},
{"id":"1207","latitude":239.2,"longitude":480.2},
{"id":"1208","latitude":246,"longitude":480.2},
{"id":"1209","latitude":252.7,"longitude":480.2},
{"id":"1210","latitude":259.5,"longitude":480.2},
{"id":"1211","latitude":266.3,"longitude":480.2},
{"id":"1212","latitude":273.1,"longitude":480.2},
{"id":"1213","latitude":279.9,"longitude":480.2},
{"id":"1214","latitude":286.6,"longitude":480.2},
{"id":"1215","latitude":293.4,"longitude":480.2},
{"id":"1216","latitude":300.2,"longitude":480.2},
{"id":"1217","latitude":307,"longitude":480.2},
{"id":"1218","latitude":313.8,"longitude":480.2},
{"id":"1219","latitude":320.6,"longitude":480.2},
{"id":"1220","latitude":327.3,"longitude":480.2},
{"id":"1221","latitude":334.1,"longitude":480.2},
{"id":"1222","latitude":340.9,"longitude":480.2},
{"id":"1223","latitude":347.7,"longitude":480.2},
{"id":"1224","latitude":103.5,"longitude":473.4},
{"id":"1225","latitude":110.3,"longitude":473.4},
{"id":"1226","latitude":117.1,"longitude":473.4},
{"id":"1227","latitude":123.9,"longitude":473.4},
{"id":"1228","latitude":130.7,"longitude":473.4},
{"id":"1229","latitude":137.4,"longitude":473.4},
{"id":"1230","latitude":144.2,"longitude":473.4},
{"id":"1231","latitude":151,"longitude":473.4},
{"id":"1232","latitude":157.8,"longitude":473.4},
{"id":"1233","latitude":164.6,"longitude":473.4},
{"id":"1234","latitude":171.3,"longitude":473.4},
{"id":"1235","latitude":178.1,"longitude":473.4},
{"id":"1236","latitude":191.7,"longitude":473.4},
{"id":"1237","latitude":198.5,"longitude":473.4},
{"id":"1238","latitude":205.3,"longitude":473.4},
{"id":"1239","latitude":218.8,"longitude":473.4},
{"id":"1240","latitude":225.6,"longitude":473.4},
{"id":"1241","latitude":232.4,"longitude":473.4},
{"id":"1242","latitude":239.2,"longitude":473.4},
{"id":"1243","latitude":246,"longitude":473.4},
{"id":"1244","latitude":252.7,"longitude":473.4},
{"id":"1245","latitude":259.5,"longitude":473.4},
{"id":"1246","latitude":266.3,"longitude":473.4},
{"id":"1247","latitude":273.1,"longitude":473.4},
{"id":"1248","latitude":279.9,"longitude":473.4},
{"id":"1249","latitude":286.6,"longitude":473.4},
{"id":"1250","latitude":293.4,"longitude":473.4},
{"id":"1251","latitude":300.2,"longitude":473.4},
{"id":"1252","latitude":307,"longitude":473.4},
{"id":"1253","latitude":313.8,"longitude":473.4},
{"id":"1254","latitude":320.6,"longitude":473.4},
{"id":"1255","latitude":327.3,"longitude":473.4},
{"id":"1256","latitude":334.1,"longitude":473.4},
{"id":"1257","latitude":340.9,"longitude":473.4},
{"id":"1258","latitude":347.7,"longitude":473.4},
{"id":"1259","latitude":90,"longitude":466.7},
{"id":"1260","latitude":96.7,"longitude":466.7},
{"id":"1261","latitude":103.5,"longitude":466.7},
{"id":"1262","latitude":110.3,"longitude":466.7},
{"id":"1263","latitude":117.1,"longitude":466.7},
{"id":"1264","latitude":123.9,"longitude":466.7},
{"id":"1265","latitude":130.7,"longitude":466.7},
{"id":"1266","latitude":137.4,"longitude":466.7},
{"id":"1267","latitude":144.2,"longitude":466.7},
{"id":"1268","latitude":151,"longitude":466.7},
{"id":"1269","latitude":157.8,"longitude":466.7},
{"id":"1270","latitude":164.6,"longitude":466.7},
{"id":"1271","latitude":171.3,"longitude":466.7},
{"id":"1272","latitude":178.1,"longitude":466.7},
{"id":"1273","latitude":191.7,"longitude":466.7},
{"id":"1274","latitude":198.5,"longitude":466.7},
{"id":"1275","latitude":218.8,"longitude":466.7},
{"id":"1276","latitude":225.6,"longitude":466.7},
{"id":"1277","latitude":232.4,"longitude":466.7},
{"id":"1278","latitude":239.2,"longitude":466.7},
{"id":"1279","latitude":246,"longitude":466.7},
{"id":"1280","latitude":252.7,"longitude":466.7},
{"id":"1281","latitude":259.5,"longitude":466.7},
{"id":"1282","latitude":266.3,"longitude":466.7},
{"id":"1283","latitude":273.1,"longitude":466.7},
{"id":"1284","latitude":279.9,"longitude":466.7},
{"id":"1285","latitude":286.6,"longitude":466.7},
{"id":"1286","latitude":293.4,"longitude":466.7},
{"id":"1287","latitude":300.2,"longitude":466.7},
{"id":"1288","latitude":307,"longitude":466.7},
{"id":"1289","latitude":313.8,"longitude":466.7},
{"id":"1290","latitude":320.6,"longitude":466.7},
{"id":"1291","latitude":327.3,"longitude":466.7},
{"id":"1292","latitude":334.1,"longitude":466.7},
{"id":"1293","latitude":340.9,"longitude":466.7},
{"id":"1294","latitude":347.7,"longitude":466.7},
{"id":"1295","latitude":354.5,"longitude":466.7},
{"id":"1296","latitude":361.3,"longitude":466.7},
{"id":"1297","latitude":49.3,"longitude":459.9},
{"id":"1298","latitude":90,"longitude":459.9},
{"id":"1299","latitude":96.7,"longitude":459.9},
{"id":"1300","latitude":103.5,"longitude":459.9},
{"id":"1301","latitude":110.3,"longitude":459.9},
{"id":"1302","latitude":117.1,"longitude":459.9},
{"id":"1303","latitude":123.9,"longitude":459.9},
{"id":"1304","latitude":130.7,"longitude":459.9},
{"id":"1305","latitude":137.4,"longitude":459.9},
{"id":"1306","latitude":144.2,"longitude":459.9},
{"id":"1307","latitude":151,"longitude":459.9},
{"id":"1308","latitude":157.8,"longitude":459.9},
{"id":"1309","latitude":164.6,"longitude":459.9},
{"id":"1310","latitude":171.3,"longitude":459.9},
{"id":"1311","latitude":178.1,"longitude":459.9},
{"id":"1312","latitude":184.9,"longitude":459.9},
{"id":"1313","latitude":191.7,"longitude":459.9},
{"id":"1314","latitude":198.5,"longitude":459.9},
{"id":"1315","latitude":218.8,"longitude":459.9},
{"id":"1316","latitude":225.6,"longitude":459.9},
{"id":"1317","latitude":232.4,"longitude":459.9},
{"id":"1318","latitude":239.2,"longitude":459.9},
{"id":"1319","latitude":246,"longitude":459.9},
{"id":"1320","latitude":252.7,"longitude":459.9},
{"id":"1321","latitude":259.5,"longitude":459.9},
{"id":"1322","latitude":266.3,"longitude":459.9},
{"id":"1323","latitude":273.1,"longitude":459.9},
{"id":"1324","latitude":279.9,"longitude":459.9},
{"id":"1325","latitude":286.6,"longitude":459.9},
{"id":"1326","latitude":293.4,"longitude":459.9},
{"id":"1327","latitude":300.2,"longitude":459.9},
{"id":"1328","latitude":307,"longitude":459.9},
{"id":"1329","latitude":313.8,"longitude":459.9},
{"id":"1330","latitude":320.6,"longitude":459.9},
{"id":"1331","latitude":327.3,"longitude":459.9},
{"id":"1332","latitude":334.1,"longitude":459.9},
{"id":"1333","latitude":340.9,"longitude":459.9},
{"id":"1334","latitude":347.7,"longitude":459.9},
{"id":"1335","latitude":354.5,"longitude":459.9},
{"id":"1336","latitude":361.3,"longitude":459.9},
{"id":"1337","latitude":368,"longitude":459.9},
{"id":"1338","latitude":49.3,"longitude":453.1},
{"id":"1339","latitude":62.8,"longitude":453.1},
{"id":"1340","latitude":96.7,"longitude":453.1},
{"id":"1341","latitude":103.5,"longitude":453.1},
{"id":"1342","latitude":110.3,"longitude":453.1},
{"id":"1343","latitude":117.1,"longitude":453.1},
{"id":"1344","latitude":123.9,"longitude":453.1},
{"id":"1345","latitude":130.7,"longitude":453.1},
{"id":"1346","latitude":137.4,"longitude":453.1},
{"id":"1347","latitude":144.2,"longitude":453.1},
{"id":"1348","latitude":151,"longitude":453.1},
{"id":"1349","latitude":157.8,"longitude":453.1},
{"id":"1350","latitude":164.6,"longitude":453.1},
{"id":"1351","latitude":171.3,"longitude":453.1},
{"id":"1352","latitude":178.1,"longitude":453.1},
{"id":"1353","latitude":184.9,"longitude":453.1},
{"id":"1354","latitude":191.7,"longitude":453.1},
{"id":"1355","latitude":198.5,"longitude":453.1},
{"id":"1356","latitude":212,"longitude":453.1},
{"id":"1357","latitude":218.8,"longitude":453.1},
{"id":"1358","latitude":225.6,"longitude":453.1},
{"id":"1359","latitude":232.4,"longitude":453.1},
{"id":"1360","latitude":239.2,"longitude":453.1},
{"id":"1361","latitude":246,"longitude":453.1},
{"id":"1362","latitude":252.7,"longitude":453.1},
{"id":"1363","latitude":259.5,"longitude":453.1},
{"id":"1364","latitude":266.3,"longitude":453.1},
{"id":"1365","latitude":273.1,"longitude":453.1},
{"id":"1366","latitude":279.9,"longitude":453.1},
{"id":"1367","latitude":286.6,"longitude":453.1},
{"id":"1368","latitude":293.4,"longitude":453.1},
{"id":"1369","latitude":300.2,"longitude":453.1},
{"id":"1370","latitude":307,"longitude":453.1},
{"id":"1371","latitude":313.8,"longitude":453.1},
{"id":"1372","latitude":320.6,"longitude":453.1},
{"id":"1373","latitude":327.3,"longitude":453.1},
{"id":"1374","latitude":334.1,"longitude":453.1},
{"id":"1375","latitude":340.9,"longitude":453.1},
{"id":"1376","latitude":347.7,"longitude":453.1},
{"id":"1377","latitude":354.5,"longitude":453.1},
{"id":"1378","latitude":361.3,"longitude":453.1},
{"id":"1379","latitude":368,"longitude":453.1},
{"id":"1380","latitude":49.3,"longitude":446.3},
{"id":"1381","latitude":56,"longitude":446.3},
{"id":"1382","latitude":96.7,"longitude":446.3},
{"id":"1383","latitude":103.5,"longitude":446.3},
{"id":"1384","latitude":110.3,"longitude":446.3},
{"id":"1385","latitude":117.1,"longitude":446.3},
{"id":"1386","latitude":123.9,"longitude":446.3},
{"id":"1387","latitude":144.2,"longitude":446.3},
{"id":"1388","latitude":151,"longitude":446.3},
{"id":"1389","latitude":157.8,"longitude":446.3},
{"id":"1390","latitude":164.6,"longitude":446.3},
{"id":"1391","latitude":171.3,"longitude":446.3},
{"id":"1392","latitude":178.1,"longitude":446.3},
{"id":"1393","latitude":184.9,"longitude":446.3},
{"id":"1394","latitude":191.7,"longitude":446.3},
{"id":"1395","latitude":198.5,"longitude":446.3},
{"id":"1396","latitude":212,"longitude":446.3},
{"id":"1397","latitude":218.8,"longitude":446.3},
{"id":"1398","latitude":225.6,"longitude":446.3},
{"id":"1399","latitude":232.4,"longitude":446.3},
{"id":"1400","latitude":239.2,"longitude":446.3},
{"id":"1401","latitude":246,"longitude":446.3},
{"id":"1402","latitude":252.7,"longitude":446.3},
{"id":"1403","latitude":259.5,"longitude":446.3},
{"id":"1404","latitude":266.3,"longitude":446.3},
{"id":"1405","latitude":273.1,"longitude":446.3},
{"id":"1406","latitude":279.9,"longitude":446.3},
{"id":"1407","latitude":286.6,"longitude":446.3},
{"id":"1408","latitude":293.4,"longitude":446.3},
{"id":"1409","latitude":300.2,"longitude":446.3},
{"id":"1410","latitude":307,"longitude":446.3},
{"id":"1411","latitude":313.8,"longitude":446.3},
{"id":"1412","latitude":320.6,"longitude":446.3},
{"id":"1413","latitude":327.3,"longitude":446.3},
{"id":"1414","latitude":334.1,"longitude":446.3},
{"id":"1415","latitude":340.9,"longitude":446.3},
{"id":"1416","latitude":347.7,"longitude":446.3},
{"id":"1417","latitude":354.5,"longitude":446.3},
{"id":"1418","latitude":361.3,"longitude":446.3},
{"id":"1419","latitude":368,"longitude":446.3},
{"id":"1420","latitude":49.3,"longitude":439.5},
{"id":"1421","latitude":56,"longitude":439.5},
{"id":"1422","latitude":62.8,"longitude":439.5},
{"id":"1423","latitude":96.7,"longitude":439.5},
{"id":"1424","latitude":103.5,"longitude":439.5},
{"id":"1425","latitude":110.3,"longitude":439.5},
{"id":"1426","latitude":117.1,"longitude":439.5},
{"id":"1427","latitude":130.7,"longitude":439.5},
{"id":"1428","latitude":151,"longitude":439.5},
{"id":"1429","latitude":157.8,"longitude":439.5},
{"id":"1430","latitude":164.6,"longitude":439.5},
{"id":"1431","latitude":171.3,"longitude":439.5},
{"id":"1432","latitude":178.1,"longitude":439.5},
{"id":"1433","latitude":184.9,"longitude":439.5},
{"id":"1434","latitude":218.8,"longitude":439.5},
{"id":"1435","latitude":225.6,"longitude":439.5},
{"id":"1436","latitude":232.4,"longitude":439.5},
{"id":"1437","latitude":239.2,"longitude":439.5},
{"id":"1438","latitude":246,"longitude":439.5},
{"id":"1439","latitude":252.7,"longitude":439.5},
{"id":"1440","latitude":259.5,"longitude":439.5},
{"id":"1441","latitude":266.3,"longitude":439.5},
{"id":"1442","latitude":273.1,"longitude":439.5},
{"id":"1443","latitude":279.9,"longitude":439.5},
{"id":"1444","latitude":286.6,"longitude":439.5},
{"id":"1445","latitude":293.4,"longitude":439.5},
{"id":"1446","latitude":300.2,"longitude":439.5},
{"id":"1447","latitude":307,"longitude":439.5},
{"id":"1448","latitude":313.8,"longitude":439.5},
{"id":"1449","latitude":320.6,"longitude":439.5},
{"id":"1450","latitude":327.3,"longitude":439.5},
{"id":"1451","latitude":334.1,"longitude":439.5},
{"id":"1452","latitude":340.9,"longitude":439.5},
{"id":"1453","latitude":347.7,"longitude":439.5},
{"id":"1454","latitude":354.5,"longitude":439.5},
{"id":"1455","latitude":361.3,"longitude":439.5},
{"id":"1456","latitude":368,"longitude":439.5},
{"id":"1457","latitude":56,"longitude":432.8},
{"id":"1458","latitude":62.8,"longitude":432.8},
{"id":"1459","latitude":103.5,"longitude":432.8},
{"id":"1460","latitude":110.3,"longitude":432.8},
{"id":"1461","latitude":117.1,"longitude":432.8},
{"id":"1462","latitude":123.9,"longitude":432.8},
{"id":"1463","latitude":130.7,"longitude":432.8},
{"id":"1464","latitude":137.4,"longitude":432.8},
{"id":"1465","latitude":144.2,"longitude":432.8},
{"id":"1466","latitude":151,"longitude":432.8},
{"id":"1467","latitude":157.8,"longitude":432.8},
{"id":"1468","latitude":164.6,"longitude":432.8},
{"id":"1469","latitude":171.3,"longitude":432.8},
{"id":"1470","latitude":178.1,"longitude":432.8},
{"id":"1471","latitude":191.7,"longitude":432.8},
{"id":"1472","latitude":198.5,"longitude":432.8},
{"id":"1473","latitude":218.8,"longitude":432.8},
{"id":"1474","latitude":225.6,"longitude":432.8},
{"id":"1475","latitude":232.4,"longitude":432.8},
{"id":"1476","latitude":239.2,"longitude":432.8},
{"id":"1477","latitude":246,"longitude":432.8},
{"id":"1478","latitude":252.7,"longitude":432.8},
{"id":"1479","latitude":259.5,"longitude":432.8},
{"id":"1480","latitude":266.3,"longitude":432.8},
{"id":"1481","latitude":273.1,"longitude":432.8},
{"id":"1482","latitude":279.9,"longitude":432.8},
{"id":"1483","latitude":286.6,"longitude":432.8},
{"id":"1484","latitude":293.4,"longitude":432.8},
{"id":"1485","latitude":300.2,"longitude":432.8},
{"id":"1486","latitude":307,"longitude":432.8},
{"id":"1487","latitude":313.8,"longitude":432.8},
{"id":"1488","latitude":320.6,"longitude":432.8},
{"id":"1489","latitude":327.3,"longitude":432.8},
{"id":"1490","latitude":334.1,"longitude":432.8},
{"id":"1491","latitude":340.9,"longitude":432.8},
{"id":"1492","latitude":347.7,"longitude":432.8},
{"id":"1493","latitude":56,"longitude":426},
{"id":"1494","latitude":110.3,"longitude":426},
{"id":"1495","latitude":117.1,"longitude":426},
{"id":"1496","latitude":123.9,"longitude":426},
{"id":"1497","latitude":130.7,"longitude":426},
{"id":"1498","latitude":137.4,"longitude":426},
{"id":"1499","latitude":151,"longitude":426},
{"id":"1500","latitude":157.8,"longitude":426},
{"id":"1501","latitude":164.6,"longitude":426},
{"id":"1502","latitude":171.3,"longitude":426},
{"id":"1503","latitude":178.1,"longitude":426},
{"id":"1504","latitude":184.9,"longitude":426},
{"id":"1505","latitude":198.5,"longitude":426},
{"id":"1506","latitude":212,"longitude":426},
{"id":"1507","latitude":218.8,"longitude":426},
{"id":"1508","latitude":225.6,"longitude":426},
{"id":"1509","latitude":232.4,"longitude":426},
{"id":"1510","latitude":239.2,"longitude":426},
{"id":"1511","latitude":246,"longitude":426},
{"id":"1512","latitude":252.7,"longitude":426},
{"id":"1513","latitude":259.5,"longitude":426},
{"id":"1514","latitude":266.3,"longitude":426},
{"id":"1515","latitude":273.1,"longitude":426},
{"id":"1516","latitude":279.9,"longitude":426},
{"id":"1517","latitude":286.6,"longitude":426},
{"id":"1518","latitude":293.4,"longitude":426},
{"id":"1519","latitude":300.2,"longitude":426},
{"id":"1520","latitude":320.6,"longitude":426},
{"id":"1521","latitude":327.3,"longitude":426},
{"id":"1522","latitude":117.1,"longitude":419.2},
{"id":"1523","latitude":123.9,"longitude":419.2},
{"id":"1524","latitude":130.7,"longitude":419.2},
{"id":"1525","latitude":137.4,"longitude":419.2},
{"id":"1526","latitude":144.2,"longitude":419.2},
{"id":"1527","latitude":151,"longitude":419.2},
{"id":"1528","latitude":157.8,"longitude":419.2},
{"id":"1529","latitude":164.6,"longitude":419.2},
{"id":"1530","latitude":171.3,"longitude":419.2},
{"id":"1531","latitude":178.1,"longitude":419.2},
{"id":"1532","latitude":184.9,"longitude":419.2},
{"id":"1533","latitude":191.7,"longitude":419.2},
{"id":"1534","latitude":205.3,"longitude":419.2},
{"id":"1535","latitude":212,"longitude":419.2},
{"id":"1536","latitude":218.8,"longitude":419.2},
{"id":"1537","latitude":225.6,"longitude":419.2},
{"id":"1538","latitude":232.4,"longitude":419.2},
{"id":"1539","latitude":239.2,"longitude":419.2},
{"id":"1540","latitude":246,"longitude":419.2},
{"id":"1541","latitude":252.7,"longitude":419.2},
{"id":"1542","latitude":259.5,"longitude":419.2},
{"id":"1543","latitude":266.3,"longitude":419.2},
{"id":"1544","latitude":273.1,"longitude":419.2},
{"id":"1545","latitude":279.9,"longitude":419.2},
{"id":"1546","latitude":286.6,"longitude":419.2},
{"id":"1547","latitude":293.4,"longitude":419.2},
{"id":"1548","latitude":123.9,"longitude":412.4},
{"id":"1549","latitude":130.7,"longitude":412.4},
{"id":"1550","latitude":137.4,"longitude":412.4},
{"id":"1551","latitude":157.8,"longitude":412.4},
{"id":"1552","latitude":164.6,"longitude":412.4},
{"id":"1553","latitude":171.3,"longitude":412.4},
{"id":"1554","latitude":178.1,"longitude":412.4},
{"id":"1555","latitude":184.9,"longitude":412.4},
{"id":"1556","latitude":205.3,"longitude":412.4},
{"id":"1557","latitude":212,"longitude":412.4},
{"id":"1558","latitude":218.8,"longitude":412.4},
{"id":"1559","latitude":225.6,"longitude":412.4},
{"id":"1560","latitude":232.4,"longitude":412.4},
{"id":"1561","latitude":239.2,"longitude":412.4},
{"id":"1562","latitude":246,"longitude":412.4},
{"id":"1563","latitude":252.7,"longitude":412.4},
{"id":"1564","latitude":259.5,"longitude":412.4},
{"id":"1565","latitude":266.3,"longitude":412.4},
{"id":"1566","latitude":273.1,"longitude":412.4},
{"id":"1567","latitude":164.6,"longitude":405.6},
{"id":"1568","latitude":171.3,"longitude":405.6},
{"id":"1569","latitude":178.1,"longitude":405.6},
{"id":"1570","latitude":184.9,"longitude":405.6},
{"id":"1571","latitude":205.3,"longitude":405.6},
{"id":"1572","latitude":212,"longitude":405.6},
{"id":"1573","latitude":218.8,"longitude":405.6},
{"id":"1574","latitude":225.6,"longitude":405.6},
{"id":"1575","latitude":232.4,"longitude":405.6},
{"id":"1576","latitude":239.2,"longitude":405.6},
{"id":"1577","latitude":246,"longitude":405.6},
{"id":"1578","latitude":252.7,"longitude":405.6},
{"id":"1579","latitude":259.5,"longitude":405.6},
{"id":"1580","latitude":266.3,"longitude":405.6},
{"id":"1581","latitude":273.1,"longitude":405.6},
{"id":"1582","latitude":164.6,"longitude":398.8},
{"id":"1583","latitude":171.3,"longitude":398.8},
{"id":"1584","latitude":171.3,"longitude":392.1},
{"id":"1585","latitude":171.3,"longitude":385.3},
{"id":"1586","latitude":178.1,"longitude":398.8},
{"id":"1587","latitude":184.9,"longitude":398.8},
{"id":"1588","latitude":191.7,"longitude":398.8},
{"id":"1589","latitude":205.3,"longitude":398.8},
{"id":"1590","latitude":212,"longitude":398.8},
{"id":"1591","latitude":218.8,"longitude":398.8},
{"id":"1592","latitude":225.6,"longitude":398.8},
{"id":"1593","latitude":232.4,"longitude":398.8},
{"id":"1594","latitude":239.2,"longitude":398.8},
{"id":"1595","latitude":246,"longitude":398.8},
{"id":"1596","latitude":252.7,"longitude":398.8},
{"id":"1597","latitude":259.5,"longitude":398.8},
{"id":"1598","latitude":266.3,"longitude":398.8},
{"id":"1599","latitude":273.1,"longitude":398.8},
{"id":"1600","latitude":184.9,"longitude":392.1},
{"id":"1601","latitude":191.7,"longitude":392.1},
{"id":"1602","latitude":198.5,"longitude":392.1},
{"id":"1603","latitude":205.3,"longitude":392.1},
{"id":"1604","latitude":212,"longitude":392.1},
{"id":"1605","latitude":218.8,"longitude":392.1},
{"id":"1606","latitude":225.6,"longitude":392.1},
{"id":"1607","latitude":232.4,"longitude":392.1},
{"id":"1608","latitude":239.2,"longitude":392.1},
{"id":"1609","latitude":246,"longitude":392.1},
{"id":"1610","latitude":252.7,"longitude":392.1},
{"id":"1611","latitude":259.5,"longitude":392.1},
{"id":"1612","latitude":266.3,"longitude":392.1},
{"id":"1613","latitude":273.1,"longitude":392.1},
{"id":"1614","latitude":184.9,"longitude":385.3},
{"id":"1615","latitude":191.7,"longitude":385.3},
{"id":"1616","latitude":198.5,"longitude":385.3},
{"id":"1617","latitude":205.3,"longitude":385.3},
{"id":"1618","latitude":212,"longitude":385.3},
{"id":"1619","latitude":218.8,"longitude":385.3},
{"id":"1620","latitude":225.6,"longitude":385.3},
{"id":"1621","latitude":232.4,"longitude":385.3},
{"id":"1622","latitude":239.2,"longitude":385.3},
{"id":"1623","latitude":246,"longitude":385.3},
{"id":"1624","latitude":252.7,"longitude":385.3},
{"id":"1625","latitude":259.5,"longitude":385.3},
{"id":"1626","latitude":266.3,"longitude":385.3},
{"id":"1627","latitude":273.1,"longitude":385.3},
{"id":"1628","latitude":279.9,"longitude":385.3},
{"id":"1629","latitude":184.9,"longitude":378.5},
{"id":"1630","latitude":191.7,"longitude":378.5},
{"id":"1631","latitude":198.5,"longitude":378.5},
{"id":"1632","latitude":212,"longitude":378.5},
{"id":"1633","latitude":218.8,"longitude":378.5},
{"id":"1634","latitude":225.6,"longitude":378.5},
{"id":"1635","latitude":232.4,"longitude":378.5},
{"id":"1636","latitude":239.2,"longitude":378.5},
{"id":"1637","latitude":246,"longitude":378.5},
{"id":"1638","latitude":252.7,"longitude":378.5},
{"id":"1639","latitude":259.5,"longitude":378.5},
{"id":"1640","latitude":266.3,"longitude":378.5},
{"id":"1641","latitude":273.1,"longitude":378.5},
{"id":"1642","latitude":279.9,"longitude":378.5},
{"id":"1643","latitude":42.5,"longitude":371.7},
{"id":"1644","latitude":225.6,"longitude":371.7},
{"id":"1645","latitude":232.4,"longitude":371.7},
{"id":"1646","latitude":239.2,"longitude":371.7},
{"id":"1647","latitude":246,"longitude":371.7},
{"id":"1648","latitude":252.7,"longitude":371.7},
{"id":"1649","latitude":259.5,"longitude":371.7},
{"id":"1650","latitude":266.3,"longitude":371.7},
{"id":"1651","latitude":273.1,"longitude":371.7},
{"id":"1652","latitude":42.5,"longitude":364.9},
{"id":"1653","latitude":232.4,"longitude":364.9},
{"id":"1654","latitude":239.2,"longitude":364.9},
{"id":"1655","latitude":246,"longitude":364.9},
{"id":"1656","latitude":252.7,"longitude":364.9},
{"id":"1657","latitude":259.5,"longitude":364.9},
{"id":"1658","latitude":42.5,"longitude":358.1},
{"id":"1659","latitude":49.3,"longitude":358.1},
{"id":"1660","latitude":239.2,"longitude":358.1},
{"id":"1661","latitude":35.7,"longitude":351.4},
{"id":"1662","latitude":42.5,"longitude":351.4},
{"id":"1663","latitude":49.3,"longitude":351.4},
{"id":"1664","latitude":56,"longitude":351.4},
{"id":"1665","latitude":62.8,"longitude":351.4},
{"id":"1666","latitude":69.6,"longitude":351.4},
{"id":"1667","latitude":76.4,"longitude":351.4},
{"id":"1668","latitude":35.7,"longitude":344.6},
{"id":"1669","latitude":42.5,"longitude":344.6},
{"id":"1670","latitude":49.3,"longitude":344.6},
{"id":"1671","latitude":56,"longitude":344.6},
{"id":"1672","latitude":62.8,"longitude":344.6},
{"id":"1673","latitude":69.6,"longitude":344.6},
{"id":"1674","latitude":76.4,"longitude":344.6},
{"id":"1675","latitude":83.2,"longitude":344.6},
{"id":"1676","latitude":90,"longitude":344.6},
{"id":"1677","latitude":96.7,"longitude":344.6},
{"id":"1678","latitude":28.9,"longitude":337.8},
{"id":"1679","latitude":35.7,"longitude":337.8},
{"id":"1680","latitude":42.5,"longitude":337.8},
{"id":"1681","latitude":49.3,"longitude":337.8},
{"id":"1682","latitude":56,"longitude":337.8},
{"id":"1683","latitude":62.8,"longitude":337.8},
{"id":"1684","latitude":69.6,"longitude":337.8},
{"id":"1685","latitude":76.4,"longitude":337.8},
{"id":"1686","latitude":83.2,"longitude":337.8},
{"id":"1687","latitude":90,"longitude":337.8},
{"id":"1688","latitude":96.7,"longitude":337.8},
{"id":"1689","latitude":28.9,"longitude":331},
{"id":"1690","latitude":35.7,"longitude":331},
{"id":"1691","latitude":42.5,"longitude":331},
{"id":"1692","latitude":49.3,"longitude":331},
{"id":"1693","latitude":56,"longitude":331},
{"id":"1694","latitude":62.8,"longitude":331},
{"id":"1695","latitude":69.6,"longitude":331},
{"id":"1696","latitude":76.4,"longitude":331},
{"id":"1697","latitude":83.2,"longitude":331},
{"id":"1698","latitude":90,"longitude":331},
{"id":"1699","latitude":96.7,"longitude":331},
{"id":"1700","latitude":103.5,"longitude":331},
{"id":"1701","latitude":28.9,"longitude":324.2},
{"id":"1702","latitude":35.7,"longitude":324.2},
{"id":"1703","latitude":42.5,"longitude":324.2},
{"id":"1704","latitude":49.3,"longitude":324.2},
{"id":"1705","latitude":56,"longitude":324.2},
{"id":"1706","latitude":62.8,"longitude":324.2},
{"id":"1707","latitude":69.6,"longitude":324.2},
{"id":"1708","latitude":76.4,"longitude":324.2},
{"id":"1709","latitude":83.2,"longitude":324.2},
{"id":"1710","latitude":90,"longitude":324.2},
{"id":"1711","latitude":96.7,"longitude":324.2},
{"id":"1712","latitude":103.5,"longitude":324.2},
{"id":"1713","latitude":28.9,"longitude":317.5},
{"id":"1714","latitude":35.7,"longitude":317.5},
{"id":"1715","latitude":42.5,"longitude":317.5},
{"id":"1716","latitude":49.3,"longitude":317.5},
{"id":"1717","latitude":56,"longitude":317.5},
{"id":"1718","latitude":62.8,"longitude":317.5},
{"id":"1719","latitude":69.6,"longitude":317.5},
{"id":"1720","latitude":76.4,"longitude":317.5},
{"id":"1721","latitude":83.2,"longitude":317.5},
{"id":"1722","latitude":90,"longitude":317.5},
{"id":"1723","latitude":96.7,"longitude":317.5},
{"id":"1724","latitude":103.5,"longitude":317.5},
{"id":"1725","latitude":110.3,"longitude":317.5},
{"id":"1726","latitude":300.2,"longitude":317.5},
{"id":"1727","latitude":307,"longitude":317.5},
{"id":"1728","latitude":28.9,"longitude":310.7},
{"id":"1729","latitude":35.7,"longitude":310.7},
{"id":"1730","latitude":42.5,"longitude":310.7},
{"id":"1731","latitude":49.3,"longitude":310.7},
{"id":"1732","latitude":56,"longitude":310.7},
{"id":"1733","latitude":62.8,"longitude":310.7},
{"id":"1734","latitude":69.6,"longitude":310.7},
{"id":"1735","latitude":76.4,"longitude":310.7},
{"id":"1736","latitude":83.2,"longitude":310.7},
{"id":"1737","latitude":90,"longitude":310.7},
{"id":"1738","latitude":96.7,"longitude":310.7},
{"id":"1739","latitude":103.5,"longitude":310.7},
{"id":"1740","latitude":110.3,"longitude":310.7},
{"id":"1741","latitude":300.2,"longitude":310.7},
{"id":"1742","latitude":307,"longitude":310.7},
{"id":"1743","latitude":313.8,"longitude":310.7},
{"id":"1744","latitude":320.6,"longitude":310.7},
{"id":"1745","latitude":327.3,"longitude":310.7},
{"id":"1746","latitude":35.7,"longitude":303.9},
{"id":"1747","latitude":42.5,"longitude":303.9},
{"id":"1748","latitude":49.3,"longitude":303.9},
{"id":"1749","latitude":56,"longitude":303.9},
{"id":"1750","latitude":62.8,"longitude":303.9},
{"id":"1751","latitude":69.6,"longitude":303.9},
{"id":"1752","latitude":76.4,"longitude":303.9},
{"id":"1753","latitude":83.2,"longitude":303.9},
{"id":"1754","latitude":90,"longitude":303.9},
{"id":"1755","latitude":96.7,"longitude":303.9},
{"id":"1756","latitude":103.5,"longitude":303.9},
{"id":"1757","latitude":110.3,"longitude":303.9},
{"id":"1758","latitude":117.1,"longitude":303.9},
{"id":"1759","latitude":123.9,"longitude":303.9},
{"id":"1760","latitude":300.2,"longitude":303.9},
{"id":"1761","latitude":307,"longitude":303.9},
{"id":"1762","latitude":313.8,"longitude":303.9},
{"id":"1763","latitude":320.6,"longitude":303.9},
{"id":"1764","latitude":327.3,"longitude":303.9},
{"id":"1765","latitude":334.1,"longitude":303.9},
{"id":"1766","latitude":340.9,"longitude":303.9},
{"id":"1767","latitude":35.7,"longitude":297.1},
{"id":"1768","latitude":42.5,"longitude":297.1},
{"id":"1769","latitude":49.3,"longitude":297.1},
{"id":"1770","latitude":56,"longitude":297.1},
{"id":"1771","latitude":62.8,"longitude":297.1},
{"id":"1772","latitude":69.6,"longitude":297.1},
{"id":"1773","latitude":76.4,"longitude":297.1},
{"id":"1774","latitude":83.2,"longitude":297.1},
{"id":"1775","latitude":90,"longitude":297.1},
{"id":"1776","latitude":96.7,"longitude":297.1},
{"id":"1777","latitude":103.5,"longitude":297.1},
{"id":"1778","latitude":110.3,"longitude":297.1},
{"id":"1779","latitude":117.1,"longitude":297.1},
{"id":"1780","latitude":123.9,"longitude":297.1},
{"id":"1781","latitude":130.7,"longitude":297.1},
{"id":"1782","latitude":293.4,"longitude":297.1},
{"id":"1783","latitude":300.2,"longitude":297.1},
{"id":"1784","latitude":307,"longitude":297.1},
{"id":"1785","latitude":313.8,"longitude":297.1},
{"id":"1786","latitude":320.6,"longitude":297.1},
{"id":"1787","latitude":327.3,"longitude":297.1},
{"id":"1788","latitude":334.1,"longitude":297.1},
{"id":"1789","latitude":340.9,"longitude":297.1},
{"id":"1790","latitude":35.7,"longitude":290.3},
{"id":"1791","latitude":42.5,"longitude":290.3},
{"id":"1792","latitude":49.3,"longitude":290.3},
{"id":"1793","latitude":56,"longitude":290.3},
{"id":"1794","latitude":62.8,"longitude":290.3},
{"id":"1795","latitude":69.6,"longitude":290.3},
{"id":"1796","latitude":76.4,"longitude":290.3},
{"id":"1797","latitude":83.2,"longitude":290.3},
{"id":"1798","latitude":90,"longitude":290.3},
{"id":"1799","latitude":96.7,"longitude":290.3},
{"id":"1800","latitude":103.5,"longitude":290.3},
{"id":"1801","latitude":110.3,"longitude":290.3},
{"id":"1802","latitude":117.1,"longitude":290.3},
{"id":"1803","latitude":123.9,"longitude":290.3},
{"id":"1804","latitude":130.7,"longitude":290.3},
{"id":"1805","latitude":293.4,"longitude":290.3},
{"id":"1806","latitude":300.2,"longitude":290.3},
{"id":"1807","latitude":307,"longitude":290.3},
{"id":"1808","latitude":313.8,"longitude":290.3},
{"id":"1809","latitude":320.6,"longitude":290.3},
{"id":"1810","latitude":327.3,"longitude":290.3},
{"id":"1811","latitude":334.1,"longitude":290.3},
{"id":"1812","latitude":340.9,"longitude":290.3},
{"id":"1813","latitude":347.7,"longitude":290.3},
{"id":"1814","latitude":35.7,"longitude":283.5},
{"id":"1815","latitude":42.5,"longitude":283.5},
{"id":"1816","latitude":49.3,"longitude":283.5},
{"id":"1817","latitude":56,"longitude":283.5},
{"id":"1818","latitude":62.8,"longitude":283.5},
{"id":"1819","latitude":69.6,"longitude":283.5},
{"id":"1820","latitude":76.4,"longitude":283.5},
{"id":"1821","latitude":83.2,"longitude":283.5},
{"id":"1822","latitude":90,"longitude":283.5},
{"id":"1823","latitude":96.7,"longitude":283.5},
{"id":"1824","latitude":103.5,"longitude":283.5},
{"id":"1825","latitude":110.3,"longitude":283.5},
{"id":"1826","latitude":117.1,"longitude":283.5},
{"id":"1827","latitude":123.9,"longitude":283.5},
{"id":"1828","latitude":279.9,"longitude":283.5},
{"id":"1829","latitude":286.6,"longitude":283.5},
{"id":"1830","latitude":293.4,"longitude":283.5},
{"id":"1831","latitude":300.2,"longitude":283.5},
{"id":"1832","latitude":307,"longitude":283.5},
{"id":"1833","latitude":313.8,"longitude":283.5},
{"id":"1834","latitude":320.6,"longitude":283.5},
{"id":"1835","latitude":327.3,"longitude":283.5},
{"id":"1836","latitude":334.1,"longitude":283.5},
{"id":"1837","latitude":340.9,"longitude":283.5},
{"id":"1838","latitude":347.7,"longitude":283.5},
{"id":"1839","latitude":354.5,"longitude":283.5},
{"id":"1840","latitude":361.3,"longitude":283.5},
{"id":"1841","latitude":42.5,"longitude":276.8},
{"id":"1842","latitude":49.3,"longitude":276.8},
{"id":"1843","latitude":56,"longitude":276.8},
{"id":"1844","latitude":62.8,"longitude":276.8},
{"id":"1845","latitude":69.6,"longitude":276.8},
{"id":"1846","latitude":76.4,"longitude":276.8},
{"id":"1847","latitude":83.2,"longitude":276.8},
{"id":"1848","latitude":90,"longitude":276.8},
{"id":"1849","latitude":96.7,"longitude":276.8},
{"id":"1850","latitude":103.5,"longitude":276.8},
{"id":"1851","latitude":110.3,"longitude":276.8},
{"id":"1852","latitude":171.3,"longitude":276.8},
{"id":"1853","latitude":279.9,"longitude":276.8},
{"id":"1854","latitude":286.6,"longitude":276.8},
{"id":"1855","latitude":293.4,"longitude":276.8},
{"id":"1856","latitude":300.2,"longitude":276.8},
{"id":"1857","latitude":307,"longitude":276.8},
{"id":"1858","latitude":313.8,"longitude":276.8},
{"id":"1859","latitude":320.6,"longitude":276.8},
{"id":"1860","latitude":327.3,"longitude":276.8},
{"id":"1861","latitude":334.1,"longitude":276.8},
{"id":"1862","latitude":340.9,"longitude":276.8},
{"id":"1863","latitude":347.7,"longitude":276.8},
{"id":"1864","latitude":354.5,"longitude":276.8},
{"id":"1865","latitude":361.3,"longitude":276.8},
{"id":"1866","latitude":368,"longitude":276.8},
{"id":"1867","latitude":42.5,"longitude":270},
{"id":"1868","latitude":49.3,"longitude":270},
{"id":"1869","latitude":56,"longitude":270},
{"id":"1870","latitude":62.8,"longitude":270},
{"id":"1871","latitude":69.6,"longitude":270},
{"id":"1872","latitude":76.4,"longitude":270},
{"id":"1873","latitude":157.8,"longitude":270},
{"id":"1874","latitude":164.6,"longitude":270},
{"id":"1875","latitude":171.3,"longitude":270},
{"id":"1876","latitude":279.9,"longitude":270},
{"id":"1877","latitude":286.6,"longitude":270},
{"id":"1878","latitude":293.4,"longitude":270},
{"id":"1879","latitude":300.2,"longitude":270},
{"id":"1880","latitude":307,"longitude":270},
{"id":"1881","latitude":313.8,"longitude":270},
{"id":"1882","latitude":320.6,"longitude":270},
{"id":"1883","latitude":327.3,"longitude":270},
{"id":"1884","latitude":334.1,"longitude":270},
{"id":"1885","latitude":340.9,"longitude":270},
{"id":"1886","latitude":347.7,"longitude":270},
{"id":"1887","latitude":354.5,"longitude":270},
{"id":"1888","latitude":361.3,"longitude":270},
{"id":"1889","latitude":368,"longitude":270},
{"id":"1890","latitude":374.8,"longitude":270},
{"id":"1891","latitude":42.5,"longitude":263.2},
{"id":"1892","latitude":49.3,"longitude":263.2},
{"id":"1893","latitude":56,"longitude":263.2},
{"id":"1894","latitude":62.8,"longitude":263.2},
{"id":"1895","latitude":69.6,"longitude":263.2},
{"id":"1896","latitude":151,"longitude":263.2},
{"id":"1897","latitude":157.8,"longitude":263.2},
{"id":"1898","latitude":171.3,"longitude":263.2},
{"id":"1899","latitude":273.1,"longitude":263.2},
{"id":"1900","latitude":279.9,"longitude":263.2},
{"id":"1901","latitude":286.6,"longitude":263.2},
{"id":"1902","latitude":293.4,"longitude":263.2},
{"id":"1903","latitude":300.2,"longitude":263.2},
{"id":"1904","latitude":307,"longitude":263.2},
{"id":"1905","latitude":313.8,"longitude":263.2},
{"id":"1906","latitude":320.6,"longitude":263.2},
{"id":"1907","latitude":327.3,"longitude":263.2},
{"id":"1908","latitude":334.1,"longitude":263.2},
{"id":"1909","latitude":340.9,"longitude":263.2},
{"id":"1910","latitude":347.7,"longitude":263.2},
{"id":"1911","latitude":354.5,"longitude":263.2},
{"id":"1912","latitude":361.3,"longitude":263.2},
{"id":"1913","latitude":368,"longitude":263.2},
{"id":"1914","latitude":374.8,"longitude":263.2},
{"id":"1915","latitude":381.6,"longitude":263.2},
{"id":"1916","latitude":35.7,"longitude":256.4},
{"id":"1917","latitude":42.5,"longitude":256.4},
{"id":"1918","latitude":49.3,"longitude":256.4},
{"id":"1919","latitude":56,"longitude":256.4},
{"id":"1920","latitude":62.8,"longitude":256.4},
{"id":"1921","latitude":69.6,"longitude":256.4},
{"id":"1922","latitude":110.3,"longitude":256.4},
{"id":"1923","latitude":144.2,"longitude":256.4},
{"id":"1924","latitude":151,"longitude":256.4},
{"id":"1925","latitude":157.8,"longitude":256.4},
{"id":"1926","latitude":178.1,"longitude":256.4},
{"id":"1927","latitude":266.3,"longitude":256.4},
{"id":"1928","latitude":273.1,"longitude":256.4},
{"id":"1929","latitude":279.9,"longitude":256.4},
{"id":"1930","latitude":286.6,"longitude":256.4},
{"id":"1931","latitude":293.4,"longitude":256.4},
{"id":"1932","latitude":300.2,"longitude":256.4},
{"id":"1933","latitude":307,"longitude":256.4},
{"id":"1934","latitude":313.8,"longitude":256.4},
{"id":"1935","latitude":320.6,"longitude":256.4},
{"id":"1936","latitude":327.3,"longitude":256.4},
{"id":"1937","latitude":334.1,"longitude":256.4},
{"id":"1938","latitude":340.9,"longitude":256.4},
{"id":"1939","latitude":347.7,"longitude":256.4},
{"id":"1940","latitude":354.5,"longitude":256.4},
{"id":"1941","latitude":361.3,"longitude":256.4},
{"id":"1942","latitude":368,"longitude":256.4},
{"id":"1943","latitude":374.8,"longitude":256.4},
{"id":"1944","latitude":381.6,"longitude":256.4},
{"id":"1945","latitude":388.4,"longitude":256.4},
{"id":"1946","latitude":35.7,"longitude":249.6},
{"id":"1947","latitude":42.5,"longitude":249.6},
{"id":"1948","latitude":49.3,"longitude":249.6},
{"id":"1949","latitude":56,"longitude":249.6},
{"id":"1950","latitude":62.8,"longitude":249.6},
{"id":"1951","latitude":69.6,"longitude":249.6},
{"id":"1952","latitude":103.5,"longitude":249.6},
{"id":"1953","latitude":110.3,"longitude":249.6},
{"id":"1954","latitude":117.1,"longitude":249.6},
{"id":"1955","latitude":123.9,"longitude":249.6},
{"id":"1956","latitude":137.4,"longitude":249.6},
{"id":"1957","latitude":144.2,"longitude":249.6},
{"id":"1958","latitude":151,"longitude":249.6},
{"id":"1959","latitude":157.8,"longitude":249.6},
{"id":"1960","latitude":171.3,"longitude":249.6},
{"id":"1961","latitude":178.1,"longitude":249.6},
{"id":"1962","latitude":246,"longitude":249.6},
{"id":"1963","latitude":266.3,"longitude":249.6},
{"id":"1964","latitude":273.1,"longitude":249.6},
{"id":"1965","latitude":279.9,"longitude":249.6},
{"id":"1966","latitude":286.6,"longitude":249.6},
{"id":"1967","latitude":293.4,"longitude":249.6},
{"id":"1968","latitude":300.2,"longitude":249.6},
{"id":"1969","latitude":307,"longitude":249.6},
{"id":"1970","latitude":313.8,"longitude":249.6},
{"id":"1971","latitude":320.6,"longitude":249.6},
{"id":"1972","latitude":327.3,"longitude":249.6},
{"id":"1973","latitude":334.1,"longitude":249.6},
{"id":"1974","latitude":340.9,"longitude":249.6},
{"id":"1975","latitude":347.7,"longitude":249.6},
{"id":"1976","latitude":354.5,"longitude":249.6},
{"id":"1977","latitude":361.3,"longitude":249.6},
{"id":"1978","latitude":368,"longitude":249.6},
{"id":"1979","latitude":374.8,"longitude":249.6},
{"id":"1980","latitude":381.6,"longitude":249.6},
{"id":"1981","latitude":388.4,"longitude":249.6},
{"id":"1982","latitude":395.2,"longitude":249.6},
{"id":"1983","latitude":429.1,"longitude":249.6},
{"id":"1984","latitude":35.7,"longitude":242.8},
{"id":"1985","latitude":42.5,"longitude":242.8},
{"id":"1986","latitude":56,"longitude":242.8},
{"id":"1987","latitude":62.8,"longitude":242.8},
{"id":"1988","latitude":69.6,"longitude":242.8},
{"id":"1989","latitude":96.7,"longitude":242.8},
{"id":"1990","latitude":103.5,"longitude":242.8},
{"id":"1991","latitude":110.3,"longitude":242.8},
{"id":"1992","latitude":117.1,"longitude":242.8},
{"id":"1993","latitude":123.9,"longitude":242.8},
{"id":"1994","latitude":137.4,"longitude":242.8},
{"id":"1995","latitude":144.2,"longitude":242.8},
{"id":"1996","latitude":151,"longitude":242.8},
{"id":"1997","latitude":157.8,"longitude":242.8},
{"id":"1998","latitude":164.6,"longitude":242.8},
{"id":"1999","latitude":171.3,"longitude":242.8},
{"id":"2000","latitude":178.1,"longitude":242.8},
{"id":"2001","latitude":246,"longitude":242.8},
{"id":"2002","latitude":266.3,"longitude":242.8},
{"id":"2003","latitude":273.1,"longitude":242.8},
{"id":"2004","latitude":279.9,"longitude":242.8},
{"id":"2005","latitude":286.6,"longitude":242.8},
{"id":"2006","latitude":293.4,"longitude":242.8},
{"id":"2007","latitude":300.2,"longitude":242.8},
{"id":"2008","latitude":307,"longitude":242.8},
{"id":"2009","latitude":313.8,"longitude":242.8},
{"id":"2010","latitude":320.6,"longitude":242.8},
{"id":"2011","latitude":327.3,"longitude":242.8},
{"id":"2012","latitude":334.1,"longitude":242.8},
{"id":"2013","latitude":340.9,"longitude":242.8},
{"id":"2014","latitude":347.7,"longitude":242.8},
{"id":"2015","latitude":354.5,"longitude":242.8},
{"id":"2016","latitude":361.3,"longitude":242.8},
{"id":"2017","latitude":368,"longitude":242.8},
{"id":"2018","latitude":374.8,"longitude":242.8},
{"id":"2019","latitude":381.6,"longitude":242.8},
{"id":"2020","latitude":388.4,"longitude":242.8},
{"id":"2021","latitude":395.2,"longitude":242.8},
{"id":"2022","latitude":402,"longitude":242.8},
{"id":"2023","latitude":408.7,"longitude":242.8},
{"id":"2024","latitude":422.3,"longitude":242.8},
{"id":"2025","latitude":429.1,"longitude":242.8},
{"id":"2026","latitude":35.7,"longitude":236.1},
{"id":"2027","latitude":42.5,"longitude":236.1},
{"id":"2028","latitude":49.3,"longitude":236.1},
{"id":"2029","latitude":56,"longitude":236.1},
{"id":"2030","latitude":62.8,"longitude":236.1},
{"id":"2031","latitude":90,"longitude":236.1},
{"id":"2032","latitude":96.7,"longitude":236.1},
{"id":"2033","latitude":103.5,"longitude":236.1},
{"id":"2034","latitude":110.3,"longitude":236.1},
{"id":"2035","latitude":117.1,"longitude":236.1},
{"id":"2036","latitude":130.7,"longitude":236.1},
{"id":"2037","latitude":137.4,"longitude":236.1},
{"id":"2038","latitude":144.2,"longitude":236.1},
{"id":"2039","latitude":151,"longitude":236.1},
{"id":"2040","latitude":157.8,"longitude":236.1},
{"id":"2041","latitude":164.6,"longitude":236.1},
{"id":"2042","latitude":171.3,"longitude":236.1},
{"id":"2043","latitude":178.1,"longitude":236.1},
{"id":"2044","latitude":184.9,"longitude":236.1},
{"id":"2045","latitude":239.2,"longitude":236.1},
{"id":"2046","latitude":246,"longitude":236.1},
{"id":"2047","latitude":259.5,"longitude":236.1},
{"id":"2048","latitude":266.3,"longitude":236.1},
{"id":"2049","latitude":273.1,"longitude":236.1},
{"id":"2050","latitude":279.9,"longitude":236.1},
{"id":"2051","latitude":286.6,"longitude":236.1},
{"id":"2052","latitude":293.4,"longitude":236.1},
{"id":"2053","latitude":300.2,"longitude":236.1},
{"id":"2054","latitude":307,"longitude":236.1},
{"id":"2055","latitude":313.8,"longitude":236.1},
{"id":"2056","latitude":320.6,"longitude":236.1},
{"id":"2057","latitude":327.3,"longitude":236.1},
{"id":"2058","latitude":354.5,"longitude":236.1},
{"id":"2059","latitude":361.3,"longitude":236.1},
{"id":"2060","latitude":368,"longitude":236.1},
{"id":"2061","latitude":374.8,"longitude":236.1},
{"id":"2062","latitude":381.6,"longitude":236.1},
{"id":"2063","latitude":388.4,"longitude":236.1},
{"id":"2064","latitude":395.2,"longitude":236.1},
{"id":"2065","latitude":402,"longitude":236.1},
{"id":"2066","latitude":408.7,"longitude":236.1},
{"id":"2067","latitude":415.5,"longitude":236.1},
{"id":"2068","latitude":422.3,"longitude":236.1},
{"id":"2069","latitude":429.1,"longitude":236.1},
{"id":"2070","latitude":35.7,"longitude":229.3},
{"id":"2071","latitude":42.5,"longitude":229.3},
{"id":"2072","latitude":49.3,"longitude":229.3},
{"id":"2073","latitude":90,"longitude":229.3},
{"id":"2074","latitude":96.7,"longitude":229.3},
{"id":"2075","latitude":117.1,"longitude":229.3},
{"id":"2076","latitude":123.9,"longitude":229.3},
{"id":"2077","latitude":130.7,"longitude":229.3},
{"id":"2078","latitude":137.4,"longitude":229.3},
{"id":"2079","latitude":144.2,"longitude":229.3},
{"id":"2080","latitude":151,"longitude":229.3},
{"id":"2081","latitude":157.8,"longitude":229.3},
{"id":"2082","latitude":164.6,"longitude":229.3},
{"id":"2083","latitude":171.3,"longitude":229.3},
{"id":"2084","latitude":178.1,"longitude":229.3},
{"id":"2085","latitude":184.9,"longitude":229.3},
{"id":"2086","latitude":191.7,"longitude":229.3},
{"id":"2087","latitude":239.2,"longitude":229.3},
{"id":"2088","latitude":246,"longitude":229.3},
{"id":"2089","latitude":266.3,"longitude":229.3},
{"id":"2090","latitude":273.1,"longitude":229.3},
{"id":"2091","latitude":279.9,"longitude":229.3},
{"id":"2092","latitude":286.6,"longitude":229.3},
{"id":"2093","latitude":293.4,"longitude":229.3},
{"id":"2094","latitude":300.2,"longitude":229.3},
{"id":"2095","latitude":307,"longitude":229.3},
{"id":"2096","latitude":313.8,"longitude":229.3},
{"id":"2097","latitude":320.6,"longitude":229.3},
{"id":"2098","latitude":388.4,"longitude":229.3},
{"id":"2099","latitude":395.2,"longitude":229.3},
{"id":"2100","latitude":402,"longitude":229.3},
{"id":"2101","latitude":408.7,"longitude":229.3},
{"id":"2102","latitude":415.5,"longitude":229.3},
{"id":"2103","latitude":422.3,"longitude":229.3},
{"id":"2104","latitude":35.7,"longitude":222.5},
{"id":"2105","latitude":42.5,"longitude":222.5},
{"id":"2106","latitude":49.3,"longitude":222.5},
{"id":"2107","latitude":56,"longitude":222.5},
{"id":"2108","latitude":90,"longitude":222.5},
{"id":"2109","latitude":96.7,"longitude":222.5},
{"id":"2110","latitude":103.5,"longitude":222.5},
{"id":"2111","latitude":117.1,"longitude":222.5},
{"id":"2112","latitude":123.9,"longitude":222.5},
{"id":"2113","latitude":130.7,"longitude":222.5},
{"id":"2114","latitude":137.4,"longitude":222.5},
{"id":"2115","latitude":151,"longitude":222.5},
{"id":"2116","latitude":157.8,"longitude":222.5},
{"id":"2117","latitude":164.6,"longitude":222.5},
{"id":"2118","latitude":171.3,"longitude":222.5},
{"id":"2119","latitude":178.1,"longitude":222.5},
{"id":"2120","latitude":184.9,"longitude":222.5},
{"id":"2121","latitude":191.7,"longitude":222.5},
{"id":"2122","latitude":198.5,"longitude":222.5},
{"id":"2123","latitude":205.3,"longitude":222.5},
{"id":"2124","latitude":239.2,"longitude":222.5},
{"id":"2125","latitude":246,"longitude":222.5},
{"id":"2126","latitude":266.3,"longitude":222.5},
{"id":"2127","latitude":273.1,"longitude":222.5},
{"id":"2128","latitude":279.9,"longitude":222.5},
{"id":"2129","latitude":286.6,"longitude":222.5},
{"id":"2130","latitude":293.4,"longitude":222.5},
{"id":"2131","latitude":300.2,"longitude":222.5},
{"id":"2132","latitude":307,"longitude":222.5},
{"id":"2133","latitude":313.8,"longitude":222.5},
{"id":"2134","latitude":35.7,"longitude":215.7},
{"id":"2135","latitude":42.5,"longitude":215.7},
{"id":"2136","latitude":49.3,"longitude":215.7},
{"id":"2137","latitude":56,"longitude":215.7},
{"id":"2138","latitude":62.8,"longitude":215.7},
{"id":"2139","latitude":76.4,"longitude":215.7},
{"id":"2140","latitude":83.2,"longitude":215.7},
{"id":"2141","latitude":90,"longitude":215.7},
{"id":"2142","latitude":96.7,"longitude":215.7},
{"id":"2143","latitude":164.6,"longitude":215.7},
{"id":"2144","latitude":171.3,"longitude":215.7},
{"id":"2145","latitude":178.1,"longitude":215.7},
{"id":"2146","latitude":184.9,"longitude":215.7},
{"id":"2147","latitude":191.7,"longitude":215.7},
{"id":"2148","latitude":198.5,"longitude":215.7},
{"id":"2149","latitude":205.3,"longitude":215.7},
{"id":"2150","latitude":212,"longitude":215.7},
{"id":"2151","latitude":218.8,"longitude":215.7},
{"id":"2152","latitude":225.6,"longitude":215.7},
{"id":"2153","latitude":239.2,"longitude":215.7},
{"id":"2154","latitude":266.3,"longitude":215.7},
{"id":"2155","latitude":273.1,"longitude":215.7},
{"id":"2156","latitude":286.6,"longitude":215.7},
{"id":"2157","latitude":293.4,"longitude":215.7},
{"id":"2158","latitude":300.2,"longitude":215.7},
{"id":"2159","latitude":35.7,"longitude":208.9},
{"id":"2160","latitude":42.5,"longitude":208.9},
{"id":"2161","latitude":49.3,"longitude":208.9},
{"id":"2162","latitude":56,"longitude":208.9},
{"id":"2163","latitude":62.8,"longitude":208.9},
{"id":"2164","latitude":76.4,"longitude":208.9},
{"id":"2165","latitude":83.2,"longitude":208.9},
{"id":"2166","latitude":90,"longitude":208.9},
{"id":"2167","latitude":96.7,"longitude":208.9},
{"id":"2168","latitude":103.5,"longitude":208.9},
{"id":"2169","latitude":110.3,"longitude":208.9},
{"id":"2170","latitude":117.1,"longitude":208.9},
{"id":"2171","latitude":123.9,"longitude":208.9},
{"id":"2172","latitude":151,"longitude":208.9},
{"id":"2173","latitude":157.8,"longitude":208.9},
{"id":"2174","latitude":164.6,"longitude":208.9},
{"id":"2175","latitude":171.3,"longitude":208.9},
{"id":"2176","latitude":178.1,"longitude":208.9},
{"id":"2177","latitude":184.9,"longitude":208.9},
{"id":"2178","latitude":191.7,"longitude":208.9},
{"id":"2179","latitude":198.5,"longitude":208.9},
{"id":"2180","latitude":205.3,"longitude":208.9},
{"id":"2181","latitude":212,"longitude":208.9},
{"id":"2182","latitude":218.8,"longitude":208.9},
{"id":"2183","latitude":252.7,"longitude":208.9},
{"id":"2184","latitude":259.5,"longitude":208.9},
{"id":"2185","latitude":266.3,"longitude":208.9},
{"id":"2186","latitude":42.5,"longitude":202.2},
{"id":"2187","latitude":49.3,"longitude":202.2},
{"id":"2188","latitude":56,"longitude":202.2},
{"id":"2189","latitude":62.8,"longitude":202.2},
{"id":"2190","latitude":76.4,"longitude":202.2},
{"id":"2191","latitude":83.2,"longitude":202.2},
{"id":"2192","latitude":90,"longitude":202.2},
{"id":"2193","latitude":96.7,"longitude":202.2},
{"id":"2194","latitude":103.5,"longitude":202.2},
{"id":"2195","latitude":110.3,"longitude":202.2},
{"id":"2196","latitude":117.1,"longitude":202.2},
{"id":"2197","latitude":151,"longitude":202.2},
{"id":"2198","latitude":157.8,"longitude":202.2},
{"id":"2199","latitude":164.6,"longitude":202.2},
{"id":"2200","latitude":171.3,"longitude":202.2},
{"id":"2201","latitude":178.1,"longitude":202.2},
{"id":"2202","latitude":184.9,"longitude":202.2},
{"id":"2203","latitude":191.7,"longitude":202.2},
{"id":"2204","latitude":198.5,"longitude":202.2},
{"id":"2205","latitude":205.3,"longitude":202.2},
{"id":"2206","latitude":212,"longitude":202.2},
{"id":"2207","latitude":218.8,"longitude":202.2},
{"id":"2208","latitude":239.2,"longitude":202.2},
{"id":"2209","latitude":252.7,"longitude":202.2},
{"id":"2210","latitude":259.5,"longitude":202.2},
{"id":"2211","latitude":266.3,"longitude":202.2},
{"id":"2212","latitude":42.5,"longitude":195.4},
{"id":"2213","latitude":49.3,"longitude":195.4},
{"id":"2214","latitude":56,"longitude":195.4},
{"id":"2215","latitude":69.6,"longitude":195.4},
{"id":"2216","latitude":76.4,"longitude":195.4},
{"id":"2217","latitude":83.2,"longitude":195.4},
{"id":"2218","latitude":90,"longitude":195.4},
{"id":"2219","latitude":103.5,"longitude":195.4},
{"id":"2220","latitude":110.3,"longitude":195.4},
{"id":"2221","latitude":117.1,"longitude":195.4},
{"id":"2222","latitude":144.2,"longitude":195.4},
{"id":"2223","latitude":151,"longitude":195.4},
{"id":"2224","latitude":157.8,"longitude":195.4},
{"id":"2225","latitude":164.6,"longitude":195.4},
{"id":"2226","latitude":171.3,"longitude":195.4},
{"id":"2227","latitude":178.1,"longitude":195.4},
{"id":"2228","latitude":184.9,"longitude":195.4},
{"id":"2229","latitude":191.7,"longitude":195.4},
{"id":"2230","latitude":198.5,"longitude":195.4},
{"id":"2231","latitude":205.3,"longitude":195.4},
{"id":"2232","latitude":212,"longitude":195.4},
{"id":"2233","latitude":218.8,"longitude":195.4},
{"id":"2234","latitude":239.2,"longitude":195.4},
{"id":"2235","latitude":246,"longitude":195.4},
{"id":"2236","latitude":252.7,"longitude":195.4},
{"id":"2237","latitude":259.5,"longitude":195.4},
{"id":"2238","latitude":42.5,"longitude":188.6},
{"id":"2239","latitude":49.3,"longitude":188.6},
{"id":"2240","latitude":56,"longitude":188.6},
{"id":"2241","latitude":69.6,"longitude":188.6},
{"id":"2242","latitude":83.2,"longitude":188.6},
{"id":"2243","latitude":96.7,"longitude":188.6},
{"id":"2244","latitude":103.5,"longitude":188.6},
{"id":"2245","latitude":110.3,"longitude":188.6},
{"id":"2246","latitude":117.1,"longitude":188.6},
{"id":"2247","latitude":123.9,"longitude":188.6},
{"id":"2248","latitude":137.4,"longitude":188.6},
{"id":"2249","latitude":144.2,"longitude":188.6},
{"id":"2250","latitude":151,"longitude":188.6},
{"id":"2251","latitude":157.8,"longitude":188.6},
{"id":"2252","latitude":164.6,"longitude":188.6},
{"id":"2253","latitude":171.3,"longitude":188.6},
{"id":"2254","latitude":178.1,"longitude":188.6},
{"id":"2255","latitude":184.9,"longitude":188.6},
{"id":"2256","latitude":191.7,"longitude":188.6},
{"id":"2257","latitude":198.5,"longitude":188.6},
{"id":"2258","latitude":205.3,"longitude":188.6},
{"id":"2259","latitude":212,"longitude":188.6},
{"id":"2260","latitude":218.8,"longitude":188.6},
{"id":"2261","latitude":246,"longitude":188.6},
{"id":"2262","latitude":252.7,"longitude":188.6},
{"id":"2263","latitude":49.3,"longitude":181.8},
{"id":"2264","latitude":62.8,"longitude":181.8},
{"id":"2265","latitude":83.2,"longitude":181.8},
{"id":"2266","latitude":90,"longitude":181.8},
{"id":"2267","latitude":96.7,"longitude":181.8},
{"id":"2268","latitude":103.5,"longitude":181.8},
{"id":"2269","latitude":110.3,"longitude":181.8},
{"id":"2270","latitude":117.1,"longitude":181.8},
{"id":"2271","latitude":123.9,"longitude":181.8},
{"id":"2272","latitude":130.7,"longitude":181.8},
{"id":"2273","latitude":137.4,"longitude":181.8},
{"id":"2274","latitude":144.2,"longitude":181.8},
{"id":"2275","latitude":151,"longitude":181.8},
{"id":"2276","latitude":157.8,"longitude":181.8},
{"id":"2277","latitude":164.6,"longitude":181.8},
{"id":"2278","latitude":171.3,"longitude":181.8},
{"id":"2279","latitude":178.1,"longitude":181.8},
{"id":"2280","latitude":184.9,"longitude":181.8},
{"id":"2281","latitude":191.7,"longitude":181.8},
{"id":"2282","latitude":198.5,"longitude":181.8},
{"id":"2283","latitude":205.3,"longitude":181.8},
{"id":"2284","latitude":212,"longitude":181.8},
{"id":"2285","latitude":218.8,"longitude":181.8},
{"id":"2286","latitude":246,"longitude":181.8},
{"id":"2287","latitude":252.7,"longitude":181.8},
{"id":"2288","latitude":56,"longitude":175},
{"id":"2289","latitude":69.6,"longitude":175},
{"id":"2290","latitude":83.2,"longitude":175},
{"id":"2291","latitude":90,"longitude":175},
{"id":"2292","latitude":96.7,"longitude":175},
{"id":"2293","latitude":103.5,"longitude":175},
{"id":"2294","latitude":110.3,"longitude":175},
{"id":"2295","latitude":117.1,"longitude":175},
{"id":"2296","latitude":123.9,"longitude":175},
{"id":"2297","latitude":130.7,"longitude":175},
{"id":"2298","latitude":137.4,"longitude":175},
{"id":"2299","latitude":144.2,"longitude":175},
{"id":"2300","latitude":151,"longitude":175},
{"id":"2301","latitude":157.8,"longitude":175},
{"id":"2302","latitude":164.6,"longitude":175},
{"id":"2303","latitude":171.3,"longitude":175},
{"id":"2304","latitude":178.1,"longitude":175},
{"id":"2305","latitude":184.9,"longitude":175},
{"id":"2306","latitude":191.7,"longitude":175},
{"id":"2307","latitude":198.5,"longitude":175},
{"id":"2308","latitude":205.3,"longitude":175},
{"id":"2309","latitude":212,"longitude":175},
{"id":"2310","latitude":218.8,"longitude":175},
{"id":"2311","latitude":225.6,"longitude":175},
{"id":"2312","latitude":232.4,"longitude":175},
{"id":"2313","latitude":239.2,"longitude":175},
{"id":"2314","latitude":246,"longitude":175},
{"id":"2315","latitude":252.7,"longitude":175},
{"id":"2316","latitude":49.3,"longitude":168.2},
{"id":"2317","latitude":56,"longitude":168.2},
{"id":"2318","latitude":69.6,"longitude":168.2},
{"id":"2319","latitude":83.2,"longitude":168.2},
{"id":"2320","latitude":96.7,"longitude":168.2},
{"id":"2321","latitude":103.5,"longitude":168.2},
{"id":"2322","latitude":110.3,"longitude":168.2},
{"id":"2323","latitude":117.1,"longitude":168.2},
{"id":"2324","latitude":123.9,"longitude":168.2},
{"id":"2325","latitude":130.7,"longitude":168.2},
{"id":"2326","latitude":137.4,"longitude":168.2},
{"id":"2327","latitude":144.2,"longitude":168.2},
{"id":"2328","latitude":151,"longitude":168.2},
{"id":"2329","latitude":157.8,"longitude":168.2},
{"id":"2330","latitude":164.6,"longitude":168.2},
{"id":"2331","latitude":171.3,"longitude":168.2},
{"id":"2332","latitude":178.1,"longitude":168.2},
{"id":"2333","latitude":184.9,"longitude":168.2},
{"id":"2334","latitude":191.7,"longitude":168.2},
{"id":"2335","latitude":198.5,"longitude":168.2},
{"id":"2336","latitude":205.3,"longitude":168.2},
{"id":"2337","latitude":212,"longitude":168.2},
{"id":"2338","latitude":218.8,"longitude":168.2},
{"id":"2339","latitude":225.6,"longitude":168.2},
{"id":"2340","latitude":232.4,"longitude":168.2},
{"id":"2341","latitude":239.2,"longitude":168.2},
{"id":"2342","latitude":246,"longitude":168.2},
{"id":"2343","latitude":56,"longitude":161.5},
{"id":"2344","latitude":62.8,"longitude":161.5},
{"id":"2345","latitude":69.6,"longitude":161.5},
{"id":"2346","latitude":83.2,"longitude":161.5},
{"id":"2347","latitude":90,"longitude":161.5},
{"id":"2348","latitude":96.7,"longitude":161.5},
{"id":"2349","latitude":103.5,"longitude":161.5},
{"id":"2350","latitude":110.3,"longitude":161.5},
{"id":"2351","latitude":117.1,"longitude":161.5},
{"id":"2352","latitude":123.9,"longitude":161.5},
{"id":"2353","latitude":130.7,"longitude":161.5},
{"id":"2354","latitude":137.4,"longitude":161.5},
{"id":"2355","latitude":144.2,"longitude":161.5},
{"id":"2356","latitude":151,"longitude":161.5},
{"id":"2357","latitude":157.8,"longitude":161.5},
{"id":"2358","latitude":164.6,"longitude":161.5},
{"id":"2359","latitude":171.3,"longitude":161.5},
{"id":"2360","latitude":178.1,"longitude":161.5},
{"id":"2361","latitude":184.9,"longitude":161.5},
{"id":"2362","latitude":191.7,"longitude":161.5},
{"id":"2363","latitude":198.5,"longitude":161.5},
{"id":"2364","latitude":205.3,"longitude":161.5},
{"id":"2365","latitude":212,"longitude":161.5},
{"id":"2366","latitude":218.8,"longitude":161.5},
{"id":"2367","latitude":225.6,"longitude":161.5},
{"id":"2368","latitude":232.4,"longitude":161.5},
{"id":"2369","latitude":239.2,"longitude":161.5},
{"id":"2370","latitude":246,"longitude":161.5},
{"id":"2371","latitude":69.6,"longitude":154.7},
{"id":"2372","latitude":83.2,"longitude":154.7},
{"id":"2373","latitude":90,"longitude":154.7},
{"id":"2374","latitude":96.7,"longitude":154.7},
{"id":"2375","latitude":103.5,"longitude":154.7},
{"id":"2376","latitude":110.3,"longitude":154.7},
{"id":"2377","latitude":117.1,"longitude":154.7},
{"id":"2378","latitude":123.9,"longitude":154.7},
{"id":"2379","latitude":130.7,"longitude":154.7},
{"id":"2380","latitude":137.4,"longitude":154.7},
{"id":"2381","latitude":144.2,"longitude":154.7},
{"id":"2382","latitude":151,"longitude":154.7},
{"id":"2383","latitude":157.8,"longitude":154.7},
{"id":"2384","latitude":164.6,"longitude":154.7},
{"id":"2385","latitude":171.3,"longitude":154.7},
{"id":"2386","latitude":178.1,"longitude":154.7},
{"id":"2387","latitude":184.9,"longitude":154.7},
{"id":"2388","latitude":191.7,"longitude":154.7},
{"id":"2389","latitude":198.5,"longitude":154.7},
{"id":"2390","latitude":205.3,"longitude":154.7},
{"id":"2391","latitude":212,"longitude":154.7},
{"id":"2392","latitude":218.8,"longitude":154.7},
{"id":"2393","latitude":225.6,"longitude":154.7},
{"id":"2394","latitude":232.4,"longitude":154.7},
{"id":"2395","latitude":56,"longitude":147.9},
{"id":"2396","latitude":62.8,"longitude":147.9},
{"id":"2397","latitude":69.6,"longitude":147.9},
{"id":"2398","latitude":90,"longitude":147.9},
{"id":"2399","latitude":96.7,"longitude":147.9},
{"id":"2400","latitude":110.3,"longitude":147.9},
{"id":"2401","latitude":117.1,"longitude":147.9},
{"id":"2402","latitude":123.9,"longitude":147.9},
{"id":"2403","latitude":130.7,"longitude":147.9},
{"id":"2404","latitude":137.4,"longitude":147.9},
{"id":"2405","latitude":144.2,"longitude":147.9},
{"id":"2406","latitude":151,"longitude":147.9},
{"id":"2407","latitude":157.8,"longitude":147.9},
{"id":"2408","latitude":164.6,"longitude":147.9},
{"id":"2409","latitude":171.3,"longitude":147.9},
{"id":"2410","latitude":178.1,"longitude":147.9},
{"id":"2411","latitude":184.9,"longitude":147.9},
{"id":"2412","latitude":191.7,"longitude":147.9},
{"id":"2413","latitude":198.5,"longitude":147.9},
{"id":"2414","latitude":205.3,"longitude":147.9},
{"id":"2415","latitude":212,"longitude":147.9},
{"id":"2416","latitude":218.8,"longitude":147.9},
{"id":"2417","latitude":225.6,"longitude":147.9},
{"id":"2418","latitude":232.4,"longitude":147.9},
{"id":"2419","latitude":62.8,"longitude":141.1},
{"id":"2420","latitude":69.6,"longitude":141.1},
{"id":"2421","latitude":76.4,"longitude":141.1},
{"id":"2422","latitude":90,"longitude":141.1},
{"id":"2423","latitude":96.7,"longitude":141.1},
{"id":"2424","latitude":110.3,"longitude":141.1},
{"id":"2425","latitude":117.1,"longitude":141.1},
{"id":"2426","latitude":123.9,"longitude":141.1},
{"id":"2427","latitude":130.7,"longitude":141.1},
{"id":"2428","latitude":137.4,"longitude":141.1},
{"id":"2429","latitude":144.2,"longitude":141.1},
{"id":"2430","latitude":151,"longitude":141.1},
{"id":"2431","latitude":157.8,"longitude":141.1},
{"id":"2432","latitude":164.6,"longitude":141.1},
{"id":"2433","latitude":171.3,"longitude":141.1},
{"id":"2434","latitude":178.1,"longitude":141.1},
{"id":"2435","latitude":184.9,"longitude":141.1},
{"id":"2436","latitude":191.7,"longitude":141.1},
{"id":"2437","latitude":198.5,"longitude":141.1},
{"id":"2438","latitude":205.3,"longitude":141.1},
{"id":"2439","latitude":212,"longitude":141.1},
{"id":"2440","latitude":218.8,"longitude":141.1},
{"id":"2441","latitude":225.6,"longitude":141.1},
{"id":"2442","latitude":62.8,"longitude":134.3},
{"id":"2443","latitude":69.6,"longitude":134.3},
{"id":"2444","latitude":83.2,"longitude":134.3},
{"id":"2445","latitude":90,"longitude":134.3},
{"id":"2446","latitude":96.7,"longitude":134.3},
{"id":"2447","latitude":103.5,"longitude":134.3},
{"id":"2448","latitude":110.3,"longitude":134.3},
{"id":"2449","latitude":117.1,"longitude":134.3},
{"id":"2450","latitude":123.9,"longitude":134.3},
{"id":"2451","latitude":130.7,"longitude":134.3},
{"id":"2452","latitude":137.4,"longitude":134.3},
{"id":"2453","latitude":144.2,"longitude":134.3},
{"id":"2454","latitude":151,"longitude":134.3},
{"id":"2455","latitude":157.8,"longitude":134.3},
{"id":"2456","latitude":164.6,"longitude":134.3},
{"id":"2457","latitude":171.3,"longitude":134.3},
{"id":"2458","latitude":178.1,"longitude":134.3},
{"id":"2459","latitude":184.9,"longitude":134.3},
{"id":"2460","latitude":191.7,"longitude":134.3},
{"id":"2461","latitude":198.5,"longitude":134.3},
{"id":"2462","latitude":205.3,"longitude":134.3},
{"id":"2463","latitude":212,"longitude":134.3},
{"id":"2464","latitude":62.8,"longitude":127.5},
{"id":"2465","latitude":69.6,"longitude":127.5},
{"id":"2466","latitude":83.2,"longitude":127.5},
{"id":"2467","latitude":90,"longitude":127.5},
{"id":"2468","latitude":103.5,"longitude":127.5},
{"id":"2469","latitude":110.3,"longitude":127.5},
{"id":"2470","latitude":117.1,"longitude":127.5},
{"id":"2471","latitude":123.9,"longitude":127.5},
{"id":"2472","latitude":130.7,"longitude":127.5},
{"id":"2473","latitude":137.4,"longitude":127.5},
{"id":"2474","latitude":144.2,"longitude":127.5},
{"id":"2475","latitude":151,"longitude":127.5},
{"id":"2476","latitude":157.8,"longitude":127.5},
{"id":"2477","latitude":164.6,"longitude":127.5},
{"id":"2478","latitude":171.3,"longitude":127.5},
{"id":"2479","latitude":178.1,"longitude":127.5},
{"id":"2480","latitude":184.9,"longitude":127.5},
{"id":"2481","latitude":191.7,"longitude":127.5},
{"id":"2482","latitude":198.5,"longitude":127.5},
{"id":"2483","latitude":205.3,"longitude":127.5},
{"id":"2484","latitude":69.6,"longitude":120.8},
{"id":"2485","latitude":76.4,"longitude":120.8},
{"id":"2486","latitude":83.2,"longitude":120.8},
{"id":"2487","latitude":90,"longitude":120.8},
{"id":"2488","latitude":96.7,"longitude":120.8},
{"id":"2489","latitude":103.5,"longitude":120.8},
{"id":"2490","latitude":110.3,"longitude":120.8},
{"id":"2491","latitude":117.1,"longitude":120.8},
{"id":"2492","latitude":123.9,"longitude":120.8},
{"id":"2493","latitude":130.7,"longitude":120.8},
{"id":"2494","latitude":137.4,"longitude":120.8},
{"id":"2495","latitude":144.2,"longitude":120.8},
{"id":"2496","latitude":151,"longitude":120.8},
{"id":"2497","latitude":157.8,"longitude":120.8},
{"id":"2498","latitude":164.6,"longitude":120.8},
{"id":"2499","latitude":171.3,"longitude":120.8},
{"id":"2500","latitude":178.1,"longitude":120.8},
{"id":"2501","latitude":184.9,"longitude":120.8},
{"id":"2502","latitude":191.7,"longitude":120.8},
{"id":"2503","latitude":198.5,"longitude":120.8},
{"id":"2504","latitude":83.2,"longitude":114},
{"id":"2505","latitude":90,"longitude":114},
{"id":"2506","latitude":96.7,"longitude":114},
{"id":"2507","latitude":103.5,"longitude":114},
{"id":"2508","latitude":110.3,"longitude":114},
{"id":"2509","latitude":117.1,"longitude":114},
{"id":"2510","latitude":123.9,"longitude":114},
{"id":"2511","latitude":130.7,"longitude":114},
{"id":"2512","latitude":137.4,"longitude":114},
{"id":"2513","latitude":144.2,"longitude":114},
{"id":"2514","latitude":151,"longitude":114},
{"id":"2515","latitude":157.8,"longitude":114},
{"id":"2516","latitude":164.6,"longitude":114},
{"id":"2517","latitude":96.7,"longitude":107.2},
{"id":"2518","latitude":103.5,"longitude":107.2},
{"id":"2519","latitude":110.3,"longitude":107.2},
{"id":"2520","latitude":117.1,"longitude":107.2},
{"id":"2521","latitude":123.9,"longitude":107.2},
{"id":"2522","latitude":130.7,"longitude":107.2},
{"id":"2523","latitude":137.4,"longitude":107.2},
{"id":"2524","latitude":144.2,"longitude":107.2},
{"id":"2525","latitude":151,"longitude":107.2},
{"id":"2526","latitude":157.8,"longitude":107.2},
{"id":"2527","latitude":164.6,"longitude":107.2},
{"id":"2528","latitude":96.7,"longitude":100.4},
{"id":"2529","latitude":103.5,"longitude":100.4},
{"id":"2530","latitude":110.3,"longitude":100.4},
{"id":"2531","latitude":117.1,"longitude":100.4},
{"id":"2532","latitude":123.9,"longitude":100.4},
{"id":"2533","latitude":130.7,"longitude":100.4},
{"id":"2534","latitude":137.4,"longitude":100.4},
{"id":"2535","latitude":144.2,"longitude":100.4},
{"id":"2536","latitude":151,"longitude":100.4},
{"id":"2537","latitude":103.5,"longitude":93.6},
{"id":"2538","latitude":110.3,"longitude":93.6},
{"id":"2539","latitude":117.1,"longitude":93.6},
{"id":"2540","latitude":123.9,"longitude":93.6},
{"id":"2541","latitude":130.7,"longitude":93.6},
{"id":"2542","latitude":137.4,"longitude":93.6},
{"id":"2543","latitude":144.2,"longitude":93.6},
{"id":"2544","latitude":151,"longitude":93.6},
{"id":"2545","latitude":103.5,"longitude":86.9},
{"id":"2546","latitude":110.3,"longitude":86.9},
{"id":"2547","latitude":117.1,"longitude":86.9},
{"id":"2548","latitude":123.9,"longitude":86.9},
{"id":"2549","latitude":130.7,"longitude":86.9},
{"id":"2550","latitude":137.4,"longitude":86.9},
{"id":"2551","latitude":96.7,"longitude":80.1},
{"id":"2552","latitude":103.5,"longitude":80.1},
{"id":"2553","latitude":110.3,"longitude":80.1},
{"id":"2554","latitude":117.1,"longitude":80.1},
{"id":"2555","latitude":123.9,"longitude":80.1},
{"id":"2556","latitude":130.7,"longitude":80.1},
{"id":"2557","latitude":96.7,"longitude":73.3},
{"id":"2558","latitude":103.5,"longitude":73.3},
{"id":"2559","latitude":110.3,"longitude":73.3},
{"id":"2560","latitude":117.1,"longitude":73.3},
{"id":"2561","latitude":123.9,"longitude":73.3},
{"id":"2562","latitude":130.7,"longitude":73.3},
{"id":"2563","latitude":96.7,"longitude":66.5},
{"id":"2564","latitude":103.5,"longitude":66.5},
{"id":"2565","latitude":110.3,"longitude":66.5},
{"id":"2566","latitude":117.1,"longitude":66.5},
{"id":"2567","latitude":123.9,"longitude":66.5},
{"id":"2568","latitude":130.7,"longitude":66.5},
{"id":"2569","latitude":96.7,"longitude":59.7},
{"id":"2570","latitude":103.5,"longitude":59.7},
{"id":"2571","latitude":110.3,"longitude":59.7},
{"id":"2572","latitude":117.1,"longitude":59.7},
{"id":"2573","latitude":123.9,"longitude":59.7},
{"id":"2574","latitude":130.7,"longitude":59.7},
{"id":"2575","latitude":96.7,"longitude":52.9},
{"id":"2576","latitude":103.5,"longitude":52.9},
{"id":"2577","latitude":110.3,"longitude":52.9},
{"id":"2578","latitude":117.1,"longitude":52.9},
{"id":"2579","latitude":123.9,"longitude":52.9},
{"id":"2580","latitude":130.7,"longitude":52.9},
{"id":"2581","latitude":137.4,"longitude":52.9},
{"id":"2582","latitude":90,"longitude":46.2},
{"id":"2583","latitude":96.7,"longitude":46.2},
{"id":"2584","latitude":103.5,"longitude":46.2},
{"id":"2585","latitude":110.3,"longitude":46.2},
{"id":"2586","latitude":117.1,"longitude":46.2},
{"id":"2587","latitude":123.9,"longitude":46.2},
{"id":"2588","latitude":130.7,"longitude":46.2},
{"id":"2589","latitude":137.4,"longitude":46.2},
{"id":"2590","latitude":144.2,"longitude":46.2},
{"id":"2591","latitude":90,"longitude":39.4},
{"id":"2592","latitude":96.7,"longitude":39.4},
{"id":"2593","latitude":103.5,"longitude":39.4},
{"id":"2594","latitude":110.3,"longitude":39.4},
{"id":"2595","latitude":117.1,"longitude":39.4},
{"id":"2596","latitude":123.9,"longitude":39.4},
{"id":"2597","latitude":130.7,"longitude":39.4},
{"id":"2598","latitude":137.4,"longitude":39.4},
{"id":"2599","latitude":144.2,"longitude":39.4},
{"id":"2600","latitude":96.7,"longitude":32.6},
{"id":"2601","latitude":103.5,"longitude":32.6},
{"id":"2602","latitude":110.3,"longitude":32.6},
{"id":"2603","latitude":117.1,"longitude":32.6},
{"id":"2604","latitude":123.9,"longitude":32.6},
{"id":"2605","latitude":130.7,"longitude":32.6},
{"id":"2606","latitude":137.4,"longitude":32.6},
{"id":"2607","latitude":144.2,"longitude":32.6},
{"id":"2608","latitude":151,"longitude":32.6},
{"id":"2609","latitude":103.5,"longitude":25.8},
{"id":"2610","latitude":110.3,"longitude":25.8},
{"id":"2611","latitude":117.1,"longitude":25.8},
{"id":"2612","latitude":123.9,"longitude":25.8},
{"id":"2613","latitude":130.7,"longitude":25.8},
{"id":"2614","latitude":151,"longitude":25.8},
{"id":"2615","latitude":103.5,"longitude":19},
{"id":"2616","latitude":110.3,"longitude":19},
{"id":"2617","latitude":117.1,"longitude":19},
{"id":"2618","latitude":151,"longitude":19},
{"id":"2619","latitude":157.8,"longitude":19}
];
if (isNaN(longitude) === false)
{
var id = "";
var closest_longitude;
var current_count = 0;
var previous_count = 100000000000;
for (let item in nodes_array)
{
current_count = Math.abs(longitude - nodes_array[item].longitude);
if (current_count < previous_count)
{
previous_count = current_count;
id = nodes_array[item].id;
}
}

closest_longitude = nodes_array[id].longitude;

current_count = 0;
previous_count = 100000000000;
for (let item in nodes_array)
{
if (nodes_array[item].longitude === closest_longitude)
{
current_count = Math.abs(latitude - nodes_array[item].latitude);
if (current_count < previous_count)
{
previous_count = current_count;
id = nodes_array[item].id;
}
}
}

return id;
}
else
{
return 0;
}
}



setInterval(() => {
// get an updated list of node IP addresses
var httprequest = new http.ClientRequest(DAEMON_HOSTNAME_AND_PORT_GET_NODES_LIST);
httprequest.end("");
var count = 0;
var ip_address = "";
var latitude;
var longitude;
var ip_address_count = 0;
var ip_address_total_count = 0;
nodes_list = "";

httprequest.on('response', function (response) {
  response.setEncoding('utf8');
  var result = "";
  response.on('data', chunk => result += chunk);
  response.on('end', function () {
    try
    { 
      var obj = JSON.parse(result);
      if (result == "" || result.indexOf("error") != -1)
      {
        throw("error");
      }  
      ip_address_total_count = obj.white_list.length;
      for (var item in obj.white_list)
      {
        ip_address = convert_number_to_ip_address(obj.white_list[item].ip);
        count++;
        setTimeout(getnodeitem, count*1000,ip_address);
      } 
setTimeout(function(){
nodes_list = nodes_list.substr(0,nodes_list.length);
fs.writeFileSync('/root/x-network/xcash_angularjs_blockchain_explorer/xcash_api/nodes_list.txt',nodes_list);
}, (ip_address_total_count*1000)+5000);  
    }
    catch (error)
    {
      console.log(error);
      return;
    }
  });
});
httprequest.setTimeout(HTTP_REQUEST_TIMEOUT, () => httprequest.abort());
httprequest.on('error', response => console.log("error"));
},3600000);



function getnodeitem(ip_address)
{
http.get('http://ip-api.com/json/' + ip_address + '?key=EgaxuTCLolXOfAy&fields=lat,lon', (response) => {
var result = "";
response.on('data', chunk => result += chunk);
response.on('end', function () {

    latitude = (-2.3947*JSON.parse(result).lat+287.82).toFixed(1);
    longitude = (2.2378*JSON.parse(result).lon+399.34).toFixed(1);
    nodes_list += get_node(latitude,longitude) + "|";    
});
}).on('error', response => console.log("error"));  
}



setInterval(() => {
var count = 0;
var ip_address = "";
var ip_addresses;
var latitude;
var longitude;
var ip_address_count = 0;
var ip_address_total_count = 0;
xcash_proof_of_stake_nodes_list = "";

// get an updated list of XCASH proof of stake nodes
http.get('http://website/getxcashproofofstakenodeslist', (response) => {
var result = "";
response.on('data', chunk => result += chunk);
response.on('end', function () {
try
{ 
ip_addresses = result.split("|");
ip_address_total_count = ip_addresses.length;
for (count = 0; count < ip_address_total_count; count++)
{
ip_address = convert_number_to_ip_address(ip_addresses[count]);
setTimeout(getxcashproofofstakenodeitem, count*1000,ip_address);
} 

setTimeout(function(){
xcash_proof_of_stake_nodes_list = xcash_proof_of_stake_nodes_list.substr(0,xcash_proof_of_stake_nodes_list.length);
fs.writeFileSync('/root/x-network/xcash_angularjs_blockchain_explorer/xcash_api/xcash_proof_of_stake_nodes_list_nodes_list.txt',xcash_proof_of_stake_nodes_list);
}, (ip_address_total_count*1000)+5000);  
    }
    catch (error)
    {
      console.log(error);
      return;
    }
});
}).on('error', response => console.log("error")); 
},3600000);



function getxcashproofofstakenodeitem(ip_address)
{
http.get('http://ip-api.com/json/' + ip_address + '?key=EgaxuTCLolXOfAy&fields=lat,lon', (response) => {
var result = "";
response.on('data', chunk => result += chunk);
response.on('end', function () {

    latitude = (-2.3947*JSON.parse(result).lat+287.82).toFixed(1);
    longitude = (2.2378*JSON.parse(result).lon+399.34).toFixed(1);
    xcash_proof_of_stake_nodes_list += get_node(latitude,longitude) + "|";    
});
}).on('error', response => console.log("error"));  
}



setInterval(() => {
// get market data
var httpsrequest = https.request(API_GET_MARKET_DATA, function (response) {
  response.setEncoding('utf8');
  var result = "";
  response.on('data', chunk => result += chunk);
  response.on('end', function () {
    try
    {
      var obj = JSON.parse(result)["x-cash"];
      var data = '{"price":{"btc":' + obj.btc.toFixed(8) + ',"ltc":' + obj.ltc.toFixed(8) + ',"usd":' + obj.usd.toFixed(8) + '},"market_cap":{"btc":' + obj.btc_market_cap + ',"ltc":' + obj.ltc_market_cap + ',"usd":' + obj.usd_market_cap + '},"volume":{"btc":' + obj.btc_24h_vol + ',"ltc":' + obj.ltc_24h_vol + ',"usd":' + obj.usd_24h_vol + '}}';
      fs.writeFileSync('/root/x-network/xcash_angularjs_blockchain_explorer/xcash_api/market_data.txt',data);
    }
    catch (error)
    {
      console.log(error);
      return;
    }
  });
});
httpsrequest.setTimeout(HTTP_REQUEST_TIMEOUT, () => httprequest.abort());
httpsrequest.on('error', response => console.log("error"));
httpsrequest.end();
},3600000);




setInterval(() => {
// get historical market data
var httpsrequest = https.request(API_GET_HISTORICAL_MARKET_DATA, function (response) {
  response.setEncoding('utf8');
  var result = "";
  response.on('data', chunk => result += chunk);
  response.on('end', function () {
    try
    {
var obj = JSON.parse(result);     
var data = '{"prices":{"data":[';
var total_volume = 0;
var start_time = "";
var end_time = "";
for (var count = obj.prices.length - 1, count_data = 0; count !== -1; count--, count_data++)
{
if (obj.prices.length - 1 - count_data < 30)
{
data += obj.prices[count_data][1] + ",";
}
if (obj.prices.length - 1 - count_data === 29)
{
start_time = obj.prices[count_data][0];
}
if (obj.prices.length - 1 - count_data === 0)
{
end_time = obj.prices[count_data][0];
}
}
data = data.substr(0,data.length - 1) + '],"start_time":' + start_time + ',"end_time":' + end_time + '},"market_caps":{"data":[';

for (count = obj.market_caps.length - 1, count_data = 0; count !== -1; count--, count_data++)
{
if (obj.market_caps.length - 1 - count_data < 30)
{
data += obj.market_caps[count_data][1] + ",";
}
if (obj.market_caps.length - 1 - count_data === 29)
{
start_time = obj.market_caps[count_data][0];
}
if (obj.market_caps.length - 1 - count_data === 0)
{
end_time = obj.market_caps[count_data][0];
}
}
data = data.substr(0,data.length - 1) + '],"start_time":' + start_time + ',"end_time":' + end_time + '},"volumes":{"data":[';

for (count = obj.total_volumes.length - 1, count_data = 0; count !== -1; count--, count_data++)
{
if (obj.total_volumes.length - 1 - count_data < 30)
{
data += obj.total_volumes[count_data][1] + ",";
total_volume += obj.total_volumes[count_data][1];
}
if (obj.total_volumes.length - 1 - count_data === 29)
{
start_time = obj.total_volumes[count_data][0];
}
if (obj.total_volumes.length - 1 - count_data === 0)
{
end_time = obj.total_volumes[count_data][0];
}
}
data = data.substr(0,data.length - 1) + '],"start_time":' + start_time + ',"end_time":' + end_time + ',"total":' + total_volume + '}}';
fs.writeFileSync('/root/x-network/xcash_angularjs_blockchain_explorer/xcash_api/market_historical_data.txt',data);
    }
    catch (error)
    {
      console.log(error);
      return;
    }
  });
});
httpsrequest.setTimeout(HTTP_REQUEST_TIMEOUT, () => httprequest.abort());
httpsrequest.on('error', response => console.log("error"));
httpsrequest.end();
},86400000);



/*setInterval(() => {
previousblockheight = fs.readFileSync('/root/x-network/xcash_angularjs_blockchain_explorer/xcash_api/tx_block_data_previous_block.txt') + "";
var httprequest = new http.ClientRequest(DAEMON_HOSTNAME_AND_PORT);
httprequest.end(GET_BLOCK_COUNT);

httprequest.on('response', function (response) {
  response.setEncoding('utf8');
  var result = "";
  response.on('data', chunk => result += chunk);
  response.on('end', function () {
    try
    { 
      var obj = JSON.parse(result);
      if (result == "" || result.indexOf("error") != -1)
      {
        throw("error");
      } 
      currentblockheight = obj.result.count - 1;
      if (currentblockheight !== previousblockheight)
      {
        for (; previousblockheight < currentblockheight; previousblockheight++)
        {           
          console.log("added block " + previousblockheight);
          addtransactionstodatabase(previousblockheight);
        }
        fs.writeFileSync('/root/x-network/xcash_angularjs_blockchain_explorer/xcash_api/tx_block_data_previous_block.txt',previousblockheight);
      }  
    }
    catch (error)
    {
      return;
    }
  });
});
httprequest.setTimeout(HTTP_REQUEST_TIMEOUT, () => httprequest.abort());
httprequest.on('error', response => console.log("error"));
},60000);*/




/*setInterval(() => {
previousblockheight = fs.readFileSync('tx_block_data_previous_block.txt') + "";
var httprequest = new http.ClientRequest(DAEMON_HOSTNAME_AND_PORT);
httprequest.end(GET_BLOCK_COUNT);

httprequest.on('response', function (response) {
  response.setEncoding('utf8');
  var result = "";
  response.on('data', chunk => result += chunk);
  response.on('end', function () {
    try
    { 
      var obj = JSON.parse(result);
      if (result == "" || result.indexOf("error") != -1)
      {
        throw("error");
      } 
      currentblockheight = obj.result.count - 1;
      if (currentblockheight !== previousblockheight)
      {
        for (; previousblockheight < currentblockheight; previousblockheight++)
        {           
          console.log("added block " + previousblockheight);
          addtransactionstodatabase(previousblockheight);
        }
        fs.writeFileSync('tx_block_data_previous_block.txt',previousblockheight);
      }      
    }
    catch (error)
    {console.log("no blocks added");
      return;
    }
  });
});
httprequest.setTimeout(HTTP_REQUEST_TIMEOUT, () => httprequest.abort());
httprequest.on('error', response => console.log("error"));
},60000);*/





// use this function to get the database up to date
/*previousblockheight = 0;
currentblockheight = 100;
tx_block_data_database = "";

setInterval(() => {
for (; previousblockheight < currentblockheight; previousblockheight++)
{
addtransactionstodatabase(previousblockheight);
}
previousblockheight = currentblockheight;
currentblockheight += 100;
console.log("finished block " + previousblockheight);
},5000);*/



/* use this function to get the database up to date
previousblockheight = 110500;
currentblockheight = 110501;
tx_block_data_database = "";

setInterval(() => {
for (; previousblockheight < currentblockheight; previousblockheight++)
{
addtransactionstodatabase(previousblockheight);
}
previousblockheight = currentblockheight;
currentblockheight += 1;
console.log("finished block " + previousblockheight);
},2000);*/




/*setInterval(() => {
var httprequest = new http.ClientRequest(DAEMON_HOSTNAME_AND_PORT);
httprequest.end(GET_BLOCK_COUNT);

httprequest.on('response', function (response) {
  response.setEncoding('utf8');
  var result = "";
  response.on('data', chunk => result += chunk);
  response.on('end', function () {
    try
    { 
      var obj = JSON.parse(result);
      if (result == "" || result.indexOf("error") != -1)
      {
        throw("error");
      } 
      var block_height = obj.result.count;
      var get_generated_supply = GET_GENERATED_SUPPLY;
      get_generated_supply = get_generated_supply.replace("block_height",block_height);
      var post_request = new http.ClientRequest(DAEMON_HOSTNAME_AND_PORT);
      post_request.end(get_generated_supply);
      post_request.on('response', function (response) {
        response.setEncoding('utf8');
        var result = "";
        response.on('data', chunk => result += chunk);
        response.on('end', function () {
         try
         { 
             var obj = JSON.parse(result);
             if (result == "" || result.indexOf("error") != -1)
             {
               throw("error");
             } 
             var generated_supply = Math.round(obj.result.emission_amount / WALLET_DECIMAL_PLACES_AMOUNT);
             var circulating_supply = Math.round(generated_supply - (PREMINE_TOTAL_SUPPLY - PREMINE_CIRCULATING_SUPPLY));
             fs.writeFileSync('/home/ubuntu/nodejs/generated_and_circulating_supply.txt',generated_supply + "|" + circulating_supply);
    }
    catch (error)
    {
      console.log("error getting generated supply3")
    }
  });
});
post_request.setTimeout(HTTP_REQUEST_TIMEOUT, () => post_request.abort());
post_request.on('error', response => console.log("error getting generated supply2"));
      
    }
    catch (error)
    {
      console.log("error getting generated supply1")
    }
  });
});
httprequest.setTimeout(HTTP_REQUEST_TIMEOUT, () => httprequest.abort());
httprequest.on('error', response => console.log("error getting generated supply"));
},3600000);*/



setInterval(() => {
var httprequest = new http.ClientRequest(DAEMON_HOSTNAME_AND_PORT);
httprequest.end(GET_BLOCK_COUNT);

httprequest.on('response', function (response) {
  response.setEncoding('utf8');
  var result = "";
  response.on('data', chunk => result += chunk);
  response.on('end', function () {
    try
    { 
      var obj = JSON.parse(result);
      if (result == "" || result.indexOf("error") != -1)
      {
        throw("error");
      } 
      var block_height = obj.result.count;
      var generated_supply = PREMINE_TOTAL_SUPPLY + STARTING_BLOCK_REWARD_BEFORE_PREMINE_BLOCK_REWARD;
      for (count = 2; count < block_height; count++)
      {
        generated_supply += (MAXIMUM_SUPPLY - generated_supply) / Math.pow(2,19);
      }
      generated_supply = Math.round(generated_supply);
      var circulating_supply = Math.round(generated_supply - (PREMINE_TOTAL_SUPPLY - PREMINE_CIRCULATING_SUPPLY));
      fs.writeFileSync('/root/x-network/xcash_angularjs_blockchain_explorer/xcash_api/generated_and_circulating_supply.txt',generated_supply + "|" + circulating_supply);
    }
    catch (error)
    {
      console.log("error getting generated supply")
    }
  });
});
httprequest.setTimeout(HTTP_REQUEST_TIMEOUT, () => httprequest.abort());
httprequest.on('error', response => console.log("error getting generated supply"));
},3600000);



setInterval(() => {
var httprequest = new http.ClientRequest(MININGPOOL_API);
httprequest.end("");

httprequest.on('response', function (response) {
  response.setEncoding('utf8');
  var result = "";
  response.on('data', chunk => result += chunk);
  response.on('end', function () {
    try
    { 
      var obj = JSON.parse(result);
      if (result == "" || result.indexOf("error") != -1)
      {
        throw("error");
      } 
      fs.writeFileSync('/root/x-network/xcash_angularjs_blockchain_explorer/xcash_api/chart_data.txt',JSON.stringify(obj.charts.difficulty));
    }
    catch (error)
    {
      console.log("error getting chart data")
    }
  });
});
httprequest.setTimeout(HTTP_REQUEST_TIMEOUT, () => httprequest.abort());
httprequest.on('error', response => console.log("error getting generated supply"));
},3600000);



setInterval(() => {
var btc_price;
var ltc_price;
var usd_price;
var httpsrequest = https.request(CRYPTOPIA_BTC_PRICE, function (response) {
 response.setEncoding('utf8');
  var result = "";
  response.on('data', chunk => result += chunk);
  response.on('end', function () {
    try
    { 
      var obj = JSON.parse(result);
      if (result == "" || result.indexOf("error") != -1)
      {
        throw("error");
      } 
      btc_price = obj.Data.LastPrice.toFixed(8);
      var postrequest1 = https.request(CRYPTOPIA_LTC_PRICE, function (response) {
      response.setEncoding('utf8');
      var result = "";
      response.on('data', chunk => result += chunk);
      response.on('end', function () {
      try
      { 
        var obj = JSON.parse(result);
        if (result == "" || result.indexOf("error") != -1)
        {
          throw("error");
        } 
        ltc_price = obj.Data.LastPrice.toFixed(8);
        var postrequest2 = https.request(CRYPTOPIA_LTC_USDT_PRICE, function (response) {
        response.setEncoding('utf8');
        var result = "";
        response.on('data', chunk => result += chunk);
        response.on('end', function () {
        try
        { 
          var obj = JSON.parse(result);
          if (result == "" || result.indexOf("error") != -1)
          {
            throw("error");
          } 
          usd_price = obj.Data.LastPrice * ltc_price;
          usd_price = usd_price.toFixed(8);
          fs.writeFileSync('/root/x-network/xcash_angularjs_blockchain_explorer/xcash_api/price_data.txt',btc_price + "|" + ltc_price + "|" + usd_price);
        }
        catch (error)
        {
          console.log("error getting generated supply");
          fs.writeFileSync('/root/x-network/xcash_angularjs_blockchain_explorer/xcash_api/price_data.txt',"Error");
          return;
        }
     })
  });
postrequest2.setTimeout(HTTP_REQUEST_TIMEOUT, () => postrequest2.abort());
postrequest2.on('error', response => console.log("error"));
postrequest2.end();
      }
      catch (error)
      {
        console.log("error getting generated supply");
        fs.writeFileSync('/root/x-network/xcash_angularjs_blockchain_explorer/xcash_api/price_data.txt',"Error");
        return;
      }
   })
});
postrequest1.setTimeout(HTTP_REQUEST_TIMEOUT, () => postrequest1.abort());
postrequest1.on('error', response => console.log("error"));
postrequest1.end();
    }
    catch (error)
    {
      console.log("error getting generated supply");
      fs.writeFileSync('/root/x-network/xcash_angularjs_blockchain_explorer/xcash_api/price_data.txt',"Error");
      return;
    }
  })
});
httpsrequest.setTimeout(HTTP_REQUEST_TIMEOUT, () => httpsrequest.abort());
httpsrequest.on('error', response => console.log("error"));
httpsrequest.end();
},3600000);





app.get('/getcurrentblockheight', function (req, res) {
// gets the current block height
var httprequest = new http.ClientRequest(DAEMON_HOSTNAME_AND_PORT);
httprequest.end(GET_BLOCK_COUNT);

httprequest.on('response', function (response) {
  response.setEncoding('utf8');
  var result = "";
  response.on('data', chunk => result += chunk);
  response.on('end', function () {
    try
    { 
      var obj = JSON.parse(result);
      if (result == "" || result.indexOf("error") != -1)
      {
        throw("error");
      } 
      res.json({"block_height":obj.result.count});
    }
    catch (error)
    {
      res.status(400).json(GET_BLOCK_COUNT_ERROR);
    }
  });
});
httprequest.setTimeout(HTTP_REQUEST_TIMEOUT, () => httprequest.abort());
httprequest.on('error', response => res.status(400).json(GET_BLOCK_COUNT_ERROR));
})



app.get('/getlastblockdata', function (req, res) {
// gets the last blocks data
var httprequest = new http.ClientRequest(DAEMON_HOSTNAME_AND_PORT);
httprequest.end(GET_LAST_BLOCK_DATA);

httprequest.on('response', function (response) {
  response.setEncoding('utf8');
  var result = "";
  response.on('data', chunk => result += chunk);
  response.on('end', function () {   
    try
    { 
      var obj = JSON.parse(result);
      if (result == "" || result.indexOf("error") != -1)
      {
        throw("error");
      } 
      res.json({
              "block_height":obj.result.block_header.height,
              "block_hash":obj.result.block_header.hash,
              "block_size":obj.result.block_header.block_size / 1024,
              "block_tx_amount":obj.result.block_header.num_txes,
              "block_reward":obj.result.block_header.reward / WALLET_DECIMAL_PLACES_AMOUNT,
              "block_timestamp":obj.result.block_header.timestamp,
              "block_difficulty":obj.result.block_header.difficulty
            });
    }
    catch (error)
    {
      res.status(400).json(GET_LAST_BLOCK_DATA_ERROR);
    } 
  });
});
httprequest.setTimeout(HTTP_REQUEST_TIMEOUT, () => httprequest.abort());
httprequest.on('error', response => res.status(400).json(GET_LAST_BLOCK_DATA_ERROR));
})




app.get('/getblockchaindata', function (req, res) {
// get the blockchain data
var httprequest = new http.ClientRequest(DAEMON_HOSTNAME_AND_PORT);
httprequest.end(GET_BLOCKCHAIN_DATA);

httprequest.on('response', function (response) {
  response.setEncoding('utf8');
  var result = "";
  response.on('data', chunk => result += chunk);
  response.on('end', function () {
    try
    { 
      var obj = JSON.parse(result);
      if (result == "" || result.indexOf("error") != -1)
      {
        throw("error");
      } 
      var current_blockchain_hashrate = obj.result.difficulty / 120;
      if (current_blockchain_hashrate < 1000)
      {
        current_blockchain_hashrate = parseFloat(current_blockchain_hashrate).toFixed(2) + " H/S";
      }
      else if (current_blockchain_hashrate < 1000000 && current_blockchain_hashrate > 1000)
      {
        current_blockchain_hashrate = parseFloat(current_blockchain_hashrate / 1000).toFixed(2) + " KH/S";
      }
      else if (current_blockchain_hashrate < 1000000000 && current_blockchain_hashrate > 1000000)
      {
        current_blockchain_hashrate = parseFloat(current_blockchain_hashrate / 1000000).toFixed(2) + " MH/S";
      }
      else if (current_blockchain_hashrate >= 1000000000)
      {
        current_blockchain_hashrate = parseFloat(current_blockchain_hashrate / 1000000000).toFixed(2) + " GH/S";
      }
      var generated_and_circulating_supply = fs.readFileSync("/root/x-network/xcash_angularjs_blockchain_explorer/xcash_api/generated_and_circulating_supply.txt") + "";
      generated_and_circulating_supply = generated_and_circulating_supply.split("|");
      var generated_supply = generated_and_circulating_supply[0];
      var circulating_supply = generated_and_circulating_supply[1];

      // get the current estimated blockchain size
      var currentestimatedblockchainsize;
      exec('du --block-size=1 --summarize "/root/.X-CASH" | cut -f1', function (error, result)
      {
      if (error)
      {
        currentestimatedblockchainsize = 0;
      }
      else
      {
        currentestimatedblockchainsize = result.trim();
        if (currentestimatedblockchainsize < 1000)
        {
          currentestimatedblockchainsize = parseFloat(currentestimatedblockchainsize).toFixed(2) + " B";
        }
        else if (currentestimatedblockchainsize < 1000000 && currentestimatedblockchainsize > 1000)
        {
          currentestimatedblockchainsize = parseFloat(currentestimatedblockchainsize / 1000).toFixed(2) + " KB";
        }
        else if (currentestimatedblockchainsize < 1000000000 && currentestimatedblockchainsize > 1000000)
        {
          currentestimatedblockchainsize = parseFloat(currentestimatedblockchainsize / 1000000).toFixed(2) + " MB";
        }
        else if (currentestimatedblockchainsize >= 1000000000)
        {
          currentestimatedblockchainsize = parseFloat(currentestimatedblockchainsize / 1000000000).toFixed(2) + " GB";
        } 
      }

      // get the total public and private transactions count
      var public_tx_count = 0;
      var private_tx_count = 0;
      collection = database.collection('transactions');
      collection.countDocuments({"tx_privacy_settings":"public"}, function(error, databasecount)
      {
        try
	{
	if (error)
	{
	throw("error");
	}
	}
	catch (error)
	{
	  public_tx_count = 0;
          private_tx_count = 0;
	}        
        public_tx_count = databasecount;
        private_tx_count = obj.result.tx_count - public_tx_count;

         res.json({
              "maximum_supply":MAXIMUM_SUPPLY,
              "generated_supply":parseInt(generated_supply),
              "circulating_supply":parseInt(circulating_supply),
              "maxium_block_size":parseFloat(obj.result.block_size_limit / 1024).toFixed(2) + " KB",
              "average_block_size":parseFloat(obj.result.block_size_median / 1024).toFixed(2) + " KB",
              "block_height":obj.result.height,
              "current_blockchain_difficulty":obj.result.difficulty,
              "blockchain_algorithm":BLOCKCHAIN_ALGORITHM,
              "current_blockchain_hashrate":current_blockchain_hashrate,  
              "current_estimated_blockchain_size":currentestimatedblockchainsize,          
              "total_tx":obj.result.tx_count,
              "private_tx_count":private_tx_count,
              "public_tx_count":public_tx_count,
              "total_tx_pool":obj.result.tx_pool_size,
              "blockchain_current_version":BLOCKCHAIN_CURRENT_VERSION,              
              "blockchain_current_version_block_height":BLOCKCHAIN_CURRENT_VERSION_BLOCK_HEIGHT,
              "blockchain_current_version_date":BLOCKCHAIN_CURRENT_VERSION_ESTIMATED_DATE,
              "blockchain_next_version":BLOCKCHAIN_NEXT_VERSION,              
              "blockchain_next_version_block_height":BLOCKCHAIN_NEXT_VERSION_BLOCK_HEIGHT,
              "blockchain_next_version_estimated_date":BLOCKCHAIN_NEXT_VERSION_ESTIMATED_DATE     
            }); 
        
        });     
        
      });      
    }
    catch (error)
    {
      res.status(400).json(GET_BLOCKCHAIN_DATA_ERROR);
    }
  });
});
httprequest.setTimeout(HTTP_REQUEST_TIMEOUT, () => httprequest.abort());
httprequest.on('error', response => res.status(400).json(GET_BLOCKCHAIN_DATA_ERROR));
})



app.get('/getnodeslist', function (req, res) {
try
{
var nodes_list = fs.readFileSync("/root/x-network/xcash_angularjs_blockchain_explorer/xcash_api/nodes_list.txt") + "";
if (nodes_list.substr(nodes_list.length - 1,1) === "|")
{
nodes_list = nodes_list.substring(0,nodes_list.length - 1);
}
res.json({"nodes_list":nodes_list.trim()});
}
catch (error)
{
res.status(400).send("Error:Could not get the nodes list");
}
})



app.get('/getxcashproofofstakenodeslist', function (req, res) {
try
{
var nodes_list = fs.readFileSync("/root/x-network/xcash_angularjs_blockchain_explorer/xcash_api/xcash_proof_of_stake_nodes_list_nodes_list.txt") + "";
if (nodes_list.substr(nodes_list.length - 1,1) === "|")
{
nodes_list = nodes_list.substring(0,nodes_list.length - 1);
}
res.json({"nodes_list":nodes_list.trim()});
}
catch (error)
{
res.status(400).send("Error:Could not get the nodes list");
}
})



app.get('/getmarketdata', function (req, res) {
try
{
var data = fs.readFileSync("/root/x-network/xcash_angularjs_blockchain_explorer/xcash_api/market_historical_data.txt") + "";
var obj = JSON.parse(data).volumes;
data = fs.readFileSync("/root/x-network/xcash_angularjs_blockchain_explorer/xcash_api/market_data.txt") + "";
data = data.split("}}").join("") + ',"start_time":' + obj.start_time + ',"end_time":' + obj.end_time + ',"total":' + obj.total + '}}';
res.json(JSON.parse(data));
}
catch (error)
{
res.status(400).send("Error:Could not get the market data");
}
})



app.get('/gethistoricalmarketdata', function (req, res) {
try
{
var data = fs.readFileSync("/root/x-network/xcash_angularjs_blockchain_explorer/xcash_api/market_historical_data.txt") + "";
res.json(JSON.parse(data));
}
catch (error)
{
res.status(400).send("Error:Could not get the historical market data");
}
})



app.get('/gettotalsupply', function (req, res) {
try
{
res.send(MAXIMUM_SUPPLY.toString());
}
catch (error)
{
res.status(400).send("Error:Could not get the total supply");
}
})



app.get('/getgeneratedsupply', function (req, res) {
try
{
var generated_and_circulating_supply = fs.readFileSync("/root/x-network/xcash_angularjs_blockchain_explorer/xcash_api/generated_and_circulating_supply.txt") + "";
res.send(generated_and_circulating_supply.split("|")[0]);
}
catch (error)
{
res.status(400).send("Error:Could not get the generated supply");
}
})



app.get('/getcirculatingsupply', function (req, res) {
try
{
var generated_and_circulating_supply = fs.readFileSync("/root/x-network/xcash_angularjs_blockchain_explorer/xcash_api/generated_and_circulating_supply.txt") + "";
res.send(generated_and_circulating_supply.split("|")[1]);
}
catch (error)
{
res.status(400).send("Error:Could not get the circulating supply");
}
})


app.get('/getcurrentblockheight', function (req, res) {
// get the current block height
var httprequest = new http.ClientRequest(DAEMON_HOSTNAME_AND_PORT);
httprequest.end(GET_BLOCK_COUNT);

httprequest.on('response', function (response) {
  response.setEncoding('utf8');
  var result = "";
  response.on('data', chunk => result += chunk);
  response.on('end', function () {
    try
    { 
      var obj = JSON.parse(result);
      if (result == "" || result.indexOf("error") != -1)
      {
        throw("error");
      } 
      res.json({"block_height":obj.result.count});
    }
    catch (error)
    {
      res.status(400).json(GET_BLOCK_COUNT_ERROR);
    }
  });
});
httprequest.setTimeout(HTTP_REQUEST_TIMEOUT, () => httprequest.abort());
httprequest.on('error', response => res.status(400).json(GET_BLOCK_COUNT_ERROR));
})



app.get('/getpricedata', function (req, res) {
try
{
var price_data = fs.readFileSync("/root/x-network/xcash_angularjs_blockchain_explorer/xcash_api/price_data.txt") + "";
price_data = price_data.split("|");
res.send({
"btc_price":price_data[0],
"ltc_price":price_data[1],
"usd_estimated_price":price_data[2],
});
}
catch (error)
{
res.status(400).send("Error:Could not get the price data");
}
})



app.get('/getchartdata', function (req, res) {
try
{
var chart_data = fs.readFileSync("/root/x-network/xcash_angularjs_blockchain_explorer/xcash_api/chart_data.txt") + "";
res.send(chart_data);
}
catch (error)
{
res.status(400).send("Error:Could not get the chart data");
}
})


app.get('/getlastblockstransactiondata', function (req, res) {
// get the last blocks transactions data
var get_block_transaction_data1 = GET_BLOCK_TRANSACTION_DATA;
get_block_transaction_data1 = get_block_transaction_data1.replace("get_block_transaction_data_parameter","height");
var get_block_transaction_data2 = GET_BLOCK_TRANSACTION_DATA;
get_block_transaction_data2 = get_block_transaction_data2.replace("get_block_transaction_data_parameter","height");
var get_block_transaction_data3 = GET_BLOCK_TRANSACTION_DATA;
get_block_transaction_data3 = get_block_transaction_data3.replace("get_block_transaction_data_parameter","height");
var get_block_transaction_data4 = GET_BLOCK_TRANSACTION_DATA;
get_block_transaction_data4 = get_block_transaction_data4.replace("get_block_transaction_data_parameter","height");
var get_block_transaction_data5 = GET_BLOCK_TRANSACTION_DATA;
get_block_transaction_data5 = get_block_transaction_data5.replace("get_block_transaction_data_parameter","height");
var get_block_transaction_data6 = GET_BLOCK_TRANSACTION_DATA;
get_block_transaction_data6 = get_block_transaction_data6.replace("get_block_transaction_data_parameter","height");
var get_block_transaction_data7 = GET_BLOCK_TRANSACTION_DATA;
get_block_transaction_data7 = get_block_transaction_data7.replace("get_block_transaction_data_parameter","height");
var get_block_transaction_data8 = GET_BLOCK_TRANSACTION_DATA;
get_block_transaction_data8 = get_block_transaction_data8.replace("get_block_transaction_data_parameter","height");
var get_block_transaction_data9 = GET_BLOCK_TRANSACTION_DATA;
get_block_transaction_data9 = get_block_transaction_data9.replace("get_block_transaction_data_parameter","height");
var get_block_transaction_data10 = GET_BLOCK_TRANSACTION_DATA;
get_block_transaction_data10 = get_block_transaction_data10.replace("get_block_transaction_data_parameter","height");

var post_request1;
var post_req1;
var post_request2;
var post_req2;
var post_request3;
var post_req3;
var post_request4;
var post_req4;
var post_request5;
var post_req5;
var post_request6;
var post_req6;
var post_request7;
var post_req7;
var post_request8;
var post_req8;
var post_request9;
var post_req9;
var post_request10;
var post_req10;
var current_block_height;
var getlastblockstransactiondata_block_height = "";
var getlastblockstransactiondata_block_hash = "";
var getlastblockstransactiondata_block_size = "";
var getlastblockstransactiondata_block_tx_amount = "";
var getlastblockstransactiondata_block_reward = "";
var getlastblockstransactiondata_block_timestamp = "";
var getlastblockstransactiondata_block_difficulty = "";
var getlastblockstransactiondata_block_mining_reward_tx_hash = "";
var getlastblockstransactiondata_block_tx_hashes = "";
var getlastblockstransactiondata_block_tx_ringsizes = "";
var getlastblockstransactiondata_block_tx_fees = "";
var getlastblockstransactiondata_block_tx_sizes = "";
var getlastblockstransactiondata_block_tx_paymentid_settings = "";
var getlastblockstransactiondata_block_tx_privacy_settings = "";

var httprequest = new http.ClientRequest(DAEMON_HOSTNAME_AND_PORT);
httprequest.end(GET_BLOCK_COUNT);
httprequest.on('response', function (response) {
  response.setEncoding('utf8');
  var result = "";
  response.on('data', chunk => result += chunk);
  response.on('end', function () {
    try
    { 
      var obj = JSON.parse(result);
      if (result == "" || result.indexOf("error") != -1)
      {
        throw("error");
      } 
      current_block_height = obj.result.count - 1;
      // get the current block height transaction data
      get_block_transaction_data1 = get_block_transaction_data1.replace("get_block_transaction_data_settings",current_block_height);
      post_request1 = new http.ClientRequest(DAEMON_HOSTNAME_AND_PORT);
      post_request1.end(get_block_transaction_data1);
      post_request1.on('response', function (response) {
        response.setEncoding('utf8');
        var result = "";
        response.on('data', chunk => result += chunk);
        response.on('end', function () {
         try
         { 
             var obj = JSON.parse(result);
             if (result == "" || result.indexOf("error") != -1)
             {
               throw("error");
             } 
             var block_transaction_data = JSON.parse(obj.result.json); 
             var tx_hashes = "";
             var get_transaction_data = {"txs_hashes":[],"decode_as_json":true}; 
             for (var count = 0; count < block_transaction_data.tx_hashes.length; count++)
             {
               tx_hashes += block_transaction_data.tx_hashes[count] + "|";
               get_transaction_data.txs_hashes[count] = block_transaction_data.tx_hashes[count];
             } 
             tx_hashes = tx_hashes.substr(0,tx_hashes.length - 1); 
             post_req1 = new http.ClientRequest(DAEMON_HOSTNAME_AND_PORT_GET_TRANSACTION_DATA);
             post_req1.end(JSON.stringify(get_transaction_data));
             post_req1.on('response', function (response) {
               response.setEncoding('utf8');
               var result = "";
               response.on('data', chunk => result += chunk);
               response.on('end', function () {
               try
               { 
               var tx_hash_data = JSON.parse(result);
               var tx_hash_data_results;
               if (result == "" || result.indexOf("error") != -1)
               {
                 throw("error");
               } 
               var block_tx_ringsizes = "";
               var block_tx_fees = "";
               var block_tx_sizes = "";
               var block_tx_paymentid_settings = "";
               var block_tx_privacy_settings = "";
               var tx_extra = "";
               for (count1 = 0; count1 < block_transaction_data.tx_hashes.length; count1++)
               {
                 tx_hash_data_results = JSON.parse(tx_hash_data.txs[count1].as_json);
                 tx_extra = Buffer.from(tx_hash_data_results.extra).toString("hex");
                 block_tx_ringsizes += tx_hash_data_results.vin[0].key.key_offsets.length + "|";
                 block_tx_fees += tx_hash_data_results.rct_signatures.txnFee + "|"; 
                 block_tx_sizes += (tx_hash_data.txs[count1].as_hex.length / 1024 / 2) + "|";                     
                 block_tx_paymentid_settings += tx_extra.substr(0,6) === UNENCRYPTED_PAYMENT_ID ? "unencrypted|" : tx_extra.substr(0,6) === ENCRYPTED_PAYMENT_ID ? "encrypted|" : "none|";
                 block_tx_privacy_settings += tx_extra.length >= 256 ? "public|" : "private|";               
               } 
               block_tx_ringsizes = block_tx_ringsizes.substr(0,block_tx_ringsizes.length - 1);
               block_tx_fees = block_tx_fees.substr(0,block_tx_fees.length - 1);
               block_tx_sizes = block_tx_sizes.substr(0,block_tx_sizes.length - 1);
               block_tx_paymentid_settings = block_tx_paymentid_settings.substr(0,block_tx_paymentid_settings.length - 1);
               block_tx_privacy_settings = block_tx_privacy_settings.substr(0,block_tx_privacy_settings.length - 1); 

               getlastblockstransactiondata_block_height += obj.result.block_header.height + "||";
               getlastblockstransactiondata_block_hash += obj.result.block_header.hash + "||";
               getlastblockstransactiondata_block_size += obj.result.block_header.block_size / 1024 + "||";
               getlastblockstransactiondata_block_tx_amount += obj.result.block_header.num_txes + "||";
               getlastblockstransactiondata_block_reward += obj.result.block_header.reward / WALLET_DECIMAL_PLACES_AMOUNT + "||";
               getlastblockstransactiondata_block_timestamp += obj.result.block_header.timestamp + "||";
               getlastblockstransactiondata_block_difficulty += obj.result.block_header.difficulty + "||";
               getlastblockstransactiondata_block_mining_reward_tx_hash += obj.result.miner_tx_hash + "||";
               getlastblockstransactiondata_block_tx_hashes += tx_hashes + "||";
               getlastblockstransactiondata_block_tx_ringsizes += block_tx_ringsizes + "||";
               getlastblockstransactiondata_block_tx_fees += block_tx_fees + "||";
               getlastblockstransactiondata_block_tx_sizes += block_tx_sizes + "||";
               getlastblockstransactiondata_block_tx_paymentid_settings += block_tx_paymentid_settings + "||";
               getlastblockstransactiondata_block_tx_privacy_settings += block_tx_privacy_settings + "||";




               // get the next blocks transaction data
               current_block_height--;
               // get the current block height transaction data
               get_block_transaction_data2 = get_block_transaction_data2.replace("get_block_transaction_data_settings",current_block_height);
               post_request2 = new http.ClientRequest(DAEMON_HOSTNAME_AND_PORT);
               post_request2.end(get_block_transaction_data2);
               post_request2.on('response', function (response) {
                 response.setEncoding('utf8');
                 var result = "";
                 response.on('data', chunk => result += chunk);
                 response.on('end', function () {
                  try
                  { 
                      var obj = JSON.parse(result);
                      if (result == "" || result.indexOf("error") != -1)
                      {
                        throw("error");
                      } 
                      var block_transaction_data = JSON.parse(obj.result.json); 
                      var tx_hashes = "";
                      var get_transaction_data = {"txs_hashes":[],"decode_as_json":true}; 
                      for (var count = 0; count < block_transaction_data.tx_hashes.length; count++)
                      {
                        tx_hashes += block_transaction_data.tx_hashes[count] + "|";
                        get_transaction_data.txs_hashes[count] = block_transaction_data.tx_hashes[count];
                      } 
                      tx_hashes = tx_hashes.substr(0,tx_hashes.length - 1); 
                      post_req2 = new http.ClientRequest(DAEMON_HOSTNAME_AND_PORT_GET_TRANSACTION_DATA);
                      post_req2.end(JSON.stringify(get_transaction_data));
                      post_req2.on('response', function (response) {
            	        response.setEncoding('utf8');
                        var result = "";
                        response.on('data', chunk => result += chunk);
                        response.on('end', function () {
                        try
                        { 
                            var tx_hash_data = JSON.parse(result);
                            var tx_hash_data_results;
                            if (result == "" || result.indexOf("error") != -1)
                            {
                              throw("error");
                            } 
                            var block_tx_ringsizes = "";
                            var block_tx_fees = "";
                            var block_tx_sizes = "";
                            var block_tx_paymentid_settings = "";
                            var block_tx_privacy_settings = "";
                            var tx_extra = "";
                            for (count1 = 0; count1 < block_transaction_data.tx_hashes.length; count1++)
                            {
                              tx_hash_data_results = JSON.parse(tx_hash_data.txs[count1].as_json);
                              tx_extra = Buffer.from(tx_hash_data_results.extra).toString("hex");
                              block_tx_ringsizes += tx_hash_data_results.vin[0].key.key_offsets.length + "|";
                              block_tx_fees += tx_hash_data_results.rct_signatures.txnFee + "|"; 
                              block_tx_sizes += (tx_hash_data.txs[count1].as_hex.length / 1024 / 2) + "|";    
                              block_tx_paymentid_settings += tx_extra.substr(0,6) === UNENCRYPTED_PAYMENT_ID ? "unencrypted|" : tx_extra.substr(0,6) === ENCRYPTED_PAYMENT_ID ? "encrypted|" : "none|";
                              block_tx_privacy_settings += tx_extra.length >= 256 ? "public|" : "private|";               
                            } 
                            block_tx_ringsizes = block_tx_ringsizes.substr(0,block_tx_ringsizes.length - 1);
                            block_tx_fees = block_tx_fees.substr(0,block_tx_fees.length - 1);
                            block_tx_sizes = block_tx_sizes.substr(0,block_tx_sizes.length - 1);
                            block_tx_paymentid_settings = block_tx_paymentid_settings.substr(0,block_tx_paymentid_settings.length - 1);
                            block_tx_privacy_settings = block_tx_privacy_settings.substr(0,block_tx_privacy_settings.length - 1); 

                            getlastblockstransactiondata_block_height += obj.result.block_header.height + "||";
                            getlastblockstransactiondata_block_hash += obj.result.block_header.hash + "||";
                            getlastblockstransactiondata_block_size += obj.result.block_header.block_size / 1024 + "||";
                            getlastblockstransactiondata_block_tx_amount += obj.result.block_header.num_txes + "||";
                            getlastblockstransactiondata_block_reward += obj.result.block_header.reward / WALLET_DECIMAL_PLACES_AMOUNT + "||";
                            getlastblockstransactiondata_block_timestamp += obj.result.block_header.timestamp + "||";
                            getlastblockstransactiondata_block_difficulty += obj.result.block_header.difficulty + "||";
                            getlastblockstransactiondata_block_mining_reward_tx_hash += obj.result.miner_tx_hash + "||";
                            getlastblockstransactiondata_block_tx_hashes += tx_hashes + "||";
                            getlastblockstransactiondata_block_tx_ringsizes += block_tx_ringsizes + "||";
                            getlastblockstransactiondata_block_tx_fees += block_tx_fees + "||";
                            getlastblockstransactiondata_block_tx_sizes += block_tx_sizes + "||";
                            getlastblockstransactiondata_block_tx_paymentid_settings += block_tx_paymentid_settings + "||";
                            getlastblockstransactiondata_block_tx_privacy_settings += block_tx_privacy_settings + "||";



                            // get the next blocks transaction data
                            current_block_height--;
                            // get the current block height transaction data
                            get_block_transaction_data3 = get_block_transaction_data3.replace("get_block_transaction_data_settings",current_block_height);
                            post_request3 = new http.ClientRequest(DAEMON_HOSTNAME_AND_PORT);
                            post_request3.end(get_block_transaction_data3);
                            post_request3.on('response', function (response) {
                              response.setEncoding('utf8');
                              var result = "";
                              response.on('data', chunk => result += chunk);
                              response.on('end', function () {
                               try
                               { 
                                   var obj = JSON.parse(result);
                                   if (result == "" || result.indexOf("error") != -1)
                                   {
                                     throw("error");
                                   } 
                                   var block_transaction_data = JSON.parse(obj.result.json); 
                                   var tx_hashes = "";
                                   var get_transaction_data = {"txs_hashes":[],"decode_as_json":true}; 
                                   for (var count = 0; count < block_transaction_data.tx_hashes.length; count++)
                                   {
                                     tx_hashes += block_transaction_data.tx_hashes[count] + "|";
                                     get_transaction_data.txs_hashes[count] = block_transaction_data.tx_hashes[count];
                                   } 
                                   tx_hashes = tx_hashes.substr(0,tx_hashes.length - 1); 
                                   post_req3 = new http.ClientRequest(DAEMON_HOSTNAME_AND_PORT_GET_TRANSACTION_DATA);
                                   post_req3.end(JSON.stringify(get_transaction_data));
                                   post_req3.on('response', function (response) {
            	                     response.setEncoding('utf8');
                                     var result = "";
                                     response.on('data', chunk => result += chunk);
                                     response.on('end', function () {
                                     try
                                     { 
                                         var tx_hash_data = JSON.parse(result);
                                         var tx_hash_data_results;
                                         if (result == "" || result.indexOf("error") != -1)
                                         {
                                           throw("error");
                                         } 
                                         var block_tx_ringsizes = "";
                                         var block_tx_fees = "";
                                         var block_tx_sizes = "";
                                         var block_tx_paymentid_settings = "";
                                         var block_tx_privacy_settings = "";
                                         var tx_extra = "";
                                         for (count1 = 0; count1 < block_transaction_data.tx_hashes.length; count1++)
                                         {
                                           tx_hash_data_results = JSON.parse(tx_hash_data.txs[count1].as_json);
                                           tx_extra = Buffer.from(tx_hash_data_results.extra).toString("hex");
                                           block_tx_ringsizes += tx_hash_data_results.vin[0].key.key_offsets.length + "|";
                                           block_tx_fees += tx_hash_data_results.rct_signatures.txnFee + "|"; 
                                           block_tx_sizes += (tx_hash_data.txs[count1].as_hex.length / 1024 / 2) + "|";    
                                           block_tx_paymentid_settings += tx_extra.substr(0,6) === UNENCRYPTED_PAYMENT_ID ? "unencrypted|" : tx_extra.substr(0,6) === ENCRYPTED_PAYMENT_ID ? "encrypted|" : "none|";
                                           block_tx_privacy_settings += tx_extra.length >= 256 ? "public|" : "private|";               
                                         } 
                                         block_tx_ringsizes = block_tx_ringsizes.substr(0,block_tx_ringsizes.length - 1);
                                         block_tx_fees = block_tx_fees.substr(0,block_tx_fees.length - 1);
                                         block_tx_sizes = block_tx_sizes.substr(0,block_tx_sizes.length - 1);
                                         block_tx_paymentid_settings = block_tx_paymentid_settings.substr(0,block_tx_paymentid_settings.length - 1);
                                         block_tx_privacy_settings = block_tx_privacy_settings.substr(0,block_tx_privacy_settings.length - 1); 

                                         getlastblockstransactiondata_block_height += obj.result.block_header.height + "||";
                                         getlastblockstransactiondata_block_hash += obj.result.block_header.hash + "||";
                                         getlastblockstransactiondata_block_size += obj.result.block_header.block_size / 1024 + "||";
                                         getlastblockstransactiondata_block_tx_amount += obj.result.block_header.num_txes + "||";
                                         getlastblockstransactiondata_block_reward += obj.result.block_header.reward / WALLET_DECIMAL_PLACES_AMOUNT + "||";
                                         getlastblockstransactiondata_block_timestamp += obj.result.block_header.timestamp + "||";
                                         getlastblockstransactiondata_block_difficulty += obj.result.block_header.difficulty + "||";
                                         getlastblockstransactiondata_block_mining_reward_tx_hash += obj.result.miner_tx_hash + "||";
                                         getlastblockstransactiondata_block_tx_hashes += tx_hashes + "||";
                                         getlastblockstransactiondata_block_tx_ringsizes += block_tx_ringsizes + "||";
                                         getlastblockstransactiondata_block_tx_fees += block_tx_fees + "||";
                                         getlastblockstransactiondata_block_tx_sizes += block_tx_sizes + "||";
                                         getlastblockstransactiondata_block_tx_paymentid_settings += block_tx_paymentid_settings + "||";
                                         getlastblockstransactiondata_block_tx_privacy_settings += block_tx_privacy_settings + "||";

                            // get the next blocks transaction data
                            current_block_height--;
                            // get the current block height transaction data
                            get_block_transaction_data4 = get_block_transaction_data4.replace("get_block_transaction_data_settings",current_block_height);
                            post_request4 = new http.ClientRequest(DAEMON_HOSTNAME_AND_PORT);
                            post_request4.end(get_block_transaction_data4);
                            post_request4.on('response', function (response) {
                              response.setEncoding('utf8');
                              var result = "";
                              response.on('data', chunk => result += chunk);
                              response.on('end', function () {
                               try
                               { 
                                   var obj = JSON.parse(result);
                                   if (result == "" || result.indexOf("error") != -1)
                                   {
                                     throw("error");
                                   } 
                                   var block_transaction_data = JSON.parse(obj.result.json); 
                                   var tx_hashes = "";
                                   var get_transaction_data = {"txs_hashes":[],"decode_as_json":true}; 
                                   for (var count = 0; count < block_transaction_data.tx_hashes.length; count++)
                                   {
                                     tx_hashes += block_transaction_data.tx_hashes[count] + "|";
                                     get_transaction_data.txs_hashes[count] = block_transaction_data.tx_hashes[count];
                                   } 
                                   tx_hashes = tx_hashes.substr(0,tx_hashes.length - 1); 
                                   post_req4 = new http.ClientRequest(DAEMON_HOSTNAME_AND_PORT_GET_TRANSACTION_DATA);
                                   post_req4.end(JSON.stringify(get_transaction_data));
                                   post_req4.on('response', function (response) {
            	                     response.setEncoding('utf8');
                                     var result = "";
                                     response.on('data', chunk => result += chunk);
                                     response.on('end', function () {
                                     try
                                     { 
                                         var tx_hash_data = JSON.parse(result);
                                         var tx_hash_data_results;
                                         if (result == "" || result.indexOf("error") != -1)
                                         {
                                           throw("error");
                                         } 
                                         var block_tx_ringsizes = "";
                                         var block_tx_fees = "";
                                         var block_tx_sizes = "";
                                         var block_tx_paymentid_settings = "";
                                         var block_tx_privacy_settings = "";
                                         var tx_extra = "";
                                         for (count1 = 0; count1 < block_transaction_data.tx_hashes.length; count1++)
                                         {
                                           tx_hash_data_results = JSON.parse(tx_hash_data.txs[count1].as_json);
                                           tx_extra = Buffer.from(tx_hash_data_results.extra).toString("hex");
                                           block_tx_ringsizes += tx_hash_data_results.vin[0].key.key_offsets.length + "|";
                                           block_tx_fees += tx_hash_data_results.rct_signatures.txnFee + "|"; 
                                           block_tx_sizes += (tx_hash_data.txs[count1].as_hex.length / 1024 / 2) + "|";    
                                           block_tx_paymentid_settings += tx_extra.substr(0,6) === UNENCRYPTED_PAYMENT_ID ? "unencrypted|" : tx_extra.substr(0,6) === ENCRYPTED_PAYMENT_ID ? "encrypted|" : "none|";
                                           block_tx_privacy_settings += tx_extra.length >= 256 ? "public|" : "private|";               
                                         } 
                                         block_tx_ringsizes = block_tx_ringsizes.substr(0,block_tx_ringsizes.length - 1);
                                         block_tx_fees = block_tx_fees.substr(0,block_tx_fees.length - 1);
                                         block_tx_sizes = block_tx_sizes.substr(0,block_tx_sizes.length - 1);
                                         block_tx_paymentid_settings = block_tx_paymentid_settings.substr(0,block_tx_paymentid_settings.length - 1);
                                         block_tx_privacy_settings = block_tx_privacy_settings.substr(0,block_tx_privacy_settings.length - 1); 

                                         getlastblockstransactiondata_block_height += obj.result.block_header.height + "||";
                                         getlastblockstransactiondata_block_hash += obj.result.block_header.hash + "||";
                                         getlastblockstransactiondata_block_size += obj.result.block_header.block_size / 1024 + "||";
                                         getlastblockstransactiondata_block_tx_amount += obj.result.block_header.num_txes + "||";
                                         getlastblockstransactiondata_block_reward += obj.result.block_header.reward / WALLET_DECIMAL_PLACES_AMOUNT + "||";
                                         getlastblockstransactiondata_block_timestamp += obj.result.block_header.timestamp + "||";
                                         getlastblockstransactiondata_block_difficulty += obj.result.block_header.difficulty + "||";
                                         getlastblockstransactiondata_block_mining_reward_tx_hash += obj.result.miner_tx_hash + "||";
                                         getlastblockstransactiondata_block_tx_hashes += tx_hashes + "||";
                                         getlastblockstransactiondata_block_tx_ringsizes += block_tx_ringsizes + "||";
                                         getlastblockstransactiondata_block_tx_fees += block_tx_fees + "||";
                                         getlastblockstransactiondata_block_tx_sizes += block_tx_sizes + "||";
                                         getlastblockstransactiondata_block_tx_paymentid_settings += block_tx_paymentid_settings + "||";
                                         getlastblockstransactiondata_block_tx_privacy_settings += block_tx_privacy_settings + "||";

                            // get the next blocks transaction data
                            current_block_height--;
                            // get the current block height transaction data
                            get_block_transaction_data5 = get_block_transaction_data5.replace("get_block_transaction_data_settings",current_block_height);
                            post_request5 = new http.ClientRequest(DAEMON_HOSTNAME_AND_PORT);
                            post_request5.end(get_block_transaction_data5);
                            post_request5.on('response', function (response) {
                              response.setEncoding('utf8');
                              var result = "";
                              response.on('data', chunk => result += chunk);
                              response.on('end', function () {
                               try
                               { 
                                   var obj = JSON.parse(result);
                                   if (result == "" || result.indexOf("error") != -1)
                                   {
                                     throw("error");
                                   } 
                                   var block_transaction_data = JSON.parse(obj.result.json); 
                                   var tx_hashes = "";
                                   var get_transaction_data = {"txs_hashes":[],"decode_as_json":true}; 
                                   for (var count = 0; count < block_transaction_data.tx_hashes.length; count++)
                                   {
                                     tx_hashes += block_transaction_data.tx_hashes[count] + "|";
                                     get_transaction_data.txs_hashes[count] = block_transaction_data.tx_hashes[count];
                                   } 
                                   tx_hashes = tx_hashes.substr(0,tx_hashes.length - 1); 
                                   post_req5 = new http.ClientRequest(DAEMON_HOSTNAME_AND_PORT_GET_TRANSACTION_DATA);
                                   post_req5.end(JSON.stringify(get_transaction_data));
                                   post_req5.on('response', function (response) {
            	                     response.setEncoding('utf8');
                                     var result = "";
                                     response.on('data', chunk => result += chunk);
                                     response.on('end', function () {
                                     try
                                     { 
                                         var tx_hash_data = JSON.parse(result);
                                         var tx_hash_data_results;
                                         if (result == "" || result.indexOf("error") != -1)
                                         {
                                           throw("error");
                                         } 
                                         var block_tx_ringsizes = "";
                                         var block_tx_fees = "";
                                         var block_tx_sizes = "";
                                         var block_tx_paymentid_settings = "";
                                         var block_tx_privacy_settings = "";
                                         var tx_extra = "";
                                         for (count1 = 0; count1 < block_transaction_data.tx_hashes.length; count1++)
                                         {
                                           tx_hash_data_results = JSON.parse(tx_hash_data.txs[count1].as_json);
                                           tx_extra = Buffer.from(tx_hash_data_results.extra).toString("hex");
                                           block_tx_ringsizes += tx_hash_data_results.vin[0].key.key_offsets.length + "|";
                                           block_tx_fees += tx_hash_data_results.rct_signatures.txnFee + "|"; 
                                           block_tx_sizes += (tx_hash_data.txs[count1].as_hex.length / 1024 / 2) + "|";    
                                           block_tx_paymentid_settings += tx_extra.substr(0,6) === UNENCRYPTED_PAYMENT_ID ? "unencrypted|" : tx_extra.substr(0,6) === ENCRYPTED_PAYMENT_ID ? "encrypted|" : "none|";
                                           block_tx_privacy_settings += tx_extra.length >= 256 ? "public|" : "private|";               
                                         } 
                                         block_tx_ringsizes = block_tx_ringsizes.substr(0,block_tx_ringsizes.length - 1);
                                         block_tx_fees = block_tx_fees.substr(0,block_tx_fees.length - 1);
                                         block_tx_sizes = block_tx_sizes.substr(0,block_tx_sizes.length - 1);
                                         block_tx_paymentid_settings = block_tx_paymentid_settings.substr(0,block_tx_paymentid_settings.length - 1);
                                         block_tx_privacy_settings = block_tx_privacy_settings.substr(0,block_tx_privacy_settings.length - 1); 

                                         getlastblockstransactiondata_block_height += obj.result.block_header.height + "||";
                                         getlastblockstransactiondata_block_hash += obj.result.block_header.hash + "||";
                                         getlastblockstransactiondata_block_size += obj.result.block_header.block_size / 1024 + "||";
                                         getlastblockstransactiondata_block_tx_amount += obj.result.block_header.num_txes + "||";
                                         getlastblockstransactiondata_block_reward += obj.result.block_header.reward / WALLET_DECIMAL_PLACES_AMOUNT + "||";
                                         getlastblockstransactiondata_block_timestamp += obj.result.block_header.timestamp + "||";
                                         getlastblockstransactiondata_block_difficulty += obj.result.block_header.difficulty + "||";
                                         getlastblockstransactiondata_block_mining_reward_tx_hash += obj.result.miner_tx_hash + "||";
                                         getlastblockstransactiondata_block_tx_hashes += tx_hashes + "||";
                                         getlastblockstransactiondata_block_tx_ringsizes += block_tx_ringsizes + "||";
                                         getlastblockstransactiondata_block_tx_fees += block_tx_fees + "||";
                                         getlastblockstransactiondata_block_tx_sizes += block_tx_sizes + "||";
                                         getlastblockstransactiondata_block_tx_paymentid_settings += block_tx_paymentid_settings + "||";
                                         getlastblockstransactiondata_block_tx_privacy_settings += block_tx_privacy_settings + "||";

                            // get the next blocks transaction data
                            current_block_height--;
                            // get the current block height transaction data
                            get_block_transaction_data6 = get_block_transaction_data6.replace("get_block_transaction_data_settings",current_block_height);
                            post_request6 = new http.ClientRequest(DAEMON_HOSTNAME_AND_PORT);
                            post_request6.end(get_block_transaction_data6);
                            post_request6.on('response', function (response) {
                              response.setEncoding('utf8');
                              var result = "";
                              response.on('data', chunk => result += chunk);
                              response.on('end', function () {
                               try
                               { 
                                   var obj = JSON.parse(result);
                                   if (result == "" || result.indexOf("error") != -1)
                                   {
                                     throw("error");
                                   } 
                                   var block_transaction_data = JSON.parse(obj.result.json); 
                                   var tx_hashes = "";
                                   var get_transaction_data = {"txs_hashes":[],"decode_as_json":true}; 
                                   for (var count = 0; count < block_transaction_data.tx_hashes.length; count++)
                                   {
                                     tx_hashes += block_transaction_data.tx_hashes[count] + "|";
                                     get_transaction_data.txs_hashes[count] = block_transaction_data.tx_hashes[count];
                                   } 
                                   tx_hashes = tx_hashes.substr(0,tx_hashes.length - 1); 
                                   post_req6 = new http.ClientRequest(DAEMON_HOSTNAME_AND_PORT_GET_TRANSACTION_DATA);
                                   post_req6.end(JSON.stringify(get_transaction_data));
                                   post_req6.on('response', function (response) {
            	                     response.setEncoding('utf8');
                                     var result = "";
                                     response.on('data', chunk => result += chunk);
                                     response.on('end', function () {
                                     try
                                     { 
                                         var tx_hash_data = JSON.parse(result);
                                         var tx_hash_data_results;
                                         if (result == "" || result.indexOf("error") != -1)
                                         {
                                           throw("error");
                                         } 
                                         var block_tx_ringsizes = "";
                                         var block_tx_fees = "";
                                         var block_tx_sizes = "";
                                         var block_tx_paymentid_settings = "";
                                         var block_tx_privacy_settings = "";
                                         var tx_extra = "";
                                         for (count1 = 0; count1 < block_transaction_data.tx_hashes.length; count1++)
                                         {
                                           tx_hash_data_results = JSON.parse(tx_hash_data.txs[count1].as_json);
                                           tx_extra = Buffer.from(tx_hash_data_results.extra).toString("hex");
                                           block_tx_ringsizes += tx_hash_data_results.vin[0].key.key_offsets.length + "|";
                                           block_tx_fees += tx_hash_data_results.rct_signatures.txnFee + "|"; 
                                           block_tx_sizes += (tx_hash_data.txs[count1].as_hex.length / 1024 / 2) + "|";    
                                           block_tx_paymentid_settings += tx_extra.substr(0,6) === UNENCRYPTED_PAYMENT_ID ? "unencrypted|" : tx_extra.substr(0,6) === ENCRYPTED_PAYMENT_ID ? "encrypted|" : "none|";
                                           block_tx_privacy_settings += tx_extra.length >= 256 ? "public|" : "private|";               
                                         } 
                                         block_tx_ringsizes = block_tx_ringsizes.substr(0,block_tx_ringsizes.length - 1);
                                         block_tx_fees = block_tx_fees.substr(0,block_tx_fees.length - 1);
                                         block_tx_sizes = block_tx_sizes.substr(0,block_tx_sizes.length - 1);
                                         block_tx_paymentid_settings = block_tx_paymentid_settings.substr(0,block_tx_paymentid_settings.length - 1);
                                         block_tx_privacy_settings = block_tx_privacy_settings.substr(0,block_tx_privacy_settings.length - 1); 

                                         getlastblockstransactiondata_block_height += obj.result.block_header.height + "||";
                                         getlastblockstransactiondata_block_hash += obj.result.block_header.hash + "||";
                                         getlastblockstransactiondata_block_size += obj.result.block_header.block_size / 1024 + "||";
                                         getlastblockstransactiondata_block_tx_amount += obj.result.block_header.num_txes + "||";
                                         getlastblockstransactiondata_block_reward += obj.result.block_header.reward / WALLET_DECIMAL_PLACES_AMOUNT + "||";
                                         getlastblockstransactiondata_block_timestamp += obj.result.block_header.timestamp + "||";
                                         getlastblockstransactiondata_block_difficulty += obj.result.block_header.difficulty + "||";
                                         getlastblockstransactiondata_block_mining_reward_tx_hash += obj.result.miner_tx_hash + "||";
                                         getlastblockstransactiondata_block_tx_hashes += tx_hashes + "||";
                                         getlastblockstransactiondata_block_tx_ringsizes += block_tx_ringsizes + "||";
                                         getlastblockstransactiondata_block_tx_fees += block_tx_fees + "||";
                                         getlastblockstransactiondata_block_tx_sizes += block_tx_sizes + "||";
                                         getlastblockstransactiondata_block_tx_paymentid_settings += block_tx_paymentid_settings + "||";
                                         getlastblockstransactiondata_block_tx_privacy_settings += block_tx_privacy_settings + "||";

                            // get the next blocks transaction data
                            current_block_height--;
                            // get the current block height transaction data
                            get_block_transaction_data7 = get_block_transaction_data7.replace("get_block_transaction_data_settings",current_block_height);
                            post_request7 = new http.ClientRequest(DAEMON_HOSTNAME_AND_PORT);
                            post_request7.end(get_block_transaction_data7);
                            post_request7.on('response', function (response) {
                              response.setEncoding('utf8');
                              var result = "";
                              response.on('data', chunk => result += chunk);
                              response.on('end', function () {
                               try
                               { 
                                   var obj = JSON.parse(result);
                                   if (result == "" || result.indexOf("error") != -1)
                                   {
                                     throw("error");
                                   } 
                                   var block_transaction_data = JSON.parse(obj.result.json); 
                                   var tx_hashes = "";
                                   var get_transaction_data = {"txs_hashes":[],"decode_as_json":true}; 
                                   for (var count = 0; count < block_transaction_data.tx_hashes.length; count++)
                                   {
                                     tx_hashes += block_transaction_data.tx_hashes[count] + "|";
                                     get_transaction_data.txs_hashes[count] = block_transaction_data.tx_hashes[count];
                                   } 
                                   tx_hashes = tx_hashes.substr(0,tx_hashes.length - 1); 
                                   post_req7 = new http.ClientRequest(DAEMON_HOSTNAME_AND_PORT_GET_TRANSACTION_DATA);
                                   post_req7.end(JSON.stringify(get_transaction_data));
                                   post_req7.on('response', function (response) {
            	                     response.setEncoding('utf8');
                                     var result = "";
                                     response.on('data', chunk => result += chunk);
                                     response.on('end', function () {
                                     try
                                     { 
                                         var tx_hash_data = JSON.parse(result);
                                         var tx_hash_data_results;
                                         if (result == "" || result.indexOf("error") != -1)
                                         {
                                           throw("error");
                                         } 
                                         var block_tx_ringsizes = "";
                                         var block_tx_fees = "";
                                         var block_tx_sizes = "";
                                         var block_tx_paymentid_settings = "";
                                         var block_tx_privacy_settings = "";
                                         var tx_extra = "";
                                         for (count1 = 0; count1 < block_transaction_data.tx_hashes.length; count1++)
                                         {
                                           tx_hash_data_results = JSON.parse(tx_hash_data.txs[count1].as_json);
                                           tx_extra = Buffer.from(tx_hash_data_results.extra).toString("hex");
                                           block_tx_ringsizes += tx_hash_data_results.vin[0].key.key_offsets.length + "|";
                                           block_tx_fees += tx_hash_data_results.rct_signatures.txnFee + "|"; 
                                           block_tx_sizes += (tx_hash_data.txs[count1].as_hex.length / 1024 / 2) + "|";    
                                           block_tx_paymentid_settings += tx_extra.substr(0,6) === UNENCRYPTED_PAYMENT_ID ? "unencrypted|" : tx_extra.substr(0,6) === ENCRYPTED_PAYMENT_ID ? "encrypted|" : "none|";
                                           block_tx_privacy_settings += tx_extra.length >= 256 ? "public|" : "private|";               
                                         } 
                                         block_tx_ringsizes = block_tx_ringsizes.substr(0,block_tx_ringsizes.length - 1);
                                         block_tx_fees = block_tx_fees.substr(0,block_tx_fees.length - 1);
                                         block_tx_sizes = block_tx_sizes.substr(0,block_tx_sizes.length - 1);
                                         block_tx_paymentid_settings = block_tx_paymentid_settings.substr(0,block_tx_paymentid_settings.length - 1);
                                         block_tx_privacy_settings = block_tx_privacy_settings.substr(0,block_tx_privacy_settings.length - 1); 

                                         getlastblockstransactiondata_block_height += obj.result.block_header.height + "||";
                                         getlastblockstransactiondata_block_hash += obj.result.block_header.hash + "||";
                                         getlastblockstransactiondata_block_size += obj.result.block_header.block_size / 1024 + "||";
                                         getlastblockstransactiondata_block_tx_amount += obj.result.block_header.num_txes + "||";
                                         getlastblockstransactiondata_block_reward += obj.result.block_header.reward / WALLET_DECIMAL_PLACES_AMOUNT + "||";
                                         getlastblockstransactiondata_block_timestamp += obj.result.block_header.timestamp + "||";
                                         getlastblockstransactiondata_block_difficulty += obj.result.block_header.difficulty + "||";
                                         getlastblockstransactiondata_block_mining_reward_tx_hash += obj.result.miner_tx_hash + "||";
                                         getlastblockstransactiondata_block_tx_hashes += tx_hashes + "||";
                                         getlastblockstransactiondata_block_tx_ringsizes += block_tx_ringsizes + "||";
                                         getlastblockstransactiondata_block_tx_fees += block_tx_fees + "||";
                                         getlastblockstransactiondata_block_tx_sizes += block_tx_sizes + "||";
                                         getlastblockstransactiondata_block_tx_paymentid_settings += block_tx_paymentid_settings + "||";
                                         getlastblockstransactiondata_block_tx_privacy_settings += block_tx_privacy_settings + "||";

                            // get the next blocks transaction data
                            current_block_height--;
                            // get the current block height transaction data
                            get_block_transaction_data8 = get_block_transaction_data8.replace("get_block_transaction_data_settings",current_block_height);
                            post_request8 = new http.ClientRequest(DAEMON_HOSTNAME_AND_PORT);
                            post_request8.end(get_block_transaction_data8);
                            post_request8.on('response', function (response) {
                              response.setEncoding('utf8');
                              var result = "";
                              response.on('data', chunk => result += chunk);
                              response.on('end', function () {
                               try
                               { 
                                   var obj = JSON.parse(result);
                                   if (result == "" || result.indexOf("error") != -1)
                                   {
                                     throw("error");
                                   } 
                                   var block_transaction_data = JSON.parse(obj.result.json); 
                                   var tx_hashes = "";
                                   var get_transaction_data = {"txs_hashes":[],"decode_as_json":true}; 
                                   for (var count = 0; count < block_transaction_data.tx_hashes.length; count++)
                                   {
                                     tx_hashes += block_transaction_data.tx_hashes[count] + "|";
                                     get_transaction_data.txs_hashes[count] = block_transaction_data.tx_hashes[count];
                                   } 
                                   tx_hashes = tx_hashes.substr(0,tx_hashes.length - 1); 
                                   post_req8 = new http.ClientRequest(DAEMON_HOSTNAME_AND_PORT_GET_TRANSACTION_DATA);
                                   post_req8.end(JSON.stringify(get_transaction_data));
                                   post_req8.on('response', function (response) {
            	                     response.setEncoding('utf8');
                                     var result = "";
                                     response.on('data', chunk => result += chunk);
                                     response.on('end', function () {
                                     try
                                     { 
                                         var tx_hash_data = JSON.parse(result);
                                         var tx_hash_data_results;
                                         if (result == "" || result.indexOf("error") != -1)
                                         {
                                           throw("error");
                                         } 
                                         var block_tx_ringsizes = "";
                                         var block_tx_fees = "";
                                         var block_tx_sizes = "";
                                         var block_tx_paymentid_settings = "";
                                         var block_tx_privacy_settings = "";
                                         var tx_extra = "";
                                         for (count1 = 0; count1 < block_transaction_data.tx_hashes.length; count1++)
                                         {
                                           tx_hash_data_results = JSON.parse(tx_hash_data.txs[count1].as_json);
                                           tx_extra = Buffer.from(tx_hash_data_results.extra).toString("hex");
                                           block_tx_ringsizes += tx_hash_data_results.vin[0].key.key_offsets.length + "|";
                                           block_tx_fees += tx_hash_data_results.rct_signatures.txnFee + "|"; 
                                           block_tx_sizes += (tx_hash_data.txs[count1].as_hex.length / 1024 / 2) + "|";    
                                           block_tx_paymentid_settings += tx_extra.substr(0,6) === UNENCRYPTED_PAYMENT_ID ? "unencrypted|" : tx_extra.substr(0,6) === ENCRYPTED_PAYMENT_ID ? "encrypted|" : "none|";
                                           block_tx_privacy_settings += tx_extra.length >= 256 ? "public|" : "private|";               
                                         } 
                                         block_tx_ringsizes = block_tx_ringsizes.substr(0,block_tx_ringsizes.length - 1);
                                         block_tx_fees = block_tx_fees.substr(0,block_tx_fees.length - 1);
                                         block_tx_sizes = block_tx_sizes.substr(0,block_tx_sizes.length - 1);
                                         block_tx_paymentid_settings = block_tx_paymentid_settings.substr(0,block_tx_paymentid_settings.length - 1);
                                         block_tx_privacy_settings = block_tx_privacy_settings.substr(0,block_tx_privacy_settings.length - 1); 

                                         getlastblockstransactiondata_block_height += obj.result.block_header.height + "||";
                                         getlastblockstransactiondata_block_hash += obj.result.block_header.hash + "||";
                                         getlastblockstransactiondata_block_size += obj.result.block_header.block_size / 1024 + "||";
                                         getlastblockstransactiondata_block_tx_amount += obj.result.block_header.num_txes + "||";
                                         getlastblockstransactiondata_block_reward += obj.result.block_header.reward / WALLET_DECIMAL_PLACES_AMOUNT + "||";
                                         getlastblockstransactiondata_block_timestamp += obj.result.block_header.timestamp + "||";
                                         getlastblockstransactiondata_block_difficulty += obj.result.block_header.difficulty + "||";
                                         getlastblockstransactiondata_block_mining_reward_tx_hash += obj.result.miner_tx_hash + "||";
                                         getlastblockstransactiondata_block_tx_hashes += tx_hashes + "||";
                                         getlastblockstransactiondata_block_tx_ringsizes += block_tx_ringsizes + "||";
                                         getlastblockstransactiondata_block_tx_fees += block_tx_fees + "||";
                                         getlastblockstransactiondata_block_tx_sizes += block_tx_sizes + "||";
                                         getlastblockstransactiondata_block_tx_paymentid_settings += block_tx_paymentid_settings + "||";
                                         getlastblockstransactiondata_block_tx_privacy_settings += block_tx_privacy_settings + "||";

                            // get the next blocks transaction data
                            current_block_height--;
                            // get the current block height transaction data
                            get_block_transaction_data9 = get_block_transaction_data9.replace("get_block_transaction_data_settings",current_block_height);
                            post_request9 = new http.ClientRequest(DAEMON_HOSTNAME_AND_PORT);
                            post_request9.end(get_block_transaction_data9);
                            post_request9.on('response', function (response) {
                              response.setEncoding('utf8');
                              var result = "";
                              response.on('data', chunk => result += chunk);
                              response.on('end', function () {
                               try
                               { 
                                   var obj = JSON.parse(result);
                                   if (result == "" || result.indexOf("error") != -1)
                                   {
                                     throw("error");
                                   } 
                                   var block_transaction_data = JSON.parse(obj.result.json); 
                                   var tx_hashes = "";
                                   var get_transaction_data = {"txs_hashes":[],"decode_as_json":true}; 
                                   for (var count = 0; count < block_transaction_data.tx_hashes.length; count++)
                                   {
                                     tx_hashes += block_transaction_data.tx_hashes[count] + "|";
                                     get_transaction_data.txs_hashes[count] = block_transaction_data.tx_hashes[count];
                                   } 
                                   tx_hashes = tx_hashes.substr(0,tx_hashes.length - 1); 
                                   post_req9 = new http.ClientRequest(DAEMON_HOSTNAME_AND_PORT_GET_TRANSACTION_DATA);
                                   post_req9.end(JSON.stringify(get_transaction_data));
                                   post_req9.on('response', function (response) {
            	                     response.setEncoding('utf8');
                                     var result = "";
                                     response.on('data', chunk => result += chunk);
                                     response.on('end', function () {
                                     try
                                     { 
                                         var tx_hash_data = JSON.parse(result);
                                         var tx_hash_data_results;
                                         if (result == "" || result.indexOf("error") != -1)
                                         {
                                           throw("error");
                                         } 
                                         var block_tx_ringsizes = "";
                                         var block_tx_fees = "";
                                         var block_tx_sizes = "";
                                         var block_tx_paymentid_settings = "";
                                         var block_tx_privacy_settings = "";
                                         var tx_extra = "";
                                         for (count1 = 0; count1 < block_transaction_data.tx_hashes.length; count1++)
                                         {
                                           tx_hash_data_results = JSON.parse(tx_hash_data.txs[count1].as_json);
                                           tx_extra = Buffer.from(tx_hash_data_results.extra).toString("hex");
                                           block_tx_ringsizes += tx_hash_data_results.vin[0].key.key_offsets.length + "|";
                                           block_tx_fees += tx_hash_data_results.rct_signatures.txnFee + "|"; 
                                           block_tx_sizes += (tx_hash_data.txs[count1].as_hex.length / 1024 / 2) + "|";    
                                           block_tx_paymentid_settings += tx_extra.substr(0,6) === UNENCRYPTED_PAYMENT_ID ? "unencrypted|" : tx_extra.substr(0,6) === ENCRYPTED_PAYMENT_ID ? "encrypted|" : "none|";
                                           block_tx_privacy_settings += tx_extra.length >= 256 ? "public|" : "private|";               
                                         } 
                                         block_tx_ringsizes = block_tx_ringsizes.substr(0,block_tx_ringsizes.length - 1);
                                         block_tx_fees = block_tx_fees.substr(0,block_tx_fees.length - 1);
                                         block_tx_sizes = block_tx_sizes.substr(0,block_tx_sizes.length - 1);
                                         block_tx_paymentid_settings = block_tx_paymentid_settings.substr(0,block_tx_paymentid_settings.length - 1);
                                         block_tx_privacy_settings = block_tx_privacy_settings.substr(0,block_tx_privacy_settings.length - 1); 

                                         getlastblockstransactiondata_block_height += obj.result.block_header.height + "||";
                                         getlastblockstransactiondata_block_hash += obj.result.block_header.hash + "||";
                                         getlastblockstransactiondata_block_size += obj.result.block_header.block_size / 1024 + "||";
                                         getlastblockstransactiondata_block_tx_amount += obj.result.block_header.num_txes + "||";
                                         getlastblockstransactiondata_block_reward += obj.result.block_header.reward / WALLET_DECIMAL_PLACES_AMOUNT + "||";
                                         getlastblockstransactiondata_block_timestamp += obj.result.block_header.timestamp + "||";
                                         getlastblockstransactiondata_block_difficulty += obj.result.block_header.difficulty + "||";
                                         getlastblockstransactiondata_block_mining_reward_tx_hash += obj.result.miner_tx_hash + "||";
                                         getlastblockstransactiondata_block_tx_hashes += tx_hashes + "||";
                                         getlastblockstransactiondata_block_tx_ringsizes += block_tx_ringsizes + "||";
                                         getlastblockstransactiondata_block_tx_fees += block_tx_fees + "||";
                                         getlastblockstransactiondata_block_tx_sizes += block_tx_sizes + "||";
                                         getlastblockstransactiondata_block_tx_paymentid_settings += block_tx_paymentid_settings + "||";
                                         getlastblockstransactiondata_block_tx_privacy_settings += block_tx_privacy_settings + "||";

                            // get the next blocks transaction data
                            current_block_height--;
                            // get the current block height transaction data
                            get_block_transaction_data10 = get_block_transaction_data10.replace("get_block_transaction_data_settings",current_block_height);
                            post_request10 = new http.ClientRequest(DAEMON_HOSTNAME_AND_PORT);
                            post_request10.end(get_block_transaction_data10);
                            post_request10.on('response', function (response) {
                              response.setEncoding('utf8');
                              var result = "";
                              response.on('data', chunk => result += chunk);
                              response.on('end', function () {
                               try
                               { 
                                   var obj = JSON.parse(result);
                                   if (result == "" || result.indexOf("error") != -1)
                                   {
                                     throw("error");
                                   } 
                                   var block_transaction_data = JSON.parse(obj.result.json); 
                                   var tx_hashes = "";
                                   var get_transaction_data = {"txs_hashes":[],"decode_as_json":true}; 
                                   for (var count = 0; count < block_transaction_data.tx_hashes.length; count++)
                                   {
                                     tx_hashes += block_transaction_data.tx_hashes[count] + "|";
                                     get_transaction_data.txs_hashes[count] = block_transaction_data.tx_hashes[count];
                                   } 
                                   tx_hashes = tx_hashes.substr(0,tx_hashes.length - 1); 
                                   post_req10 = new http.ClientRequest(DAEMON_HOSTNAME_AND_PORT_GET_TRANSACTION_DATA);
                                   post_req10.end(JSON.stringify(get_transaction_data));
                                   post_req10.on('response', function (response) {
            	                     response.setEncoding('utf8');
                                     var result = "";
                                     response.on('data', chunk => result += chunk);
                                     response.on('end', function () {
                                     try
                                     { 
                                         var tx_hash_data = JSON.parse(result);
                                         var tx_hash_data_results;
                                         if (result == "" || result.indexOf("error") != -1)
                                         {
                                           throw("error");
                                         } 
                                         var block_tx_ringsizes = "";
                                         var block_tx_fees = "";
                                         var block_tx_sizes = "";
                                         var block_tx_paymentid_settings = "";
                                         var block_tx_privacy_settings = "";
                                         var tx_extra = "";
                                         for (count1 = 0; count1 < block_transaction_data.tx_hashes.length; count1++)
                                         {
                                           tx_hash_data_results = JSON.parse(tx_hash_data.txs[count1].as_json);
                                           tx_extra = Buffer.from(tx_hash_data_results.extra).toString("hex");
                                           block_tx_ringsizes += tx_hash_data_results.vin[0].key.key_offsets.length + "|";
                                           block_tx_fees += tx_hash_data_results.rct_signatures.txnFee + "|"; 
                                           block_tx_sizes += (tx_hash_data.txs[count1].as_hex.length / 1024 / 2) + "|";    
                                           block_tx_paymentid_settings += tx_extra.substr(0,6) === UNENCRYPTED_PAYMENT_ID ? "unencrypted|" : tx_extra.substr(0,6) === ENCRYPTED_PAYMENT_ID ? "encrypted|" : "none|";
                                           block_tx_privacy_settings += tx_extra.length >= 256 ? "public|" : "private|";               
                                         } 
                                         block_tx_ringsizes = block_tx_ringsizes.substr(0,block_tx_ringsizes.length - 1);
                                         block_tx_fees = block_tx_fees.substr(0,block_tx_fees.length - 1);
                                         block_tx_sizes = block_tx_sizes.substr(0,block_tx_sizes.length - 1);
                                         block_tx_paymentid_settings = block_tx_paymentid_settings.substr(0,block_tx_paymentid_settings.length - 1);
                                         block_tx_privacy_settings = block_tx_privacy_settings.substr(0,block_tx_privacy_settings.length - 1); 

                                         getlastblockstransactiondata_block_height += obj.result.block_header.height + "||";
                                         getlastblockstransactiondata_block_hash += obj.result.block_header.hash + "||";
                                         getlastblockstransactiondata_block_size += obj.result.block_header.block_size / 1024 + "||";
                                         getlastblockstransactiondata_block_tx_amount += obj.result.block_header.num_txes + "||";
                                         getlastblockstransactiondata_block_reward += obj.result.block_header.reward / WALLET_DECIMAL_PLACES_AMOUNT + "||";
                                         getlastblockstransactiondata_block_timestamp += obj.result.block_header.timestamp + "||";
                                         getlastblockstransactiondata_block_difficulty += obj.result.block_header.difficulty + "||";
                                         getlastblockstransactiondata_block_mining_reward_tx_hash += obj.result.miner_tx_hash + "||";
                                         getlastblockstransactiondata_block_tx_hashes += tx_hashes + "||";
                                         getlastblockstransactiondata_block_tx_ringsizes += block_tx_ringsizes + "||";
                                         getlastblockstransactiondata_block_tx_fees += block_tx_fees + "||";
                                         getlastblockstransactiondata_block_tx_sizes += block_tx_sizes + "||";
                                         getlastblockstransactiondata_block_tx_paymentid_settings += block_tx_paymentid_settings + "||";
                                         getlastblockstransactiondata_block_tx_privacy_settings += block_tx_privacy_settings + "||";  

                                         getlastblockstransactiondata_block_height = getlastblockstransactiondata_block_height.substr(0,getlastblockstransactiondata_block_height.length - 2);  
                                         getlastblockstransactiondata_block_hash = getlastblockstransactiondata_block_hash.substr(0,getlastblockstransactiondata_block_hash.length - 2); 
                                         getlastblockstransactiondata_block_size = getlastblockstransactiondata_block_size.substr(0,getlastblockstransactiondata_block_size.length - 2); 
                                         getlastblockstransactiondata_block_tx_amount = getlastblockstransactiondata_block_tx_amount.substr(0,getlastblockstransactiondata_block_tx_amount.length - 2); 
                                         getlastblockstransactiondata_block_reward = getlastblockstransactiondata_block_reward.substr(0,getlastblockstransactiondata_block_reward.length - 2); 
                                         getlastblockstransactiondata_block_timestamp = getlastblockstransactiondata_block_timestamp.substr(0,getlastblockstransactiondata_block_timestamp.length - 2); 
                                         getlastblockstransactiondata_block_difficulty = getlastblockstransactiondata_block_difficulty.substr(0,getlastblockstransactiondata_block_difficulty.length - 2); 
                                         getlastblockstransactiondata_block_mining_reward_tx_hash = getlastblockstransactiondata_block_mining_reward_tx_hash.substr(0,getlastblockstransactiondata_block_mining_reward_tx_hash.length - 2); 
                                         getlastblockstransactiondata_block_tx_hashes = getlastblockstransactiondata_block_tx_hashes.substr(0,getlastblockstransactiondata_block_tx_hashes.length - 2); 
                                         getlastblockstransactiondata_block_tx_ringsizes = getlastblockstransactiondata_block_tx_ringsizes.substr(0,getlastblockstransactiondata_block_tx_ringsizes.length - 2); 
                                         getlastblockstransactiondata_block_tx_fees = getlastblockstransactiondata_block_tx_fees.substr(0,getlastblockstransactiondata_block_tx_fees.length - 2); 
                                         getlastblockstransactiondata_block_tx_sizes = getlastblockstransactiondata_block_tx_sizes.substr(0,getlastblockstransactiondata_block_tx_sizes.length - 2); 
                                         getlastblockstransactiondata_block_tx_paymentid_settings = getlastblockstransactiondata_block_tx_paymentid_settings.substr(0,getlastblockstransactiondata_block_tx_paymentid_settings.length - 2); 
                                         getlastblockstransactiondata_block_tx_privacy_settings = getlastblockstransactiondata_block_tx_privacy_settings.substr(0,getlastblockstransactiondata_block_tx_privacy_settings.length - 2);           
               
          







  
      res.json({
              "block_height":getlastblockstransactiondata_block_height,
              "block_hash":getlastblockstransactiondata_block_hash,
              "block_size":getlastblockstransactiondata_block_size,
              "block_tx_amount":getlastblockstransactiondata_block_tx_amount,
              "block_reward":getlastblockstransactiondata_block_reward,
              "block_timestamp":getlastblockstransactiondata_block_timestamp,
              "block_difficulty":getlastblockstransactiondata_block_difficulty,
              "block_mining_reward_tx_hash":getlastblockstransactiondata_block_mining_reward_tx_hash,
              "block_tx_hashes":getlastblockstransactiondata_block_tx_hashes,
              "block_tx_ringsizes":getlastblockstransactiondata_block_tx_ringsizes,
              "block_tx_fees":getlastblockstransactiondata_block_tx_fees,
              "block_tx_sizes":getlastblockstransactiondata_block_tx_sizes,
              "block_tx_paymentid_settings":getlastblockstransactiondata_block_tx_paymentid_settings,
              "block_tx_privacy_settings":getlastblockstransactiondata_block_tx_privacy_settings
            });
 }
    catch (error)
    {
      res.status(400).json(GET_BLOCK_TRANSACTION_DATA_ERROR);
    }    
  });
});
post_req10.setTimeout(HTTP_REQUEST_TIMEOUT, () => post_req10.abort());
post_req10.on('error', response => res.status(400).json(GET_BLOCK_TRANSACTION_DATA_ERROR));
        }
    catch (error)
    {
      res.status(400).json(GET_BLOCK_TRANSACTION_DATA_ERROR);
    }    
  });
});
post_request10.setTimeout(HTTP_REQUEST_TIMEOUT, () => post_request10.abort());
post_request10.on('error', response => res.status(400).json(GET_BLOCK_TRANSACTION_DATA_ERROR));
 }
    catch (error)
    {
      res.status(400).json(GET_BLOCK_TRANSACTION_DATA_ERROR);
    }    
  });
});
post_req9.setTimeout(HTTP_REQUEST_TIMEOUT, () => post_req9.abort());
post_req9.on('error', response => res.status(400).json(GET_BLOCK_TRANSACTION_DATA_ERROR));
        }
    catch (error)
    {
      res.status(400).json(GET_BLOCK_TRANSACTION_DATA_ERROR);
    }    
  });
});
post_request9.setTimeout(HTTP_REQUEST_TIMEOUT, () => post_request9.abort());
post_request9.on('error', response => res.status(400).json(GET_BLOCK_TRANSACTION_DATA_ERROR));
 }
    catch (error)
    {
      res.status(400).json(GET_BLOCK_TRANSACTION_DATA_ERROR);
    }    
  });
});
post_req8.setTimeout(HTTP_REQUEST_TIMEOUT, () => post_req8.abort());
post_req8.on('error', response => res.status(400).json(GET_BLOCK_TRANSACTION_DATA_ERROR));
        }
    catch (error)
    {
      res.status(400).json(GET_BLOCK_TRANSACTION_DATA_ERROR);
    }    
  });
});
post_request8.setTimeout(HTTP_REQUEST_TIMEOUT, () => post_request8.abort());
post_request8.on('error', response => res.status(400).json(GET_BLOCK_TRANSACTION_DATA_ERROR));
 }
    catch (error)
    {
      res.status(400).json(GET_BLOCK_TRANSACTION_DATA_ERROR);
    }    
  });
});
post_req7.setTimeout(HTTP_REQUEST_TIMEOUT, () => post_req7.abort());
post_req7.on('error', response => res.status(400).json(GET_BLOCK_TRANSACTION_DATA_ERROR));
       }
    catch (error)
    {
      res.status(400).json(GET_BLOCK_TRANSACTION_DATA_ERROR);
    }    
  });
});
post_request7.setTimeout(HTTP_REQUEST_TIMEOUT, () => post_request7.abort());
post_request7.on('error', response => res.status(400).json(GET_BLOCK_TRANSACTION_DATA_ERROR));
 }
    catch (error)
    {
      res.status(400).json(GET_BLOCK_TRANSACTION_DATA_ERROR);
    }    
  });
});
post_req6.setTimeout(HTTP_REQUEST_TIMEOUT, () => post_req6.abort());
post_req6.on('error', response => res.status(400).json(GET_BLOCK_TRANSACTION_DATA_ERROR));
        }
    catch (error)
    {
      res.status(400).json(GET_BLOCK_TRANSACTION_DATA_ERROR);
    }    
  });
});
post_request6.setTimeout(HTTP_REQUEST_TIMEOUT, () => post_request6.abort());
post_request6.on('error', response => res.status(400).json(GET_BLOCK_TRANSACTION_DATA_ERROR));
 }
    catch (error)
    {
      res.status(400).json(GET_BLOCK_TRANSACTION_DATA_ERROR);
    }    
  });
});
post_req5.setTimeout(HTTP_REQUEST_TIMEOUT, () => post_req5.abort());
post_req5.on('error', response => res.status(400).json(GET_BLOCK_TRANSACTION_DATA_ERROR));
        }
    catch (error)
    {
      res.status(400).json(GET_BLOCK_TRANSACTION_DATA_ERROR);
    }    
  });
});
post_request5.setTimeout(HTTP_REQUEST_TIMEOUT, () => post_request5.abort());
post_request5.on('error', response => res.status(400).json(GET_BLOCK_TRANSACTION_DATA_ERROR));
 }
    catch (error)
    {
      res.status(400).json(GET_BLOCK_TRANSACTION_DATA_ERROR);
    }    
  });
});
post_req4.setTimeout(HTTP_REQUEST_TIMEOUT, () => post_req4.abort());
post_req4.on('error', response => res.status(400).json(GET_BLOCK_TRANSACTION_DATA_ERROR));
        }
    catch (error)
    {
      res.status(400).json(GET_BLOCK_TRANSACTION_DATA_ERROR);
    }    
  });
});
post_request4.setTimeout(HTTP_REQUEST_TIMEOUT, () => post_request4.abort());
post_request4.on('error', response => res.status(400).json(GET_BLOCK_TRANSACTION_DATA_ERROR));
 }
    catch (error)
    {
      res.status(400).json(GET_BLOCK_TRANSACTION_DATA_ERROR);
    }    
  });
});
post_req3.setTimeout(HTTP_REQUEST_TIMEOUT, () => post_req3.abort());
post_req3.on('error', response => res.status(400).json(GET_BLOCK_TRANSACTION_DATA_ERROR));
        }
    catch (error)
    {
      res.status(400).json(GET_BLOCK_TRANSACTION_DATA_ERROR);
    }    
  });
});
post_request3.setTimeout(HTTP_REQUEST_TIMEOUT, () => post_request3.abort());
post_request3.on('error', response => res.status(400).json(GET_BLOCK_TRANSACTION_DATA_ERROR));
            
             }
    catch (error)
    {
      res.status(400).json(GET_BLOCK_TRANSACTION_DATA_ERROR);
    }    
  });
});
post_req2.setTimeout(HTTP_REQUEST_TIMEOUT, () => post_req2.abort());
post_req2.on('error', response => res.status(400).json(GET_BLOCK_TRANSACTION_DATA_ERROR));
 }
    catch (error)
    {
      res.status(400).json(GET_BLOCK_TRANSACTION_DATA_ERROR);
    }    
  });
});
post_request2.setTimeout(HTTP_REQUEST_TIMEOUT, () => post_request2.abort());
post_request2.on('error', response => res.status(400).json(GET_BLOCK_TRANSACTION_DATA_ERROR));
            }
    catch (error)
    {
      res.status(400).json(GET_BLOCK_TRANSACTION_DATA_ERROR);
    }    
  });
});
post_req1.setTimeout(HTTP_REQUEST_TIMEOUT, () => post_req1.abort());
post_req1.on('error', response => res.status(400).json(GET_BLOCK_TRANSACTION_DATA_ERROR));
        }
    catch (error)
    {
      res.status(400).json(GET_BLOCK_TRANSACTION_DATA_ERROR);
    }    
  });
});
post_request1.setTimeout(HTTP_REQUEST_TIMEOUT, () => post_request1.abort());
post_request1.on('error', response => res.status(400).json(GET_BLOCK_TRANSACTION_DATA_ERROR));
    }
    catch (error)
    {
      res.status(400).json(GET_BLOCK_TRANSACTION_DATA_ERROR);
    }    
  });
});
httprequest.setTimeout(HTTP_REQUEST_TIMEOUT, () => httprequest.abort());
httprequest.on('error', response => res.status(400).json(GET_BLOCK_COUNT_ERROR));
})



app.get('/gettransactiondata', urlencodedParser, function (req, res) {
// gets the transaction data
// parameters
//tx_hash = the transactions hash or the block reward transaction hash
var get_transaction_data = GET_TRANSACTION_DATA;
get_transaction_data = get_transaction_data.replace("transaction_hash",req.query.tx_hash);
var httprequest = new http.ClientRequest(DAEMON_HOSTNAME_AND_PORT_GET_TRANSACTION_DATA);
httprequest.end(get_transaction_data);

httprequest.on('response', function (response) {
  response.setEncoding('utf8');
  var result = "";
  response.on('data', chunk => result += chunk);
  response.on('end', function () {
    try
    { 
      var obj = JSON.parse(result);
      if (result == "" || result.indexOf("error") != -1)
      {
        throw("error");
      }
      var tx_data = JSON.parse(obj.txs[0].as_json);
      var tx_settings = obj.txs[0].as_json.indexOf("key_offset") !== -1 ? "transaction" : "block_reward_transaction"; 
      var tx_key_images = "";
      var tx_key_images_ring_address_count = []; 
      var count1 = 0;
      var count2 = 0;     
      var counter = 0; 

if (tx_settings === "transaction") 
{   

      for (count1 = 0; count1 < tx_data.vin.length; count1++)
      {
        tx_key_images += tx_data.vin[count1].key.k_image + "|";
        for (count2 = 0, ring_address_counter = 0; count2 < tx_data.vin[count1].key.key_offsets.length; count2++)
        {
          // calculate the tx_key_images_ring_address_count
          tx_key_images_ring_address_count[counter] = ring_address_counter === 0 ? tx_data.vin[count1].key.key_offsets[count2] : ring_address_counter + tx_data.vin[count1].key.key_offsets[count2];
          ring_address_counter += tx_data.vin[count1].key.key_offsets[count2];
          counter++;
        }
      }
      tx_key_images = tx_key_images.substr(0,tx_key_images.length - 1);
      var tx_ringsize = tx_data.vin[0].key.key_offsets.length;
      var tx_unlock_block = tx_data.unlock_time == 0 ? obj.txs[0].block_height + 10 : tx_data.unlock_time;
     
      var tx_key_images_ring_address = "";
      var tx_key_images_ring_tx_hash = "";     
      var tx_key_images_ring_tx_hash_array = [];
      var tx_key_images_ring_block_height = "";

          var post_req = http.request(DAEMON_HOSTNAME_AND_PORT_GET_RING_ADDRESSES_DATA, function(response) {
          response.setEncoding('utf8');
          var result = "";
          response.on('data', chunk => result += chunk);
          response.on('end', function () {
          try
          { 
          var tx_ring_address = JSON.parse(result);
          if (result == "" || result.indexOf("error") != -1)
          {
            throw("error");
          } 
          for (count1 = 0; count1 < tx_key_images_ring_address_count.length; count1++)
          {
            tx_key_images_ring_address += (count1 + 1) % tx_ringsize !== 0 ? tx_ring_address.outs[count1].key + "|" : tx_ring_address.outs[count1].key + "||";
            tx_key_images_ring_tx_hash += (count1 + 1) % tx_ringsize !== 0 ? tx_ring_address.outs[count1].txid + "|" : tx_ring_address.outs[count1].txid + "||";
            tx_key_images_ring_tx_hash_array[count1] = tx_ring_address.outs[count1].txid;
            tx_key_images_ring_block_height += (count1 + 1) % tx_ringsize !== 0 ? tx_ring_address.outs[count1].height + "|" : tx_ring_address.outs[count1].height + "||";
          } 
            tx_key_images_ring_address = tx_key_images_ring_address.substr(0,tx_key_images_ring_address.length - 2);
            tx_key_images_ring_tx_hash = tx_key_images_ring_tx_hash.substr(0,tx_key_images_ring_tx_hash.length - 2);
            tx_key_images_ring_block_height = tx_key_images_ring_block_height.substr(0,tx_key_images_ring_block_height.length - 2);

            var tx_addresses = "";
            for (count1 = 0; count1 < tx_data.vout.length; count1++)
            { 
              tx_addresses += tx_data.vout[count1].target.key + "|";
            }
            tx_addresses = tx_addresses.substr(0,tx_addresses.length - 1);

            // calcuate the tx_size
            var tx_size = obj.txs[0].as_hex.length / 1024 / 2;
            
            tx_extra = tx_data.extra;

            // get the key images ring address data
            var tx_key_images_ring_tx_settings;
            var tx_key_images_ring_address_tx_ring_addresses = "";
            var tx_key_images_ring_address_tx_ring_size = "";
            var tx_key_images_ring_address_tx_block_timestamp = "";            
            var tx_key_images_ring_address_tx_extra = "";
            var tx_key_images_ring_address_tx_ecdh_data = "";
            var get_transaction_data = {"txs_hashes":[],"decode_as_json":true,"prune":false};         
            for (count1 = 0; count1 < tx_key_images_ring_tx_hash_array.length; count1++)
            {
              get_transaction_data.txs_hashes[count1] = tx_key_images_ring_tx_hash_array[count1];
            }                        
            var post_request = new http.ClientRequest(DAEMON_HOSTNAME_AND_PORT_GET_TRANSACTION_DATA);
            post_request.end(JSON.stringify(get_transaction_data));
            post_request.on('response', function (response) {
            response.setEncoding('utf8');
            var result = "";
            response.on('data', chunk => result += chunk);
            response.on('end', function () {
            try
            { 
              var tx_key_images_ring_tx_hash_result = JSON.parse(result);
              var tx_key_images_ring_tx_hash_data;
              var tx_key_images_ring_tx_hash_data_extra;
              if (result == "" || result.indexOf("error") != -1)
              {
                throw("error");
              } 
              for (count1 = 0; count1 < tx_key_images_ring_tx_hash_array.length; count1++)
              {
                tx_key_images_ring_tx_hash_data = JSON.parse(tx_key_images_ring_tx_hash_result.txs[count1].as_json);  
                tx_key_images_ring_tx_settings = tx_key_images_ring_tx_hash_result.txs[count1].as_json.indexOf("key_offset") !== -1 ? "transaction" : "block_reward_transaction"; 
                if (tx_key_images_ring_tx_settings === "transaction")
                {          
                  tx_key_images_ring_address_tx_ring_size += (count1 + 1) % tx_ringsize !== 0 ? tx_key_images_ring_tx_hash_data.vin[0].key.key_offsets.length + "|" : tx_key_images_ring_tx_hash_data.vin[0].key.key_offsets.length + "||";
                  tx_key_images_ring_address_tx_block_timestamp += (count1 + 1) % tx_ringsize !== 0 ? tx_key_images_ring_tx_hash_result.txs[count1].block_timestamp + "|" : tx_key_images_ring_tx_hash_result.txs[count1].block_timestamp + "||";
                  tx_key_images_ring_tx_hash_data_extra = Buffer.from(tx_key_images_ring_tx_hash_data.extra).toString("hex");
                  tx_key_images_ring_tx_hash_data_ecdh_tx_data = JSON.stringify(tx_key_images_ring_tx_hash_data.rct_signatures);
                  if (tx_key_images_ring_tx_hash_data_extra.length >= 256)
                  {
                    tx_key_images_ring_address_tx_extra += (count1 + 1) % tx_ringsize !== 0 ? tx_key_images_ring_tx_hash_data_extra + "|" : tx_key_images_ring_tx_hash_data_extra + "||";
                    tx_key_images_ring_address_tx_ecdh_data += (count1 + 1) % tx_ringsize !== 0 ? tx_key_images_ring_tx_hash_data_ecdh_tx_data + "|" : tx_key_images_ring_tx_hash_data_ecdh_tx_data + "||";
                  }
                  else
                  {
                    tx_key_images_ring_address_tx_extra += (count1 + 1) % tx_ringsize !== 0 ? "private_tx|" : "private_tx||";
                    tx_key_images_ring_address_tx_ecdh_data += (count1 + 1) % tx_ringsize !== 0 ? "private_tx|" : "private_tx||";
                  }
                  for (count2 = 0; count2 < tx_key_images_ring_tx_hash_data.vout.length; count2++)
                  {
                    tx_key_images_ring_address_tx_ring_addresses += (count2 + 1) !== tx_key_images_ring_tx_hash_data.vout.length ? tx_key_images_ring_tx_hash_data.vout[count2].target.key + "|" : tx_key_images_ring_tx_hash_data.vout[count2].target.key + "||";
                  }
                  if ((count1 + 1) % tx_ringsize === 0)
                  {
                    tx_key_images_ring_address_tx_ring_addresses += "|";
                  } 
                }
                else
                {
                  tx_key_images_ring_address_tx_ring_size += (count1 + 1) % tx_ringsize !== 0 ? "0|" : "0||";
                  tx_key_images_ring_address_tx_block_timestamp += (count1 + 1) % tx_ringsize !== 0 ? tx_key_images_ring_tx_hash_result.txs[count1].block_timestamp + "|" : tx_key_images_ring_tx_hash_result.txs[count1].block_timestamp + "||";
                  tx_key_images_ring_address_tx_extra += (count1 + 1) % tx_ringsize !== 0 ? "block_reward_transaction|" : "block_reward_transaction||";
                  tx_key_images_ring_address_tx_ecdh_data += (count1 + 1) % tx_ringsize !== 0 ? "block_reward_transaction|" : "block_reward_transaction||";
                  tx_key_images_ring_address_tx_ring_addresses += (count1 + 1) % tx_ringsize !== 0 ? tx_key_images_ring_tx_hash_data.vout[0].target.key + "||" : tx_key_images_ring_tx_hash_data.vout[0].target.key + "|||";
                }
              } 
                tx_key_images_ring_address_tx_ring_size = tx_key_images_ring_address_tx_ring_size.substr(0, tx_key_images_ring_address_tx_ring_size.length - 2);
                tx_key_images_ring_address_tx_block_timestamp = tx_key_images_ring_address_tx_block_timestamp.substr(0, tx_key_images_ring_address_tx_block_timestamp.length - 2);
                tx_key_images_ring_address_tx_extra = tx_key_images_ring_address_tx_extra.substr(0, tx_key_images_ring_address_tx_extra.length - 2);
                tx_key_images_ring_address_tx_ecdh_data = tx_key_images_ring_address_tx_ecdh_data.substr(0, tx_key_images_ring_address_tx_ecdh_data.length - 2);
                tx_key_images_ring_address_tx_ring_addresses = tx_key_images_ring_address_tx_ring_addresses.substr(0, tx_key_images_ring_address_tx_ring_addresses.length - 3);
 
                // get the information to decode the transaction

        res.json({
                "tx_block_height":obj.txs[0].block_height !== 18446744073709552000 ? obj.txs[0].block_height : "TX_POOL",
                "tx_block_timestamp":obj.txs[0].block_timestamp,
                "tx_version":tx_data.version,
                "tx_settings":tx_settings,
                "tx_ringct_version":tx_data.rct_signatures.type,
                "tx_fee":tx_data.rct_signatures.txnFee,
                "tx_size":tx_size,
                "tx_unlock_block":tx_unlock_block,
                "tx_extra":Buffer.from(tx_extra).toString("hex"),
                "tx_ringsize":tx_ringsize,
                "tx_addresses":tx_addresses,
                "tx_ecdh_data":JSON.stringify(tx_data.rct_signatures),
                "tx_extra":Buffer.from(tx_extra).toString("hex"),
                "tx_key_images":tx_key_images,
                "tx_key_images_ring_address":tx_key_images_ring_address,
                "tx_key_images_ring_tx_hash":tx_key_images_ring_tx_hash, 
                "tx_key_images_ring_address_tx_ring_addresses":tx_key_images_ring_address_tx_ring_addresses,
                "tx_key_images_ring_address_tx_block_height":tx_key_images_ring_block_height,
                "tx_key_images_ring_address_tx_extra":tx_key_images_ring_address_tx_extra,
                "tx_key_images_ring_address_tx_ecdh_data":tx_key_images_ring_address_tx_ecdh_data,
                "tx_key_images_ring_address_tx_ring_size":tx_key_images_ring_address_tx_ring_size,
                "tx_key_images_ring_address_tx_block_timestamp":tx_key_images_ring_address_tx_block_timestamp,
                });
              
           }
           catch (error)
           {
             res.status(400).json(GET_TRANSACTION_DATA_ERROR);
           }         
         });
       });
       post_request.setTimeout(HTTP_REQUEST_TIMEOUT, () => post_request.abort());
       post_request.on('error', response => res.status(400).json(GET_TRANSACTION_DATA_ERROR)); 
         }
         catch (error)
         {
           res.status(400).json(GET_TRANSACTION_DATA_ERROR);
         }   
      });
});
post_req.setTimeout(HTTP_REQUEST_TIMEOUT, () => post_req.abort());
post_req.on('error', response => res.status(400).json(GET_TRANSACTION_DATA_ERROR));   
var get_ring_addresses_data = {"outputs":[]};
for (count1 = 0; count1 < tx_key_images_ring_address_count.length; count1++)
{
get_ring_addresses_data.outputs[count1] = {"amount":0,"index":tx_key_images_ring_address_count[count1]};
}
post_req.end(JSON.stringify(get_ring_addresses_data));




/*
for (var count1 = 0; count1 < tx_data.vin.length; count1++)
{
var post_req = http.request(DAEMON_HOSTNAME_AND_PORT_GET_RING_ADDRESSES_DATA, function(response) {
      response.setEncoding('utf8');
      response.on('data', function (chunk) { 
          var result = JSON.parse(chunk);
          completed_requests++;
          for (var count3 = 0; count3 < tx_ringsize; count3++)
          {
            tx_key_images_ring_address += result.outs[count3].key + "|";
            tx_key_images_ring_tx_hash += result.outs[count3].txid + "|";
            tx_key_images_ring_block_height += result.outs[count3].height + "|";
          } 
          tx_key_images_ring_address += "|"; 
          tx_key_images_ring_tx_hash += "|";
          tx_key_images_ring_block_height += "|";       
          if (completed_requests === tx_data.vin.length)
          {
            tx_key_images_ring_address = tx_key_images_ring_address.substr(0,tx_key_images_ring_address.length - 2);
            tx_key_images_ring_tx_hash = tx_key_images_ring_tx_hash.substr(0,tx_key_images_ring_tx_hash.length - 2);
            tx_key_images_ring_block_height = tx_key_images_ring_block_height.substr(0,tx_key_images_ring_block_height.length - 2);
            var tx_extra = tx_data.extra;
             res.json({
              "tx_block_height":obj.txs[0].block_height,
              "tx_block_timestamp":obj.txs[0].block_timestamp,
              "tx_version":tx_data.version,
              "tx_unlock_block":tx_data.unlock_time,
              "tx_ringsize":tx_ringsize,
              "tx_key_images":tx_key_images,
              "tx_key_images_ring_address":tx_key_images_ring_address,
              "tx_key_images_ring_tx_hash":tx_key_images_ring_tx_hash, 
              "tx_key_images_ring_block_height":tx_key_images_ring_block_height
            });
          }
      });
});
var get_ring_addresses_data = {"outputs":[]};
for (var count2 = 0; count2 < tx_ringsize; count2++, counter++)
{
get_ring_addresses_data.outputs[count2] = {"amount":0,"index":tx_key_images_ring_address_count[counter]};
}
post_req.end(JSON.stringify(get_ring_addresses_data));
get_ring_addresses_data = "";
}
*/

     
      
      
      
}
else
{
        res.json({
                "tx_block_height":obj.txs[0].block_height,
                "tx_block_timestamp":obj.txs[0].block_timestamp,
                "tx_version":tx_data.version,
                "tx_settings":tx_settings,
                "tx_ringct_version":tx_data.rct_signatures.type,
                "tx_size":obj.txs[0].as_hex.length / 1024 / 2,
                "tx_unlock_block":tx_data.unlock_time,
                "tx_extra":Buffer.from(tx_data.extra).toString("hex"),
                "tx_address":tx_data.vout[0].target.key,
                "tx_address_amount":tx_data.vout[0].amount / WALLET_DECIMAL_PLACES_AMOUNT,
                });
}      
     
    }
    catch (error)
    {
      res.status(400).json(GET_TRANSACTION_DATA_ERROR);
    } 
     
  });
});
httprequest.setTimeout(HTTP_REQUEST_TIMEOUT, () => httprequest.abort());
httprequest.on('error', response => res.status(400).json(GET_TRANSACTION_DATA_ERROR));
})




app.get('/verifypreminefundsairdrop', urlencodedParser, function (req, res) {
var premine_funds_data = "";
var verify_reserve_proof = "";
var counter = 0;
for (var count = 0; count < PREMINE_FUNDS_AIRDROP_WALLETS.length; count++)
{
verify_reserve_proof = VERIFY_RESERVE_PROOF;
verify_reserve_proof = verify_reserve_proof.replace("public_address",PREMINE_FUNDS_AIRDROP_WALLETS[count]);
verify_reserve_proof = verify_reserve_proof.replace('"reserve_proof"','"' + PREMINE_FUNDS_AIRDROP_WALLETS_RESERVE_PROOFS[count] + '"');
verify_reserve_proof = verify_reserve_proof.replace(',"message":"data"',"");
var post_req = http.request(WALLET_HOSTNAME_AND_PORT, function(response) {
      response.setEncoding('utf8');
      var result = "";
      response.on('data', chunk => result += chunk);
      response.on('end', function () {  
      try
      {
      var obj = JSON.parse(result);
      if (result == "")
      {
        throw("error");
      }       
      else if (result.indexOf("error") != -1 || result.indexOf("false") != -1)
      { 
        premine_funds_data = premine_funds_data + PREMINE_FUNDS_AIRDROP_WALLETS[counter] + "|" + PREMINE_FUNDS_AIRDROP_WALLETS_RESERVE_PROOFS[counter] + "|" + "invalid|0|0|The reserve proof is invalid for this address||";
      }
     else
     {         
       var message = obj.result.spent === 0 ? "The reserve proof is valid for this address, and no funds have been spent since creating this reserve proof" : "The reserve proof is valid for this address, but funds have been spent after creating this reserve proof, meaning that the amount is incorrect";
       premine_funds_data = premine_funds_data + PREMINE_FUNDS_AIRDROP_WALLETS[counter] + "|" + PREMINE_FUNDS_AIRDROP_WALLETS_RESERVE_PROOFS[counter] + "|" +  "valid|" + obj.result.total / WALLET_DECIMAL_PLACES_AMOUNT + "|" + obj.result.spent / WALLET_DECIMAL_PLACES_AMOUNT + "|" + message + "||";
     } 
     counter++;
     if (counter === PREMINE_FUNDS_AIRDROP_WALLETS.length)
     {
       premine_funds_data = premine_funds_data.substr(0,premine_funds_data.length - 2);
       res.json({"data":premine_funds_data});
     }
    }
    catch (error)
    {
      res.status(400).json(VERIFY_RESERVE_PROOF_ERROR);
    } 
  });
});
post_req.end(verify_reserve_proof);
post_req.setTimeout(HTTP_REQUEST_TIMEOUT, () => post_req.abort());
post_req.on('error', response => console.log("error"));
}
})




app.get('/verifypreminefundsxcash', urlencodedParser, function (req, res) {
var premine_funds_data = "";
var verify_reserve_proof = "";
var counter = 0;
for (var count = 0; count < PREMINE_FUNDS_XCASH_WALLETS.length; count++)
{
verify_reserve_proof = VERIFY_RESERVE_PROOF;
verify_reserve_proof = verify_reserve_proof.replace("public_address",PREMINE_FUNDS_XCASH_WALLETS[count]);
verify_reserve_proof = verify_reserve_proof.replace('"reserve_proof"','"' + PREMINE_FUNDS_XCASH_WALLETS_RESERVE_PROOFS[count] + '"');
verify_reserve_proof = verify_reserve_proof.replace(',"message":"data"',"");
var post_req = http.request(WALLET_HOSTNAME_AND_PORT, function(response) {
      response.setEncoding('utf8');
      var result = "";
      response.on('data', chunk => result += chunk);
      response.on('end', function () {  
      try
      {
      var obj = JSON.parse(result);
      if (result == "")
      {
        throw("error");
      }       
      else if (result.indexOf("error") != -1 || result.indexOf("false") != -1)
      { 
        premine_funds_data = premine_funds_data + PREMINE_FUNDS_XCASH_WALLETS[counter] + "|" + PREMINE_FUNDS_XCASH_WALLETS_RESERVE_PROOFS[counter] + "|" + "invalid|0|0|The reserve proof is invalid for this address||";
      }
     else
     {         
       var message = obj.result.spent === 0 ? "The reserve proof is valid for this address, and no funds have been spent since creating this reserve proof" : "The reserve proof is valid for this address, but funds have been spent after creating this reserve proof, meaning that the amount is incorrect";
       premine_funds_data = premine_funds_data + PREMINE_FUNDS_XCASH_WALLETS[counter] + "|" + PREMINE_FUNDS_XCASH_WALLETS_RESERVE_PROOFS[counter] + "|" +  "valid|" + obj.result.total / WALLET_DECIMAL_PLACES_AMOUNT + "|" + obj.result.spent / WALLET_DECIMAL_PLACES_AMOUNT + "|" + message + "||";
     } 
     counter++;
     if (counter === PREMINE_FUNDS_XCASH_WALLETS.length)
     {
       premine_funds_data = premine_funds_data.substr(0,premine_funds_data.length - 2);
       res.json({"data":premine_funds_data});
     }
    }
    catch (error)
    {
      res.status(400).json(VERIFY_RESERVE_PROOF_ERROR);
    } 
  });
});
post_req.end(verify_reserve_proof);
post_req.setTimeout(HTTP_REQUEST_TIMEOUT, () => post_req.abort());
post_req.on('error', response => console.log("error"));
}
})




app.get('/verifypreminefundsxcashrewards', urlencodedParser, function (req, res) {
var premine_funds_data = "";
var verify_reserve_proof = "";
var counter = 0;
for (var count = 0; count < PREMINE_FUNDS_XCASH_REWARD_WALLETS.length; count++)
{
verify_reserve_proof = VERIFY_RESERVE_PROOF;
verify_reserve_proof = verify_reserve_proof.replace("public_address",PREMINE_FUNDS_XCASH_REWARD_WALLETS[count]);
verify_reserve_proof = verify_reserve_proof.replace('"reserve_proof"','"' + PREMINE_FUNDS_XCASH_REWARD_WALLETS_RESERVE_PROOFS[count] + '"');
verify_reserve_proof = verify_reserve_proof.replace(',"message":"data"',"");
var post_req = http.request(WALLET_HOSTNAME_AND_PORT, function(response) {
      response.setEncoding('utf8');
      var result = "";
      response.on('data', chunk => result += chunk);
      response.on('end', function () {  
      try
      {
      var obj = JSON.parse(result);
      if (result == "")
      {
        throw("error");
      }       
      else if (result.indexOf("error") != -1 || result.indexOf("false") != -1)
      { 
        premine_funds_data = premine_funds_data + PREMINE_FUNDS_XCASH_REWARD_WALLETS[counter] + "|" + PREMINE_FUNDS_XCASH_REWARD_WALLETS_RESERVE_PROOFS[counter] + "|" + "invalid|0|0|The reserve proof is invalid for this address||";
      }
     else
     {         
       var message = obj.result.spent === 0 ? "The reserve proof is valid for this address, and no funds have been spent since creating this reserve proof" : "The reserve proof is valid for this address, but funds have been spent after creating this reserve proof, meaning that the amount is incorrect";
       premine_funds_data = premine_funds_data + PREMINE_FUNDS_XCASH_REWARD_WALLETS[counter] + "|" + PREMINE_FUNDS_XCASH_REWARD_WALLETS_RESERVE_PROOFS[counter] + "|" +  "valid|" + obj.result.total / WALLET_DECIMAL_PLACES_AMOUNT + "|" + obj.result.spent / WALLET_DECIMAL_PLACES_AMOUNT + "|" + message + "||";
     } 
     counter++;
     if (counter === PREMINE_FUNDS_XCASH_REWARD_WALLETS.length)
     {
       premine_funds_data = premine_funds_data.substr(0,premine_funds_data.length - 2);
       res.json({"data":premine_funds_data});
     }
    }
    catch (error)
    {
      res.status(400).json(VERIFY_RESERVE_PROOF_ERROR);
    } 
  });
});
post_req.end(verify_reserve_proof);
post_req.setTimeout(HTTP_REQUEST_TIMEOUT, () => post_req.abort());
post_req.on('error', response => console.log("error"));
}
})




app.get('/verifypreminefundsxcashinvestors', urlencodedParser, function (req, res) {
var premine_funds_data = "";
var verify_reserve_proof = "";
var counter = 0;
for (var count = 0; count < PREMINE_FUNDS_XCASH_INVESTORS_WALLETS.length; count++)
{
verify_reserve_proof = VERIFY_RESERVE_PROOF;
verify_reserve_proof = verify_reserve_proof.replace("public_address",PREMINE_FUNDS_XCASH_INVESTORS_WALLETS[count]);
verify_reserve_proof = verify_reserve_proof.replace('"reserve_proof"','"' + PREMINE_FUNDS_XCASH_INVESTORS_WALLETS_RESERVE_PROOFS[count] + '"');
verify_reserve_proof = verify_reserve_proof.replace(',"message":"data"',"");
var post_req = http.request(WALLET_HOSTNAME_AND_PORT, function(response) {
      response.setEncoding('utf8');
      var result = "";
      response.on('data', chunk => result += chunk);
      response.on('end', function () {  
      try
      {
      var obj = JSON.parse(result);
      if (result == "")
      {
        throw("error");
      }       
      else if (result.indexOf("error") != -1 || result.indexOf("false") != -1)
      { 
        premine_funds_data = premine_funds_data + PREMINE_FUNDS_XCASH_INVESTORS_WALLETS[counter] + "|" + PREMINE_FUNDS_XCASH_INVESTORS_WALLETS_RESERVE_PROOFS[counter] + "|" + "invalid|0|0|The reserve proof is invalid for this address||";
      }
     else
     {         
       var message = obj.result.spent === 0 ? "The reserve proof is valid for this address, and no funds have been spent since creating this reserve proof" : "The reserve proof is valid for this address, but funds have been spent after creating this reserve proof, meaning that the amount is incorrect";
       premine_funds_data = premine_funds_data + PREMINE_FUNDS_XCASH_INVESTORS_WALLETS[counter] + "|" + PREMINE_FUNDS_XCASH_INVESTORS_WALLETS_RESERVE_PROOFS[counter] + "|" +  "valid|" + obj.result.total / WALLET_DECIMAL_PLACES_AMOUNT + "|" + obj.result.spent / WALLET_DECIMAL_PLACES_AMOUNT + "|" + message + "||";
     } 
     counter++;
     if (counter === PREMINE_FUNDS_XCASH_INVESTORS_WALLETS.length)
     {
       premine_funds_data = premine_funds_data.substr(0,premine_funds_data.length - 2);
       res.json({"data":premine_funds_data});
     }
    }
    catch (error)
    {
      res.status(400).json(VERIFY_RESERVE_PROOF_ERROR);
    } 
  });
});
post_req.end(verify_reserve_proof);
post_req.setTimeout(HTTP_REQUEST_TIMEOUT, () => post_req.abort());
post_req.on('error', response => console.log("error"));
}
})



app.get('/verifyreserveproofapi', urlencodedParser, function (req, res) {
// verifies that a reserve proof is correct
// parameters
// public_address = the public address
// reserve_proof = the reserve proof
// data = any data that was used to create the reserve proof. leave empty if no data was used to create the reserve proof
var verify_reserve_proof = VERIFY_RESERVE_PROOF;
verify_reserve_proof = verify_reserve_proof.replace("public_address",req.query.public_address);
verify_reserve_proof = verify_reserve_proof.replace('"reserve_proof"','"' + req.query.reserve_proof + '"');
verify_reserve_proof = req.query.data != "" ? verify_reserve_proof.replace("data",req.query.data) : verify_reserve_proof.replace(',"message":"data"',"");
var httprequest = new http.ClientRequest(WALLET_HOSTNAME_AND_PORT);
httprequest.end(verify_reserve_proof);

httprequest.on('response', function (response) {
  response.setEncoding('utf8');
  var result = "";
  response.on('data', chunk => result += chunk);
  response.on('end', function () {   
    try
    {
      var obj = JSON.parse(result);
      if (result == "")
      {
        throw("error");
      } 
      else if (result.indexOf("error") != -1 || result.indexOf("false") != -1)
      { 
      res.json({
              "reserve_proof_settings":"invalid",
              "reserve_proof_amount":0,
              "reserve_proof_amount_spent":0,
              "message":"The reserve proof is invalid for this address"
            });
     }
     else
     {
       var message = obj.result.spent === 0 ? "The reserve proof is valid for this address, and no funds have been spent since creating this reserve proof" : "The reserve proof is valid for this address, but funds have been spent after creating this reserve proof, meaning that the amount is incorrect";
       res.json({
              "reserve_proof_settings":"valid",
              "reserve_proof_amount":obj.result.total / WALLET_DECIMAL_PLACES_AMOUNT,
              "reserve_proof_amount_spent":obj.result.spent / WALLET_DECIMAL_PLACES_AMOUNT,
              "message":message
            });
     }
    }
    catch (error)
    {
      res.status(400).json(VERIFY_RESERVE_PROOF_ERROR);
    } 
  });
});
httprequest.setTimeout(HTTP_REQUEST_TIMEOUT, () => httprequest.abort());
httprequest.on('error', response => res.status(400).json(VERIFY_RESERVE_PROOF_ERROR));
})




app.get('/verifyreserveproofallapi', urlencodedParser, function (req, res) {
var data = "";
var counter = 0;
for (var count = 0; count < PREMINE_FUNDS_ALL_WALLETS.length; count++)
{
verify_reserve_proof = VERIFY_RESERVE_PROOF;
verify_reserve_proof = verify_reserve_proof.replace("public_address",PREMINE_FUNDS_ALL_WALLETS[count]);
verify_reserve_proof = verify_reserve_proof.replace('"reserve_proof"','"' + PREMINE_FUNDS_ALL_WALLETS_RESERVE_PROOFS[count] + '"');
verify_reserve_proof = verify_reserve_proof.replace(',"message":"data"',"");
var post_req = http.request(WALLET_HOSTNAME_AND_PORT, function(response) {
      response.setEncoding('utf8');
      var result = "";
      response.on('data', chunk => result += chunk);
      response.on('end', function () {  
      try
      {
      var obj = JSON.parse(result);
      if (result == "")
      {
        throw("error");
      }       
      else if (result.indexOf("error") != -1 || result.indexOf("false") != -1)
      { 
        data += "invalid|0|0|The reserve proof is invalid for this address||";
      }
     else
     {         
       var message = obj.result.spent === 0 ? "The reserve proof is valid for this address, and no funds have been spent since creating this reserve proof" : "The reserve proof is valid for this address, but funds have been spent after creating this reserve proof, meaning that the amount is incorrect";
       data += "valid|" + obj.result.total / WALLET_DECIMAL_PLACES_AMOUNT + "|" + obj.result.spent / WALLET_DECIMAL_PLACES_AMOUNT + "|" + message + "||";
     } 
     counter++;
     if (counter === PREMINE_FUNDS_ALL_WALLETS.length)
     {
       data = data.substr(0,data.length - 2);
       res.json({"data":data});
     }
    }
    catch (error)
    {
      res.status(400).json(VERIFY_RESERVE_PROOF_ERROR);
    } 
  });
});
post_req.end(verify_reserve_proof);
post_req.setTimeout(HTTP_REQUEST_TIMEOUT, () => post_req.abort());
post_req.on('error', response => console.log("error"));
}
})



app.get('/gettransactionconfirmations', urlencodedParser, function (req, res) {
// gets the transaction confirmations
// parameters
// tx_hash = the transaction hash
var get_transaction_confirmations_data = GET_TRANSACTION_CONFIRMATIONS_DATA;
get_transaction_confirmations_data = get_transaction_confirmations_data.replace("transaction_hash",req.query.tx_hash);
var httprequest = new http.ClientRequest(DAEMON_HOSTNAME_AND_PORT_GET_TRANSACTION_DATA);
httprequest.end(get_transaction_confirmations_data);

var tx_block_height;
var current_block_height;
var tx_confirmations;

httprequest.on('response', function (response) {
  response.setEncoding('utf8');
  var result = "";
  response.on('data', chunk => result += chunk);
  response.on('end', function () {
    try
    { 
      var obj = JSON.parse(result);
      if (result == "" || result.indexOf("error") != -1)
      {
        throw("error");
      }
      tx_block_height = obj.txs[0].block_height;
      var post_req = new http.ClientRequest(DAEMON_HOSTNAME_AND_PORT);
      post_req.end(GET_BLOCK_COUNT);
      post_req.on('response', function (response) {
      response.setEncoding('utf8');
      var result = "";
      response.on('data', chunk => result += chunk);
      response.on('end', function () {
        try
        { 
          var obj = JSON.parse(result);
          if (result == "" || result.indexOf("error") != -1)
          {
            throw("error");
          } 
          current_block_height = obj.result.count;
          tx_confirmations = current_block_height - tx_block_height;      
          res.json({"tx_confirmations":tx_confirmations});
    }
    catch (error)
    {
      res.status(400).json(GET_TRANSACTION_CONFIRMATIONS_DATA_ERROR);
    }    
  });
});
post_req.setTimeout(HTTP_REQUEST_TIMEOUT, () => post_req.abort());
post_req.on('error', response => res.status(400).json(GET_TRANSACTION_CONFIRMATIONS_DATA_ERROR));       
    }
    catch (error)
    {
      res.status(400).json(GET_TRANSACTION_CONFIRMATIONS_DATA_ERROR);
    }    
  });
});
httprequest.setTimeout(HTTP_REQUEST_TIMEOUT, () => httprequest.abort());
httprequest.on('error', response => res.status(400).json(GET_TRANSACTION_CONFIRMATIONS_DATA_ERROR));
})



app.get('/createintegratedaddressapi', urlencodedParser, function (req, res) {
// creates an integrated address
// parameters
// public_address = the public address
// payment_id = the payment id, leave empty for a random payment id
try
{
var public_address = req.query.public_address;
if (public_address.length !== 98)
{
throw("error");
}
var payment_id = req.query.payment_id;
if (payment_id.length !== 16)
{
payment_id = randString(16);
}
var integrated_address = cryptocurrency.create_integrated_address(public_address,payment_id);
if (integrated_address == "")
{
throw("error");
}

          res.json({
              "public_address":public_address,
              "payment_id":payment_id,
              "integrated_address":integrated_address
            });
    }
    catch (error)
    {
      res.status(400).json(CREATE_INTEGRATED_ADDRESS_ERROR);
    } 
})












app.post('/gettransactionpooldata', urlencodedParser, function (req, res) {
// get the transaction pool data
// parameters
//tx_pool_settings 0 gets all the tx pool transactions data, 1 gets the MAXIMUM_TX_POOL_SIZE tx pool transactions data
var httprequest = new http.ClientRequest(DAEMON_HOSTNAME_AND_PORT_GET_TRANSACTION_POOL_DATA);
httprequest.end();

httprequest.on('response', function (response) {
  response.setEncoding('utf8');
  var result = "";
  response.on('data', chunk => result += chunk);
  response.on('end', function () {
    try
    {
if (result == "" || result.indexOf("error") != -1)
{
throw("error");
}        
var results = "";
for (var count = 0; count < result.length; count++)
{
if (
    result[count] === "a" ||
    result[count] === "b" ||
    result[count] === "c" ||
    result[count] === "d" ||
    result[count] === "e" ||
    result[count] === "f" ||
    result[count] === "g" ||
    result[count] === "h" ||
    result[count] === "i" ||
    result[count] === "j" ||
    result[count] === "k" ||
    result[count] === "l" ||
    result[count] === "m" ||
    result[count] === "n" ||
    result[count] === "o" ||
    result[count] === "p" ||
    result[count] === "q" ||
    result[count] === "r" ||
    result[count] === "s" ||
    result[count] === "t" ||
    result[count] === "u" ||
    result[count] === "v" ||
    result[count] === "w" ||
    result[count] === "x" ||
    result[count] === "y" ||
    result[count] === "z" ||
    result[count] === "A" ||
    result[count] === "B" ||
    result[count] === "C" ||
    result[count] === "D" ||
    result[count] === "E" ||
    result[count] === "F" ||
    result[count] === "G" ||
    result[count] === "H" ||
    result[count] === "I" ||
    result[count] === "J" ||
    result[count] === "K" ||
    result[count] === "L" ||
    result[count] === "M" ||
    result[count] === "N" ||
    result[count] === "O" ||
    result[count] === "P" ||
    result[count] === "Q" ||
    result[count] === "R" ||
    result[count] === "S" ||
    result[count] === "T" ||
    result[count] === "U" ||
    result[count] === "V" ||
    result[count] === "W" ||
    result[count] === "X" ||
    result[count] === "Y" ||
    result[count] === "Z" ||
    result[count] === "0" ||
    result[count] === "1" ||
    result[count] === "2" ||
    result[count] === "3" ||
    result[count] === "4" ||
    result[count] === "5" ||
    result[count] === "6" ||
    result[count] === "7" ||
    result[count] === "8" ||
    result[count] === "9" ||
    result[count] === ":" ||
    result[count] === "[" ||
    result[count] === "]" ||
    result[count] === "{" ||
    result[count] === "}" ||
    result[count] === " " ||
    result[count] === "|" ||
    result[count] === " " ||
    result[count] === "?" ||
    result[count] === "." ||
    result[count] === ">" ||
    result[count] === "<" ||
    result[count] === "," ||
    result[count] === ";" ||
    result[count] === "+" ||
    result[count] === '-' ||
    result[count] === "*" ||
    result[count] === "=" ||
    result[count] === "-" ||
    result[count] === "_" ||
    result[count] === "`" ||
    result[count] === "~" ||
    result[count] === "!" ||
    result[count] === "@" ||
    result[count] === "#" ||
    result[count] === "$" ||
    result[count] === "%" ||
    result[count] === "^" ||
    result[count] === "&"
   )
{
results += result[count];
}
}

var count1 = 0;
var count2 = 0;
var count3 = 0;
var count4 = 0;
var tx_count = 0;
var tx_hash_pool = "";
var tx_ringsize = "";
var tx_timestamp = "";
var tx_fee = "";
var tx_size = "";
var tx_paymentidsettings = "";
var tx_privacy_settings = "";
var get_transaction_data = {"txs_hashes":[],"decode_as_json":true}; 
count1 = results.split("txs_hashes:").length - 1;
for (count2 = 0; count2 < count1; count2++)
{
count4 = results.indexOf("txs_hashes:",count3);
count3 = count4 + 11;
var str = results.substr(count4 + 13,64);
if (tx_hash_pool.indexOf(str) === -1)
{
if ((req.body.tx_pool_settings == 0) || (req.body.tx_pool_settings == 1 && count2 < MAXIMUM_TX_POOL_SIZE))
{
tx_hash_pool += str + "|";
tx_count++;
get_transaction_data.txs_hashes.push(str);
}
}
}

count4 = 0;
count3 = 0;
for (count2 = 0; count2 < count1; count2++)
{
count4 = results.indexOf("last_relayed_time",count3);
count3 = count4 + 17;
var str = results.substr(count4 + 19,10);
//if (tx_timestamp.indexOf(str) === -1)
//{
if ((req.body.tx_pool_settings == 0) || (req.body.tx_pool_settings == 1 && count2 < MAXIMUM_TX_POOL_SIZE))
{
tx_timestamp += str + "|";
}
//}
}
tx_hash_pool = tx_hash_pool.substr(0,tx_hash_pool.length - 1);
var tx_timestamp_copy = "";
for (var count = 0; count < tx_timestamp.length; count++)
{
if (
    tx_timestamp[count] === "0" ||
    tx_timestamp[count] === "1" ||
    tx_timestamp[count] === "2" ||
    tx_timestamp[count] === "3" ||
    tx_timestamp[count] === "4" ||
    tx_timestamp[count] === "5" ||
    tx_timestamp[count] === "6" ||
    tx_timestamp[count] === "7" ||
    tx_timestamp[count] === "8" ||
    tx_timestamp[count] === "9" ||
    tx_timestamp[count] === "|"
   )
{
tx_timestamp_copy += tx_timestamp[count];
}
}
//tx_timestamp = tx_timestamp_copy;
tx_timestamp = tx_timestamp_copy.indexOf("||") !== -1 ? tx_timestamp_copy.split("||")[0] : tx_timestamp_copy;
if (tx_timestamp.substr(tx_timestamp.length - 1,1) === "|")
{
tx_timestamp = tx_timestamp.substr(0,tx_timestamp.length - 1);
}

            var post_request = new http.ClientRequest(DAEMON_HOSTNAME_AND_PORT_GET_TRANSACTION_DATA);
            post_request.end(JSON.stringify(get_transaction_data));
            post_request.on('response', function (response) {
            response.setEncoding('utf8');
            var result = "";
            response.on('data', chunk => result += chunk);
            response.on('end', function () {
            try
            { 
              var obj = JSON.parse(result);
              if (result == "" || result.indexOf("error") != -1)
              {
                throw("error");
              } 
              var tx_extra = "";
              for (count1 = 0; count1 < tx_count; count1++)
              {
                if ((req.body.tx_pool_settings == 0) || (req.body.tx_pool_settings == 1 && count1 < MAXIMUM_TX_POOL_SIZE))
                {
                  tx_data = JSON.parse(obj.txs[count1].as_json);
                  tx_extra = Buffer.from(tx_data.extra).toString("hex");
                  tx_ringsize += tx_data.vin[0].key.key_offsets.length + "|"; 
                  tx_fee += tx_data.rct_signatures.txnFee + "|"; 
                  tx_size += (obj.txs[count1].as_hex.length / 1024 / 2) + "|";    
                  tx_paymentidsettings += tx_extra.substr(0,6) === UNENCRYPTED_PAYMENT_ID ? "unencrypted|" : tx_extra.substr(0,6) === ENCRYPTED_PAYMENT_ID ? "encrypted|" : "none|";
                  tx_privacy_settings += tx_extra.length >= 256 ? "public|" : "private|";  
                }             
              } 
              tx_ringsize = tx_ringsize.substr(0,tx_ringsize.length - 1);
              tx_fee = tx_fee.substr(0,tx_fee.length - 1);
              tx_size = tx_size.substr(0,tx_size.length - 1);
              tx_paymentidsettings = tx_paymentidsettings.substr(0,tx_paymentidsettings.length - 1);
              tx_privacy_settings = tx_privacy_settings.substr(0,tx_privacy_settings.length - 1);

              if (tx_timestamp.substr(tx_timestamp.length - 1,1) === "|")
              {
                tx_timestamp = tx_timestamp.substr(0,tx_timestamp.length - 1);
              }

        res.json({
                "tx_hash":tx_hash_pool,
                "tx_ringsize":tx_ringsize,
                "tx_timestamp":tx_timestamp,
                "tx_fee":tx_fee,
                "tx_size":tx_size,
                "tx_paymentidsettings":tx_paymentidsettings,
                "tx_privacy_settings":tx_privacy_settings
                }); 
        
           }
           catch (error)
           {
             res.status(400).json(GET_TRANSACTION_POOL_DATA_ERROR);
           }          
         });
       });
       post_request.setTimeout(HTTP_REQUEST_TIMEOUT, () => post_request.abort());
       post_request.on('error', response => res.status(400).json(GET_TRANSACTION_POOL_DATA_ERROR)); 
       
                        
           }
           catch (error)
           {
             res.status(400).json(GET_TRANSACTION_POOL_DATA_ERROR);
           }          
         });
       });
       httprequest.setTimeout(HTTP_REQUEST_TIMEOUT, () => httprequest.abort());
       httprequest.on('error', response => res.status(400).json(GET_TRANSACTION_POOL_DATA_ERROR)); 
})




app.post('/getblockhash', urlencodedParser, function (req, res) {
// gets the block hash from a block height
// parameters
// block_height = the block height
var get_block_hash = GET_BLOCK_HASH;
get_block_hash = get_block_hash.replace("block_height",req.body.block_height);
var httprequest = new http.ClientRequest(DAEMON_HOSTNAME_AND_PORT);
httprequest.end(get_block_hash);

httprequest.on('response', function (response) {
  response.setEncoding('utf8');
  var result = "";
  response.on('data', chunk => result += chunk);
  response.on('end', function () {  
    try
    { 
      var obj = JSON.parse(result);
      if (result == "" || result.indexOf("error") != -1)
      {
        throw("error");
      } 
      res.json({"block_hash":obj.result});
    }
    catch (error)
    {
      res.status(400).json(GET_BLOCK_HASH_ERROR);
    } 
  });
});
httprequest.setTimeout(HTTP_REQUEST_TIMEOUT, () => httprequest.abort());
httprequest.on('error', response => res.status(400).json(GET_BLOCK_HASH_ERROR));
})



/*app.post('/getblockdatafromblockheight', urlencodedParser, function (req, res) {
// gets the blocks data from the block height
// parameters
// block_height = the block height
var get_block_data_from_block_height = GET_BLOCK_DATA_FROM_BLOCK_HEIGHT;
get_block_data_from_block_height = get_block_data_from_block_height.replace("block_height",req.body.block_height);
var httprequest = new http.ClientRequest(DAEMON_HOSTNAME_AND_PORT);
httprequest.end(get_block_data_from_block_height);

httprequest.on('response', function (response) {
  response.setEncoding('utf8');
  var result = "";
  response.on('data', chunk => result += chunk);
  response.on('end', function () {   
    try
    { 
      var obj = JSON.parse(result);
      if (result == "" || result.indexOf("error") != -1)
      {
        throw("error");
      }     
      res.json({
              "block_height":obj.result.block_header.height,
              "block_hash":obj.result.block_header.hash,
              "block_size":obj.result.block_header.block_size / 1024,
              "block_tx_amount":obj.result.block_header.num_txes,
              "block_reward":obj.result.block_header.reward / WALLET_DECIMAL_PLACES_AMOUNT,
              "block_timestamp":obj.result.block_header.timestamp,
              "block_difficulty":obj.result.block_header.difficulty
            });
    }
    catch (error)
    {
      res.status(400).json(GET_BLOCK_DATA_FROM_BLOCK_HEIGHT_ERROR);
    }    
  });
});
httprequest.setTimeout(HTTP_REQUEST_TIMEOUT, () => httprequest.abort());
httprequest.on('error', response => res.status(400).json(GET_BLOCK_DATA_FROM_BLOCK_HEIGHT_ERROR));
})*/



app.get('/getblockdata', urlencodedParser, function (req, res) {
// gets the blocks data from the block height or block hash
// parameters
// block_data = the block height or the block hash
var get_block_data = req.query.block_data.length === 64 ? GET_BLOCK_DATA_FROM_BLOCK_HASH : GET_BLOCK_DATA_FROM_BLOCK_HEIGHT;
if (req.query.block_data.length === 64)
{
get_block_data = get_block_data.replace("block_hash",req.query.block_data);
}
else
{
get_block_data = get_block_data.replace("block_height",req.query.block_data);
}
console.log(get_block_data);
var httprequest = new http.ClientRequest(DAEMON_HOSTNAME_AND_PORT);
httprequest.end(get_block_data);

httprequest.on('response', function (response) {
  response.setEncoding('utf8');
  var result = "";
  response.on('data', chunk => result += chunk);
  response.on('end', function () {   
    try
    { 
      var obj = JSON.parse(result);
      if (result == "" || result.indexOf("error") != -1)
      {
        throw("error");
      }     
      res.json({
              "block_height":obj.result.block_header.height,
              "block_hash":obj.result.block_header.hash,
              "block_size":obj.result.block_header.block_size / 1024,
              "block_tx_amount":obj.result.block_header.num_txes,
              "block_reward":obj.result.block_header.reward / WALLET_DECIMAL_PLACES_AMOUNT,
              "block_timestamp":obj.result.block_header.timestamp,
              "block_difficulty":obj.result.block_header.difficulty
            });
    }
    catch (error)
    {
      res.status(400).json(GET_LAST_BLOCK_DATA_ERROR);
    }   
  });
});
httprequest.setTimeout(HTTP_REQUEST_TIMEOUT, () => httprequest.abort());
httprequest.on('error', response => res.status(400).json(GET_LAST_BLOCK_DATA_ERROR));
})



app.post('/getblockchaindatasettings', urlencodedParser, function (req, res) {
// gets what type of item the user has provided
// parameters
// settings = valid parameters are the block_height, block_hash, block_reward_transaction, tx_hash, encrypted_payment_id, unencrypted_payment_id, public_address, stealth_address, tx_public_key, tx_private_key
var settings = req.body.settings;
var blockchaindatasettings = "";
if (isNaN(settings) == false && (settings.length !== 64 || settings.length !== 16))
{
blockchaindatasettings = "block_height";
res.json({"settings":"block_height"});
return;
}
if (settings.length === 16)
{
blockchaindatasettings = "encrypted_payment_id";
res.json({"settings":"encrypted_payment_id"});
return;
}
if (settings.substr(0,3) === "XCA")
{
blockchaindatasettings = "public_address";
res.json({"settings":"public_address"});
return;
}
var get_block_data_from_block_hash = GET_BLOCK_DATA_FROM_BLOCK_HASH;
get_block_data_from_block_hash = get_block_data_from_block_hash.replace("block_hash",settings);
var httprequest = new http.ClientRequest(DAEMON_HOSTNAME_AND_PORT);
httprequest.end(get_block_data_from_block_hash);

httprequest.on('response', function (response) {
  response.setEncoding('utf8');
  var result = "";
  response.on('data', chunk => result += chunk);
  response.on('end', function () {   
    try
    { 
      if (result.indexOf("error") === -1)
      {
        blockchaindatasettings = "block_hash";
        res.json({"settings":"block_hash"});
        return;        
      }
      
      var get_transaction_data = GET_TRANSACTION_DATA;
      get_transaction_data = get_transaction_data.replace("transaction_hash",settings);
      var post_request1 = new http.ClientRequest(DAEMON_HOSTNAME_AND_PORT_GET_TRANSACTION_DATA);
      post_request1.end(get_transaction_data);

      post_request1.on('response', function (response) {
        response.setEncoding('utf8');
        var result = "";
        response.on('data', chunk => result += chunk);
        response.on('end', function () {
          try
          {             
            if (result.indexOf("key_offset") !== -1)
            {
              blockchaindatasettings = "transaction";
              res.json({"settings":"transaction"});
              return;
            }
            else if (result.indexOf("block_height") !== -1)
            {
              blockchaindatasettings = "block_reward_transaction";
              res.json({"settings":"block_reward_transaction"});
              return;              
            } 
            else
            {
              // search the database for tx_public_key, tx_private_key, stealth_address, unencrypted_payment_id
              collection = database.collection('transactions');
              collection.countDocuments({"tx_paymentid":settings}, function(error, databasecount)
              {
                try
		{
		if (error)
		{
		throw("error");
		}
		}
		catch (error)
		{
		return;
		}
                if (databasecount != 0)
                {
                  blockchaindatasettings = "unencrypted_payment_id";
                  res.json({"settings":"unencrypted_payment_id"});
                  return;                  
                }
                });
             
                 var str = ".*" + settings + ".*";
                  collection.countDocuments({"tx_addresses":{'$regex':str}}, function(error, databasecount)
                  {
               	  try
		  {
		  if (error)
		  {
		  throw("error");
		  }
		  }
		  catch (error)
		  {
		  return;
		  }
                  if (databasecount != 0)
                  {
                    blockchaindatasettings = "stealth_address";
                    res.json({"settings":"stealth_address"});
                    return;                    
                  }
                  });
                    collection.countDocuments({"tx_public_key":settings}, function(error, databasecount)
                    {
                    try
		    {
		    if (error)
		    {
		    throw("error");
		    }
		    }
		    catch (error)
		    {
		    return;
		    }
                    if (databasecount != 0)
                    {
                      blockchaindatasettings = "tx_public_key";
                      res.json({"settings":"tx_public_key"});
                      return;                      
                    }
                    });
                      collection.countDocuments({"tx_private_key":settings}, function(error, databasecount)
                      {
                      try
		      {
		      if (error)
		      {
		      throw("error");
		      }
		      }
		      catch (error)
		      {
		      return;
		      }
                      if (databasecount != 0)
                      {
                        blockchaindatasettings = "tx_private_key";
                        res.json({"settings":"tx_private_key"});
                        return;                        
                      }
                      });
                      
                     setTimeout(() => {if(blockchaindatasettings == "") { res.status(400).json(GET_BLOCKCHAIN_DATA_SETTINGS_ERROR);}},5000);
            }
            
          }
    catch (error)
    {
      res.status(400).json(GET_BLOCKCHAIN_DATA_SETTINGS_ERROR);
    }    
  });
});
post_request1.setTimeout(HTTP_REQUEST_TIMEOUT, () => post_request1.abort());
post_request1.on('error', response => res.status(400).json(GET_BLOCKCHAIN_DATA_SETTINGS_ERROR));      
    }
    catch (error)
    {
      res.status(400).json(GET_BLOCKCHAIN_DATA_SETTINGS_ERROR);
    }    
  });
});
httprequest.setTimeout(5000, () => httprequest.abort());
httprequest.on('error', response => res.status(400).json(GET_BLOCKCHAIN_DATA_SETTINGS_ERROR));
})



app.post('/gettransactiondatasearchresults', urlencodedParser, function (req, res) {
// gets the transaction data for the transaction search results
// parameters
// settings = the type of transaction data. Valid parameters are encrypted_payment_id, unencrypted_payment_id, public_address, stealth_address, tx_public_key, tx_private_key
// tx_data = the tx_data
try
{
var tx_data_array;
if (req.body.settings === "encrypted_payment_id" || req.body.settings === "unencrypted_payment_id")
{
tx_data_array = {"tx_paymentid":req.body.tx_data};
}  
else if (req.body.settings === "public_address")
{
tx_data_array = {"tx_public_addresses":{'$regex':req.body.tx_data}};
} 
else if (req.body.settings === "stealth_address")
{
tx_data_array = {"tx_addresses":{'$regex':req.body.tx_data}};
} 
else if (req.body.settings === "tx_public_key")
{
tx_data_array = {"tx_public_key":req.body.tx_data};
} 
else if (req.body.settings === "tx_private_key")
{
tx_data_array = {"tx_private_key":req.body.tx_data};
} 
else
{
throw("error");
}

// get the transaction data
var tx_data = [];
var count = 1;
collection.find(tx_data_array).toArray((err,documents) => res.json({"tx_data":documents})); 
}
catch (error)
{
res.status(400).json(SEND_HEXADECIMIAL_TRANSACTION_ERROR);
}    
})



/*app.post('/getblockdatafromblockhash', urlencodedParser, function (req, res) {
// gets the blocks data from the block hash
// parameters
// block_hash = the block hash
var get_block_data_from_block_hash = GET_BLOCK_DATA_FROM_BLOCK_HASH;
get_block_data_from_block_hash = get_block_data_from_block_hash.replace("block_hash",req.body.block_hash);
var httprequest = new http.ClientRequest(DAEMON_HOSTNAME_AND_PORT);
httprequest.end(get_block_data_from_block_hash);

httprequest.on('response', function (response) {
  response.setEncoding('utf8');
  var result = "";
  response.on('data', chunk => result += chunk);
  response.on('end', function () {
    try
    { 
      var obj = JSON.parse(result);
      if (result == "" || result.indexOf("error") != -1)
      {
        throw("error");
      }        
      res.json({
              "block_height":obj.result.block_header.height,
              "block_hash":obj.result.block_header.hash,
              "block_size":obj.result.block_header.block_size / 1024,
              "block_tx_amount":obj.result.block_header.num_txes,
              "block_reward":obj.result.block_header.reward / WALLET_DECIMAL_PLACES_AMOUNT,
              "block_timestamp":obj.result.block_header.timestamp,
              "block_difficulty":obj.result.block_header.difficulty
            });
    }
    catch (error)
    {
      res.status(400).json(GET_BLOCK_DATA_FROM_BLOCK_HASH_ERROR);
    }    
  });
});
httprequest.setTimeout(HTTP_REQUEST_TIMEOUT, () => httprequest.abort());
httprequest.on('error', response => res.status(400).json(GET_BLOCK_DATA_FROM_BLOCK_HASH_ERROR));
})
*/



app.post('/sendhexadecimaltransaction', urlencodedParser, function (req, res) {
// sends a hexadecimal transaction
// parameters
// tx_data_hexadecimal = the hexadecimal data of the transaction
// settings = 0 sends the transaction and 1 validates the transaction
var send_hexadecimal_transaction = req.body.settings == 0 ? SEND_HEXADECIMAL_TRANSACTION : VALIDATE_HEXADECIMAL_TRANSACTION;
send_hexadecimal_transaction = send_hexadecimal_transaction.replace("tx_data_hexadecimal",req.body.tx_data_hexadecimal);
var httprequest = new http.ClientRequest(DAEMON_HOSTNAME_AND_PORT_SEND_HEXADECIMAL_TRANSACTION);
httprequest.end(send_hexadecimal_transaction);

httprequest.on('response', function (response) {
  response.setEncoding('utf8');
  var result = "";
  response.on('data', chunk => result += chunk);
  response.on('end', function () {   
    try
    {
      if (result == "" || result.indexOf("error") != -1 || result.indexOf("Failed") != -1)
      {
        var obj = JSON.parse(result);
        if (obj.reason == "")
        {
          obj.reason = "Invalid";
        }
        res.json({"send_hexadecimal_transaction_results":obj.reason});
      }  
      else
      {
        res.json(SEND_HEXADECIMIAL_TRANSACTION_SUCCESS);
      } 
    }
    catch (error)
    {
      res.status(400).json(SEND_HEXADECIMIAL_TRANSACTION_ERROR);
    }    
  });
});
httprequest.setTimeout(HTTP_REQUEST_TIMEOUT, () => httprequest.abort());
httprequest.on('error', response => res.status(400).json(SEND_HEXADECIMIAL_TRANSACTION_ERROR));
})



app.post('/getblocktransactiondata', urlencodedParser, function (req, res) {
// gets the blocks transaction data
// parameters
// get_block_transaction_data_settings = the block height, or the block hash
var get_block_transaction_data = GET_BLOCK_TRANSACTION_DATA;
get_block_transaction_data = req.body.get_block_transaction_data_settings.length === 64 ? get_block_transaction_data.replace("get_block_transaction_data_parameter","hash") : get_block_transaction_data.replace("get_block_transaction_data_parameter","height");
get_block_transaction_data = get_block_transaction_data.replace("get_block_transaction_data_settings",req.body.get_block_transaction_data_settings);
var httprequest = new http.ClientRequest(DAEMON_HOSTNAME_AND_PORT);
httprequest.end(get_block_transaction_data);

httprequest.on('response', function (response) {
  response.setEncoding('utf8');
  var result = "";
  response.on('data', chunk => result += chunk);
  response.on('end', function () {
    try
    { 
      var obj = JSON.parse(result);
      if (result == "" || result.indexOf("error") != -1)
      {
        throw("error");
      } 
      var block_transaction_data = JSON.parse(obj.result.json); 
      var tx_hashes = "";
      var get_transaction_data = {"txs_hashes":[],"decode_as_json":true}; 
      for (var count = 0; count < block_transaction_data.tx_hashes.length; count++)
      {
        tx_hashes += block_transaction_data.tx_hashes[count] + "|";
        get_transaction_data.txs_hashes[count] = block_transaction_data.tx_hashes[count];
      } 
      tx_hashes = tx_hashes.substr(0,tx_hashes.length - 1); 
            var post_request = new http.ClientRequest(DAEMON_HOSTNAME_AND_PORT_GET_TRANSACTION_DATA);
            post_request.end(JSON.stringify(get_transaction_data));
            post_request.on('response', function (response) {
            response.setEncoding('utf8');
            var result = "";
            response.on('data', chunk => result += chunk);
            response.on('end', function () {
            try
            { 
              var tx_hash_data = JSON.parse(result);
              var tx_hash_data_results;
              if (result == "" || result.indexOf("error") != -1)
              {
                throw("error");
              } 
              var block_tx_ringsizes = "";
              var block_tx_fees = "";
              var block_tx_sizes = "";
              var block_tx_paymentid_settings = "";
              var block_tx_privacy_settings = "";
              var tx_extra = "";
              for (count1 = 0; count1 < block_transaction_data.tx_hashes.length; count1++)
              {
                tx_hash_data_results = JSON.parse(tx_hash_data.txs[count1].as_json);
                tx_extra = Buffer.from(tx_hash_data_results.extra).toString("hex");
                block_tx_ringsizes += tx_hash_data_results.vin[0].key.key_offsets.length + "|";
                block_tx_fees += tx_hash_data_results.rct_signatures.txnFee + "|"; 
                block_tx_sizes += (tx_hash_data.txs[count1].as_hex.length / 1024 / 2) + "|";    
                block_tx_paymentid_settings += tx_extra.substr(0,6) === UNENCRYPTED_PAYMENT_ID ? "unencrypted|" : tx_extra.substr(0,6) === ENCRYPTED_PAYMENT_ID ? "encrypted|" : "none|";
                block_tx_privacy_settings += tx_extra.length >= 256 ? "public|" : "private|";               
              } 
              block_tx_ringsizes = block_tx_ringsizes.substr(0,block_tx_ringsizes.length - 1);
              block_tx_fees = block_tx_fees.substr(0,block_tx_fees.length - 1);
              block_tx_sizes = block_tx_sizes.substr(0,block_tx_sizes.length - 1);
              block_tx_paymentid_settings = block_tx_paymentid_settings.substr(0,block_tx_paymentid_settings.length - 1);
              block_tx_privacy_settings = block_tx_privacy_settings.substr(0,block_tx_privacy_settings.length - 1); 
            
      res.json({
              "block_height":obj.result.block_header.height,
              "block_hash":obj.result.block_header.hash,
              "block_size":obj.result.block_header.block_size / 1024,
              "block_tx_amount":obj.result.block_header.num_txes,
              "block_reward":obj.result.block_header.reward / WALLET_DECIMAL_PLACES_AMOUNT,
              "block_timestamp":obj.result.block_header.timestamp,
              "block_difficulty":obj.result.block_header.difficulty,
              "block_mining_reward_tx_hash":obj.result.miner_tx_hash,
              "block_tx_hashes":tx_hashes,
              "block_tx_ringsizes":block_tx_ringsizes,
              "block_tx_fees":block_tx_fees,
              "block_tx_sizes":block_tx_sizes,
              "block_tx_paymentid_settings":block_tx_paymentid_settings,
              "block_tx_privacy_settings":block_tx_privacy_settings
            });
        }
    catch (error)
    {
      res.status(400).json(GET_BLOCK_TRANSACTION_DATA_ERROR);
    }    
  });
});
post_request.setTimeout(HTTP_REQUEST_TIMEOUT, () => post_request.abort());
post_request.on('error', response => res.status(400).json(GET_BLOCK_TRANSACTION_DATA_ERROR));
    }
    catch (error)
    {
      res.status(400).json(GET_BLOCK_TRANSACTION_DATA_ERROR);
    }    
  });
});
httprequest.setTimeout(HTTP_REQUEST_TIMEOUT, () => httprequest.abort());
httprequest.on('error', response => res.status(400).json(GET_BLOCK_TRANSACTION_DATA_ERROR));
})




/*app.post('/gettransactiondata', urlencodedParser, function (req, res) {
// gets the transaction data
// parameters
//tx_hash = the transactions hash or the block reward transaction hash
var get_transaction_data = GET_TRANSACTION_DATA;
get_transaction_data = get_transaction_data.replace("transaction_hash",req.body.tx_hash);
var httprequest = new http.ClientRequest(DAEMON_HOSTNAME_AND_PORT_GET_TRANSACTION_DATA);
httprequest.end(get_transaction_data);

httprequest.on('response', function (response) {
  response.setEncoding('utf8');
  var result = "";
  response.on('data', chunk => result += chunk);
  response.on('end', function () {
    try
    { 
      var obj = JSON.parse(result);
      if (result == "" || result.indexOf("error") != -1)
      {
        throw("error");
      }
      var tx_data = JSON.parse(obj.txs[0].as_json);
      var tx_settings = obj.txs[0].as_json.indexOf("key_offset") !== -1 ? "transaction" : "block_reward_transaction"; 
      var tx_key_images = "";
      var tx_key_images_ring_address_count = []; 
      var count1 = 0;
      var count2 = 0;     
      var counter = 0; 

if (tx_settings === "transaction") 
{   

      for (count1 = 0; count1 < tx_data.vin.length; count1++)
      {
        tx_key_images += tx_data.vin[count1].key.k_image + "|";
        for (count2 = 0, ring_address_counter = 0; count2 < tx_data.vin[count1].key.key_offsets.length; count2++)
        {
          // calculate the tx_key_images_ring_address_count
          tx_key_images_ring_address_count[counter] = ring_address_counter === 0 ? tx_data.vin[count1].key.key_offsets[count2] : ring_address_counter + tx_data.vin[count1].key.key_offsets[count2];
          ring_address_counter += tx_data.vin[count1].key.key_offsets[count2];
          counter++;
        }
      }
      tx_key_images = tx_key_images.substr(0,tx_key_images.length - 1);
      var tx_ringsize = tx_data.vin[0].key.key_offsets.length;
      var tx_unlock_block = tx_data.unlock_time == 0 ? obj.txs[0].block_height + 10 : tx_data.unlock_time;
     
      var tx_key_images_ring_address = "";
      var tx_key_images_ring_tx_hash = "";     
      var tx_key_images_ring_tx_hash_array = [];
      var tx_key_images_ring_block_height = "";

          var post_req = http.request(DAEMON_HOSTNAME_AND_PORT_GET_RING_ADDRESSES_DATA, function(response) {
          response.setEncoding('utf8');
          var result = "";
          response.on('data', chunk => result += chunk);
          response.on('end', function () {
          try
          { 
          var tx_ring_address = JSON.parse(result);
          if (result == "" || result.indexOf("error") != -1)
          {
            throw("error");
          } 
          for (count1 = 0; count1 < tx_key_images_ring_address_count.length; count1++)
          {
            tx_key_images_ring_address += (count1 + 1) % tx_ringsize !== 0 ? tx_ring_address.outs[count1].key + "|" : tx_ring_address.outs[count1].key + "||";
            tx_key_images_ring_tx_hash += (count1 + 1) % tx_ringsize !== 0 ? tx_ring_address.outs[count1].txid + "|" : tx_ring_address.outs[count1].txid + "||";
            tx_key_images_ring_tx_hash_array[count1] = tx_ring_address.outs[count1].txid;
            tx_key_images_ring_block_height += (count1 + 1) % tx_ringsize !== 0 ? tx_ring_address.outs[count1].height + "|" : tx_ring_address.outs[count1].height + "||";
          } 
            tx_key_images_ring_address = tx_key_images_ring_address.substr(0,tx_key_images_ring_address.length - 2);
            tx_key_images_ring_tx_hash = tx_key_images_ring_tx_hash.substr(0,tx_key_images_ring_tx_hash.length - 2);
            tx_key_images_ring_block_height = tx_key_images_ring_block_height.substr(0,tx_key_images_ring_block_height.length - 2);

            var tx_addresses = "";
            for (count1 = 0; count1 < tx_data.vout.length; count1++)
            { 
              tx_addresses += tx_data.vout[count1].target.key + "|";
            }
            tx_addresses = tx_addresses.substr(0,tx_addresses.length - 1);

            // calcuate the tx_size
            var tx_size = obj.txs[0].as_hex.length / 1024 / 2;
            
            tx_extra = tx_data.extra;

            // get the key images ring address data
            var tx_key_images_ring_tx_settings;
            var tx_key_images_ring_address_tx_ring_addresses = "";
            var tx_key_images_ring_address_tx_ring_size = "";
            var tx_key_images_ring_address_tx_block_timestamp = "";            
            var tx_key_images_ring_address_tx_extra = "";
            var tx_key_images_ring_address_tx_ecdh_data = "";
            var get_transaction_data = {"txs_hashes":[],"decode_as_json":true,"prune":false};         
            for (count1 = 0; count1 < tx_key_images_ring_tx_hash_array.length; count1++)
            {
              get_transaction_data.txs_hashes[count1] = tx_key_images_ring_tx_hash_array[count1];
            }                        
            var post_request = new http.ClientRequest(DAEMON_HOSTNAME_AND_PORT_GET_TRANSACTION_DATA);
            post_request.end(JSON.stringify(get_transaction_data));
            post_request.on('response', function (response) {
            response.setEncoding('utf8');
            var result = "";
            response.on('data', chunk => result += chunk);
            response.on('end', function () {
            try
            { 
              var tx_key_images_ring_tx_hash_result = JSON.parse(result);
              var tx_key_images_ring_tx_hash_data;
              var tx_key_images_ring_tx_hash_data_extra;
              if (result == "" || result.indexOf("error") != -1)
              {
                throw("error");
              } 
              for (count1 = 0; count1 < tx_key_images_ring_tx_hash_array.length; count1++)
              {
                tx_key_images_ring_tx_hash_data = JSON.parse(tx_key_images_ring_tx_hash_result.txs[count1].as_json);  
                tx_key_images_ring_tx_settings = tx_key_images_ring_tx_hash_result.txs[count1].as_json.indexOf("key_offset") !== -1 ? "transaction" : "block_reward_transaction"; 
                if (tx_key_images_ring_tx_settings === "transaction")
                {          
                  tx_key_images_ring_address_tx_ring_size += (count1 + 1) % tx_ringsize !== 0 ? tx_key_images_ring_tx_hash_data.vin[0].key.key_offsets.length + "|" : tx_key_images_ring_tx_hash_data.vin[0].key.key_offsets.length + "||";
                  tx_key_images_ring_address_tx_block_timestamp += (count1 + 1) % tx_ringsize !== 0 ? tx_key_images_ring_tx_hash_result.txs[count1].block_timestamp + "|" : tx_key_images_ring_tx_hash_result.txs[count1].block_timestamp + "||";
                  tx_key_images_ring_tx_hash_data_extra = Buffer.from(tx_key_images_ring_tx_hash_data.extra).toString("hex");
                  tx_key_images_ring_tx_hash_data_ecdh_tx_data = JSON.stringify(tx_key_images_ring_tx_hash_data.rct_signatures);
                  if (tx_key_images_ring_tx_hash_data_extra.length >= 256)
                  {
                    tx_key_images_ring_address_tx_extra += (count1 + 1) % tx_ringsize !== 0 ? tx_key_images_ring_tx_hash_data_extra + "|" : tx_key_images_ring_tx_hash_data_extra + "||";
                    tx_key_images_ring_address_tx_ecdh_data += (count1 + 1) % tx_ringsize !== 0 ? tx_key_images_ring_tx_hash_data_ecdh_tx_data + "|" : tx_key_images_ring_tx_hash_data_ecdh_tx_data + "||";
                  }
                  else
                  {
                    tx_key_images_ring_address_tx_extra += (count1 + 1) % tx_ringsize !== 0 ? "private_tx|" : "private_tx||";
                    tx_key_images_ring_address_tx_ecdh_data += (count1 + 1) % tx_ringsize !== 0 ? "private_tx|" : "private_tx||";
                  }
                  for (count2 = 0; count2 < tx_key_images_ring_tx_hash_data.vout.length; count2++)
                  {
                    tx_key_images_ring_address_tx_ring_addresses += (count2 + 1) !== tx_key_images_ring_tx_hash_data.vout.length ? tx_key_images_ring_tx_hash_data.vout[count2].target.key + "|" : tx_key_images_ring_tx_hash_data.vout[count2].target.key + "||";
                  }
                  if ((count1 + 1) % tx_ringsize === 0)
                  {
                    tx_key_images_ring_address_tx_ring_addresses += "|";
                  } 
                }
                else
                {
                  tx_key_images_ring_address_tx_ring_size += (count1 + 1) % tx_ringsize !== 0 ? "0|" : "0||";
                  tx_key_images_ring_address_tx_block_timestamp += (count1 + 1) % tx_ringsize !== 0 ? tx_key_images_ring_tx_hash_result.txs[count1].block_timestamp + "|" : tx_key_images_ring_tx_hash_result.txs[count1].block_timestamp + "||";
                  tx_key_images_ring_address_tx_extra += (count1 + 1) % tx_ringsize !== 0 ? "block_reward_transaction|" : "block_reward_transaction||";
                  tx_key_images_ring_address_tx_ecdh_data += (count1 + 1) % tx_ringsize !== 0 ? "block_reward_transaction|" : "block_reward_transaction||";
                  tx_key_images_ring_address_tx_ring_addresses += (count1 + 1) % tx_ringsize !== 0 ? tx_key_images_ring_tx_hash_data.vout[0].target.key + "||" : tx_key_images_ring_tx_hash_data.vout[0].target.key + "|||";
                }
              } 
                tx_key_images_ring_address_tx_ring_size = tx_key_images_ring_address_tx_ring_size.substr(0, tx_key_images_ring_address_tx_ring_size.length - 2);
                tx_key_images_ring_address_tx_block_timestamp = tx_key_images_ring_address_tx_block_timestamp.substr(0, tx_key_images_ring_address_tx_block_timestamp.length - 2);
                tx_key_images_ring_address_tx_extra = tx_key_images_ring_address_tx_extra.substr(0, tx_key_images_ring_address_tx_extra.length - 2);
                tx_key_images_ring_address_tx_ecdh_data = tx_key_images_ring_address_tx_ecdh_data.substr(0, tx_key_images_ring_address_tx_ecdh_data.length - 2);
                tx_key_images_ring_address_tx_ring_addresses = tx_key_images_ring_address_tx_ring_addresses.substr(0, tx_key_images_ring_address_tx_ring_addresses.length - 3);
 
                // get the information to decode the transaction

        res.json({
                "tx_block_height":obj.txs[0].block_height !== 18446744073709552000 ? obj.txs[0].block_height : "TX_POOL",
                "tx_block_timestamp":obj.txs[0].block_timestamp,
                "tx_version":tx_data.version,
                "tx_settings":tx_settings,
                "tx_ringct_version":tx_data.rct_signatures.type,
                "tx_fee":tx_data.rct_signatures.txnFee,
                "tx_size":tx_size,
                "tx_unlock_block":tx_unlock_block,
                "tx_extra":Buffer.from(tx_extra).toString("hex"),
                "tx_ringsize":tx_ringsize,
                "tx_addresses":tx_addresses,
                "tx_ecdh_data":JSON.stringify(tx_data.rct_signatures),
                "tx_extra":Buffer.from(tx_extra).toString("hex"),
                "tx_key_images":tx_key_images,
                "tx_key_images_ring_address":tx_key_images_ring_address,
                "tx_key_images_ring_tx_hash":tx_key_images_ring_tx_hash, 
                "tx_key_images_ring_address_tx_ring_addresses":tx_key_images_ring_address_tx_ring_addresses,
                "tx_key_images_ring_address_tx_block_height":tx_key_images_ring_block_height,
                "tx_key_images_ring_address_tx_extra":tx_key_images_ring_address_tx_extra,
                "tx_key_images_ring_address_tx_ecdh_data":tx_key_images_ring_address_tx_ecdh_data,
                "tx_key_images_ring_address_tx_ring_size":tx_key_images_ring_address_tx_ring_size,
                "tx_key_images_ring_address_tx_block_timestamp":tx_key_images_ring_address_tx_block_timestamp,
                });
              
           }
           catch (error)
           {
             res.status(400).json(GET_TRANSACTION_DATA_ERROR);
           }         
         });
       });
       post_request.setTimeout(HTTP_REQUEST_TIMEOUT, () => post_request.abort());
       post_request.on('error', response => res.status(400).json(GET_TRANSACTION_DATA_ERROR)); 
         }
         catch (error)
         {
           res.status(400).json(GET_TRANSACTION_DATA_ERROR);
         }   
      });
});
post_req.setTimeout(HTTP_REQUEST_TIMEOUT, () => post_req.abort());
post_req.on('error', response => res.status(400).json(GET_TRANSACTION_DATA_ERROR));   
var get_ring_addresses_data = {"outputs":[]};
for (count1 = 0; count1 < tx_key_images_ring_address_count.length; count1++)
{
get_ring_addresses_data.outputs[count1] = {"amount":0,"index":tx_key_images_ring_address_count[count1]};
}
post_req.end(JSON.stringify(get_ring_addresses_data));





for (var count1 = 0; count1 < tx_data.vin.length; count1++)
{
var post_req = http.request(DAEMON_HOSTNAME_AND_PORT_GET_RING_ADDRESSES_DATA, function(response) {
      response.setEncoding('utf8');
      response.on('data', function (chunk) { 
          var result = JSON.parse(chunk);
          completed_requests++;
          for (var count3 = 0; count3 < tx_ringsize; count3++)
          {
            tx_key_images_ring_address += result.outs[count3].key + "|";
            tx_key_images_ring_tx_hash += result.outs[count3].txid + "|";
            tx_key_images_ring_block_height += result.outs[count3].height + "|";
          } 
          tx_key_images_ring_address += "|"; 
          tx_key_images_ring_tx_hash += "|";
          tx_key_images_ring_block_height += "|";       
          if (completed_requests === tx_data.vin.length)
          {
            tx_key_images_ring_address = tx_key_images_ring_address.substr(0,tx_key_images_ring_address.length - 2);
            tx_key_images_ring_tx_hash = tx_key_images_ring_tx_hash.substr(0,tx_key_images_ring_tx_hash.length - 2);
            tx_key_images_ring_block_height = tx_key_images_ring_block_height.substr(0,tx_key_images_ring_block_height.length - 2);
            var tx_extra = tx_data.extra;
             res.json({
              "tx_block_height":obj.txs[0].block_height,
              "tx_block_timestamp":obj.txs[0].block_timestamp,
              "tx_version":tx_data.version,
              "tx_unlock_block":tx_data.unlock_time,
              "tx_ringsize":tx_ringsize,
              "tx_key_images":tx_key_images,
              "tx_key_images_ring_address":tx_key_images_ring_address,
              "tx_key_images_ring_tx_hash":tx_key_images_ring_tx_hash, 
              "tx_key_images_ring_block_height":tx_key_images_ring_block_height
            });
          }
      });
});
var get_ring_addresses_data = {"outputs":[]};
for (var count2 = 0; count2 < tx_ringsize; count2++, counter++)
{
get_ring_addresses_data.outputs[count2] = {"amount":0,"index":tx_key_images_ring_address_count[counter]};
}
post_req.end(JSON.stringify(get_ring_addresses_data));
get_ring_addresses_data = "";
}


     
      
      
      
}
else
{
        res.json({
                "tx_block_height":obj.txs[0].block_height,
                "tx_block_timestamp":obj.txs[0].block_timestamp,
                "tx_version":tx_data.version,
                "tx_settings":tx_settings,
                "tx_ringct_version":tx_data.rct_signatures.type,
                "tx_size":obj.txs[0].as_hex.length / 1024 / 2,
                "tx_unlock_block":tx_data.unlock_time,
                "tx_extra":Buffer.from(tx_data.extra).toString("hex"),
                "tx_address":tx_data.vout[0].target.key,
                "tx_address_amount":tx_data.vout[0].amount / WALLET_DECIMAL_PLACES_AMOUNT,
                });
}      
     
    }
    catch (error)
    {
      res.status(400).json(GET_TRANSACTION_DATA_ERROR);
    } 
     
  });
});
httprequest.setTimeout(HTTP_REQUEST_TIMEOUT, () => httprequest.abort());
httprequest.on('error', response => res.status(400).json(GET_TRANSACTION_DATA_ERROR));
})
*/





/*
app.post('/gettransactionconfirmations', urlencodedParser, function (req, res) {
// gets the transaction confirmations
// parameters
// tx_hash = the transaction hash
var get_transaction_confirmations_data = GET_TRANSACTION_CONFIRMATIONS_DATA;
get_transaction_confirmations_data = get_transaction_confirmations_data.replace("transaction_hash",req.body.tx_hash);
var httprequest = new http.ClientRequest(DAEMON_HOSTNAME_AND_PORT_GET_TRANSACTION_DATA);
httprequest.end(get_transaction_confirmations_data);

var tx_block_height;
var current_block_height;
var tx_confirmations;

httprequest.on('response', function (response) {
  response.setEncoding('utf8');
  var result = "";
  response.on('data', chunk => result += chunk);
  response.on('end', function () {
    try
    { 
      var obj = JSON.parse(result);
      if (result == "" || result.indexOf("error") != -1)
      {
        throw("error");
      }
      tx_block_height = obj.txs[0].block_height;
      var post_req = new http.ClientRequest(DAEMON_HOSTNAME_AND_PORT);
      post_req.end(GET_BLOCK_COUNT);
      post_req.on('response', function (response) {
      response.setEncoding('utf8');
      var result = "";
      response.on('data', chunk => result += chunk);
      response.on('end', function () {
        try
        { 
          var obj = JSON.parse(result);
          if (result == "" || result.indexOf("error") != -1)
          {
            throw("error");
          } 
          current_block_height = obj.result.count;
          tx_confirmations = current_block_height - tx_block_height;      
          res.json({"tx_confirmations":tx_confirmations});
    }
    catch (error)
    {
      res.status(400).json(GET_TRANSACTION_CONFIRMATIONS_DATA_ERROR);
    }    
  });
});
post_req.setTimeout(HTTP_REQUEST_TIMEOUT, () => post_req.abort());
post_req.on('error', response => res.status(400).json(GET_TRANSACTION_CONFIRMATIONS_DATA_ERROR));       
    }
    catch (error)
    {
      res.status(400).json(GET_TRANSACTION_CONFIRMATIONS_DATA_ERROR);
    }    
  });
});
httprequest.setTimeout(HTTP_REQUEST_TIMEOUT, () => httprequest.abort());
httprequest.on('error', response => res.status(400).json(GET_TRANSACTION_CONFIRMATIONS_DATA_ERROR));
})
*/

app.get('/tx*', (req, res) => res.redirect('https://explorer.x-cash.org/Transaction?data='+req.url.replace("/tx/","")))

app.use('*', (req, res) => res.sendFile("/var/www/html/index.html"));

var server = app.listen(8000, function (req,res) {    
var host = server.address().address
var port = server.address().port
})

