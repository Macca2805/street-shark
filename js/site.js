/* global angular */
var app = angular.module("streetSharkApp", []);

/* main controller */
app.controller("MainController", ["$scope", "dataset", "getPokemon", "$timeout",
	function ($scope, dataset, getPokemon, $timeout) {

		// constants
		$scope.baseTemp = 25;
		$scope.baseFatalities = 85;
		$scope.baseAgeMultiplier = 80;
		$scope.baseMutliplier = 0.005;
		$scope.hours = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23"];
		$scope.genders = ["Male", "Female"];
		$scope.ageGroups = ["20-29", "30-39", "40-49", "50-59", "60-69", "70-79"];

		// defaults
		$scope.zoom = 16;
		$scope.latitude = -33.8771694;
		$scope.longitude = 151.2165295;
		$scope.radius = 0;
		$scope.gender = "Male";
		$scope.age = "20-29";
		$scope.ageMultiplier = 0;
		$scope.hour = "20";
		$scope.temp = 0;
		$scope.raining = "No";
		$scope.fatalities = 0;
		$scope.pokemonMarkers = [];
		$scope.pokemonShow = false;

		// raw data
		$scope.weatherRawData = [];
		dataset.fetch("weather").then(function (data) {
			$scope.weatherRawData = data;
		});

		$scope.pedestrianFatalitiesRawData = [];
		dataset.fetch("pedestrian-fatalities").then(function (data) {
			$scope.pedestrianFatalitiesRawData = data;
		});

		$scope.ageRawData = [];
		dataset.fetch("age").then(function (data) {
			$scope.ageRawData = data;
		});

		$scope.heatmapRawData = [];
		dataset.fetch("heatmap").then(function (data) {
			$scope.heatmapRawData = data;
		});

		$scope.pokemonRawData = [];		
		getPokemon.fetch($scope.latitude, $scope.longitude, $scope.zoom).then(function (data) {
			$scope.pokemonRawData = data;
			
			if($scope.pokemonShow) showPokemon();
		});

		// map init
		$scope.map = new google.maps.Map(document.getElementById("map"), {
			center: {lat: $scope.latitude, lng: $scope.longitude},
			zoom: $scope.zoom
		});

		$scope.directionsService = new google.maps.DirectionsService();
		$scope.directionsRenderer = new google.maps.DirectionsRenderer();

		$scope.heatmapLayer = new google.maps.visualization.HeatmapLayer({
			data: [],
			map: $scope.map,
			radius: $scope.radius,
			gradient: [
			"rgba(0, 255, 0, 0.2)",
			"rgba(127, 255, 0, 1)",
			"rgba(255, 255, 0, 1)",
			"rgba(255, 127, 0, 1)",
			"rgba(255, 0, 0, 1)",
			"rgba(127, 0, 0, 1)",
			"rgba(0, 0, 0, 1)"
			]
		});

		// listeners
		$scope.map.addListener("zoom_changed", function () {
			$scope.zoom = $scope.map.get("zoom");
			setHeatmapRadius();
		});

		$scope.$watch('gender', function () { updateMap() });

		$scope.$watch('age', function () { updateMap() });

		$scope.$watch('hour', function () { updateMap() });

		$scope.$watch('pokemonShow', function(newValue, oldValue){

			if($scope.pokemonShow === true) {
				showPokemon();
			} else {
				hidePokemon();
			}
		});

		function updateMap() {

			updateWeather();
			updateFatalities();
			updateAgeMultiplier();
			mapPoints();
			setHeatmapRadius();
		}

		function buildRoute() {

			var request = {
				origin: "Kings Cross Station, Sydney",
				destination: "Elizabeth House, 230 Elizabeth St, Surry Hills NSW 2010, Australia",
				travelMode: "WALKING",
				provideRouteAlternatives: true,
			};

			$scope.directionsRenderer.setMap($scope.map);

			$scope.directionsService.route(request, function(result, status) {

				if (status === "OK") {
					$scope.directionsRenderer.setDirections(result);
				}
			});
		}

		function mapPoints() {

			var points = [];
			angular.forEach($scope.heatmapRawData, function(value, key) {

				if(!value) return;

				var hour = getHour(value.time);
				if(withinLatestHours(hour) && checkGender(value.gender)) {
					points.push(new google.maps.LatLng(value.lat, value.long));
				}
			});
			$scope.heatmapLayer.setData(points);
		}

		function getHour(time) {

			return time.split(":")[0];
		}

		function withinLatestHours(hour) {

			return hour >= $scope.hour - 1 && hour <= $scope.hour + 1
		}

		function checkGender(gender) {

			if($scope.gender === "Male") {
				return gender === "M";
			}

			return gender === "F";
		}

		function setHeatmapRadius() {

			// zoom filter
			$scope.radius = (6.875 * Math.pow($scope.zoom, 2)) - (170.09 * $scope.zoom) + 1056.6;

			// weather filter
			$scope.radius = runFilter($scope.radius, $scope.temp, $scope.baseTemp, $scope.baseMutliplier);

			// fatalities filter
			$scope.radius = runFilter($scope.radius, $scope.fatalities, $scope.baseFatalities, $scope.baseMutliplier);

			// age filter
			$scope.radius = $scope.radius * ($scope.ageMultiplier / $scope.baseAgeMultiplier);

			// gender global filter
			$scope.radius = $scope.gender === "Male" ? $scope.radius * (1 - $scope.baseMutliplier) : $scope.radius;

			$scope.heatmapLayer.set("radius", Math.floor($scope.radius));
		}

		function showPokemon() {

			$scope.pokemonMarkers = [];
			angular.forEach($scope.pokemonRawData.data, function (value, key) {

				var image = {
					url: "https://df48mbt4ll5mz.cloudfront.net/images/pokemon/" + value.pokemonId + ".png",
					scaledSize: new google.maps.Size(32, 32),
					origin: new google.maps.Point(0, 0),
					anchor: new google.maps.Point(0, 32)
				};

				$scope.pokemonMarkers.push(new google.maps.Marker({
					position: {lat: value.latitude, lng: value.longitude},
					map: $scope.map,
					icon: image
				}));
			});
		}

		function hidePokemon() {

			angular.forEach($scope.pokemonMarkers, function (value, key) {
				value.setMap(null);
			});
		}

		function runFilter(value, current, base, multiplier) {

			return value * (1 + ((current - base) * multiplier))
		}

		function updateWeather() {

			var current;
			angular.forEach($scope.weatherRawData, function (value, key) {
				if(value && value.hour == $scope.hour) current = value;
			});

			if(!current) return;

			$scope.temp = current.temp || 0;
			$scope.raining = current.rain === "Y" ? "Yes" : "No";
		}

		function updateFatalities() {

			var current;
			angular.forEach($scope.pedestrianFatalitiesRawData, function (value, key) {

				if(value && value.hour == $scope.hour) current = value;
			});

			if(!current) return;

			$scope.fatalities = current.fatalities || 0;
		}

		function updateAgeMultiplier() {

			var current;			
			angular.forEach($scope.ageRawData, function (value, key) {

				if(value && value.hour == $scope.hour && value.ageGroup === $scope.age) {
					current = value;
				}
			});

			if(!current) return;

			$scope.ageMultiplier = Math.floor(current.multiplier * 100);
		}

		$timeout(function () {
			updateMap();
			buildRoute();
		}, 2500);
	}]);

app.factory("dataset", function ($timeout, $http) {

	var dataset = {
		fetch: function (dataset) {
			return $timeout(function () {
				return $http.get("./data/" + dataset + ".json").then(function (response) {
					return response.data;
				});
			}, 30);
		}
	}
	return dataset;
});

app.factory("getPokemon", function ($timeout, $http) {

	var dataset = {
		fetch: function (lat, long, zoom) {
			return $timeout(function () {
				return $http.get("http://www.pokeradar.io/api/v1/submissions?deviceId=177b8710565111e693ee9352baed1839&latitude=" + lat + "&longitude=" + long + "&zoomLevel=" + zoom + "&pokemonId=0").then(function (response) {
					return response.data;
				});
			}, 30);
		}
	}
	return dataset;
});