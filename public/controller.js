var container = null;
var container_bounding = null;
var b_canvas = null;
var b_ctx = null
var f_canvas = null;
var f_ctx = null;

var start_time = null;
var last_timestamp = null;
var pause = false;
var time_since_last_update = 0;
var update_wait = 1000 * 60 * 0.1;

var charts = [];
var chart_subscriptions = {"BTC":[]};

var selected_coin_name = "ETH";

var num_nodes = 100;

$( document ).ready(function() {
    console.log(coin_model.coinlist);
    container = document.getElementById("main_display");
    container_bounding = container.getBoundingClientRect();
    graph_container = document.getElementById("graph");
    graph_container_bounding = graph_container.getBoundingClientRect();
     
    b_canvas = document.createElement("canvas");
    b_canvas.setAttribute("id","background-canvas");
    b_canvas.setAttribute("width", container_bounding.width);
    b_canvas.setAttribute("height", container_bounding.height);
    b_canvas.style.position = "absolute";
    b_ctx = b_canvas.getContext("2d");

    f_canvas = document.createElement("canvas");
    f_canvas.setAttribute("id","foreground-canvas");
    f_canvas.setAttribute("width", container_bounding.width);
    f_canvas.setAttribute("height", container_bounding.height);
    f_canvas.style.position = "absolute";
    f_ctx = f_canvas.getContext("2d");

    container.prepend(b_canvas);
    container.appendChild(f_canvas);

    let i_chart = new chart(graph_container_bounding, num_nodes, window.performance.now(), f_ctx, update_wait);
    charts.push(i_chart);
    i_chart.subscribe(selected_coin_name);
    updator(window.performance.now());
});

function updator(timestamp){
    start_time = start_time == null ? timestamp : start_time;
    last_timestamp = last_timestamp == null ? timestamp : last_timestamp;
    var time_since_last_frame = timestamp - last_timestamp;
    time_since_last_update += time_since_last_frame;
    var p = time_since_last_update / update_wait;

    if(time_since_last_update > update_wait){
        time_since_last_update = 0;
        
        update_prices();
        text_update();

    }
    var p = time_since_last_update / update_wait;
    f_ctx.clearRect(0,0, container_bounding.width, container_bounding.height);
    charts_run('frame_update', timestamp);
    last_timestamp = timestamp;
    requestAnimationFrame(updator);
}

function charts_run(func, ts){
    charts.forEach((c)=>{c[func](ts)});
}

function text_update(){
    var coin = coin_model.coins[selected_coin_name];
    let owned = get_owned(selected_coin_name);
    let value = owned * coin.data.price;
    if(!coin.data) return;
    $("#main_title").text(selected_coin_name != "PORT" ? coin_model.coinlist[selected_coin_name] : "Portfolio");
    $("#price").text(`$${Math.round(coin.data.price * 100) / 100}`);
    $("#price").css({color: coin.up ? "green" : "red"});
    $("#coins").empty();
    for(let c = 0; c < Object.keys(coin_model.coins).length; c++){
        let symbol = Object.keys(coin_model.coins)[c];
        let name = coin_model.coinlist[symbol];
        var c_obj = coin_model.coins[symbol];
        var div_string = 
        `<div class="coin-panel${symbol == selected_coin_name ? " selected-coin-panel" : ""}" id="${symbol+c}" value="${symbol}">
            <div class="coin-panel-head"><p>${symbol}</p></div>
            <div class="coin-panel-graph" id="${symbol+c+"price"}"><span>${Math.round(c_obj.data.price)}</span></div>
            <div class="coin-panel-body"><span>${Math.round(get_owned(symbol)*100)/100}</span></div>
        </div>`;
        $("#coins").append(div_string);
        $("#"+symbol+c+"price").css("color", c_obj.up ? "green" : "red");
        $("#"+symbol+c).click(function(){
                window.selected_coin_name = $(this).attr('value');
                var coin = coin_model.coins[window.selected_coin_name];
                charts[0].init_chart(coin);
                charts[0].node_update(window.performance.now());
                window.text_update();
                
            }     
        )
    }
    for(let c = 0; c < Object.keys(coin_model.loading_coins).length; c++){
        let symbol = Object.keys(coin_model.loading_coins)[c];
        let name = coin_model.coinlist[symbol];
        var c_obj = coin_model.loading_coins[symbol];
        var div_string = 
        `<div class="coin-panel${symbol == selected_coin_name ? " selected-coin-panel" : ""}" id="${symbol+c}" value="${symbol}">
            <div class="coin-panel-head"><p>${symbol}</p></div>
            <div class="coin-panel-graph" id="${symbol+c+"price"}"><span>LOADING</span></div>
            <div class="coin-panel-body"><span>${Math.round(get_owned(symbol)*100)/100}</span></div>
        </div>`;
        $("#coins").append(div_string);
        $("#"+symbol+c+"price").css("color", c_obj.up ? "green" : "red");
    }

    $(".coin-panel-body").click(function(){
        populate_portfolio();
        $('#portfolio-modal').modal('show');
    });
    if(Object.keys(coin_model.coins).length < 15){
        var div_string = 
        `<div class="coin-panel text-center" id="new-coin" data-toggle="modal" data-target="#add-modal">
            <span id="new-coin-glyph" class="glyphicon glyphicon-plus"></span>
        </div>`;
        $("#coins").append(div_string);
        $("#new-coin").click(function(){
            $("#wrong-ticker").hide();   
        });

    }
    $("#value").text(`Profit: ${Math.round((coin_model.coins['PORT'].data.price - coin_model.portfolio_cost) * 100) / 100}`);
    
}

function populate_portfolio(){
    var container = $("#portfolio-contents");
    container.empty();
    for(c in coin_model.portfolio){
        var ticker = coin_model.portfolio[c][0];
        var amount = coin_model.portfolio[c][1];
        container.append(`
        <div class="portfolio-item">
            <div class="col">${ticker}</div>
            <div class="col">${amount}</div>
        </div>
        `);
    }
    $("#wrong-ticker-add").hide(); 
}

function add_portfolio(){
    var ticker_input = $("#add-port-ticker");
    var amount_input = $("#add-port-amount");
    var new_coin_ticker = (ticker_input.val().toUpperCase());
    if(!(new_coin_ticker in coin_model.coinlist)){
        $("#wrong-ticker-add").show(); 
        return;
    }
    $("#wrong-ticker-add").hide(); 
    var new_coin_amount = parseFloat(amount_input.val());
    var already_added = false;
    for(c in coin_model.portfolio){
        if(coin_model.portfolio[c][0] == new_coin_ticker){
            if(new_coin_amount != 0){
                coin_model.portfolio[c][1] = new_coin_amount;
            }else{
                coin_model.portfolio.splice(parseInt(c), 1);
            }
            already_added = true;
            break;
        }
    }
    if(!already_added){
        coin_model.portfolio.push([new_coin_ticker, new_coin_amount]);
        get_coin_history(new_coin_ticker);
    }

    

    populate_portfolio();
}

function update_portfolio(){
    save_portfolio();
    update_port(true, false);
    text_update();
}

function add_portfolio_cost(){
    var cost_input = $("#add-port-cost").val();
    coin_model.portfolio_cost = parseFloat(cost_input);
}

function new_coin(ticker){
    var input = $("#new_coin_input");
    var new_coin_ticker = ticker ? ticker :(input.val().toUpperCase());

    if(!(new_coin_ticker in coin_model.coinlist)){
        $("#wrong-ticker").show();
        return;
    }
    $("#wrong-ticker").hide();
    $('#add-modal').modal('hide');
    
    get_coin_history(new_coin_ticker);
    text_update();
    
}
