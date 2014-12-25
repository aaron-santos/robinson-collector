$(document).ready(function() {
  var timelinesUrl = "/saves/timelines";
  $.getJSON(timelinesUrl)
    .done(function(timelines) {
      console.log(JSON.stringify(timelines));
      var data = _.chain(timelines)
                  .map(function(d) {
                    return _.chain(d.events)
                            .unique(false, function(e) {
                              return e.time.toString() + e.type;
                            })
                            .map(function(e) {
                              var type;
                              if (e.type === "item-harvested") {
                                type = "item-harvested-" + e.food.name;
                              } else if (e.type === "npc-killed") {
                                type = "npc-killed-" + e.npc.name;
                              } else if (e.type === "food-eaten") {
                                type = "food-eaten-" + e.food.name;
                              }
                              return {saveid: d.id,
                                      time:   e.time,
                                      type:   type};
                            })
                            .value();
                  })
                  .flatten(true)
                  .value();
      var types = _.chain(data)
                   .map(function(d) {return d.type})
                   .unique(false)
                   .value();
      function typeToIdx(t) {
        return _.indexOf(types, t);
      };
      console.dir(types);
      var saveIds = _.chain(data)
                     .map(function(d) {return d.saveid})
                     .unique(false)
                     .value();
      function saveIdToIdx(s) {
        return _.indexOf(saveIds, s);
      }
      console.dir(data);
      var ndx = crossfilter(data);
      var timeDimension = ndx.dimension(function(d) {
        return [saveIdToIdx(d.saveid), +d.time]
      });
      var timeGroup = timeDimension.group().reduceSum(function(d) {
          return 1 + typeToIdx(d.type);
      });
      var symbolScale = d3.scale.ordinal().range(d3.svg.symbolTypes);
      var symbolAccessor = function(d) {return symbolScale(d.key[0]);};
      var subChart = function(c) {
        return dc.scatterPlot(c)
                 .symbol(symbolAccessor)
                 .symbolSize(8)
                 .highlightedSize(10);
      };
      var maxTime = _.max(data, function(d) {return d.time;}).time;
      console.log("MaxTime:" + maxTime);
      var chart = dc.seriesChart('#timeline-chart');
      chart.width(800)
           .height(400)
           .chart(subChart)
           .x(d3.scale.linear().domain([0, maxTime]))
           .brushOn(false)
           .yAxisLabel("Type")
           .xAxisLabel("Turn")
           .clipPadding(10)
           .elasticY(false)
           .dimension(timeDimension)
           .group(timeGroup)
           .mouseZoomable(true)
           .seriesAccessor(function(d) {
             return "Save: " + saveIds[d.key[0]];
           })
           .keyAccessor(function(d) {
             //console.dir(d);
             return +d.key[1];
           })
           .valueAccessor(function(d) {
             return +d.value;
           })
           .legend(dc.legend().x(350).y(50).itemHeight(13).gap(5).horizontal(1).legendWidth(240).itemWidth(210));
      chart.yAxis().tickFormat(function(d) {
        if ((d > types.length) || (d < 1)) {
          return "OutOfBounds";
        }
        return types[d - 1];
      });
      chart.margins().left += 160;
      dc.renderAll();
   
    });
});

