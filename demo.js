var count = 0;
var countRemove = 0;
var countRemoveCompare = 1;
var storer = 0;
var storer2 = 0;


var WALL = 0,
    performance = window.performance;

$(function() {

    var $grid = $("#search_grid"),
        $selectWallFrequency = $("#selectWallFrequency"),
        $selectGridSize = $("#selectGridSize"),
        $checkDebug = $("#checkDebug"),
        $searchDiagonal = $("#searchDiagonal"),
        $checkClosest = $("#checkClosest");

    var opts = {
        wallFrequency: $selectWallFrequency.val(),
        gridSize: $selectGridSize.val(),
        debug: $checkDebug.is("checked"),
        diagonal: $searchDiagonal.is("checked"),
        closest: $checkClosest.is("checked")
    };

    var grid = new GraphSearch($grid, opts, astar.search);

    $("#btnGenerate").click(function() {
        grid.initialize();
    });

    $selectWallFrequency.change(function() {
        grid.setOption({wallFrequency: $(this).val()});
        grid.initialize();
    });

    $selectGridSize.change(function() {
        grid.setOption({gridSize: $(this).val()});
        grid.initialize();
    });

    $checkDebug.change(function() {
        grid.setOption({debug: $(this).is(":checked")});
    });

    $searchDiagonal.change(function() {
        var val = $(this).is(":checked");
        grid.setOption({diagonal: val});
        grid.graph.diagonal = val;
    });

    $checkClosest.change(function() {
        grid.setOption({closest: $(this).is(":checked")});
    });

    $("#generateWeights").click( function () {
        if ($("#generateWeights").prop("checked")) {
            $('#weightsKey').slideDown();
        } else {
            $('#weightsKey').slideUp();
        }
    });

});

var css = { start: "start", finish: "finish", wall: "wall", active: "active"};

function GraphSearch($graph, options, implementation) {
    this.$graph = $graph;
    this.search = implementation;
    this.opts = $.extend({wallFrequency:0.1, debug:true, gridSize:10}, options);
    this.initialize();
}
GraphSearch.prototype.setOption = function(opt) {
    this.opts = $.extend(this.opts, opt);
    this.drawDebugInfo();
};
GraphSearch.prototype.initialize = function() {
    this.grid = [];
    var self = this,
        nodes = [],
        $graph = this.$graph;

    $graph.empty();

    var cellWidth = ($graph.width()/this.opts.gridSize)-2,  // -2 for border
        cellHeight = ($graph.height()/this.opts.gridSize)-2,
        $cellTemplate = $("<span />").addClass("grid_item").width(cellWidth).height(cellHeight),
        startSet = false;

    for(var x = 0; x < this.opts.gridSize; x++) {
        var $row = $("<div class='clear' />"),
            nodeRow = [],
            gridRow = [];

        for(var y = 0; y < this.opts.gridSize; y++) {
            var id = "cell_"+x+"_"+y,
                $cell = $cellTemplate.clone();
            $cell.attr("id", id).attr("x", x).attr("y", y);
            $row.append($cell);
            gridRow.push($cell);

            var isWall = Math.floor(Math.random()*(1/self.opts.wallFrequency));
            if(isWall === 0) {
                nodeRow.push(WALL);
                $cell.addClass(css.wall);
            }
            else  {
                var cell_weight = ($("#generateWeights").prop("checked") ? (Math.floor(Math.random() * 3)) * 2 + 1 : 1);
                nodeRow.push(cell_weight);
                $cell.addClass('weight' + cell_weight);
                if ($("#displayWeights").prop("checked")) {
                    $cell.html(cell_weight);
                }
                if (!startSet) {
                    $cell.addClass(css.start);
                    startSet = true;
                }
            }
        }
        $graph.append($row);

        this.grid.push(gridRow);
        nodes.push(nodeRow);
    }

    this.graph = new Graph(nodes);

    // bind cell event, set start/wall positions
    this.$cells = $graph.find(".grid_item");
    this.$cells.click(function() {
        self.cellClicked($(this));
    });
};
GraphSearch.prototype.cellClicked = function($end) {

    var end = this.nodeFromElement($end);

    if($end.hasClass(css.wall) || $end.hasClass(css.start)) {
        return;
    }

    this.$cells.removeClass(css.finish);
    $end.addClass("finish");
    var $start = this.$cells.filter("." + css.start),
        start = this.nodeFromElement($start);

    var sTime = performance ? performance.now() : new Date().getTime();

    var path = this.search(this.graph, start, end, {
        closest: this.opts.closest
    });
    var fTime = performance ? performance.now() : new Date().getTime(),
        duration = (fTime-sTime).toFixed(2);

    if(path.length === 0) {
        $("#message").text("couldn't find a path (" + duration + "ms)");
        this.animateNoPath();
    }
    else {
        $("#message").text("search took " + duration + "ms.");
        this.drawDebugInfo();
        this.animatePath(path);
    }
};


function draw() {

    searchStep();

    // Draw current state of everything
    background(255);

    doGUI();

    text("Search status - " + status, 10, 450);

    startTime();

    drawMap();

    for (var i = 0; i < pathfinder.closedSet.length; i++) {
        pathfinder.closedSet[i].show(color(179, 179, 179));
    }

    var infoNode = null;

    for (var i = 0; i < pathfinder.openSet.length; i++) {
        var node = pathfinder.openSet[i];
        node.show(color(25, 252, 0));
        if (mouseX > node.x && mouseX < node.x + node.width &&
            mouseY > node.y && mouseY < node.y + node.height) {
            infoNode = node;
        }
    }
    recordTime("Draw Grid");

    fill(255, 255, 0);
    if (infoNode != null) {
        text("f = " + infoNode.f, 430, 230);
        text("g = " + infoNode.g, 430, 250);
        text("h = " + infoNode.h, 430, 270);
        text("vh = " + infoNode.vh, 430, 290);

    }

    var path = calcPath(pathfinder.lastCheckedNode);
    drawPath(path);
}

function calcPath(endNode) {
    startTime();
    // Find the path by working backwards
    path = [];
    var temp = endNode;
    endNode.show(color(29, 10, 245));
    path.push(temp);
    while (temp.previous) {
        path.push(temp.previous);
        temp = temp.previous;
    }
    recordTime("Calc Path");
    return path
}

GraphSearch.prototype.drawDebugInfo = function() {
    this.$cells.html(" ");
	
    var that = this;
    if(this.opts.debug) {
        that.$cells.each(function() {
            var node = that.nodeFromElement($(this)),
                debug = false;
            if (node.visited) {
				
                debug = "F: " + node.f + "<br />G: " + node.g + "<br />H: " + node.h;
				
            }

            if (debug) {
				
                $(this).html(debug).addClass(css.start);
				//$(this).html(".").addClass(css.visited);
				//node.background(56)
            }
        });
    }
};
GraphSearch.prototype.nodeFromElement = function($cell) {
    return this.graph.grid[parseInt($cell.attr("x"))][parseInt($cell.attr("y"))];
};
GraphSearch.prototype.animateNoPath = function() {
    var $graph = this.$graph;
    var jiggle = function(lim, i) {
        if(i>=lim) { $graph.css("top", 0).css("left", 0); return; }
        if(!i) i=0;
        i++;
        $graph.css("top", Math.random()*6).css("left", Math.random()*6);
        setTimeout(function() {
            jiggle(lim, i);
        }, 5);
    };
    jiggle(15);
};
GraphSearch.prototype.animatePath = function(path) {
    var grid = this.grid,
        timeout = 1000 / grid.length,
        elementFromNode = function(node) {
        return grid[node.x][node.y];
    };

    var self = this;
    // will add start class if final
    /*var removeClass = function(path, i) {
        if(i >= path.length) { // finished removing path, set start positions
            return setStartClass(path, i);
        }
        elementFromNode(path[i]).removeClass(css.active);
        setTimeout(function() {
            removeClass(path, i+1);
        }, timeout*path[i].getCost());
    };
    var setStartClass = function(path, i) {
        if(i === path.length) {
            self.$graph.find("." + css.start).removeClass(css.start);
            elementFromNode(path[i-1]).addClass(css.start);
        }
    };
    var addClass = function(path, i) {
        if(i >= path.length) { // Finished showing path, now remove
            return removeClass(path, 0);
        }
        elementFromNode(path[i]).addClass(css.active);
        setTimeout(function() {
            addClass(path, i+1);
        }, timeout*path[i].getCost());
    };*/
    var addClass = function(path, i) {
	

        if(i >= path.length) { // Finished showing path, now remove		
		if (count % 2 == 0) {  
			storer = path;
			if(countRemove >= countRemoveCompare) { 
				removeClass(storer2, 0);
				countRemoveCompare++;
			}
		 }
		count++;
		if(count % 2 == 0) { removeClass(storer, 0);  countRemove++; storer2 = path;}
		


//            return removeClass(path, 0); 
	return;
        }


        elementFromNode(path[i]).addClass(css.active);
        setTimeout(function() {
            addClass(path, i+1);
        }, timeout*path[i].getCost());
    };

    var removeClass = function(path, i) {
        if(i >= path.length) { // finished removing path, set start positions
         //   return setStartClass(path, i);
return;
        }
        elementFromNode(path[i]).removeClass(css.active);
        setTimeout(function() {
            removeClass(path, i+1);
        }, timeout*path[i].getCost());
    };

    var setStartClass = function(path, i) {
        if(i === path.length) {
            self.$graph.find("." + css.start).removeClass(css.start);
            elementFromNode(path[i-1]).addClass(css.start);
        }
    };

    addClass(path, 0);

    setStartClass(path, path.length);
    this.$graph.find("." + css.start).removeClass(css.start);
    this.$graph.find("." + css.finish).addClass(css.start);
};
