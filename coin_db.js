const rp = require('request-promise');

async function fetch_list(){
    const options = {
        method: 'GET',
        uri: "https://min-api.cryptocompare.com/data/all/coinlist",
        json: true,
    }
    return rp(options)
    .then(function(response){
        return(Object.entries(response.Data).reduce((a, c)=>{ a[c[0]] = c[1].CoinName; return a}, {}));
    })
    .catch(function(err){
        return(err);
    });
}

async function fetch_coin_history(symbol){
    console.log(symbol);
    const options = {
        method: 'GET',
        uri: `https://min-api.cryptocompare.com/data/histominute?fsym=${symbol}&tsym=USD&limit=100`,
        json: true,
    }
    console.log(options.uri);
    return rp(options)
    .then(function(response){
        console.log(response);
        let history = response.Data.map((e)=>[e.close, e.time]);
        return({data:{}, history: history});
    })
    .catch(function(err){
        return(err);
    });
}

async function fetch_coin_price(symbol){
    console.log(symbol);
    const options = {
        method: 'GET',
        uri: `https://min-api.cryptocompare.com/data/price?fsym=${symbol}&tsyms=USD`,
        json: true,
    }
    console.log(options.uri);
    return rp(options)
    .then(function(response){
        console.log(response);
        return(response);
    })
    .catch(function(err){
        return(err);
    });
}

module.exports = {
    fetch_list,
    fetch_coin_history,
    fetch_coin_price,
}