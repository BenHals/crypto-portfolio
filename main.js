const express = require('express');
const path = require('path');
const rp = require('request-promise');
const coin_db = require('./coin_db');

const app = express();
const port = 8080;

app.set('trust proxy', true);
app.use(express.static('public'))

app.get('/', (request, response) => {
    response.sendFile(path.join(__dirname+'/public/index.html'));
});

app.get('/coinlist', async (request, response) => {
    try {
        let res = await coin_db.fetch_list();
        response.send(res);

    }catch(e){
        console.log(e);
        response.send(e);
    }

});

app.get('/coinhistory/:symbol', async (request, response) => {
    var symbol = request.params.symbol;
    console.log(symbol);
    try {
        let res = await coin_db.fetch_coin_history(symbol);
        response.send(res);
    }catch(e){
        console.log(e);
        response.send(e);
    }
});

app.get('/coinprice/:symbol', async (request, response) => {
    var symbol = request.params.symbol;
    console.log(symbol);
    try {
        let res = await coin_db.fetch_coin_price(symbol);
        response.send(res);
    }catch(e){
        console.log(e);
        response.send(e);
    }
});

app.listen(port, (err) => {
    if(err){
        return console.log("err", err);
    }
    console.log(`listening on ${port}`);
})