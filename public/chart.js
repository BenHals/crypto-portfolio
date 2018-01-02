class chart {
    constructor(bounds, num_nodes, ts, ctx, update_wait){
        this.subscription = null;
        this.bounds = bounds;
        this.num_nodes = num_nodes;
        this.ctx = ctx;
        this.nodes = [];
        this.node_gap = bounds.width / (num_nodes - 2);
        this.coin = {data: {min: -1, max: 1, min_last: -1, max_last: 1, price: 0, ts: ts}, history: new Array(num_nodes).fill(0)};
        this.x_delta = this.node_gap / (update_wait/1000);
        this.y_delta = 30;
        for(let i = 0; i < num_nodes; i++){
            let r = Math.floor(Math.random()*255);
            let g = Math.floor(Math.random()*255);
            let b = Math.floor(Math.random()*255);
            this.nodes.push({attrs:{
                x: {value: bounds.left + this.node_gap*i, set: bounds.left + this.node_gap*i, ts: ts, type: 'was', delta: this.x_delta},
                y: {value: this.scale_y(this.coin.history[i]), set: this.scale_y(this.coin.history[i]), ts: ts, type: 'will', delta: this.y_delta},
                color_r: {value: r, set: r, ts: ts, type: 'will', delta: this.y_delta, round:true},
                color_g: {value: g, set: g, ts: ts, type: 'will', delta: this.y_delta, round:true},
                color_b: {value: b, set: b, ts: ts, type: 'will', delta: this.y_delta, round:true},
            }, id: i});
        }

        
    }

    subscribe(symbol){
        this.subscription = symbol;
    }

    init_chart(coin){
        this.coin = coin;
        this.subscription = coin.symbol;
    }

    scale_y(y){
        let s_y = this.bounds.bottom - (y - this.coin.data.min)/(this.coin.data.max-this.coin.data.min) * this.bounds.height;
        return s_y;
    }

    frame_update(ts){
        for(let n = 0; n < this.nodes.length; n++){
            let node = this.nodes[n];
            Object.entries(node.attrs).forEach(element => {
                let time_delta = (ts - element[1].ts)/1000;
                if(element[1].type == 'was'){
                    node.attrs[element[0]].value = parseFloat(element[1].set - (time_delta * element[1].delta))
                }else if(element[1].type == 'will'){
                    time_delta = time_delta * -1;
                    time_delta = Math.max(time_delta, 0);
                    let attr_delta = element[1].set > element[1].value ? (time_delta * element[1].delta) : (time_delta * element[1].delta) * -1;
                    node.attrs[element[0]].value = element[1].round ? Math.round(parseFloat(element[1].set - attr_delta)) : parseFloat(element[1].set - attr_delta);
                }
            });
        }
        this.draw();
    }

    new_price(ts){
        let left_node = this.nodes.shift();
        left_node.attrs.x = {value: this.bounds.right + this.node_gap, set: this.bounds.right + this.node_gap, ts: ts, type: 'was', delta: this.x_delta};
        //left_node.attrs.y = {value: this.scale_y(this.coin.data.price), set: this.scale_y(this.coin.data.price), ts: ts, type: 'will', delta: this.y_delta};
        this.nodes.push(left_node);

        this.node_update(ts);
    }

    node_update(ts){
        for(let n = 0; n < this.nodes.length; n++){
            let node = this.nodes[n];
            let set_val = this.coin.history[n][0];
            let val = n != this.nodes.length - 1 ? node.attrs.y.value : this.scale_y(this.coin.history[n][0]);
            let time_needed = Math.abs(this.scale_y(set_val) - val)
            time_needed = time_needed / (node.attrs.y.delta);
            node.attrs.y = {value: val, set: this.scale_y(set_val), ts: ts + time_needed*1000, type: 'will', delta: this.y_delta};
        }

    }



    draw(){
        this.ctx.clearRect(0,0, this.bounds.width, this.bounds.height);
        for(var n = 0; n < this.nodes.length - 1; n++){
            let node = this.nodes[n];
            let next_node = this.nodes[n+1];
            let raw_x = node.attrs.x.value;
            let raw_y = node.attrs.y.value;
            let raw_x_next = next_node.attrs.x.value;
            let raw_y_next = next_node.attrs.y.value;
            let [clamp_x, clamp_y, clamp_x_next, clamp_y_next] = this.clamp_xy(raw_x, raw_y, raw_x_next, raw_y_next);
            let rbg_str = "rgb("+node.attrs.color_r.value+","+node.attrs.color_g.value+","+node.attrs.color_b.value+")";
            
            
            this.ctx.beginPath();
            
            this.ctx.moveTo(clamp_x, clamp_y);
            this.ctx.lineTo(clamp_x_next, clamp_y_next);
            this.ctx.strokeStyle = rbg_str;
            this.ctx.stroke();
            this.ctx.closePath();
            
        }
    }

    clamp_xy(raw_x, raw_y, raw_x_next, raw_y_next){
        if(raw_x < this.bounds.left && raw_x_next < this.bounds.left){
            return [0, 0, 0, 0];
        }
        if(raw_x < this.bounds.left){
            var diff = this.bounds.left - raw_x;
            var prop = diff/this.node_gap;
            raw_x = this.bounds.left;
            raw_y = (prop) * raw_y_next + (1-prop) * raw_y;
        }
        if(raw_x_next > this.bounds.right){
            var diff = raw_x_next - this.bounds.right;
            var prop = diff/this.node_gap;
            raw_x_next = this.bounds.right;
            raw_y_next = (prop) * raw_y + (1-prop) * raw_y_next;
        }
        return [raw_x, raw_y, Math.min(Math.max(raw_x_next, this.bounds.left), this.bounds.right), raw_y_next]
    }
}