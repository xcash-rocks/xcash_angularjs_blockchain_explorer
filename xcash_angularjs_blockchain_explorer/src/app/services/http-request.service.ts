import {Injectable} from '@angular/core';
import {HttpClient, HttpHeaders, HttpParams} from '@angular/common/http';

@Injectable()
export class httpdataservice{
constructor(private httpClient: HttpClient) {}

WALLET_DECIMAL_PLACES_AMOUNT = 1000000;
UNENCRYPTED_PAYMENT_ID:string = "022100";
ENCRYPTED_PAYMENT_ID:string = "020901";

SERVER_HOSTNAME_AND_PORT_SEND_HEXADECIMAL_TRANSACTION:string = "https://explorer.xcash.foundation/sendhexadecimaltransaction";
SERVER_HOSTNAME_AND_PORT_GET_CURRENT_BLOCK_HEIGHT:string = "https://explorer.xcash.foundation/getcurrentblockheight";
SERVER_HOSTNAME_AND_PORT_GET_BLOCKCHAIN_DATA:string = "https://explorer.xcash.foundation/getblockchaindata";
SERVER_HOSTNAME_AND_PORT_GET_NODES_LIST:string = "https://explorer.xcash.foundation/getnodeslist";
SERVER_HOSTNAME_AND_PORT_GET_GENERATED_SUPPLY:string = "https://explorer.xcash.foundation/getgeneratedsupply";
SERVER_HOSTNAME_AND_PORT_GET_CIRCULATING_SUPPLY:string = "https://explorer.xcash.foundation/getcirculatingsupply";
SERVER_HOSTNAME_AND_PORT_GET_LAST_BLOCK_DATA:string = "https://explorer.xcash.foundation/getlastblockdata";
SERVER_HOSTNAME_AND_PORT_GET_BLOCK_DATA:string = "https://explorer.xcash.foundation/getblockdata";
SERVER_HOSTNAME_AND_PORT_GET_TX_POOL_DATA:string = "https://explorer.xcash.foundation/gettransactionpooldata";
SERVER_HOSTNAME_AND_PORT_GET_BLOCKCHAIN_DATA_SETTINGS:string = "https://explorer.xcash.foundation/getblockchaindatasettings";
SERVER_HOSTNAME_AND_PORT_GET_BLOCK_TRANSACTION_DATA:string = "https://explorer.xcash.foundation/getblocktransactiondata";
SERVER_HOSTNAME_AND_PORT_GET_TRANSACTION_DATA:string = "https://explorer.xcash.foundation/gettransactiondata";
SERVER_HOSTNAME_AND_PORT_VERIFY_RESERVE_PROOF:string = "https://explorer.xcash.foundation/verifyreserveproofapi";
SERVER_HOSTNAME_AND_PORT_VERIFY_PREMINE_FUNDS_AIRDROP:string = "https://explorer.xcash.foundation/verifypreminefundsairdrop";
SERVER_HOSTNAME_AND_PORT_VERIFY_PREMINE_FUNDS_XCASH:string = "https://explorer.xcash.foundation/verifypreminefundsxcash";
SERVER_HOSTNAME_AND_PORT_VERIFY_PREMINE_FUNDS_XCASH_REWARDS:string = "https://explorer.xcash.foundation/verifypreminefundsxcashrewards";
SERVER_HOSTNAME_AND_PORT_VERIFY_PREMINE_FUNDS_XCASH_INVESTORS:string = "https://explorer.xcash.foundation/verifypreminefundsxcashinvestors";
SERVER_HOSTNAME_AND_PORT_GET_TRANSACTION_CONFIRMATIONS:string = "https://explorer.xcash.foundation/gettransactionconfirmations";
SERVER_HOSTNAME_AND_PORT_CREATE_INTEGRATED_ADDRESS:string = "https://explorer.xcash.foundation/createintegratedaddressapi";
SERVER_HOSTNAME_AND_PORT_GET_LAST_BLOCKS_TRANSACTION_DATA:string = "https://explorer.xcash.foundation/getlastblockstransactiondata";
SERVER_HOSTNAME_AND_PORT_GET_TRANSACTION_DATA_SEARCH_RESULTS:string = "https://explorer.xcash.foundation/gettransactiondatasearchresults";
SERVER_HOSTNAME_AND_PORT_GET_CHART_DATA:string = "https://explorer.xcash.foundation/getchartdata";
SERVER_HOSTNAME_AND_PORT_GET_MARKET_DATA:string = "https://explorer.xcash.foundation/getmarketdata";
SERVER_HOSTNAME_AND_PORT_GET_HISTORICAL_MARKET_DATA:string = "https://explorer.xcash.foundation/gethistoricalmarketdata";

/*SERVER_HOSTNAME_AND_PORT_SEND_HEXADECIMAL_TRANSACTION:string = "http://localhost:8000/sendhexadecimaltransaction";
SERVER_HOSTNAME_AND_PORT_GET_CURRENT_BLOCK_HEIGHT:string = "http://localhost:8000/getcurrentblockheight";
SERVER_HOSTNAME_AND_PORT_GET_BLOCKCHAIN_DATA:string = "http://localhost:8000/getblockchaindata";
SERVER_HOSTNAME_AND_PORT_GET_NODES_LIST:string = "http://localhost:8000/getnodeslist";
SERVER_HOSTNAME_AND_PORT_GET_GENERATED_SUPPLY:string = "http://localhost:8000/getgeneratedsupply";
SERVER_HOSTNAME_AND_PORT_GET_CIRCULATING_SUPPLY:string = "http://localhost:8000/getcirculatingsupply";
SERVER_HOSTNAME_AND_PORT_GET_LAST_BLOCK_DATA:string = "http://localhost:8000/getlastblockdata";
SERVER_HOSTNAME_AND_PORT_GET_BLOCK_DATA:string = "http://localhost:8000/getblockdata";
SERVER_HOSTNAME_AND_PORT_GET_TX_POOL_DATA:string = "http://localhost:8000/gettransactionpooldata";
SERVER_HOSTNAME_AND_PORT_GET_BLOCKCHAIN_DATA_SETTINGS:string = "http://localhost:8000/getblockchaindatasettings";
SERVER_HOSTNAME_AND_PORT_GET_BLOCK_TRANSACTION_DATA:string = "http://localhost:8000/getblocktransactiondata";
SERVER_HOSTNAME_AND_PORT_GET_TRANSACTION_DATA:string = "http://localhost:8000/gettransactiondata";
SERVER_HOSTNAME_AND_PORT_VERIFY_RESERVE_PROOF:string = "http://localhost:8000/verifyreserveproofapi";
SERVER_HOSTNAME_AND_PORT_VERIFY_PREMINE_FUNDS_AIRDROP:string = "http://localhost:8000/verifypreminefundsairdrop";
SERVER_HOSTNAME_AND_PORT_VERIFY_PREMINE_FUNDS_XCASH:string = "http://localhost:8000/verifypreminefundsxcash";
SERVER_HOSTNAME_AND_PORT_VERIFY_PREMINE_FUNDS_XCASH_REWARDS:string = "http://localhost:8000/verifypreminefundsxcashrewards";
SERVER_HOSTNAME_AND_PORT_VERIFY_PREMINE_FUNDS_XCASH_INVESTORS:string = "http://localhost:8000/verifypreminefundsxcashinvestors";
SERVER_HOSTNAME_AND_PORT_GET_TRANSACTION_CONFIRMATIONS:string = "http://localhost:8000/gettransactionconfirmations";
SERVER_HOSTNAME_AND_PORT_CREATE_INTEGRATED_ADDRESS:string = "http://localhost:8000/createintegratedaddressapi";
SERVER_HOSTNAME_AND_PORT_GET_LAST_BLOCKS_TRANSACTION_DATA:string = "http://localhost:8000/getlastblockstransactiondata";
SERVER_HOSTNAME_AND_PORT_GET_TRANSACTION_DATA_SEARCH_RESULTS:string = "http://localhost:8000/gettransactiondatasearchresults";
SERVER_HOSTNAME_AND_PORT_GET_CHART_DATA:string = "http://localhost:8000/getchartdata";
SERVER_HOSTNAME_AND_PORT_GET_MARKET_DATA:string = "http://localhost:8000/getmarketdata";
SERVER_HOSTNAME_AND_PORT_GET_HISTORICAL_MARKET_DATA:string = "http://localhost:8000/gethistoricalmarketdata";*/

/*SERVER_HOSTNAME_AND_PORT_SEND_HEXADECIMAL_TRANSACTION:string = "http://94.130.96.48/sendhexadecimaltransaction";
SERVER_HOSTNAME_AND_PORT_GET_CURRENT_BLOCK_HEIGHT:string = "http://94.130.96.48/getcurrentblockheight";
SERVER_HOSTNAME_AND_PORT_GET_BLOCKCHAIN_DATA:string = "http://94.130.96.48/getblockchaindata";
SERVER_HOSTNAME_AND_PORT_GET_NODES_LIST:string = "http://94.130.96.48/getnodeslist";
SERVER_HOSTNAME_AND_PORT_GET_GENERATED_SUPPLY:string = "http://94.130.96.48/getgeneratedsupply";
SERVER_HOSTNAME_AND_PORT_GET_CIRCULATING_SUPPLY:string = "http://94.130.96.48/getcirculatingsupply";
SERVER_HOSTNAME_AND_PORT_GET_LAST_BLOCK_DATA:string = "http://94.130.96.48/getlastblockdata";
SERVER_HOSTNAME_AND_PORT_GET_BLOCK_DATA:string = "http://94.130.96.48/getblockdata";
SERVER_HOSTNAME_AND_PORT_GET_TX_POOL_DATA:string = "http://94.130.96.48/gettransactionpooldata";
SERVER_HOSTNAME_AND_PORT_GET_BLOCKCHAIN_DATA_SETTINGS:string = "http://94.130.96.48/getblockchaindatasettings";
SERVER_HOSTNAME_AND_PORT_GET_BLOCK_TRANSACTION_DATA:string = "http://94.130.96.48/getblocktransactiondata";
SERVER_HOSTNAME_AND_PORT_GET_TRANSACTION_DATA:string = "http://94.130.96.48/gettransactiondata";
SERVER_HOSTNAME_AND_PORT_VERIFY_RESERVE_PROOF:string = "http://94.130.96.48/verifyreserveproofapi";
SERVER_HOSTNAME_AND_PORT_VERIFY_PREMINE_FUNDS_AIRDROP:string = "http://94.130.96.48/verifypreminefundsairdrop";
SERVER_HOSTNAME_AND_PORT_VERIFY_PREMINE_FUNDS_XCASH:string = "http://94.130.96.48/verifypreminefundsxcash";
SERVER_HOSTNAME_AND_PORT_VERIFY_PREMINE_FUNDS_XCASH_REWARDS:string = "http://94.130.96.48/verifypreminefundsxcashrewards";
SERVER_HOSTNAME_AND_PORT_VERIFY_PREMINE_FUNDS_XCASH_INVESTORS:string = "http://94.130.96.48/verifypreminefundsxcashinvestors";
SERVER_HOSTNAME_AND_PORT_GET_TRANSACTION_CONFIRMATIONS:string = "http://94.130.96.48/gettransactionconfirmations";
SERVER_HOSTNAME_AND_PORT_CREATE_INTEGRATED_ADDRESS:string = "http://94.130.96.48/createintegratedaddressapi";
SERVER_HOSTNAME_AND_PORT_GET_LAST_BLOCKS_TRANSACTION_DATA:string = "http://94.130.96.48/getlastblockstransactiondata";
SERVER_HOSTNAME_AND_PORT_GET_TRANSACTION_DATA_SEARCH_RESULTS:string = "http://94.130.96.48/gettransactiondatasearchresults";
SERVER_HOSTNAME_AND_PORT_GET_CHART_DATA:string = "http://94.130.96.48/getchartdata";
SERVER_HOSTNAME_AND_PORT_GET_MARKET_DATA:string = "http://94.130.96.48/getmarketdata";
SERVER_HOSTNAME_AND_PORT_GET_HISTORICAL_MARKET_DATA:string = "http://94.130.96.48/gethistoricalmarketdata";*/



Timer:any;

get_request(url:string)
{
return this.httpClient.get(url);
}

post_request(url:string, data:string)
{
const headers = new HttpHeaders ({'Content-Type':'application/x-www-form-urlencoded'});
return this.httpClient.post(url,data, {headers: headers});
}

post_request_json(item: any[])
{
const headers = new HttpHeaders ({'Content-Type':'application/json'});
return this.httpClient.post('url',item, {headers: headers});
}

get_payment_id(tx_extra:string)
{
return tx_extra.substr(0,6) === this.UNENCRYPTED_PAYMENT_ID ? tx_extra.substr(6,64) : tx_extra.substr(0,6) === this.ENCRYPTED_PAYMENT_ID ? tx_extra.substr(6,16) : "none";
}

get_payment_id_settings(tx_extra:string)
{
return tx_extra.substr(0,6) === this.UNENCRYPTED_PAYMENT_ID ? "unencrypted" : tx_extra.substr(0,6) === this.ENCRYPTED_PAYMENT_ID ? "encrypted" : "none";
}

converthexadecimaltostring(hexadecimal:string)
{
var str = "";
for (var count = 0, counter = 0; counter < hexadecimal.length; count++, counter += 2)
{
str += String.fromCharCode(parseInt(hexadecimal.substr(counter,2),16));
}
return str;
}

get_public_tx_data(tx_extra:string)
{
  var public_tx_data_array = [];
  var count = tx_extra.indexOf("02647c584341");
  public_tx_data_array.push({
      "tx_private_key":tx_extra.substr(tx_extra.indexOf("02227c") + 6,64),
      "tx_signature":this.converthexadecimaltostring(tx_extra.substr(tx_extra.indexOf("025f7c536967") + 6,186)),
      "address1":this.converthexadecimaltostring(tx_extra.substr(count + 6,196)),
      "address2":this.converthexadecimaltostring(tx_extra.substr(tx_extra.indexOf("02647c584341",count+12) + 6,196))
    });
  return public_tx_data_array;
}

}
