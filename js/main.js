$(document).ready(function() {
  var timelinesUrl = "https://aaron-santos.com/saves/timelines";
  $.getJSON(timelinesUrl)
    .done(function(timelines) {
      console.log(JSON.stringify(timelines));
      var data = _.chain(timelines)
                  .map(function(d) {
                    return _.map(d.events, function(e) {
                      return {saveid: d.id,
                              time:   e.time,
                              type:   e.type};
                           });
                  })
                  .flatten(true)
                  .value();
      var types = _.chain(data)
                   .map(function(d) {return d.type})
                   .unique()
                   .value();
      function typeToIdx(t) {
        return _.indexOf(types, t);
      };
      console.log("Types:");
      for(var i in types) {
        console.log(i + ":" + types[i]);
      }
      var saveids = _.chain(data)
                     .map(function(d) {return d.saveid})
                     .unique()
                     .value();
      function saveIdToIdx(s) {
        return _.indexOf(saveids, s);
      }
      console.log(JSON.stringify(data));
      var ndx = crossfilter(data);
      var timeDimension = ndx.dimension(function(e) {
        return [e.saveid, e.time]
      });
      var timeGroup = timeDimension.group().reduce(function(p, v) {
        if (v.total == -1)
          return typeToIdx(p);
        return -1;
      }, function(p, v) {
          return -1;
      }, function() {return -1;});
      var symbolScale = d3.scale.ordinal().range(d3.svg.symbolTypes);
      var symbolAccessor = function(d) {return symbolScale(saveIdToIdx(d.key[0]));};
      var subChart = function(c) {
        return dc.scatterPlot(c)
                 .symbol(symbolAccessor)
                 .symbolSize(8)
                 .highlightedSize(10);
      };
      var maxTime = timeDimension.top(1)[0].time;
      var chart = dc.seriesChart('#timeline-chart');
      chart.width(800)
           .height(400)
           .chart(subChart)
           .x(d3.scale.linear().domain([0, maxTime]))
           .brushOn(false)
           .yAxisLabel("Type")
           .xAxisLabel("Turn")
           .clipPadding(10)
           .elasticY(true)
           .dimension(timeDimension)
           .group(timeGroup)
           .mouseZoomable(true)
           .seriesAccessor(function(d) {
             return "Save: " +d.key[0];
           })
           .keyAccessor(function(d) {
             return d.key[1];
           })
           .valueAccessor(function(d) {
             return types.length - d.value - 1;
           })
           .legend(dc.legend().x(350).y(50).itemHeight(13).gap(5).horizontal(1).legendWidth(240).itemWidth(210));
      chart.yAxis().tickFormat(function(d) {
        return types[d];
      });
      chart.margins().left += 60;
      dc.renderAll();
   
    });
});

