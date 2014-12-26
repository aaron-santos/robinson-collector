$(document).ready(function() {
  var timelinesUrl = "/saves/timelines";
  $.getJSON(timelinesUrl)
    .done(function(timelines) {
      console.log(JSON.stringify(timelines));
      var data = _.chain(timelines)
                  .map(function(d) {
                    var prevTimes = {};
                    return _.chain(d.events)
                            .unique(false, function(e) {
                              return e.time.toString() + e.type;
                            })
                            .sortBy(function(d) {return d.time;})
                            .map(function(e) {
                              var type = e.type;
                              if (e.type === "item-harvested") {
                                type = "item-harvested-" + e.food.name;
                              } else if (e.type === "npc-killed") {
                                type = "npc-killed-" + e.npc.name;
                              } else if (e.type === "food-eaten") {
                                type = "food-eaten-" + e.food.name;
                              }
                              var prevTime = prevTimes[e.type] || 0;
                              prevTimes[e.type] = e.time;
                              return {saveid:   d.id,
                                      category: e.type,
                                      time:     e.time,
                                      type:     type,
                                      prevTime: prevTime,
                                      diffTime: e.time - prevTime};
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
      var timeDiffDimension = ndx.dimension(function(d) {
        return [typeToIdx(d.type), +d.diffTime];
      });
      var timeDiffGroup = timeDiffDimension.group().reduceCount()
      var symbolScale = d3.scale.ordinal().range(d3.svg.symbolTypes);
      var symbolAccessor = function(d) {return symbolScale(d.key[0]);};
      var subChart = function(c) {
        return dc.scatterPlot(c)
                 .symbol(symbolAccessor)
                 .symbolSize(8)
                 .highlightedSize(10)
                 .renderTitle(true)
                 .title(function (d) {
                    return d.key[1] + '\n' + d.value;
                 });
      };
      var maxTime = _.max(data, function(d) {return d.time;}).time;
      var maxDiffTime = _.max(data, function(d) {return d.diffTime;}).diffTime;
      console.log("MaxTime:" + maxTime);
      var timelineHeight = 500,
          timelineLegendHeight = 230,
          timelineLegendY = timelineHeight - timelineLegendHeight;
      var timelineChart = dc.seriesChart('#timeline-chart');
      timelineChart.width(700)
           .height(timelineHeight)
           .chart(subChart)
           .x(d3.scale.linear().domain([0, maxTime]))
           .brushOn(false)
           .yAxisLabel("Type")
           .xAxisLabel("Turn")
           .clipPadding(10)
           .elasticY(false)
           .renderHorizontalGridLines(true)
           .dimension(timeDimension)
           .group(timeGroup)
           .mouseZoomable(false)
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
           .legend(dc.legend()
                     .x(220)
                     .y(timelineLegendY)
                     .itemHeight(13)
                     .gap(5)
                     .horizontal(1)
                     .legendWidth(240)
                     .itemWidth(210));
      timelineChart.yAxis().tickFormat(function(d) {
        if ((d > types.length) || (d < 1)) {
          return "OutOfBounds";
        }
        return types[d - 1];
      });
      timelineChart.margins().left += 160;
      timelineChart.margins().bottom = timelineLegendY + 10;


      var subChart = function(c) {
        return dc.barChart(c);
      };
      var diffTimelineHeight = 500,
          diffTimelineLegendHeight = 240,
          diffTimelineLegendY = diffTimelineHeight - diffTimelineLegendHeight;
      var diffTimelineChart = dc.seriesChart('#difference-chart');
      diffTimelineChart.width(700)
        .chart(subChart)
        .height(diffTimelineHeight)
        .x(d3.scale.linear().domain([0, maxDiffTime]))
        .brushOn(false)
        .yAxisLabel("Count")
        .xAxisLabel("Time Interval")
        .clipPadding(10)
        .dimension(timeDiffDimension)
        .group(timeDiffGroup)
        .seriesAccessor(function(d) {
          return "Type: " + types[d.key[0]];
        })
        .keyAccessor(function(d) {
          //console.dir(d);
          return +d.key[1];
        })
        .valueAccessor(function(d) {
          return +d.value;
        });
      diffTimelineChart.margins().left += 160;
      diffTimelineChart.margins().bottom = diffTimelineLegendY + 10;
      diffTimelineChart
        .legend(dc.legend()
                  .x(250)
                  .y(diffTimelineLegendY)
                  .itemHeight(13)
                  .gap(5)
                  .horizontal(1)
                  .legendWidth(240)
                  .itemWidth(210));

      dc.renderAll();
   
    });
});

