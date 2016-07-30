/* global angular */
var app = angular.module("streetSharkApp", []);

/* main controller */
app.controller("MainController", ["$scope", "heatmap", "$interval",
	function ($scope, heatmap, $interval) {

		// defaults
		$scope.zoom = 17;
		$scope.radius = 0;
		$scope.hour = 20;

		// map init
		$scope.map = new google.maps.Map(document.getElementById('map'), {
			center: {lat: -33.881086, lng: 151.2120779},
			zoom: $scope.zoom
		});

		$scope.heatmapLayer = new google.maps.visualization.HeatmapLayer({
			data: [],
			map: $scope.map,
			radius: $scope.radius,
			gradient: [
	          'rgba(0, 255, 0, 0.5)',
	          'rgba(127, 255, 0, 1)',
	          'rgba(255, 255, 0, 1)',
	          'rgba(255, 127, 0, 1)',
	          'rgba(255, 0, 0, 1)',
	          'rgba(127, 0, 0, 1)',
	          'rgba(0, 0, 0, 1)'
	        ]
		});

		$scope.map.addListener("zoom_changed", function () {
			$scope.zoom = $scope.map.get('zoom');
			setHeatmapRadius();
		})

		$scope.heatmapLayer = {};
		$scope.heatmapRawData = [];

		heatmap.fetch().then(function (data) {

			$scope.heatmapRawData = data;
			mapPoints();
		});

		function mapPoints() {

			var points = [];
			angular.forEach($scope.heatmapRawData, function(value, key) {

				if(data.hour === $scope.hour) {
					points.push(new google.maps.LatLng(value.lat, value.long));
				}
			});

			$scope.heatmapLayer.set("data", points);

			setHeatmapRadius();
		}

		function setHeatmapRadius() {

			$scope.radius = (6.875 * Math.pow($scope.zoom, 2)) - (170.09 * $scope.zoom) + 1056.6;
			$scope.heatmapLayer.set('radius', Math.floor($scope.radius));
		}

		$interval(function () {

			$scope.hour++;
			if($scope.hour > 23) $scope.hour = 0;
			mapPoints();
		}, 5000);
	}]);

app.factory('heatmap', function ($timeout, $http) {
	var heatmap = {
		fetch: function () {
			return $timeout(function () {
				return $http.get('./data/heatmap.json').then(function (response) {
					return response.data;
				});
			}, 30);
		}
	}

	return heatmap;
});