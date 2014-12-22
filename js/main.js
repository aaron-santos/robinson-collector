$(document).ready(function() {
  var timelinesUrl = "https://aaron-santos.com/saves/timelines";
  $.getJSON(timelinesUrl)
    .done(function(timelines) {
      console.log(timelines);
      var eventDropsChart = d3.chart.eventDrops();
      d3.select('#timeline-chart')
        .datum(data)
        .call(eventDropsChart);
    });
});

