/* global angular */
var app = angular.module("streetSharkApp", []);

/* main controller */
app.controller("MainController", ["$scope",
    function ($scope) {
            
        $scope.defaultUrl = "pages/home.html";
        $scope.templateUrl = $scope.defaultUrl;
        
        $scope.goToPage = function (pageName) {
            
            var url = "pages" + pageName + ".html";
            
            $scope.templateUrl = url;
        }
    }]);