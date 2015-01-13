{
  id: "oracle.xdo.demo.treemap",
  component: {
      name: "Treemap",
      tooltip: "Insert Treemap",
      cssClass: "Treemap"
  },
  fields: [
    {name: "parent", caption: "Drop Parent Field Here", fieldType: "label", dataType: "string"},
    {name: "child", caption: "Drop Child Field Here", fieldType: "label", dataType: "string"},
    {name: "data", caption: "Drop Measure Field Here", fieldType: "measure", dataType: "number", formula: "summation"}
  ],
  remoteFiles: [
    {type:"js", location:"//cdnjs.cloudflare.com/ajax/libs/d3/3.5.2/d3.min.js", isLoaded: function() {
      return (window['d3'] != null);
    }},
    {type:'css', location:'asset://style.css'}
  ],
  properties: [
    {key: "width", label: "Width", type: "length", value: "1024px"},
    {key: "height", label: "Height", type: "length", value: "400px"}
  ],
  dataType: "d3hierarchy",
  _zoom: function (d, duration) {

    if (this._inTransition != 0)
    {
      // still in the previous animation
      return;
    }

    if (duration == null) {
      duration = 750;
    }

    var contextId = this._contextId;
    var svg = d3.select(document.getElementById(contextId)).select('svg');
    var fields = this._curFields;
    var _this = this;
    var contextId =  this._contextId;
    if (d.name != "root" && this._appliedFilterInfo == null) {
      this._appliedFilterInfo =  {
          id: contextId, filter: [
              {field: fields[0].field, value: d.name}
          ]
      }

      // trigger filtering
      xdo.api.handleClickEvent(this._appliedFilterInfo);
    } else if (d.name == "root" && this._appliedFilterInfo != null) {
      try{
        var filterId = this._appliedFilterInfo.filter[0].id;
        this._appliedFilterInfo = null;

        setTimeout(function(){
          xdo.app.viewer.GlobalFilter.removeFilter(contextId, filterId);
        }, duration)

      } catch (e) {

      }
    }

    var w = this._dimension.w;
    var h = this._dimension.h;

    var x = d3.scale.linear().range([0, w]);
    var y = d3.scale.linear().range([0, h]);

    var kx = w / d.dx;
    var ky = h / d.dy;
    x.domain([d.x, d.x + d.dx]);
    y.domain([d.y, d.y + d.dy]);

    // reset transition flag
    _this._inTransition = 1 + 2 + 4 + 8; // for 4 transition
    var transition1 = 0;
    var transition2 = 0;
    var transition3 = 0;
    var transition4 = 0;

    var t = svg.selectAll("g.cell").transition()
        .duration(duration)
        .attr("transform", function(d) { return "translate(" + x(d.x) + "," + y(d.y) + ")"; })
        .each(function(){
           transition1++;
        })
        .each("end", function(){
           if (!--transition1)
             if (_this._inTransition & 1) _this._inTransition -= 1;
         });

    t.select("rect")
        .attr("width", function(d) { return kx * d.dx - 1; })
        .attr("height", function(d) { return ky * d.dy - 1; })

    t.select("text")
        .attr("x", function(d) { return kx * d.dx / 2; })
        .attr("y", function(d) { return ky * d.dy / 2; })
        .style("opacity", function(d) { return kx * d.dx > d.w && ky * d.dy > 33 ? 1 : 0; })
        .selectAll("tspan")
        .attr("x", function(d) { return kx *d.dx / 2; })
        .each(function(){
          transition2++;
        })
        .each("end", function(){
           if (!--transition2)
             if (_this._inTransition & 2) _this._inTransition -= 2;
        });

    // category text
    var t = svg.selectAll("g.parent").transition()
        .duration(duration)
        .attr("transform", function(d) { return "translate(" + x(d.x) + "," + y(d.y) + ")"; })
        .each(function(){
          transition3++;
        })
        .each("end", function(){
            if (!--transition3)
              if (_this._inTransition & 4) _this._inTransition -= 4;
        });

    svg.selectAll("text.category")
        .transition()
        .duration(duration)
        .attr("x", function(d) { return kx * d.dx / 2; })
        .attr("y", function(d) { return 14; })
        .style("opacity", function(d) { return kx * d.dx > d.w ? 1.0 : 0; })
        .each(function(){
            transition4++;
        })
        .each("end", function(){
            if (!--transition4)
              if (_this._inTransition & 8) _this._inTransition -= 8;
        });

    _this._selectedNode = d;
    if (d3.event) {
        d3.event.stopPropagation();
    }
  },
  _renderChildren: function(svgParent, parentNode, depth) {
    var _this = this;
    var root = this._root;
    var nodes = parentNode.children.filter(function(d) { return d.depth == depth+1; });
    var numFormatting = d3.format('$,.0f');

    var cell = svgParent.selectAll("g")
        .data(nodes)
        .enter().append("svg:g")
        .attr("class", "cell")
        .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
        .on("click", function(d) { return _this._zoom(_this._selectedNode.name != "root" ? root : d.parent); });

    cell.append("svg:rect")
        .attr("width", function(d) { return d.dx - 1; })
        .attr("height", function(d) { return d.dy - 1; })
        .style("fill", function(d, idx) { return _this.color(d.parent.name); });

    var svgText = cell.append("svg:text")
        .attr("x", function(d) { return d.dx / 2; })
        .attr("y", function(d) { return d.dy / 2; })
        .attr("text-anchor", "middle")
        .style("font-size", "12px")

    svgText.append("svg:tspan")
        .attr("x", function(d) { return d.dx / 2; })
        .text(function(d) { return d.name })
    svgText.append("svg:tspan")
        .attr("x", function(d) { return d.dx / 2; })
        .attr("dy", "1.4em")
        .text(function(d) { return numFormatting(d.value)+""; })

    // defer calling opacity calculation until all texts are set
    svgText.style("opacity", function(d) {
      ((d3.select(this).selectAll("tspan"))[0]).forEach(function(sel){
        var len = sel.getComputedTextLength();
        if (d.w == null)
          d.w = len;
        else
          d.w = (len > d.w)?len:d.w;
      });
      return d.dx > d.w && d.dy > 33 ? 1 : 0; });

    d3.select(window).on("click", function() { _this._zoom(root); });
  },
  _render: function(svg, treemap, startNode, depth) {

    var nodes = treemap.nodes(startNode)
        .filter(function(d) { return d.depth == depth+1; })
        .sort(function(a, b){
            return b.value - a.value;
        })

    var _this = this;
    nodes.forEach(function(child, index) {

      var dummyG = svg.append("svg:g")

      _this._renderChildren(dummyG, child, depth+1);

      // add g for parent block
      var g = svg.append("svg:g")
          .attr("class", "parent")
          .attr("transform", function(d) { return "translate(" + child.x + "," + child.y + ")"; });

      // bind data
      g.data([child]);

      g.append("svg:text").data([child])
          .attr("class", "category")
          .attr("x", function(d) { return  child.dx/2; })
          .attr("y", function(d) { return  14; })
          .attr("text-anchor", "middle")
          .style("stroke-width", "0px")
          .style("stroke", "#fcfcfc")
          .style("fill", "#fcfcfc")
          .style("font-size", "12px")
          .style("text-shadow", "none")
          .text(child.name)
          .style("opacity", function(d) {d.w = this.getComputedTextLength(); return d.dx > d.w && d.dy > 33 ? 1.0 : 0; });
    });
  },
  render: function (context, containerElem, node, fields, props) {

    var width = xdo.api.getPixelValue(props["width"]);
    var height = xdo.api.getPixelValue(props["height"]);
    var depth = 0;

    this._curFields = fields;
    this._dimension = {w: width, h: height};
    this._inTransition = 0;

    var treemap = d3.layout.treemap()
    .size([width, height])
    .sort(function(a, b){
      return a.value - b.value;
    })
    .sticky(true)
    .value(function (d) {
      return d.value;
    });

    // init tree map root div
    var container = d3.select(containerElem)
    .attr("class", "chart")
    .style("text-shadow", "none")
    .style("width", width + "px")
    .style("height", height + "px")

    // remove old one
    container.html("");

    this._contextId = context.id;
    this._root = node;
    this._selectedNode = (this._selectedNode == null)?node:this._selectedNode;

    // append new svg
    var svg = container.append("svg:svg")
        .attr("width", width)
        .attr("height", height);

    // setup color provider
    this.color = d3.scale.category20();

    this._render(svg, treemap, node, depth);
  },

  refresh: function(context, containerElem, node, fields, props) {
    this.render(context, containerElem, node, fields, props);

    if (this._selectedNode.name != "root")
    {
      this._zoom(this._selectedNode, 0);
    }
  }
}


