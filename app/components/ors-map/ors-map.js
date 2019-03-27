angular.module("orsApp").directive("orsMap", () => {
  return {
    restrict: "E",
    transclude: true,
    scope: {
      orsMap: "="
    },
    link: (scope, element, attrs) => {},
    controller: [
      "$scope",
      "$filter",
      "$compile",
      "$injector",
      "$timeout",
      "$window",
      "orsSettingsFactory",
      "orsObjectsFactory",
      "orsRequestService",
      "orsUtilsService",
      "orsMapFactory",
      "orsCookiesFactory",
      "lists",
      "globals",
      "mappings",
      "orsNamespaces",
      "ENV",
      (
        $scope,
        $filter,
        $compile,
        $injector,
        $timeout,
        $window,
        orsSettingsFactory,
        orsObjectsFactory,
        orsRequestService,
        orsUtilsService,
        orsMapFactory,
        orsCookiesFactory,
        lists,
        globals,
        mappings,
        orsNamespaces,
        ENV
      ) => {
        $scope.translateFilter = $filter("translate");
        const mapsurfer = L.tileLayer(orsNamespaces.layerMapSurfer.url, {
          attribution: orsNamespaces.layerMapSurfer.attribution,
          id: 0
        });
        const bkgtopplus = L.tileLayer.wms(orsNamespaces.layerBkgTopPlus.url, {
          layers: "web",
          attribution:
            '© <a href="http://www.bkg.bund.de">Bundesamt für Kartographie und Geodäsie</a> 2017, <a href="http://sg.geodatenzentrum.de/web_public/Datenquellen_TopPlus_Open.pdf">Datenquellen</a>',
          id: 1
        });
        const bkgtopplusgrey = L.tileLayer.wms(
          orsNamespaces.layerBkgTopPlus.url,
          {
            layers: "web_grau",
            attribution:
              '© <a href="http://www.bkg.bund.de">Bundesamt für Kartographie und Geodäsie</a> 2017, <a href="http://sg.geodatenzentrum.de/web_public/Datenquellen_TopPlus_Open.pdf">Datenquellen</a>',
            id: 2
          }
        );
        const openstreetmap = L.tileLayer(orsNamespaces.layerOSM.url, {
          attribution: orsNamespaces.layerOSM.attribution,
          id: 3
        });
        const opencyclemap = L.tileLayer(orsNamespaces.layerOSMCycle.url, {
          attribution: orsNamespaces.layerOSMCycle.attribution,
          id: 4
        });
        const transportdark = L.tileLayer(orsNamespaces.layerOSMDark.url, {
          attribution: orsNamespaces.layerOSMDark.attribution,
          id: 5
        });
        const outdoors = L.tileLayer(orsNamespaces.layerOutdoors.url, {
          attribution: orsNamespaces.layerOutdoors.attribution,
          id: 6
        });
        // const stamen = L.tileLayer(orsNamespaces.layerStamen.url, {
        //     attribution: orsNamespaces.layerStamen.attribution,
        // });
        const hillshade = L.tileLayer(orsNamespaces.overlayHillshade.url, {
          format: "image/png",
          opacity: 0.45,
          transparent: true,
          attribution:
            '<a href="http://srtm.csi.cgiar.org/">SRTM</a>; ASTER GDEM is a product of <a href="http://www.meti.go.jp/english/press/data/20090626_03.html">METI</a> and <a href="https://lpdaac.usgs.gov/products/aster_policies">NASA</a>'
        });
        const floodextent = L.tileLayer.wms(
          orsNamespaces.overlayFloodextent.url,
          {
            format: "image/png",
            opacity: 0.45,
            transparent: true,
            layers: "moz_idai_flooding",
            styles: "flooding",
            attribution: orsNamespaces.layerMapSurfer.attribution
          }
        );
        $scope.geofeatures = {
          layerLocationMarker: L.featureGroup(),
          layerRoutePoints: L.featureGroup(),
          layerRouteLines: L.featureGroup(),
          layerAvoid: L.featureGroup(),
          layerAccessibilityAnalysis: L.featureGroup(),
          layerAccessibilityAnalysisNumberedMarkers: L.featureGroup(),
          layerEmph: L.featureGroup(),
          layerTracks: L.featureGroup(),
          layerRouteNumberedMarkers: L.featureGroup(),
          layerRouteExtras: L.featureGroup(),
          layerRouteDrag: L.featureGroup(),
          layerTmcMarker: L.featureGroup(),
          layerDisasterBoundaries: L.featureGroup(),
          layerFloodExtent: L.featureGroup()
        };

        floodextent.addTo($scope.geofeatures.layerFloodExtent);

        const httpService = $injector.get("$http");
        httpService.get("floodedAreas.json").then(
            (response) => {
                let popupContent = (feature) => {
                    return `<div style="margin: 10px"><b><a href=${feature.properties.url} target="_blank">${feature.properties.name.split("-")[0]}</a></b><br>imagery date: ${feature.properties["imagery date"]}</div>`;
                };
                let floodedAreas = L.geoJSON(
                    response.data,
                    {
                      onEachFeature: (feature, layer) => {
                          layer.bindPopup(popupContent(feature));
                      },
                      style: lists.layerStyles.floodedAreas()
                    }
                );
                $scope.floodBounds = floodedAreas.getBounds()
                floodedAreas.addTo($scope.geofeatures.layerFloodExtent);
            },
            (errorResponse) => {
                console.log(errorResponse);
            }
        );
        $scope.zoomToFlood = () => {
          $scope.orsMap.fitBounds($scope.floodBounds);
        };
        const request = orsUtilsService.getDorsConfig();
        request.promise.then(
          function(data) {
            $scope.dors_config = data;
            let i = 0;
            angular.forEach($scope.dors_config, function(value, key) {
              if (i === 0) {
                value.checked = true;
              } else {
                value.checked = false;
              }
              i = i + 1;
            });
            $scope.selectedRegion = {
              selected:
                $scope.dors_config[Object.keys($scope.dors_config)[0]].instance
            };

            const instance = $scope.selectedRegion.selected;
            orsUtilsService.setDorsLink(instance);
            let dArea = L.geoJSON(
              $scope.dors_config[$scope.selectedRegion.selected].geojson,
              {
                invert: true,
                worldLatLngs: [
                  L.latLng([85, 360]),
                  L.latLng([85, -360]),
                  L.latLng([-85, -360]),
                  L.latLng([-85, 360])
                ],
                style: lists.layerStyles.boundary()
              }
            );
            $scope.orsMap.setMaxBounds(
              L.geoJSON(
                $scope.dors_config[$scope.selectedRegion.selected].geojson
              ).getBounds()
            );
            $scope.zoomToFlood();
            dArea.addTo($scope.geofeatures.layerDisasterBoundaries);
            $scope.mapModel.map.addControl($scope.disasterSwitcher);
          },
          function(data) {
            console.error(data);
          }
        );

        $scope.mapModel = {
          map: $scope.orsMap,
          geofeatures: $scope.geofeatures
        };

        $scope.locateControl = L.control
          .locate({
            locateOptions: {
              enableHighAccuracy: true,
              showPopup: false,
              strings: {
                title: ""
              }
            }
          })
          .addTo($scope.mapModel.map);
        $scope.zoomControl = new L.Control.Zoom({
          position: "topright"
        }).addTo($scope.mapModel.map);
        L.control.scale().addTo($scope.mapModel.map);
        // disaster region switcher
        $scope.disasterSwitcher = L.control({
          position: "bottomright"
        });
        $scope.switchRegions = () => {
          const instance = $scope.selectedRegion.selected;
          $scope.geofeatures.layerDisasterBoundaries.clearLayers();
          let dArea = L.geoJSON($scope.dors_config[instance].geojson, {
            invert: true,
            style: lists.layerStyles.boundary()
          });
          dArea.addTo($scope.geofeatures.layerDisasterBoundaries);
          orsUtilsService.setDorsLink(instance);
          $scope.orsMap.setMaxBounds(
            L.geoJSON(
              $scope.dors_config[$scope.selectedRegion.selected].geojson
            ).getBounds()
          );
          $scope.orsMap.fitBounds(
            L.geoJSON($scope.dors_config[instance].geojson).getBounds()
          );
        };
        $scope.disasterSwitcher.onAdd = function(map) {
          var div = $compile("<ors-disaster-list></ors-disaster-list>")(
            $scope
          )[0];
          return div;
        };
        /* AVOID AREA CONTROLLER */
        L.NewPolygonControl = L.Control.extend({
          options: {
            position: "topright"
          },
          onAdd: function(map) {
            var container = L.DomUtil.create(
                "div",
                "leaflet-bar leaflet-control",
                container
              ),
              link = L.DomUtil.create("a", "leaflet-avoid-area", container);
            link.href = "#";
            link.title = "Create a new area avoid polygon";
            L.DomEvent.on(link, "click", L.DomEvent.stop).on(
              link,
              "click",
              function() {
                map.editTools.startPolygon();
              }
            );
            return container;
          }
        });
        let measureControlOptions = {
          position: "bottomleft",
          primaryLengthUnit: "meters",
          secondaryLengthUnit: "kilometers",
          primaryAreaUnit: "hectares",
          secondaryAreaUnit: "sqmeters",
          activeColor: "#cf5f5f",
          completedColor: "#e29f9f",
          background: "#FFF",
          localization: "en",
          popupOptions: {
            className: "leaflet-measure-resultpopup",
            autoPanPadding: [10, 10]
          }
        };
        $scope.measureControl = new L.control.measure(
          measureControlOptions
        ).addTo($scope.mapModel.map);
        // if user settings change..
        orsSettingsFactory.userOptionsSubject.subscribe(settings => {
          if (settings.language) {
            $scope.mapModel.map.removeControl($scope.measureControl);
            measureControlOptions.localization =
              lists.measure_locale[settings.language];
            $scope.measureControl = L.control
              .measure(measureControlOptions)
              .addTo($scope.mapModel.map);
            const el = angular
              .element(document.querySelector(".js-toggle"))
              .empty();
          }
        });
        // set default map style from cookies
        $scope.mapStyleId =
          orsCookiesFactory.getMapOptions() &&
          orsCookiesFactory.getMapOptions().msi
            ? orsCookiesFactory.getMapOptions().msi
            : 3;
        // override cookies if mapsurfer in cookies
        if ($scope.mapStyleId === 0) {
          $scope.mapStyleId = 3;
        }
        // mapOptionsInitSubject is a replay subject and only subscribes once
        let mapInitSubject = orsSettingsFactory.mapOptionsInitSubject.subscribe(
          settings => {
            console.error("ONCE", JSON.stringify(settings));
            if (settings.lat && settings.lng && settings.zoom) {
              $scope.orsMap.setView(
                {
                  lat: settings.lat,
                  lng: settings.lng
                },
                settings.zoom
              );
            } else {
              // Africa Bounding Box
              $scope.orsMap.setView([21.445313, 5.441022], 5);
              if (orsCookiesFactory.getMapOptions()) {
                // Welcome box
                $scope.welcomeMsgBox = L.control({
                  position: "topright"
                });
                $scope.welcomeMsgBox.onAdd = function(map) {
                  var div = $compile("<ors-welcome-box></ors-welcome-box>")(
                    $scope
                  )[0];
                  return div;
                };
              }
            }
            mapInitSubject.dispose();
          }
        );
        $scope.floodMsgBox = L.control({
            position: "topright"
        });
        $scope.floodMsgBox.onAdd = function(map) {
            let div = $compile("<ors-flood-box></ors-flood-box>")(
                $scope
            )[0];
            return div;
        };
        $timeout( () => {
            if (!$scope.smallScreen) $scope.mapModel.map.addControl($scope.floodMsgBox);
        }, 100);
        // sign up for API
        $scope.signupBox = L.control({
          position: "topleft"
        });
        $scope.signupBox.onAdd = function(map) {
          var div = $compile("<ors-signup-box></ors-signup-box>")($scope)[0];
          return div;
        };
        // $timeout(function() {
        //     if (!$scope.smallScreen) $scope.mapModel.map.addControl($scope.signupBox);
        // }, 500);
        // brand
        $scope.brand = L.control({
          position: "topleft",
          bubblingMouseEvents: true
        });
        $scope.brand.onAdd = function(map) {
          var divs = L.DomUtil.create("div", "ors-brand-small");
          divs.innerHTML =
            '<img src="img/brand.png"><br><img class="ors-hot" src="img/HOT.png">';
          return divs;
        };
        $timeout(function() {
          $scope.mapModel.map.addControl($scope.brand);
        }, 500);
        // hack to remove measure string from box
        const el = angular
          .element(document.querySelector(".js-toggle"))
          .empty();
        $scope.mapModel.map.addControl(new L.NewPolygonControl());
        const deleteShape = function(e) {
          if (
            (e.originalEvent.altKey || e.originalEvent.metaKey) &&
            this.editEnabled()
          ) {
            this.editor.deleteShapeAt(e.latlng);
            $scope.mapModel.geofeatures.layerAvoid.removeLayer(
              e.target._leaflet_id
            );
            // remove overlay in controls if no regions left
            if ($scope.geofeatures.layerAvoid.getLayers().length === 0)
              $scope.layerControls.removeLayer($scope.geofeatures.layerAvoid);
            setSettings();
          }
        };
        const deleteVertex = function(e) {
          e.vertex.delete();
        };
        const setSettings = function() {
          const polygons = $scope.geofeatures.layerAvoid.toGeoJSON();
          let avoidPolygons = {
            type: polygons.features.length > 1 ? "MultiPolygon" : "Polygon"
          };
          if (polygons.features.length == 1) {
            avoidPolygons.coordinates = [
              orsUtilsService.trimCoordinates(
                polygons.features[0].geometry.coordinates[0],
                5
              )
            ];
          } else {
            avoidPolygons.coordinates = [];
            for (let i = 0; i < polygons.features.length; i++) {
              avoidPolygons.coordinates.push([
                orsUtilsService.trimCoordinates(
                  polygons.features[i].geometry.coordinates[0],
                  5
                )
              ]);
            }
          }
          orsSettingsFactory.setAvoidableAreas(avoidPolygons);
        };
        const shapeDrawn = function(e) {
          // $scope.layerControls.addOverlay($scope.geofeatures.layerAvoid, 'Avoidable regions');
          setSettings();
        };
        $scope.baseLayers = {
          MapSurfer: mapsurfer,
          "TopPlus-Web-Open": bkgtopplus,
          "TopPlus-Web-Open Greyscale": bkgtopplusgrey,
          OpenStreetMap: openstreetmap,
          OpenCycleMap: opencyclemap,
          "Transport Dark": transportdark,
          Outdoors: outdoors
        };
        $scope.overlays = {
          Hillshade: hillshade,
          "Copernicus EMS: flood extent": $scope.geofeatures.layerFloodExtent
        };
        $scope.mapModel.map.on("load", evt => {
          // add mapstyle
          angular.forEach($scope.baseLayers, (value, key) => {
            if (value.options.id == $scope.mapStyleId) {
              $scope.baseLayers[key].addTo($scope.orsMap);
            }
          });
          $scope.mapModel.geofeatures.layerRoutePoints.addTo(
            $scope.mapModel.map
          );
          $scope.mapModel.geofeatures.layerRouteLines.addTo(
            $scope.mapModel.map
          );
          $scope.mapModel.geofeatures.layerRouteNumberedMarkers.addTo(
            $scope.mapModel.map
          );
          $scope.mapModel.geofeatures.layerAvoid.addTo($scope.mapModel.map);
          $scope.mapModel.geofeatures.layerAccessibilityAnalysis.addTo(
            $scope.mapModel.map
          );
          $scope.mapModel.geofeatures.layerAccessibilityAnalysisNumberedMarkers.addTo(
            $scope.mapModel.map
          );
          $scope.mapModel.geofeatures.layerEmph.addTo($scope.mapModel.map);
          $scope.mapModel.geofeatures.layerTracks.addTo($scope.mapModel.map);
          $scope.mapModel.geofeatures.layerRouteExtras.addTo(
            $scope.mapModel.map
          );
          $scope.mapModel.geofeatures.layerRouteDrag.addTo($scope.mapModel.map);
          $scope.mapModel.geofeatures.layerFloodExtent.addTo($scope.mapModel.map);
          $scope.mapModel.geofeatures.layerDisasterBoundaries.addTo(
            $scope.mapModel.map
          );
          // add layer control
          $scope.layerControls = L.control
            .layers($scope.baseLayers, $scope.overlays)
            .addTo($scope.mapModel.map);
          $scope.mapModel.map.editTools.featuresLayer =
            $scope.geofeatures.layerAvoid;
          // add eventlisteners for layeravoidables only
          $scope.mapModel.geofeatures.layerAvoid.on("layeradd", function(e) {
            if (e.layer instanceof L.Path)
              e.layer
                .on("click", L.DomEvent.stop)
                .on("click", deleteShape, e.layer);
            if (e.layer instanceof L.Path)
              e.layer
                .on("dblclick", L.DomEvent.stop)
                .on("dblclick", e.layer.toggleEdit);
          });
          $scope.mapModel.map.on("editable:drawing:commit", shapeDrawn);
          $scope.mapModel.map.on("editable:vertex:deleted", setSettings);
          $scope.mapModel.map.on("editable:vertex:dragend", setSettings);
          $scope.mapModel.map.on("editable:vertex:altclick", deleteVertex);
          $scope.mapModel.map.on("baselayerchange", function(e) {
            angular.forEach($scope.baseLayers, (value, key) => {
              if (e.name == key) {
                $scope.mapStyleId = value.options.id;
              }
            });
            $scope.setMapOptions();
          });
          const w = angular.element($window);
          $scope.getWindowDimensions = function() {
            return {
              h: w.height(),
              w: w.width()
            };
          };
          $scope.smallScreen =
            $scope.getWindowDimensions().w < 720 ? true : false;
        });
        /**
         * Listens to left mouse click on map
         * @param {Object} e: Click event
         */
        $scope.popup = L.popup({
          minWidth: 150,
          closeButton: false,
          className: "cm-popup"
        }).bringToFront();
        $scope.pointPopup = L.popup({
          minWidth: 175,
          maxHeight: 300,
          closeButton: true,
          className: "cm-popup"
        });
        $scope.mapModel.map.on("contextmenu", e => {
          $scope.displayPos = e.latlng;
          const popupDirective =
            $scope.routing === true
              ? "<ors-popup></ors-popup>"
              : "<ors-aa-popup></ors-aa-popup>";
          const popupContent = $compile(popupDirective)($scope);
          $scope.popup
            .setContent(popupContent[0])
            .setLatLng($scope.displayPos)
            .openOn($scope.mapModel.map);
          $timeout(function() {
            $scope.popup.update();
          }, 300);
        });
        //$scope.mapModel.map.on('baselayerchange', emitMapChangeBaseMap);
        //$scope.mapModel.map.on('overlayadd', emitMapChangeOverlay);
        //$scope.mapModel.map.on('overlayremove', emitMapChangeOverlay);
        $scope.mapModel.map.on("zoomend", e => {
          let layerRouteLines = $scope.mapModel.geofeatures.layerRouteLines;
          const currentZoom = $scope.mapModel.map.getZoom();
          if (currentZoom >= 15) {
            d3.select($scope.mapModel.map.getPanes().overlayPane).style(
              "opacity",
              0.5
            );
          } else {
            d3.select($scope.mapModel.map.getPanes().overlayPane).style(
              "opacity",
              1
            );
          }
          $scope.setMapOptions();
        });
        $scope.mapModel.map.on("moveend", e => {
          $scope.setMapOptions();
        });
        $scope.setMapOptions = () => {
          const mapCenter = $scope.mapModel.map.getCenter();
          const mapZoom = $scope.mapModel.map.getZoom();
          const mapOptions = {
            lat: mapCenter.lat,
            lng: mapCenter.lng,
            zoom: mapZoom,
            msi: $scope.mapStyleId
          };
          orsCookiesFactory.setMapOptions(mapOptions);
          // update permalink
          let userOptions = orsSettingsFactory.getUserOptions();
          userOptions.lat = mapCenter.lat;
          userOptions.lng = mapCenter.lng;
          userOptions.zoom = mapZoom;
          // dont set user options here, will otherwise end in a loop
          orsUtilsService.parseSettingsToPermalink(
            orsSettingsFactory.getSettings(),
            userOptions
          );
        };
        $scope.processMapWaypoint = (
          idx,
          pos,
          updateWp = false,
          fireRequest = true,
          fromHover = false
        ) => {
          // add waypoint to map
          // get the address from the response
          if (updateWp) {
            orsSettingsFactory.updateWaypoint(idx, "", pos, fireRequest);
          } else {
            const waypoint = orsObjectsFactory.createWaypoint("", pos, 1);
            orsSettingsFactory.insertWaypointFromMap(
              idx,
              waypoint,
              fireRequest,
              fromHover
            );
          }
          orsSettingsFactory.getAddress(pos, idx, updateWp, fromHover);
          orsUtilsService.parseSettingsToPermalink(
            orsSettingsFactory.getSettings(),
            orsSettingsFactory.getUserOptions()
          );
          // close the popup
          $scope.mapModel.map.closePopup();
        };
        $scope.addNumberedMarker = (
          geom,
          featureId,
          layerCode,
          isIsochrones = false
        ) => {
          const lat = geom[1] || geom.lat;
          const lng = geom[0] || geom.lng;
          let textLabelclass;
          if (isIsochrones) {
            textLabelclass = "textLabelclass-isochrones";
          }
          let marker = L.marker(L.latLng(lat, lng), {
            icon: createLabelIcon(textLabelclass, parseInt(featureId) + 1),
            index: featureId
          });
          marker
            .bindPopup("<b>Position</b><br>" + lat + ", " + lng)
            .openPopup();
          marker.addTo($scope.mapModel.geofeatures[layerCode]);
        };
        $scope.addWaypoint = (
          idx,
          iconIdx,
          pos,
          fireRequest = true,
          aaIcon = false
        ) => {
          let waypointIcon =
            aaIcon === true
              ? L.divIcon(lists.waypointIcons[3])
              : L.divIcon(lists.waypointIcons[iconIdx]);
          const waypointsLength = orsSettingsFactory.getWaypoints().length;
          if (aaIcon) {
            waypointIcon.options.html =
              '<i class="fa fa-map-marker"><div class="location-number-circle"><div class="via-number-text"></div></div></i>';
          } else if (idx > 0 && idx < waypointsLength - 1) {
            waypointIcon.options.html =
              '<i class="fa fa-map-marker"><div class="via-number-circle"><div class="via-number-text">' +
              idx +
              "</div></div></i>";
          } else if (idx === 0) {
            waypointIcon.options.html =
              '<i class="fa fa-map-marker"><div class="start-number-circle"><div class="via-number-text"> ' +
              "A" +
              " </div></div></i>";
          } else {
            waypointIcon.options.html =
              '<i class="fa fa-map-marker"><div class="end-number-circle"><div class="via-number-text"> ' +
              "B" +
              " </div></div></i>";
          }
          // create the waypoint marker
          let wayPointMarker = new L.marker(pos, {
            icon: waypointIcon,
            draggable: "true",
            idx: idx,
            autoPan: true,
            autoPanPadding: [50, 50],
            autoPanSpeed: 10
          });
          wayPointMarker.addTo($scope.mapModel.geofeatures.layerRoutePoints);
          wayPointMarker.on("dragend", event => {
            // idx of waypoint
            const idx = event.target.options.idx;
            const pos = event.target._latlng;
            $scope.processMapWaypoint(idx, pos, true, fireRequest);
          });
        };
        /** Clears the map
         * @param {boolean} switchApp: Whether accessibility layer should be cleared
         */
        $scope.clearMap = (switchApp = false) => {
          $scope.mapModel.map.closePopup();
          $scope.mapModel.geofeatures.layerLocationMarker.clearLayers();
          $scope.mapModel.geofeatures.layerRouteLines.clearLayers();
          $scope.mapModel.geofeatures.layerEmph.clearLayers();
          $scope.mapModel.geofeatures.layerRouteExtras.clearLayers();
          $scope.mapModel.geofeatures.layerRouteDrag.clearLayers();
          if ($scope.hg) $scope.hg.remove();
          if (switchApp) {
            $scope.mapModel.geofeatures.layerRoutePoints.clearLayers();
            $scope.mapModel.geofeatures.layerAvoid.clearLayers();
            $scope.mapModel.geofeatures.layerAccessibilityAnalysis.clearLayers();
            $scope.mapModel.geofeatures.layerAccessibilityAnalysisNumberedMarkers.clearLayers();
          }
        };
        $scope.clearLayer = layer => {
          $scope.mapModel.geofeatures[layer].clearLayers();
        };
        $scope.reAddWaypoints = (
          waypoints,
          fireRequest = true,
          aaIcon = false
        ) => {
          $scope.clearLayer("layerRoutePoints");
          let setCnt = 0;
          angular.forEach(waypoints, (waypoint, idx) => {
            var iconIdx = orsSettingsFactory.getIconIdx(idx);
            if (waypoint._latlng.lat && waypoint._latlng.lng) {
              $scope.addWaypoint(
                idx,
                iconIdx,
                waypoint._latlng,
                fireRequest,
                aaIcon
              );
            }
            if (waypoint._set == 1) setCnt += 1;
          });
          // if only one waypoint is set, clear the route line layer
          if (setCnt == 1) $scope.clearLayer("layerRouteLines");
        };
        $scope.reshuffleIndicesText = actionPackage => {
          let i = 0;
          $scope.mapModel.geofeatures[actionPackage.layerCode].eachLayer(
            layer => {
              let markerIcon;
              markerIcon =
                actionPackage.layerCode == lists.layers[5]
                  ? createLabelIcon("textLabelclass-isochrones", i + 1)
                  : createLabelIcon("textLabelclass", i + 1);
              layer.setIcon(markerIcon);
              layer.options.index = i;
              i++;
            }
          );
        };
        /**
         * Either zooms to feature, geometry or entire layer
         */
        $scope.zoom = actionPackage => {
          if (typeof actionPackage != "undefined") {
            if (typeof actionPackage.featureId != "undefined") {
              $scope.mapModel.geofeatures[actionPackage.layerCode].eachLayer(
                layer => {
                  if (layer.options.index == actionPackage.featureId) {
                    $scope.orsMap.fitBounds(layer.getBounds());
                  }
                }
              );
            } else if (actionPackage.featureId === undefined) {
              if (actionPackage.geometry !== undefined) {
                if (actionPackage.geometry.lat && actionPackage.geometry.lng) {
                  $timeout(function() {
                    $scope.mapModel.map.panTo(actionPackage.geometry);
                  }, 100);
                  //$scope.mapModel.map.setZoom(13);
                } else {
                  let bounds = new L.LatLngBounds(actionPackage.geometry);
                  $scope.orsMap.fitBounds(bounds);
                }
              } else {
                $scope.orsMap.fitBounds(
                  new L.featureGroup(
                    Object.keys($scope.mapModel.geofeatures).map(key => {
                      return $scope.mapModel.geofeatures[key];
                    })
                  ).getBounds()
                );
              }
            }
          } else {
            $scope.orsMap.fitBounds(
              new L.featureGroup(
                Object.keys($scope.mapModel.geofeatures).map(key => {
                  return $scope.mapModel.geofeatures[key];
                })
              ).getBounds()
            );
          }
        };
        /**
         * Highlights marker on map
         * @param {Object} actionPackage - The action actionPackage
         */
        $scope.highlightWaypoint = actionPackage => {
          let waypointIcon = L.divIcon(lists.waypointIcons[4]);
          const waypointsLength = orsSettingsFactory.getWaypoints().length;
          if (
            actionPackage.featureId > 0 &&
            actionPackage.featureId < waypointsLength - 1
          ) {
            waypointIcon.options.html =
              '<i class="fa fa-map-marker"><div class="highlight-number-circle"><div class="via-number-text">' +
              actionPackage.featureId +
              "</div></div></i>";
          } else if (actionPackage.featureId === 0) {
            waypointIcon.options.html =
              '<i class="fa fa-map-marker"><div class="highlight-number-circle"><div class="via-number-text">' +
              "A" +
              "</div></div></i>";
          } else {
            waypointIcon.options.html =
              '<i class="fa fa-map-marker"><div class="highlight-number-circle"><div class="via-number-text">' +
              "B" +
              "</div></div></i>";
          }
          let wayPointMarker = new L.marker(actionPackage.geometry, {
            icon: waypointIcon
          });
          wayPointMarker.addTo(
            $scope.mapModel.geofeatures[actionPackage.layerCode]
          );
        };
        /**
         * adds features to specific layer
         * @param {Object} actionPackage - The action actionPackage
         */
        $scope.addFeatures = actionPackage => {
          const isDistanceMarkers =
            orsSettingsFactory.getUserOptions().showDistanceMarkers === true
              ? true
              : false;
          const polyLine = L.polyline(actionPackage.geometry, {
            index: !(actionPackage.featureId === undefined)
              ? actionPackage.featureId
              : null,
            interactive: false,
            distanceMarkers: {
              lazy: !isDistanceMarkers,
              showAll: 13,
              offset: 500,
              cssClass: "ors-marker-dist",
              iconSize: [18, 18]
            }
          }).addTo($scope.mapModel.geofeatures[actionPackage.layerCode]);
          polyLine.setStyle(actionPackage.style);
        };
        /**
         * adds interactive route
         * @param {Object} actionPackage - The action actionPackage
         */
        $scope.addPolyline = actionPackage => {
          $scope.mapModel.map.closePopup();
          const polyLine = L.polyline(actionPackage.geometry, {
            index: !(actionPackage.featureId === undefined)
              ? actionPackage.featureId
              : null,
            interactive: true,
            distanceMarkers: {
              lazy: true
            }
            //bubblingMouseEvents: true
          }).addTo($scope.mapModel.geofeatures[actionPackage.layerCode]);
          polyLine.setStyle(actionPackage.style);
        };
        /*  copied from https://github.com/makinacorpus/Leaflet.GeometryUtil/blob/master/src/leaflet.geometryutil.js
                @param {L.PolyLine} polyline Polyline on which the latlng will be search
                @param {L.LatLng} latlng The position to search
            */
        $scope.locateOnLineCopiedFromGeometryUtil = (map, polyline, latlng) => {
          const latlngs = polyline.getLatLngs();
          if (latlng.equals(latlngs[0])) return 0.0;
          if (latlng.equals(latlngs[latlngs.length - 1])) return 1.0;
          const point = L.GeometryUtil.closest(map, polyline, latlng, false),
            lengths = L.GeometryUtil.accumulatedLengths(latlngs),
            total_length = lengths[lengths.length - 1];
          let portion = 0,
            found = false,
            foundIndex = 0;
          for (let i = 0, n = latlngs.length - 1; i < n; i++) {
            let l1 = latlngs[i],
              l2 = latlngs[i + 1];
            portion = lengths[i];
            if (L.GeometryUtil.belongsSegment(point, l1, l2)) {
              portion += l1.distanceTo(point);
              foundIndex = i;
              found = true;
              break;
            }
          }
          if (!found) {
            throw "Could not interpolate " +
              latlng.toString() +
              " within " +
              polyline.toString();
          }
          return {
            factor: portion / total_length,
            latlng: point,
            index: foundIndex
          };
        };
        $scope.addPolylineHover = actionPackage => {
          $scope.mapModel.map.closePopup();
          $scope.polylineZone = L.polyline(actionPackage.geometry, {
            distanceMarkers: {
              lazy: true
            }
          }).addTo($scope.mapModel.geofeatures[actionPackage.layerCode]);
          $scope.polylineZone.setStyle({
            color: "#FFF",
            weight: 100,
            opacity: 0
          });
          $scope.polylineZone.on("mouseover", e => {
            if ($scope.hoverPoint)
              $scope.hoverPoint.removeFrom(
                $scope.mapModel.geofeatures.layerRouteDrag
              );
          });
          $scope.hoverPolyLine = L.polyline(actionPackage.geometry, {
            interactive: true,
            distanceMarkers: {
              lazy: true
            }
          }).addTo($scope.mapModel.geofeatures[actionPackage.layerCode]);
          $scope.hoverPolyLine.setStyle(actionPackage.style);
          $scope.pointList = actionPackage.extraInformation.pointInformation;
          $scope.hoverPolyLine.on("mousemove", e => {
            $scope.addHoverPoint(
              $scope.mapModel,
              $scope.hoverPolyLine,
              $scope.pointList,
              e.latlng
            );
          });
        };
        /**
         * adds interactive point over a polyLine
         * @param {Object} e - The event
         */
        $scope.addHoverPoint = (mapModel, hoverPolyLine, pointList, latlng) => {
          if ($scope.hoverPoint)
            $scope.hoverPoint.removeFrom(
              $scope.mapModel.geofeatures.layerRouteDrag
            );
          let snappedPosition = $scope.locateOnLineCopiedFromGeometryUtil(
            mapModel.map,
            hoverPolyLine,
            latlng
          );
          // center the point on the polyline
          const hoverIcon = L.divIcon(lists.waypointIcons[5]);
          hoverIcon.options.html = '<i class="fa fa-circle"></i>';
          // create the waypoint marker
          $scope.hoverPoint = new L.marker(snappedPosition.latlng, {
            icon: hoverIcon,
            draggable: "true"
            //bubblingMouseEvents: true
          })
            .addTo(mapModel.geofeatures.layerRouteDrag)
            .on("dragend", event => {
              $scope.processMapWaypoint(
                pointList[snappedPosition.index].segment_index + 1,
                event.target._latlng,
                false,
                true,
                true
              );
              mapModel.geofeatures.layerRouteDrag.clearLayers();
            })
            .on("mousedown", event => {
              hoverPolyLine.off("mousemove");
              $scope.polylineZone.off("mouseover");
            })
            .on("mouseup", event => {
              hoverPolyLine.on("mousemove", e => {
                $scope.addHoverPoint(
                  mapModel,
                  hoverPolyLine,
                  pointList,
                  e.latlng
                );
              });
              $scope.polylineZone.on("mouseover", e => {
                if ($scope.hoverPoint)
                  $scope.hoverPoint.removeFrom(
                    $scope.mapModel.geofeatures.layerRouteDrag
                  );
              });
            })
            .on("click", e => {
              $scope.mapModel.map.closePopup();
              const snappedPosition = $scope.locateOnLineCopiedFromGeometryUtil(
                mapModel.map,
                hoverPolyLine,
                e.latlng
              );
              //$scope.mapModel.geofeatures.layerRouteDrag.clearLayers();
              $scope.distanceAtInterpolatedPoint =
                snappedPosition.factor *
                pointList[pointList.length - 1].distance;
              $scope.interpolatedRoutePoint = pointList[snappedPosition.index];
              const popupDirective =
                "<ors-route-point-popup></ors-route-point-popup>";
              const popupContent = $compile(popupDirective)($scope);
              $scope.pointPopup
                .setContent(popupContent[0])
                .setLatLng(e.latlng)
                .openOn($scope.mapModel.map);
              $timeout(function() {
                $scope.pointPopup.update();
              });
            });
        };
        /**
         * adds numbered marker if not yet added
         * @param {Object} actionPackage - The action actionPackage
         */
        $scope.addIsochronesMarker = actionPackage => {
          $scope.addNumberedMarker(
            actionPackage.geometry,
            actionPackage.featureId,
            actionPackage.layerCode,
            true
          );
        };
        /**
         * adds numbered marker if not yet added
         * @param {Object} actionPackage - The action actionPackage
         */
        $scope.toggleIsochronesMarker = actionPackage => {
          const idx = actionPackage.extraInformation.idx;
          const toggle = actionPackage.extraInformation.toggle;
          const marker = $scope.mapModel.geofeatures[
            actionPackage.layerCode
          ].getLayers()[idx];
          if (toggle) angular.element(marker._icon).addClass("hideMarker");
          else angular.element(marker._icon).removeClass("hideMarker");
        };
        let createLabelIcon = function(labelClass, labelText) {
          return L.divIcon({
            className: labelClass,
            html: labelText,
            iconSize: L.point(17, 17)
          });
        };
        $scope.removeIsochrones = actionPackage => {
          const idx = actionPackage.featureId;
          const layerToRemove = $scope.mapModel.geofeatures[
            actionPackage.layerCode
          ].getLayers()[idx];
          layerToRemove.removeFrom(
            $scope.mapModel.geofeatures[actionPackage.layerCode]
          );
        };
        $scope.toggleIsochrones = actionPackage => {
          const toggle = actionPackage.extraInformation.toggle;
          const idx = actionPackage.extraInformation.idx;
          $scope.mapModel.geofeatures[actionPackage.layerCode]
            .getLayers()
            [idx].setStyle({
              opacity: toggle === true ? 0 : 1,
              weight: toggle === true ? 0 : 1,
              fillOpacity: toggle === true ? 0 : 1
            });
        };
        $scope.toggleIsochroneIntervals = actionPackage => {
          const toggle = actionPackage.extraInformation.toggle;
          const idx = actionPackage.extraInformation.idx;
          const revIIdx = actionPackage.extraInformation.revIIdx;
          $scope.mapModel.geofeatures[actionPackage.layerCode]
            .getLayers()
            [idx].getLayers()
            [revIIdx].setStyle({
              opacity: toggle === true ? 0 : 1,
              weight: toggle === true ? 0 : 1,
              fillOpacity: toggle === true ? 0 : 1
            });
        };
        $scope.getGradientColor = (rangePos, colorRangeStart) => {
          const hsl = Math.floor(colorRangeStart - 120 * rangePos);
          return "hsl(" + hsl + ", 100%, 50%" + ")";
        };
        $scope.colorRangeIsochronesRotator = lists.isochronesColorsRanges;
        $scope.addIsochrones = actionPackage => {
          const randomColorsSelected =
            orsSettingsFactory.getUserOptions().randomIsochronesColors === true
              ? true
              : false;
          let colorRangeStart = 120;
          if (randomColorsSelected) {
            colorRangeStart = $scope.colorRangeIsochronesRotator[0];
            $scope.colorRangeIsochronesRotator.push(colorRangeStart);
            $scope.colorRangeIsochronesRotator.splice(0, 1);
          }
          const isochrones = [];
          const isochronesPane = "isochronesPane" + actionPackage.featureId;
          $scope.mapModel.map.createPane(isochronesPane);
          for (let i = actionPackage.geometry.length - 1; i >= 0; i--) {
            let isochrone = L.polygon(
              actionPackage.geometry[i].geometry.coordinates[0],
              {
                fillColor:
                  actionPackage.geometry.length == 1
                    ? $scope.getGradientColor(1, colorRangeStart)
                    : $scope.getGradientColor(
                        i / (actionPackage.geometry.length - 1),
                        colorRangeStart
                      ),
                color: "#FFF",
                weight: 1,
                fillOpacity: 1,
                index: actionPackage.featureId,
                pane: isochronesPane
              }
            );
            isochrones.push(isochrone);
          }
          new L.FeatureGroup(isochrones).addTo(
            $scope.mapModel.geofeatures[actionPackage.layerCode]
          );
          $scope.opacityIsochrones();
        };
        $scope.opacityIsochrones = () => {
          const mapPanes = $scope.mapModel.map.getPanes();
          console.log(mapPanes);
          for (let pane in mapPanes) {
            if (pane.startsWith("isochronesPane")) {
              let svg = d3.select(mapPanes[pane]);
              svg.style("opacity", 0.5);
              svg.selectAll("path").style("stroke-opacity", 1);
            }
          }
        };
        /**
         * clears layer entirely or specific layer in layer
         */
        $scope.clear = actionPackage => {
          if (!(actionPackage.featureId === undefined)) {
            $scope.mapModel.geofeatures[actionPackage.layerCode].eachLayer(
              layer => {
                if (layer.options.index == actionPackage.featureId) {
                  $scope.mapModel.geofeatures[
                    actionPackage.layerCode
                  ].removeLayer(layer);
                }
              }
            );
          } else {
            $scope.mapModel.geofeatures[actionPackage.layerCode].clearLayers();
          }
        };
        /**
         * clears featuregroup layer and checks for layers inside with specific index
         */
        $scope.clearFeaturegroup = actionPackage => {
          $scope.mapModel.geofeatures[actionPackage.layerCode].eachLayer(
            layer => {
              layer.eachLayer(subLayer => {
                if (subLayer.options.index == actionPackage.featureId) {
                  $scope.mapModel.geofeatures[
                    actionPackage.layerCode
                  ].removeLayer(layer);
                  return;
                }
              });
            }
          );
        };
        orsSettingsFactory.subscribeToNgRoute(function onNext(route) {
          //let svg = d3.select($scope.mapModel.map.getPanes().overlayPane);
          $scope.clearMap(true);
          $scope.routing = route == "directions" ? true : false;
          //if ($scope.routing) svg.style("opacity", 1);
        });
        orsSettingsFactory.subscribeToWaypoints(function onNext(d) {
          console.log("changes in routing waypoints detected..", d);
          const waypoints = d;
          // re-add waypoints only after init
          if (waypoints.length > 0)
            $scope.reAddWaypoints(waypoints, $scope.routing);
        });
        orsSettingsFactory.subscribeToAaWaypoints(function onNext(d) {
          console.log("changes in aa waypoints detected..", d);
          const waypoints = d;
          // re-add waypoints only after init
          if (waypoints.length > 0)
            $scope.reAddWaypoints(waypoints, $scope.routing, true);
          // $scope.addWaypoint(idx, iconIdx, waypoint._latlng, fireRequest);
        });
        $scope.hereControl = L.control({
          position: "bottomright"
        });
        $scope.hereControl.onAdd = map => {
          let div = $compile("<ors-here-popup></ors-here-popup>")($scope)[0];
          L.DomEvent.disableClickPropagation(div);
          return div;
        };
        $scope.showHereMessage = pos => {
          $scope.mapModel.map.closePopup();
          const lngLatString = orsUtilsService.parseLngLatString(pos);
          const latLngString = orsUtilsService.parseLatLngString(pos);
          // get the information of the rightclick location
          const payload = orsUtilsService.geocodingPayload(lngLatString, true);
          const request = orsRequestService.geocode(payload);
          request.promise.then(
            data => {
              $scope.address = {};
              if (data.features.length > 0) {
                $scope.address.info = orsUtilsService.addShortAddresses(
                  data.features
                )[0];
                $scope.address.info.processed.secondary =
                  "<i>" + $scope.address.info.processed.secondary + "</i>";
              } else {
                $scope.address.info = {
                  processed: {
                    primary: $scope.translateFilter("NO_ADDRESS")
                  }
                };
              }
              $scope.address.position = "<small>" + latLngString + "</small>";
              $scope.mapModel.map.addControl($scope.hereControl);
            },
            response => {
              orsMessagingService.messageSubject.onNext(lists.errors.GEOCODE);
            }
          );
        };
        /**
         * Dispatches all commands sent by Mapservice by using id and then performing the corresponding function
         */
        orsMapFactory.subscribeToMapFunctions(function onNext(params) {
          switch (params._actionCode) {
            case -1:
              break;
            /** zoom to features */
            case 0:
              $scope.zoom(params._package);
              break;
            /** add features */
            case 1:
              $scope.addFeatures(params._package);
              break;
            case 2:
              $scope.clear(params._package);
              break;
            case 3:
              $scope.highlightWaypoint(params._package);
              break;
            case 5:
              $scope.clearMap();
              break;
            case 7:
              $scope.clearFeaturegroup(params._package);
              break;
            case 11:
              $scope.highlightPoi(params._package);
              break;
            case 30:
              $scope.addIsochrones(params._package);
              break;
            case 31:
              $scope.toggleIsochrones(params._package);
              break;
            case 32:
              $scope.toggleIsochroneIntervals(params._package);
              break;
            case 33:
              $scope.reshuffleIndicesText(params._package);
              break;
            case 34:
              $scope.addIsochronesMarker(params._package);
              break;
            case 35:
              $scope.removeIsochrones(params._package);
              break;
            case 36:
              $scope.toggleIsochronesMarker(params._package);
              break;
            case 40:
              $scope.addPolyline(params._package);
              break;
            case 41:
              $scope.addPolylineHover(params._package);
              break;
            default:
              break;
          }
        });
      }
    ]
  };
});
// directive to control the popup to add waypoints on the map
angular.module("orsApp").directive("orsPopup", [
  "$compile",
  "$timeout",
  "orsSettingsFactory",
  "orsUtilsService",
  "orsRequestService",
  "orsRouteService",
  (
    $compile,
    $timeout,
    orsSettingsFactory,
    orsUtilsService,
    orsRequestService,
    orsRouteService
  ) => {
    return {
      restrict: "E",
      templateUrl: "components/ors-map/directive-templates/ors-popup.html",
      link: (scope, elem, attr) => {
        scope.add = idx => {
          scope.processMapWaypoint(idx, scope.displayPos);
        };
        //what's here request
        scope.here = () => {
          scope.showHereMessage(scope.displayPos);
        };
      }
    };
  }
]);
angular.module("orsApp").directive("orsAaPopup", [
  "$compile",
  "$timeout",
  "orsSettingsFactory",
  ($compile, $timeout, orsSettingsFactory) => {
    return {
      restrict: "E",
      templateUrl: "components/ors-map/directive-templates/ors-aa-popup.html",
      link: (scope, elem, attr) => {
        scope.add = idx => {
          //fourth argument to not fire a request on add waypoint
          scope.processMapWaypoint(idx, scope.displayPos, false, false);
        };
      }
    };
  }
]);
angular.module("orsApp").directive("orsHerePopup", [
  "$translate",
  $translate => {
    return {
      restrict: "E",
      templateUrl: "components/ors-map/directive-templates/ors-here-popup.html",
      link: (scope, elem, attr) => {
        scope.hereShow = true;
      }
    };
  }
]);
angular.module("orsApp").directive("orsRoutePointPopup", [
  "$translate",
  $translate => {
    return {
      restrict: "E",
      templateUrl:
        "components/ors-map/directive-templates/ors-route-point-popup.html",
      link: (scope, elem, attr) => {}
    };
  }
]);
angular.module("orsApp").directive("orsWelcomeBox", [
  "$translate",
  $translate => {
    return {
      restrict: "E",
      template: `<div ng-attr-class="{{ 'ui message ors-map-message fade blue' }}" ng-show="show">
            <i class="fa fa-close flright" data-ng-click="show = !show"></i>
            <div class="header" ng-bind-html="('WELCOME' | translate)">
            </div>
            <div class="list">
                <span ng-bind-html="('WELCOME_MESSAGE' | translate)">
                </span>
            </div>
        </div>`,
      link: (scope, elem, attr) => {
        scope.show = true;
      }
    };
  }
]);
angular.module("orsApp").directive("orsFloodBox", [
  "$translate",
  $translate => {
    return {
      restrict: "E",
      template: `<div ng-attr-class="{{ 'ui message ors-map-message fade red' }}" ng-show="show">
            <i class="fa fa-close flright" data-ng-click="show = !show"></i>
            <div class="header" ng-bind-html="'Cyclone Idai Response'">
            </div>
            <div class="list">
                <span>
                    Latest flood extents of the <a style="color: red;" href=https://emergency.copernicus.eu/mapping/list-of-activations-rapid target="_blank">Copernicus EMS</a> integrated as overlay!
                    Use the avoid polygon tool to draw polygons and avoid flooded areas.
                </span>
            </div>
        </div>`,
      link: (scope, elem, attr) => {
        scope.show = true;
      }
    };
  }
]);
angular.module("orsApp").directive("orsSignupBox", [
  "$translate",
  $translate => {
    return {
      restrict: "E",
      template: `<div ng-attr-class="{{ 'ui message ors-map-message fade green' }}" ng-show="show">
            <i class="fa fa-close flright" data-ng-click="show = !show"></i>
            <div class="header" ng-bind-html="('LOCALE_SIGNUP_HEADER' | translate)">
            </div>
            <div class="list">
                <span ng-bind-html="('LOCALE_SIGNUP_MESSAGE' | translate)">
                </span>
            </div>
        </div>`,
      link: (scope, elem, attr) => {
        scope.show = true;
      }
    };
  }
]);

angular.module("orsApp").directive("orsDisasterList", [
  "$compile",
  "$timeout",
  "orsSettingsFactory",
  ($compile, $timeout, orsSettingsFactory) => {
    return {
      restrict: "E",
      template: `
                <div class="ui form ors-disaster-control">
                  <div class="grouped fields">
                    <label>Choose your region:</label>
                    <div class="field" ng-repeat="area in dors_config">
                      <div class="ui slider checkbox">
                        <input type="radio" ng-checked="area.checked" ng-model="selectedRegion.selected" ng-value="area.instance" ng-change="switchRegions()" name="disaster-region">
                        <label ng-click="switchRegions()">{{area.region}}<br><small><i>{{area.last_updated}}</i></small></label>
                      </div>
                    </div>
                  </div>
                </div>
        `,
      link: (scope, elem, attr) => {}
    };
  }
]);
