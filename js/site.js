/* global angular */
var app = angular.module("streetSharkApp", []);

/* main controller */
app.controller("MainController", ["$scope", "dataset", "getPokemon", "$interval",
	function ($scope, dataset, getPokemon, $interval) {

		// constants
		$scope.baseTemp = 25;
		$scope.baseFatalities = 85;
		$scope.baseMutliplier = 0.005;
		$scope.genders = ["Male", "Female"];

		// defaults
		$scope.zoom = 14;
		$scope.latitude = -33.881086;
		$scope.longitude = 151.2120779;
		$scope.radius = 0;
		$scope.gender = "Male";
		$scope.hour = 0;
		$scope.temp = 0;
		$scope.raining = "No";
		$scope.fatalities = 0;

		// raw data
		$scope.weatherRawData = [];
		dataset.fetch("weather").then(function (data) {
			$scope.weatherRawData = data;
		});

		$scope.pedestrianFatalitiesRawData = [];
		dataset.fetch("pedestrian-fatalities").then(function (data) {
			$scope.pedestrianFatalitiesRawData = data;
		});

		$scope.heatmapRawData = [];
		dataset.fetch("heatmap").then(function (data) {
			$scope.heatmapRawData = data;
			mapPoints();
		});

		$scope.pokemonRawData = [];		
		getPokemon.fetch($scope.latitude, $scope.longitude, $scope.zoom).then(function (data) {
			$scope.pokemonRawData = data;
		});

		// map init
		$scope.map = new google.maps.Map(document.getElementById("map"), {
			center: {lat: $scope.latitude, lng: $scope.longitude},
			zoom: $scope.zoom
		});

		$scope.heatmapLayer = new google.maps.visualization.HeatmapLayer({
			data: [],
			map: $scope.map,
			radius: $scope.radius,
			gradient: [
	          "rgba(0, 255, 0, 0.5)",
	          "rgba(127, 255, 0, 1)",
	          "rgba(255, 255, 0, 1)",
	          "rgba(255, 127, 0, 1)",
	          "rgba(255, 0, 0, 1)",
	          "rgba(127, 0, 0, 1)",
	          "rgba(0, 0, 0, 1)"
	        ]
		});

		$scope.map.addListener("zoom_changed", function () {
			$scope.zoom = $scope.map.get("zoom");
			setHeatmapRadius();
		});

		function mapPoints() {

			var points = [];
			angular.forEach($scope.heatmapRawData, function(value, key) {

				var hour = getHour(value.time);
				if(value && withinLatestHours(hour)) {
					points.push(new google.maps.LatLng(value.lat, value.long));
				}
			});
			$scope.heatmapLayer.setData(points);
		}

		function withinLatestHours(hour) {

			return hour >= $scope.hour - 1 && hour <= $scope.hour + 1
		}

		function setHeatmapRadius() {

			// zoom filter
			$scope.radius = (6.875 * Math.pow($scope.zoom, 2)) - (170.09 * $scope.zoom) + 1056.6;

			// weather filter
			$scope.radius = runFilter($scope.radius, $scope.temp, $scope.baseTemp, $scope.baseMutliplier);

			// fatalities filter
			$scope.radius = runFilter($scope.radius, $scope.fatalities, $scope.baseFatalities, $scope.baseMutliplier);

			// gender global filter
			$scope.radius = $scope.gender === "Male" ? $scope.radius * (1 - $scope.baseMutliplier) : $scope.radius;

			$scope.heatmapLayer.set("radius", Math.floor($scope.radius));
		}

		function runFilter(value, current, base, multiplier) {

			return value * (1 + ((current - base) * multiplier))
		}

		function updateWeather() {

			var current;
			angular.forEach($scope.weatherRawData, function (value, key) {

				if(value && value.hour == $scope.hour) current = value;
			});
			$scope.temp = current.temp || 0;
			$scope.raining = current.rain === "Y" ? "Yes" : "No";
		}

		function updateFatalities() {

			var current;
			angular.forEach($scope.pedestrianFatalitiesRawData, function (value, key) {

				if(value && value.hour == $scope.hour) current = value;
			});
			$scope.fatalities = current.fatalities || 0;
		}

		function getHour(time) {

			return time.split(":")[0];
		}

		$interval(function () {

			$scope.hour++;
			if($scope.hour > 23) $scope.hour = 0;
			updateWeather();
			updateFatalities();
			mapPoints();
			setHeatmapRadius();
		}, 1000);
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