const server = "http://localhost:8080/";
const default_portfolio = [["BTC", 1], ["ETH", 1]];

const coin_model = {};
coin_model.coins = {};
coin_model.loading_coins = {};
get_coinlist().then((val)=>coin_model.coinlist = val);
get_portfolio().then((val)=>{coin_model.portfolio = val[0]; coin_model.portfolio_cost = val[1]});
 

async function get_coinlist(){
    const options = {
        uri: server+"coinlist",
        json: true
    }

    let req = await $.get(options.uri, ()=>{console.log("sent")})
        .done((coins)=>{
            console.log(coins);
            return coins
        })
        .fail((err)=>{
            console.log(err);
            throw err;
        });
    
        return req;
}

async function get_portfolio(){
    let cookie = "; " + document.cookie;
    let cookie_split = cookie.split("; portfolio=");
    let portfolio = cookie_split.length > 1 ? JSON.parse(cookie_split[1].split(";")[0]) : default_portfolio;
    cookie_split = cookie.split("; portfolio_cost=");
    let port_cost = cookie_split.length > 1 ? JSON.parse(cookie_split[1].split(";")[0]) : 0;


    portfolio.forEach(element => {
        get_coin_history(element[0]);
    });
    selected_coin_name = portfolio[0][0];
    let port_coin = {};
    port_coin.symbol = "PORT";
    port_coin.history = null;
    port_coin.data = {};
    coin_model.coins["PORT"] = port_coin;
    return [portfolio, port_cost];
}

async function get_coin_history(symbol){
    const options = {
        uri: `${server}coinhistory/${symbol}`,
        json: true
    }
    console.log(symbol);
    coin_model.loading_coins[symbol] = {symbol: symbol, data:{price: "loading"}};
    $.get(options.uri, ()=>{console.log("sent")})
        .done((coin_data)=>{
            let hist = coin_data.history.slice(coin_data.history.length-num_nodes, coin_data.history.length);
            coin_data.symbol = symbol;
            coin_data.data.min = Math.min(...hist.map((e)=>e[0]));
            coin_data.data.min_last = coin_data.data.min;
            coin_data.data.max = Math.max(...hist.map((e)=>e[0]));
            coin_data.data.max_last = coin_data.data.max;
            [coin_data.data.price, coin_data.data.ts] = hist[hist.length-1];
            coin_data.history = hist;
            console.log(coin_data);
            coin_model.coins[symbol] = coin_data;
            delete coin_model.loading_coins[symbol];

            charts.filter((c)=> c.subscription == symbol).forEach((chart)=>{
                chart.init_chart(coin_model.coins[symbol]);
                chart.node_update(window.performance.now());
            });

            
        })
        .fail((err)=>{
            console.log(err);
            throw err;
        })
}

function get_owned(symbol){
    if(symbol == "PORT") return 1;
    for(let i = 0; i < coin_model.portfolio.length; i++){
        let el = coin_model.portfolio[i];
        if(el[0] == symbol) return el[1];
    };
    return 0;
}

async function update_prices(){
    Object.keys(coin_model.coins).forEach((symbol)=>{
        if(symbol == "PORT") return;
        let coin = coin_model.coins[symbol];
        const options = {
            uri: `${server}coinprice/${symbol}`,
            json: true
        }
        console.log(symbol);
        $.get(options.uri, ()=>{console.log("sent")})
            .done((latest_price)=>{
                let hist = coin.history.slice(coin.history.length-num_nodes, coin.history.length);
                latest_price = latest_price["USD"];
                coin.up = latest_price >= coin.data.price;
                coin.data.price = latest_price;
                coin.history.shift();
                coin.history.push([latest_price, window.performance.now()]);
                coin.data.min_last = coin.data.min;
                coin.data.min = Math.min(...hist.map((e)=>e[0]));
                coin.data.max_last = coin.data.max;
                coin.data.max = Math.max(...hist.map((e)=>e[0]));
                
                charts.filter((c)=> c.subscription == symbol).forEach((chart)=>{
                    chart.new_price(window.performance.now());
                });

            })
            .fail((err)=>{
                console.log(err);
                throw err;
            })
    });

    update_port(coin_model.coins["PORT"].history == null, true);
}

function save_portfolio(){
    setCookie("portfolio", JSON.stringify(coin_model.portfolio), 365);
    setCookie("portfolio_cost", JSON.stringify(coin_model.portfolio_cost), 365);
}
function setCookie(name,value,days) {
    var expires = "";
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days*24*60*60*1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "")  + expires + "; path=/";
}
function update_port(new_history, new_element){
    let coin = coin_model.coins["PORT"];
    if(new_history) coin.history = calc_port_history();
    let time_sum = 0;
    var ts = 0;
    coin_model.portfolio.forEach(element => {
        let symbol = element[0];
        let [node_price, ts_node] = coin_model.coins[symbol].history[coin_model.coins[symbol].history.length - 1];
        time_sum += element[1] * node_price;
        ts = ts_node;
    });
    if(new_element){
        coin.history.shift();
        coin.history.push([time_sum, window.performance.now()]);
    }
    coin.up = time_sum >= coin.data.price;
    coin.data.price = time_sum;
    coin.data.min_last = coin.data.min || Math.min(...coin.history.map((e)=>e[0]));
    coin.data.min = Math.min(...coin.history.map((e)=>e[0]));
    coin.data.max_last = coin.data.max || Math.max(...coin.history.map((e)=>e[0]));
    coin.data.max = Math.max(...coin.history.map((e)=>e[0]));

    charts.filter((c)=> c.subscription == "PORT").forEach((chart)=>{
        chart.new_price(window.performance.now());
    });
}

function calc_port_history(){
    let history = [];
    for(let i = 0; i < num_nodes; i++){
        let time_sum = 0;
        var ts = 0;
        coin_model.portfolio.forEach(element => {
            let symbol = element[0];
            if(symbol in coin_model.loading_coins) return;
            let [node_price, ts_node] = coin_model.coins[symbol].history[i];
            time_sum += element[1] * node_price;
            ts = ts_node;
        });
        history.push([time_sum, ts]);
    }
    return history;
}