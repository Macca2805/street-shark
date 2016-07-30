/* global angular */
var app = angular.module("streetSharkApp", []);

/* main controller */
app.controller("MainController", ["$scope", "heatmap",
	function ($scope, heatmap) {

		$scope.map = new google.maps.Map(document.getElementById('map'), {
			center: {lat: -33.8833237, lng: 151.2071924},
			zoom: 17
		});

		$scope.heatmapLayer = {};

		heatmap.fetch().then(function (data) {
			mapPoints(data);
		});

		function mapPoints(data) {

			var points = [];
			angular.forEach(data, function(value, key) {
				points.push(new google.maps.LatLng(value.lat, value.long));
			});

			$scope.heatmapLayer = new google.maps.visualization.HeatmapLayer({
				data: points,
				map: $scope.map
			});
		}
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