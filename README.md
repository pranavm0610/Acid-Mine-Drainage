# Detecting Acid Mine Drainage using Google Earth Engine

## Overview
This project aims to detect Acid Mine Drainage (AMD) using Sentinel images and Google Earth Engine (GEE). The script provided allows users to analyze Sentinel images, calculate AMD indices, visualize AMD layers, and find the distance to the nearest mine.

## Files
- `amd_full_copy.js`: This JavaScript file contains the complete code for implementing the AMD detection functionality using GEE.
- `amd_initial_prototype.js`: This JavaScript file contains the initial prototype code for the AMD detection project.

## How to Use
1. **Setup Google Earth Engine**: Ensure you have access to Google Earth Engine and are familiar with its interface.
2. **Upload Mining Footprints**: Upload the mining footprints dataset to your Google Earth Engine account.
3. **Run the Script**: Open the `amd_full_copy.js` script in the GEE code editor and run it. This will initialize the interface and display the maps.
4. **Select Location**: Choose a location from the dropdown list or manually navigate to an area of interest on the left map.
5. **Analyze Data**: Use the date slider to select the desired date range for analyzing Sentinel images.
6. **Visualize AMD Indices**: Select the AMD index (AMWI) from the dropdown list to visualize it on the right map.
7. **Determine Acidity of Water Bodies**: Select the PH index (PH) to visualise the pH of water bodies on the map.
8. **Find Distance to Nearest Mine**: Click the "Find distance to nearest mine" button, then click on the map to calculate the distance to the nearest mine from the selected location.

## Dependencies
- Google Earth Engine API
