/*global $:true, L: true, console: true, HeatCanvas: true, setTimeout:true */
String.prototype.pluralize = function(count, plural) {
    if (plural === null) {
        plural = this + 's';
    }
    return (count === 1 ? this : plural);
};
$(function() {
    $('#modal').modal({
        'show': true,
        'keyboard': false
    });
    var root_url = "http://hubwaydatachallenge.org";
    var map = new L.Map("map").setView([42.3598, -71.0851], 13);
    var layer = new L.MAPCTileLayer("basemap");
    map.addLayer(layer);
    var heatmap = new L.TileLayer.HeatCanvas({},{/*'step':0.09,*/'step':1, 'degree':HeatCanvas.LINEAR, 'opacity':0.7});

    var stationLayer = L.geoJson([], {
        onEachFeature: function(feature, layer) {
            layer.bindPopup(feature.properties.name);
        },
        pointToLayer: function(feature, latlng) {
             var hubwayIcon = L.icon({
                iconUrl: 'img/hubway.png',
                iconSize: [20, 20]
            });
            var marker = L.marker(latlng, {icon: hubwayIcon});
            return marker;
        }
    }).addTo(map);
    var stations = [];
    var extractObjects = function(data) {
        var objects = [];
        $.each(data.objects, function() {
            var feature = {
                "type": "Feature",
                "properties": {
                "id": this.id,
                "name": this.name,
                "terminalname": this.terminalname
                },
                "geometry": this.point
            };
            stationLayer.addData(feature);
            objects.push(this);
        });
        return objects;
    };
    $.ajax({
        url: root_url + "/api/v1/station/",
        data: {
            "username": "DBell-Feins",
            "api_key": "b062fdf01a1e606b77629c2ba5d812e1401558ca"
        },
        dataType: 'json'
    }).done(function(data) {
        var objs = extractObjects(data);
        $.each(objs, function() {
            stations.push({'name': this.name, 'id': this.id, 'lat': this.point.coordinates[1], 'lng': this.point.coordinates[0]});
        });
        var modal_denom = objs.length;
        var pct = 0;
        var ds = objs.map(function(o) {
            var d = new $.Deferred();
            $.ajax({
                url: root_url + "/api/v1/trip/",
                dataType: 'json',
                localCache: true,
                isCacheValid : function() {
                    return true;
                },
                data: {
                    "username": "DBell-Feins",
                    "api_key": "b062fdf01a1e606b77629c2ba5d812e1401558ca",
                    "start_station": o.id,
                    "limit": 1/*,
                    "start_date__year": 2012,
                    "start_date__month": 10,
                    "start_date__day": 2*/
                }
            })
            .done(function(r) {
                var note;
                d.resolve(r);
                pct += 1*(100/modal_denom);
                note = pct <= 10 ? "Reticulating Splines..." : note;
                note = pct > 10 && pct <= 20 ? "Tinkering With Internal Three-Speed" : note;
                note = pct > 20 && pct <= 30 ? "" : note;
                note = pct > 30 && pct <= 40 ? "" : note;
                note = pct > 40 && pct <= 50 ? "Wearing Helmet..." : note;
                note = pct > 50 && pct <= 60 ? "Filling Front Rack..." : note;
                note = pct > 60 && pct <= 70 ? "Inflating Puncture-Resistant Tires..." : note;
                note = pct > 70 && pct <= 80 ? "Adjusting Seat Height..." : note;
                note = pct > 80 && pct <= 90 ? "Stepping Through Frames..." : note;
                note = pct > 90 && pct <= 100 ? "Heating-Up Heatmap..." : note;
                var pct_string = pct + '%';
                $('#modal .reticulating-splines').text(note);
                $('#modal .bar').css('width', pct_string);
            }).
            fail(function() {
                d.resolve(null);
            });
            return d;
        });
        $.when.apply(null, ds).done(function() {
            var results = [].slice.call(arguments);
            var name_count = [];
            $.each(results, function(index, item) {
                var count, station, lat, lng, station_id, start_station, name;
                if(item !== null && item.meta.total_count !== 0) {
                    count = item.meta.total_count;
                    start_station =item.objects[0].start_station;
                    station_id = start_station.substring(1, start_station.length-1).split("/")[start_station.substring(1, start_station.length-1).split("/").length-1];
                    station = stations.filter(function(x) { return x.id === parseInt(station_id, 10); });
                    if(station.length === 1) {
                        name = station[0].name;
                        lat = station[0].lat;
                        lng = station[0].lng;
                        name_count.push([name, count]);
                        heatmap.pushData(lat, lng, count);
                    } else {
                        console.log(station, item);
                    }
                }
            });
            var high = 0;
            stationLayer.eachLayer(function(layer) {
                var count, name;
                name = layer._popup._content;
                count = name_count.filter(function(x) {return x[0] === layer._popup._content; });
                count = count.length>0 ? count[0][1] : 0;
                if(count>high) {
                    high = count;
                }
                layer.bindPopup(name + '<br />' + count + ' ' + 'trip'.pluralize(count, "trips"));

            });
            console.log(high);
            heatmap.heatCanvasOptions.step = 0.1;
            $('map').trigger('viewreset');
            map.addLayer(heatmap);
            setTimeout(function() {
                $('#modal').modal('hide');
            }, 1500);
        }).fail(function() {
            console.log("FAILED");
        });
    });
    $('#picker').datepicker({
        format: 'mm/dd/yyyy',
        autoclose: true,
        startDate: '07/28/2011',
        endDate: '10/02/2012'
    });
    $('#dateinput').change(function() {
        var date = new Date($('#dateinput').val().split("/")[2],$('#dateinput').val().split("/")[0]-1,$('#dateinput').val().split("/")[1]);
        console.log(date);
    });
});
