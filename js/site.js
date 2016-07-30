/* global angular */
var app = angular.module("streetSharkApp", []);

/* main controller */
app.controller("MainController", ["$scope", "dataset", "$interval",
	function ($scope, dataset, $interval) {

		// defaults
		$scope.zoom = 17;
		$scope.radius = 0;
		$scope.hour = 0;
		$scope.temp = 0;

		// raw data
		$scope.weatherRawData = [];
		dataset.fetch("weather").then(function (data) {

			$scope.weatherRawData = data;
		});

		$scope.heatmapRawData = [];
		dataset.fetch("heatmap").then(function (data) {

			$scope.heatmapRawData = data;
			mapPoints();
		});

		// map init
		$scope.map = new google.maps.Map(document.getElementById("map"), {
			center: {lat: -33.881086, lng: 151.2120779},
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
				if(hour == $scope.hour) {
					points.push(new google.maps.LatLng(value.lat, value.long));
				}
			});
			$scope.heatmapLayer.setData(points);
		}

		function setHeatmapRadius() {

			// zoom filter
			$scope.radius = (6.875 * Math.pow($scope.zoom, 2)) - (170.09 * $scope.zoom) + 1056.6;

			// weather filter
			$scope.radius = $scope.radius * (1 + (($scope.temp - 25) * 0.01));

			$scope.heatmapLayer.set("radius", Math.floor($scope.radius));
		}

		function updateWeather() {

			var currentWeather;
			angular.forEach($scope.weatherRawData, function (value, key) {

				if(value && value.hour == $scope.hour) currentWeather = value;
			});
			$scope.temp = currentWeather.temp || 0;
		}

		function getHour(time) {

			return time.split(":")[0];
		}

		$interval(function () {

			$scope.hour++;
			if($scope.hour > 23) $scope.hour = 0;
			updateWeather();
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