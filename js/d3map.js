//wrapping everything in self executing anonymous function to move to local scope
(function(){
//pseudo-global variables
var asianArray = ["Human_Dev_Rank", "Human_Dev_Index", "GNI_per_capita", "POV_DAY", "POV_DAY_YEAR", "POV_NATIONAL", "POV_NATIONAL_YEAR", "OUT_OF_SCHOOL", "OUT_FEMALE_PRIMARY", "MALNUTRITION_UNDERWEIGHT", "MALNUTRITION_YEAR", "MALNUTRITION_WORLDBANK_2015"];
var expressed = asianArray[0]; //initial attributes

//execute script when window is loaded
window.onload = setMap();

//set up choropleth map
function setMap(){
  //map frame dimensions
      var width = window.innerWidth *0.5,
          height = 460;

  //create new svg container for the map
      var map = d3.select("body")
          .append("svg")
          .attr("class", "map")
          .attr("width", width)
          .attr("height", height);

  //create Albers equal area conic projection centered on France
      var projection = d3.geoPatterson()
          .center([100, 25])
          // .rotate([-28, 42, 3])
          // .parallels([6, 45.5])
          .scale(360)
          .translate([width / 2, height / 2]);

      var path = d3.geoPath()
            .projection(projection);
  //use queue to parallelize asynchronous data loading
    d3.queue()
        .defer(d3.csv, "data/Poverty_asia.csv") //load attributes from csv
        .defer(d3.json, "data/world.topojson") //load world background spatial data
        .defer(d3.json, "data/asia_poverty.topojson") //load choropleth spatial data
        .await(callback);

    function callback(error,csvData,world,asia){

      //translate world and asian TopoJSON
      var worldCountries = topojson.feature(world, world.objects.world),
          asianCountries = topojson.feature(asia, asia.objects.asia_poverty).features;

      //add world countries to map
      var wCountries = map.append("path")
          .datum(worldCountries)
          .attr("class", "world")
          .attr("d", path);
      //create the color scale
      var colorScale = makeColorScale(csvData);

      //join csv data to GeoJson enumeration setEnumerationUnits
      asianCountries = joinData(asianCountries, csvData);
      //add enumeration units to the setMap
      setEnumerationUnits(asianCountries, map, path, colorScale);
      //add coordinated visualization to the map
      setChart(csvData, colorScale);
        };//end of function callback
};//end of setMap

function joinData(asianCountries, csvData){
  //loop through csv to assign each set of csv attribute values to geojson region
      for (var i=0; i<csvData.length; i++){
          var csvRegion = csvData[i]; //the current region
          var csvKey = csvRegion.ADM0_A3; //the CSV primary key

          //loop through geojson regions to find correct region
          for (var a=0; a<asianCountries.length; a++){

              var geojsonProps = asianCountries[a].properties; //the current region geojson properties
              var geojsonKey = geojsonProps.ADM0_A3; //the geojson primary key

              //where primary keys match, transfer csv data to geojson properties object
              if (geojsonKey == csvKey){

                  //assign all attributes and values
                  asianArray.forEach(function(attr){
                      var val = parseFloat(csvRegion[attr]); //get csv attribute value
                      geojsonProps[attr] = val; //assign attribute and value to geojson properties
                  });
              };
          };
      };
      return asianCountries;
};//end of joinData

function setEnumerationUnits(asianCountries, map, path, colorScale){
  //add Asian Countries to map
    var asian = map.selectAll(".countries")
        .data(asianCountries)
        .enter()
        .append("path")
        .attr("class", function(d){
            return "countries " + d.properties.ADM0_A3;
        })
        .attr("d", path)
        .style("fill", function(d){
            return choropleth(d.properties, colorScale);
        });
};//end setEnumerationUnits

//function to create color scale generator
function makeColorScale(data){
    var colorClasses = [
        "#D4B9DA",
        "#C994C7",
        "#DF65B0",
        "#DD1C77",
        "#980043"
    ];
    //create color scale generator
    var colorScale = d3.scaleQuantile()
        .range(colorClasses);
    //build array of all values of the expressed attribute
    var domainArray = [];
    for (var i=0; i<data.length; i++){
        var val = parseFloat(data[i][expressed]);
        domainArray.push(val);
    };
    //assign array of expressed values as scale domain
    colorScale.domain(domainArray);
    return colorScale;
};//end of makeColorScale function

//function to test for data value and return color
function choropleth(props, colorScale){
    //make sure attribute value is a number
    var val = parseFloat(props[expressed]);
    //if attribute value exists, assign a color; otherwise assign gray
    if (typeof val == 'number' && !isNaN(val)){
        return colorScale(val);
    } else {
        return "#CCC";
    };
};//end of choropleth test

//function to create coordinated bar chart
function setChart(csvData, colorScale){
    //chart frame dimensions
    var chartWidth = window.innerWidth*0.425,
        chartHeight = 473;
        leftPadding = 25,
        rightPadding = 2,
        topBottomPadding = 5,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";
    //create a second svg element to hold the bar chart
    var chart = d3.select("body")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "chart");
    //create a rectangle for chart background fill
    var chartBackground = chart.append("rect")
        .attr("class", "chartBackground")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);
    //create a scale to size bars proportionally to frame
    var yScale = d3.scaleLinear()
          .range([463, 0])
          .domain([0, 200]);
    //set bars for each province
    var bars = chart.selectAll(".bars")
        .data(csvData)
        .enter()
        .append("rect")
        .sort(function(a,b){
          return b[expressed]-a[expressed];
        })
        .attr("class", function(d){
            return "bars " + d.ADM0_A3;
        })
        .attr("width", chartWidth / csvData.length - 1)
        .attr("x", function(d, i){
            return i * (chartWidth / csvData.length)+leftPadding;
        })
        .attr("height", function(d){
          //make sure attribute value is a number
          var val = parseFloat(d[expressed]);
          //if attribute value exists, assign a color; otherwise assign gray
          if (typeof val == 'number' && !isNaN(val)){
              return 463 - yScale(parseFloat(d[expressed]));
          } else {
              return 0;
          };
        })
        .attr("y", function(d){
          //make sure attribute value is a number
          var val = parseFloat(d[expressed]);
          //if attribute value exists, assign a color; otherwise assign gray
          if (typeof val == 'number' && !isNaN(val)){
              return yScale(parseFloat(d[expressed])) + topBottomPadding;
          } else {
              return 0;
          };
        })
        .style("fill", function(d){
            return choropleth(d, colorScale);
        });
    // //annotate bars with attribute value text
    //   var numbers = chart.selectAll(".numbers")
    //       .data(csvData)
    //       .enter()
    //       .append("text")
    //       .sort(function(a, b){
    //           return a[expressed]-b[expressed]
    //       })
    //       .attr("class", function(d){
    //           return "numbers " + d.ADM0_A3;
    //       })
    //       .attr("text-anchor", "middle")
    //       .attr("x", function(d, i){
    //           var fraction = chartWidth / csvData.length;
    //           return i * fraction + (fraction - 1) / 2;
    //       })
    //       .attr("y", function(d){
    //         //make sure attribute value is a number
    //         var val = parseFloat(d[expressed]);
    //         //if attribute value exists, assign a color; otherwise assign gray
    //         if (typeof val == 'number' && !isNaN(val)){
    //             return chartHeight - yScale(parseFloat(d[expressed])) + 15;
    //         } else {
    //             return 0;
    //         };
    //       })
    //       .text(function(d){
    //           return d[expressed];
    //       });
      //create vertical axis generator
      var yAxis = d3.axisLeft()
          .scale(yScale);
      //place axis
      var axis = chart.append("g")
          .attr("class", "axis")
          .attr("transform", translate)
          .call(yAxis);
      //create frame for chart border
      var chartFrame = chart.append("rect")
          .attr("class", "chartFrame")
          .attr("width", chartInnerWidth)
          .attr("height", chartInnerHeight)
          .attr("transform", translate);
      //create chart title
      var chartTitle = chart.append("text")
              .attr("x", 40)
              .attr("y", 40)
              .attr("class", "chartTitle")
              .text("Variable " + expressed[0] + " in each nation");
};//end of setChart

})();//last line of d3map.js