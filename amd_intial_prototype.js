var cloudThreshold = 30
var startDate = '2017-04-01'
var endDate = '2017-05-28'
var mining_footprints = ee.FeatureCollection("projects/sat-io/open-datasets/global-mining/global_mining_footprints");

var places = {
  Chini_Lake: [102.91477, 3.43937],
  Bellendur: [77.66615, 12.93675],
  "loc": [80.247001, 13.031458],
};

var select = ui.Select({
	  items: Object.keys(places),
	  onChange: function(key){
    Map.setCenter(places[key][0], places[key][1],13);}
});
select.setPlaceholder('Choose a location...');
print(select)


var filter = ee.Filter.and(
  ee.Filter.date(startDate, endDate)
)
var collection = ee.ImageCollection(
    ee.Join.saveFirst('cloudProbability').apply({
        primary: ee.ImageCollection('COPERNICUS/S2').filter(filter),
        secondary: ee.ImageCollection('COPERNICUS/S2_CLOUD_PROBABILITY').filter(filter),
        condition: ee.Filter.equals({leftField: 'system:index', rightField: 'system:index'})
    })
).map(function (image) {
  var cloudFree = ee.Image(image.get('cloudProbability')).lt(cloudThreshold)
  return image.updateMask(cloudFree)
})


var median = collection.median()

var trueColorSen = {
  bands: ['B2', 'B3', 'B4'],
  min: 0.0,
  max: 2000.0,
}
var ndviVis={min:0, max:1, palette: ['white', 'yellow','red']};
//amd index
var amwi = median.expression(
    '(RED - BLUE) / (RED + BLUE)', {
      'BLUE': median.select('B2').multiply(0.0001),
      'RED': median.select('B8A').multiply(0.0001),
}).rename('amwi');

//ph layer
var ph=median.expression(
  '(8.339-0.827*(A/NIR))',{
    'A': median.select('B1').multiply(0.0001),
    'NIR':median.select('B8').multiply(0.0001),
  }).rename('ph');
  
//Map.addLayer(ph,{'palette':['red','green','blue']},'ph');
//Map.addLayer(ph, ndviVis, 'ph');
//Map.addLayer(amwi, ndviVis, 'amwi');
//Map.addLayer(median, trueColorSen, 'Sentinel')
Map.addLayer(ee.Image().paint(mining_footprints,0,3), {"palette":["#d73027"]},'Global Mining Footprints');

var distance=mining_footprints.distance({searchRadius: 1000000,maxError: 50});
Map.addLayer(distance,{searchRadius: 1000000},"Dist to mines");



function calcDist(location){
  var InputGeom=ee.Geometry.Point(location.lon, location.lat);
  var buffer = InputGeom.buffer(100000);
  var polygonsWithinBuffer = mining_footprints.filterBounds(buffer);
  var distances = polygonsWithinBuffer.map(function(polygon) {
  var distance = polygon.distance(InputGeom);
  return polygon.set('distanceToPixel', distance);
});
  var nearestPolygon = distances.sort('distanceToPixel').first();

  // Get the distance of the nearest polygon
  var minDistance = nearestPolygon.get('distanceToPixel');
  
  // Print the minimum distance to the console
  print('Minimum Distance to Nearest Mine:', minDistance);
  //Map.centerObject(nearestPolygon,13);
  //distanceLabel.setValue('Minimum Distance to Nearest Polygon: ' + minDistance.toFixed(2) + ' meters');

  
}


var distanceLabel = ui.Label({
  value: 'Distance will be shown here.',
  style: {fontWeight: 'bold'}
});

var calculateButton = ui.Button({
  label: 'Calculate Distance',
  onClick: function() {
    // Add a map click event
    Map.onClick(calcDist);
    Map.style().set({cursor: 'crosshair'});
    // Inform the user to click on the map
    distanceLabel.setValue('Click on the map to calculate the distance.');
  }
});

// Display the button on the map
Map.add(calculateButton);


var layerProperties= {
  amwi:
  {
    layer: amwi,
    //layer: amwi.visualize({min: -1, max: 1, palette: ['blue', 'white', 'red']}),
    visParams:ndviVis,
    
  },
  ph:
  {
    layer: ph,
    visParams:{min:0, max:1, palette: ['white', 'yellow','red']},
  }
  
  //sentinel: Map.addLayer(median, trueColorSen, 'Sentinel')
};

// Create a layer selector pulldown.
var selectItems = Object.keys(layerProperties);


// Define the pulldown menu for layer selection.
var layerSelect = ui.Select({
  items: selectItems,
  value: selectItems[0],
  onChange: function(selected) {
    // Remove existing layers from the map
    Map.layers().reset([]); // Reset the map layers
    
    // Add the selected layer to the map
    var selectedLayer = layerProperties[selected].layer;
    Map.addLayer(selectedLayer, {}, selected); // Empty dictionary for visualization parameters
    
    // Update legend if needed
    //setLegend(layerProperties[selected].legend);
  }
});

// Add the layer selection dropdown to the map
Map.add(layerSelect);

