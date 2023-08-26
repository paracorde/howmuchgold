let level_xp = [
    2, // 1
    2, // 2
    6, // 3
    10, // 4
    24, // 5
    40, // 6
    60, // 7
    84, // 8
    100 // 9
]

let shop_odds = [
    [1.00], // 1
    [1.00], // 2
    [0.75, 0.25], // 3
    [0.55, 0.30, 0.15], // 4
    [0.45, 0.33, 0.20, 0.2], // 5
    [0.25, 0.40, 0.30, 0.05], // 6
    [0.19, 0.30, 0.35, 0.15, 0.01], // 7
    [0.16, 0.20, 0.35, 0.25, 0.04], // 8
    [0.09, 0.15, 0.30, 0.30, 0.16], // 9
    [0.05, 0.10, 0.20, 0.40, 0.25], // 10
    [0.01, 0.02, 0.12, 0.50, 0.35] // 11 (can't reach without high-end, which doesn't exist atm)
];

let copies_by_tier = [29, 22, 18, 12, 10];
let units_by_tier = [13, 13, 13, 12, 8];

let pool_total = [];

for (let i = 0; i < 5; i++){
    pool_total.push(copies_by_tier[i]*units_by_tier[i])
}

function roll_slot(sodds){
    let running = 0;
    let r = Math.random();
    for (let i = 0; i < 5; i++){
        running += sodds[i];
        if (r < running){
            return i;
        }
    }
}

function roll_unit(cost, wanted, pool){
    let running = 0;
    let r = Math.random();
    for (let i in wanted[cost]){
        running += (copies_by_tier[cost]-wanted[cost][i].contested)/pool;
        if (r < running){
            if (wanted[cost][i].wanted == 0) return false;
            wanted[cost][i].contested += 1;
            wanted[cost][i].wanted -= 1;
            return true;
        }
    }
    return false;
}

// wanted is a dict of {cost:[array of {cost: x, wanted: y, contested: z}]}
function sim_once(sodds, wanted, taken){
    let total_wanted = 0;
    let wanted_by_cost = [0, 0, 0, 0, 0];
    let copies_by_cost = [0, 0, 0, 0, 0];
    for (let i = 0; i < 5; i++){
        if (wanted[i].length > 0 && sodds.length <= i){
            return Infinity;
        }
    }
    let local_wanted = {}; // make deep copy of wanted argument so the sim doesn't change the inputs
    for (let c in wanted){
        local_wanted[c] = [];
        for (let i in wanted[c]){
            let w = wanted[c][i];
            local_wanted[c].push({...w});
            total_wanted += w.wanted;
            wanted_by_cost[c] += w.wanted;
            copies_by_cost[c] += copies_by_tier[c];
        }
    }

    let local_taken = [...taken]; // make copy
    let total_gold = 0;

    while (total_wanted > 0){
        total_gold += 2;
        for (let i = 0; i < 5; i++){ // roll rarity for each shop slot
            let cost = roll_slot(sodds);
            if (wanted_by_cost[cost] == 0) continue;
            let unit = roll_unit(cost, local_wanted, pool_total[cost]-local_taken[cost]);
            if (unit){
                total_gold += cost+1;
                local_taken[cost] += 1;
                total_wanted -= 1;
                wanted_by_cost[cost] -= 1;
            }
        }
    }
    
    return total_gold;
}

function calc(level, wanted, taken){
    let golds = [];
    let total_total_gold = 0;
    const iterations = 5000;
    for (let i = 0; i < iterations; i++){
        let x = sim_once(shop_odds[level], wanted, taken);
        total_total_gold += x;
        golds.push(x);
        if (total_total_gold == Infinity) return Infinity;
    }
    golds.sort(function(a, b){return a-b;});
    if (iterations%2 == 0) return (golds[~~(iterations/2)]+golds[~~(iterations/2)+1])/2;
    return golds[~~(iterations/2)];
    // return golds[iterations/2];
}

function wrap_and_setup(input_field, input_type){ // https://stackoverflow.com/a/18453767
    input_field.classList.add(input_type);
    input_field.setAttribute("type", "number");
    if (input_type == "cost"){
        input_field.setAttribute("value", "1")
        input_field.setAttribute("min", "1");
        input_field.setAttribute("max", "5");
    }else{
        input_field.setAttribute("value", "0")
        input_field.setAttribute("min", "0");
        input_field.setAttribute("max", "29");
    }
    wrapper = document.createElement("div");
    wrapper.appendChild(document.createTextNode(input_type+":"));
    wrapper.appendChild(input_field);
    return wrapper;
}

window.add_constraint = function(){
    let cgrid = document.getElementById("constraints_grid");

    let cost_input = document.createElement("input");
    let wanted_input = document.createElement("input");
    let contested_input = document.createElement("input");

    let wrapped_cost = wrap_and_setup(cost_input, "cost");
    let wrapped_wanted = wrap_and_setup(wanted_input, "wanted");
    let wrapped_contested = wrap_and_setup(contested_input, "contested");

    let constraint_div = document.createElement("div");
    constraint_div.classList.add("constraint_div");
    let delete_button = document.createElement("button");
    delete_button.appendChild(document.createTextNode("x"));
    delete_button.onclick = function(){
        cgrid.removeChild(constraint_div);
    }
    constraint_div.appendChild(wrapped_cost);
    constraint_div.appendChild(wrapped_wanted);
    constraint_div.appendChild(wrapped_contested);
    constraint_div.appendChild(delete_button);

    cgrid.appendChild(constraint_div);
}

window.simulate = function(){
    let results = "";
    document.getElementById("results").innerHTML = "";
    let impossible = false;
    let cost_inputs = document.getElementsByClassName("cost");
    let wanted_inputs = document.getElementsByClassName("wanted");
    let contested_inputs = document.getElementsByClassName("contested");

    let taken_inputs = document.getElementsByClassName("taken");

    let taken = [];
    for(let i = 0; i < 5; i++){
        taken.push(+taken_inputs[i].value);
        if (taken[i] > pool_total[i]){
            results += "Not enough units in pool for that many " + (i+1) + " costs to be out of the pool.<br>";
            impossible = true;
        }
    }

    let wanted = {0: [], 1: [], 2: [], 3: [], 4: []};
    for (let i = 0; i < cost_inputs.length; i++){
        let cost = +(cost_inputs[i].value)-1;
        wanted[cost].push({wanted: +wanted_inputs[i].value, contested: +contested_inputs[i].value});
        if (((+wanted_inputs[i].value + +contested_inputs[i].value) > copies_by_tier[cost]) || (+wanted_inputs[i].value + taken[cost] > pool_total[cost])){
            results += "Not enough units left in pool for condition " + (i+1) + " to be possible.<br>";
            impossible = true;
        }
    }
    
    let level = +document.getElementById("level").value-1;
    let exp = document.getElementById("exp").value;
    let levelup = document.getElementById("levelup").checked;
    let ccorners = document.getElementById("ccorners").checked;
    let exp_per_pump = (levelup ? 7 : 4);
    let exp_to_next_level = level_xp[level] - (ccorners ? 4 : 0);
    if (exp > exp_to_next_level){
        results += "Exp should take you to next level.<br>";
        impossible = true;
    }
    let gold_to_level = Math.ceil((exp_to_next_level-exp)/exp_per_pump)*4;

    if (impossible){
        document.getElementById("results").innerHTML = results;
        return;
    }

    let r1 = calc(level, wanted, taken);
    if (r1 == Infinity){
        document.getElementById("results").innerHTML = results + "Impossible to hit at this level.";
        return;
    }
    results += "Rolling at level " + (level+1) + ": med. <b>" + r1 + "</b> gold<br>";
    
    if (level < 8 || ((level < 9) && (levelup || ccorners))){
        let r2 = calc(level+1, wanted, taken);
        results += "Going " + (level+2) + " to roll: med. " + r2 + "+" + gold_to_level + "=<b>" + (r2+gold_to_level) + "</b> gold<br>"; 
    }

    document.getElementById("results").innerHTML = results;
}