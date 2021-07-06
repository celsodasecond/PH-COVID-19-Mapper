var map;

var removeMode = false;
var addMode = false;
var addMarkerEvent;

var messageStyle = document.getElementById("message");
var table = document.getElementById("MyTable");

var myLatLng = [];
var patientLocations = [
    {id: 1, lat: 14.696836905199396, lng: 121.08990540524388},
    {id: 2, lat: 14.697044003785694, lng: 121.08903818030394},
    {id: 3, lat: 14.698455087777315, lng: 121.0890975078075},
    {id: 4, lat: 14.69846533740118, lng: 121.08870014355143},
    {id: 5, lat: 14.697932357114198, lng: 121.08841933939966},
];
var polygonArray = [];

patientLocations.sort((a,b) => b.id - a.id);
var counter = patientLocations[0].id;

function initMap() {
    geocoder = new google.maps.Geocoder();

    if(myLatLng.length===0){ 
        myLatLng[0] = {id:1, lat: 14.576368776100365, lng: 121.02620400481982, zoom:11};
    }

    map = new google.maps.Map(document.getElementById("map"), {
        center: myLatLng[0],
        zoom: myLatLng[0].zoom,
        clickableIcons: false
    });

    var i;
    for(i = 0; i < patientLocations.length; i++){ 
        createMarker(patientLocations[i], patientLocations[i].id);

        getAddress(patientLocations[i].lat, patientLocations[i].lng, function(result, i){
            patientLocations[i]['address'] = result;
            printAddress(); 
        }, i);
    }

    cluster(patientLocations);

    createAreaDropdown();

    if (!google.maps.Polygon.prototype.getBounds) {
 
        google.maps.Polygon.prototype.getBounds=function(){
            var bounds = new google.maps.LatLngBounds()
            this.getPath().forEach(function(element,index){bounds.extend(element)})
            return bounds
        }
         
    }

    var input = document.getElementById('searchInput');
    map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

    var autocomplete = new google.maps.places.Autocomplete(input);
    autocomplete.bindTo('bounds', map);

    autocomplete.addListener('place_changed', function() {
        var place = autocomplete.getPlace();
        if (!place.geometry) {
            window.alert("Autocomplete's returned place contains no geometry");
            return;
        }
  
        // If the place has a geometry, then present it on a map.
        if (place.geometry.viewport) {
            map.fitBounds(place.geometry.viewport);
        } else {
            map.setCenter(place.geometry.location);
            map.setZoom(27);
        }
        counter++;
        createMarker(place.geometry.location, counter);
        patientLocations.push({id: counter, lat: place.geometry.location.lat(), lng: place.geometry.location.lng()});
        removePolygons();
        cluster(patientLocations);
    });
}

//function to print addresses into html

//just call this function to print the addresses after changes
//like after a marker is moved or added or deleted
function printAddress(){
    while (table.rows.length > 1) {
        table.deleteRow(1);
    }

    patientLocations.sort((a,b) => a.id - b.id);

    var i;
    for(i = 0; i < patientLocations.length; i++){
        var row = table.insertRow(-1); 
        var cell1 = row.insertCell(0);
        var cell2 = row.insertCell(1);  

        cell1.innerHTML = patientLocations[i].id;
        cell2.innerHTML = patientLocations[i].address;
    }
}

//function to get address of lat lng

function getAddress(lat, lng, callback, i) {
    i = i || 0; //optional variable that may or may not contain value.
    geocoder.geocode({
        latLng: new google.maps.LatLng(lat,lng)
    }, function(responses) {
        if (responses && responses.length > 0) {
            callback(responses[0].formatted_address, i);
        } else {
            callback("no formatted addresss", i);
        }
    });
}

//functions for clustering the points

function cluster(points){
    var i;
    var result = [];

    for(i = 0; i < points.length; i++){
        var cluster = newCluster(points[i], i);
        result.push(cluster);
    }

    for(i = 0; i < result.length; i++){
        var j;
        for(j = 0; j < i; j++){
            var length = Math.sqrt(Math.pow((result[j].lng - result[i].lng), 2) + Math.pow((result[j].lat - result[i].lat), 2));
            if(length < 0.00065){
                union(result[i], result[j]);
            }
        }
    }

    const clusterId = [... new Set(result.map(x => x.parent.rank))];
    
    for(i = 0; i <clusterId.length; i++){
        var clusterPoints = result.filter(function(point){
            var root = find(point);
            return root.rank == clusterId[i];
        });
        const newHull = convexHull(clusterPoints);
        createHullPolygon(newHull);
    }
    drawPolygons();
}

//function for disjoint set data structure

function newCluster(point, rankNum){
    var set = {
        rank: rankNum,
        id: point.id,
        lat: point.lat,
        lng: point.lng
    }
    set.parent = set;
    return set;
}

function find(point){
    if (point.parent !== point){
      point.parent = find(point.parent);
    }
    return point.parent;
}

function union(point1, point2){
    var root1 = find(point1);
    var root2 = find(point2);

    if(root1 !== root2){
        if(root1.rank < root2.rank){
            root2.parent = root1;
        } else {
            root1.parent = root2;
        } 
    } 
}

//function for creating the marker

function createMarker(position, id){
    const marker = new google.maps.Marker({
        position: position,
        draggable: true,
        map,
    });

    const infowindow = new google.maps.InfoWindow();

    marker.addListener("click", () => {
        if(removeMode){
            counter--;
            const position = patientLocations.findIndex(x => x.id == id);
            patientLocations.splice(position, 1);
            
            marker.setMap(null);

            printAddress();
            removePolygons();
            cluster(patientLocations);
        } else {
            getAddress(marker.getPosition().lat(), marker.getPosition().lng(), function(address){
                infowindow.setContent("(" + id + ") " + address);
                infowindow.open(marker.get("map"), marker);
            });
        }  
    });

    google.maps.event.addListener(marker, 'dragend', function() {
        const position = patientLocations.findIndex(x => x.id == id);
        patientLocations[position].lat = marker.getPosition().lat();
        patientLocations[position].lng = marker.getPosition().lng(); 
        getAddress(marker.getPosition().lat(), marker.getPosition().lng(), function(address){
            patientLocations[position].address = address;
            infowindow.setContent("(" + id + ") " + address);
            printAddress();
        });
        removePolygons();
        cluster(patientLocations);
    });
}

//functions for google maps polygon

function createHullPolygon(points) {
    var color = "red";
    
    var polygon = new google.maps.Polygon({
        paths: points,
        strokeColor: color,
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: color,
        fillOpacity: 0.35,
        clickable: false,
    });
    var area = google.maps.geometry.spherical.computeArea(polygon.getPath());
    if(area >= 5000 && area < 20000){
        color = "#eb004e";
    }else if(area >= 20000){
        color = "#a100a1";
    }
    polygon.setOptions({strokeColor: color, fillColor: color});

    polygonArray.push(polygon);
}

function drawPolygons() {
    var i;
    for(i = 0; i < polygonArray.length; i++){
        polygonArray[i].setMap(map);
    }
}

function removePolygons() {
    var i;
    for(i = 0; i < polygonArray.length; i++){
        polygonArray[i].setMap(null);
    }
    polygonArray = [];
}

//functions for convex hull

function convexHull(coordinates){
    const points = coordinates;
    points.sort((a,b) => a.lng - b.lng);
    var start = points[0];
    var result = [];
    var i = 0;

    do {
        result[i] = start;
        var current = result[0];
        var j;
        for(j = 0; j < points.length; j++){
            var checkLeft = isLeft(result[i], current, points[j]);
            if((current == start) || checkLeft){
                current = points[j];
            }
        }
        start = current;
        i++;
    } while (current != result[0])
    return result;
}

function isLeft(a, b, c){
    return result = ((b.lng - a.lng) * (c.lat - a.lat) - (b.lat - a.lat) * (c.lng - a.lng)) > 0;
}

// functions for area

function setArea(){
    lat = map.getCenter().lat();
    lng = map.getCenter().lng();
    zoom = map.getZoom();
    if(myLatLng.length === 0){
        id = 1;
    } else id = myLatLng[myLatLng.length-1].id + 1;

    const newArea = {id: id, lat: lat, lng: lng, zoom: zoom};

    myLatLng.push(newArea);

    messageStyle.style.display = "block";
    messageStyle.innerHTML = "Successfuly set new area";

    createAreaDropdown()

    //add code to save  mylatlng to a storage
    //para pag niload ni user ang map ay maipapakita ang nakasave na location imbes na kung saan lang
}

function goToArea(i){
    map.panTo(myLatLng[i]);
    map.setZoom(myLatLng[i].zoom);
}

function removeArea(a){
    myLatLng.splice(a, 1);
    createAreaDropdown();
}

function createAreaDropdown() {
    var dropdown = document.getElementById("dropdown");
    dropdown.innerHTML = "";

    var i;
    for(i = 0; i < myLatLng.length; i++){
        var option = document.createElement("div");
        var remove = document.createElement("div");
        var onclick = "goToArea(" + i + ")";
        var removeFunction = "removeArea(" + i + ")";
        var areaNum = myLatLng[i].id;
        var areaText = document.createTextNode("Area " + areaNum);
        var removeFunctionText = document.createTextNode("X");

        option.setAttribute("class", "dropdown-content");
        option.setAttribute("onclick", onclick);
        option.appendChild(areaText);

        remove.setAttribute("class", "remove-area-button");
        remove.setAttribute("onclick", removeFunction);
        remove.appendChild(removeFunctionText);

        dropdown.append(option);
        dropdown.append(remove);
    }
    var insert = document.createElement("div");
    var insertFunctionText = document.createTextNode("+ New Area");
    
    insert.setAttribute("class", "insert-area-button");
    insert.setAttribute("onclick", "setArea()");
    insert.appendChild(insertFunctionText);

    dropdown.append(insert);
}

//functions for add and remove

function addMarker(){
    if(addMode){
        addMode = false;
        messageStyle.style.display = "none";
        google.maps.event.removeListener(addMarkerEvent);
        return;
    }
    addMode = true;
    removeMode = false;
    
    messageStyle.style.display = "block";
    messageStyle.innerHTML = "You are in Add Mode. Click 'Add' again to exit";
    addMarkerEvent = map.addListener("click", (mapsMouseEvent) =>{
        counter++; // index of available space in array or last index

        createMarker(mapsMouseEvent.latLng, counter);

        getAddress(mapsMouseEvent.latLng.lat(), mapsMouseEvent.latLng.lng(), function(address){
            //these codes are inside the callback function
            //because we have to make sure that the geocoding is done before proceeding
            patientLocations.push({id: counter, lat: mapsMouseEvent.latLng.lat(), lng: mapsMouseEvent.latLng.lng(), address: address});
            printAddress();

            removePolygons();
            cluster(patientLocations);   
        });
    });
}

function removeMarker(){
    //console.clear()
    if(removeMode){
        removeMode = false;
        messageStyle.style.display = "none";
        return;
    }
    removeMode = true;
    addMode = false;
    google.maps.event.removeListener(addMarkerEvent);
   
    messageStyle.style.display = "block";
    messageStyle.innerHTML = "You are in Remove Mode. Click 'Remove' again to exit";
}

