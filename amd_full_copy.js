var leftMap= ui.Map()
var rightMap= ui.Map()
var mapPanel = ui.Map()
var mining_footprints = ee.FeatureCollection("projects/sat-io/open-datasets/global-mining/global_mining_footprints");

//list of places
var places = {
  'Chini Lake': [102.91477, 3.43937,13],
  'Bellendur': [77.66615, 12.93675,13],
  'Kizel': [57.29819, 59.29791,15],
};
var places2 = {
  "loc": [80.247001, 13.031458],
};

//creating the split panel view
var splitPanel=ui.SplitPanel({
  firstPanel: leftMap,
  secondPanel: rightMap,
  orientation: 'horizontal',
  wipe: true
})

//setting a default location
leftMap.setCenter(places2["loc"][0],places2["loc"][1],18)

//creating the side panel
ui.root.widgets().reset([splitPanel]);
var linkPanel = ui.Map.Linker([leftMap,rightMap])
var header = ui.Label('Acid Mine Drainage', {fontSize: '36px', color: 'red'});
var text = ui.Label(
    'Results from analysis of Sentinel images.',
    {fontSize: '11px'});
    
var toolPanel = ui.Panel([header, text], 'flow', {width: '300px'});
ui.root.widgets().add(toolPanel);

//allowing selection of the places using a drop down list
var select = ui.Select({
	  items: Object.keys(places),
	  onChange: function(key) {
    //mapPanel.setCenter(places[key][0], places[key][1],13);}
    leftMap.setCenter(places[key][0], places[key][1],places[key][2]);}
});

// Set a place holder.
select.setPlaceholder('Choose a location...');
toolPanel.add(select)

//Get current date
 var date = new Date();

//Date slider
var dateSlider = ui.DateSlider({
  start: ee.Date('2017-03-28'),
  end: ee.Date(date),
  period: 60, // Number of days to step by
  onChange: updateMapLayers
});

//creating global variables for amwi and ph layers
var amwi_img;
var ph_img;


// Function to update map layers based on selected date range
function updateMapLayers() {
  var startDate=dateSlider.getStart()
  var endDate=dateSlider.getEnd()
  var cloudThreshold = 30 
  leftMap.layers().reset([]);
  rightMap.layers().reset([]);
  
  var filter = ee.Filter.and(
    ee.Filter.date(startDate, endDate))
  
  
  var collection = ee.ImageCollection(
    ee.Join.saveFirst('cloudProbability').apply({
      primary: ee.ImageCollection('COPERNICUS/S2').filter(filter),
      secondary: ee.ImageCollection('COPERNICUS/S2_CLOUD_PROBABILITY').filter(filter),
      condition: ee.Filter.equals({ leftField: 'system:index', rightField: 'system:index' })
    })
  ).map(function (image) {
    var cloudFree = ee.Image(image.get('cloudProbability')).lt(cloudThreshold);
    return image.updateMask(cloudFree);
  });
  
  
var median = collection.median()

//the colour palettes to be used for the different layers
var trueColorSen = {bands: ['B2','B3','B4'],min: 0.0,max: 2000.0,}
var ndviVis={min:-0.5, max:0.5, palette: ['red','orange','yellow','green','blue']};
var phVis={min:5 , max:9, palette: ['white','red','orange','yellow','green','blue','indigo','violet','pink']};

//amd index
var amwi = median.expression(
    '(RED - BLUE) / (RED + BLUE)', {
      'BLUE': median.select('B2').multiply(0.0001),
      'RED': median.select('B8A').multiply(0.0001),
}).rename('amwi');

//ph index
var ph=median.expression(
  '(8.339-0.827*(A/NIR))',{
    'A': median.select('B1').multiply(0.0001),
    'NIR':median.select('B8').multiply(0.0001),
  }).rename('ph');
  
  
var sen_img=ui.Map.Layer(median, trueColorSen, 'Sentinel');
amwi_img=ui.Map.Layer(amwi, ndviVis, 'amwi');
ph_img=ui.Map.Layer(ph, phVis, 'ph');
var mine_img=ui.Map.Layer(ee.Image().paint(mining_footprints,0,3), {"palette":["#d73027"]},'Global Mining Footprints');
var sen_layer= leftMap.layers();
var amwi_layer= rightMap.layers();
sen_layer.add(mine_img);
//amwi_layer.add(mine_img);

}

updateMapLayers();


//to calculate the distance between the selected pixel and the nearest boundary of the mine polygon
function calcDist(location){
  var InputGeom=ee.Geometry.Point(location.lon, location.lat);
  var buffer = InputGeom.buffer(100000);
  var polygonsWithinBuffer = mining_footprints.filterBounds(buffer);
  var distances = polygonsWithinBuffer.map(function(polygon) {
  var distance = polygon.distance(InputGeom);
  return polygon.set('distanceToPixel', distance);
});
  var nearestPolygon = distances.sort('distanceToPixel').first();
  rightMap.centerObject(nearestPolygon,13);
  // Get the distance of the nearest polygon
  var minDistance = nearestPolygon.get('distanceToPixel');

  // Print the minimum distance to the console
  print('Minimum Distance to Nearest Mine:', minDistance);
  distanceLabel.setValue("Closest Mine is: "+minDistance.getInfo()+' meters away');

}

//displaying the distance label
var distanceLabel = ui.Label({
  value: 'Distance will be shown here.',
  style: {fontWeight: 'bold'}
});

//distance calculatiion button
var calculateButton = ui.Button({
  label: 'Find distance to nearest mine',
  onClick: function() {
    // Add a map click event
    rightMap.onClick(calcDist);
    rightMap.style().set({cursor: 'crosshair'});
    // Inform the user to click on the map
    distanceLabel.setValue('Click on the map to calculate the distance.');
  }
});






// Create the color bar for the legend.
function makeColorBar(palette, min, max) {
  return ui.Thumbnail({
    image: ee.Image.pixelLonLat().select(0),
    params: {
              bbox: [0, 0, 1, 0.1],
              dimensions: '100x10',
              format: 'png',
              min: 0,
              max: 1,
              palette: palette,
            },
    style: {stretch: 'horizontal', margin: '0px 8px', maxHeight: '24px'},
  });
}

// Create a panel with three numbers for the legend.
function makeColorBarLabels(labels,outermargin) { 
  return ui.Panel({
    widgets: [
      ui.Label(labels[0], {margin: '4px 8px'}),
      ui.Label(labels[1], {margin: outermargin})
    ],
    layout: ui.Panel.Layout.flow('horizontal')
  });
}


//make the colorbar
function ColorBar(palette, min, max, labels, outermargin)
{
  var legendTitle = ui.Label('Legend', {fontWeight: 'bold', fontSize: '15px', margin: '0 0 4px 0', padding: '5px'});
  var colorBar = makeColorBar(palette, min, max);
  var legendLabels = makeColorBarLabels(labels, outermargin);
  var legendPanel = ui.Panel([legendTitle, colorBar, legendLabels]);
  //toolPanel.add(legendPanel);
  toolPanel.widgets().set(7, legendPanel);
}

//creating a drop down list for the layer selection
var layerProperties= {};

// Create a layer selector pulldown.
var selectItems = Object.keys(layerProperties);
selectItems.push('amwi');
selectItems.push('ph');

// Define the pulldown menu for layer selection.
var layerSelect = ui.Select({
  //label: 'Select Layers',
  items: selectItems,
  value: selectItems[0],
  onChange: function(selected) {
    // Remove existing layers from the map
    rightMap.layers().reset([]); // Reset the map layers
    
    
    
     if (selected === 'amwi') {
      // If 'amwi' is selected, add the stored amwiLayer to the map
      var palette = ['red','orange','yellow','green','blue'];
      var min = -0.5;
      var max = 0.5;
      rightMap.add(amwi_img,{min:min, max:max, palette:palette}, 'amwi');
      ColorBar(palette, min, max, ['Highly Polluted','Clean'], '4px 150px');
     }
     else if (selected==='ph') {
      // If 'ph' is selected, add the stored phlayer to the map
      var palette = ['white','red','orange','yellow','green','blue','indigo','violet','pink'];
      var min = 5;
      var max = 9;
      rightMap.add(ph_img, {min:min , max:max, palette: palette}, 'ph');
      //amwi_layer.add(ph_img)
      ColorBar(palette, min, max, ['pH 5 ','pH 9'], '4px 215px');
     }
}});



// Displaying the buttons on the map
toolPanel.add(calculateButton);
toolPanel.add(distanceLabel);
toolPanel.add(layerSelect);
toolPanel.add(dateSlider);