var map;
var removeMode = false;
var addMode = false;
var addMarkerEvent;
var messageStyle = document.getElementById("message");
var polygonArray = [];

// dapat itong mga variable na ito ay kunin from some storage:
var myLatLng = [];
var patientLocations = [
    {id: 4, lat: 14.696836905199396, lng: 121.08990540524388},
    {id: 3, lat: 14.697044003785694, lng: 121.08903818030394},
    {id: 6, lat: 14.698455087777315, lng: 121.0890975078075},
    {id: 7, lat: 14.69846533740118, lng: 121.08870014355143},
    {id: 8, lat: 14.697932357114198, lng: 121.08841933939966},
    {id: 10, lat: 14.69630265943562, lng: 121.08977567629718},
    {id: 13, lat: 14.69704063681295, lng: 121.08973329087912},
    {id: 14, lat: 14.696758770697233, lng: 121.09109492613807},
    {id: 15, lat: 14.696312909477232, lng: 121.09138102832385},
    {id: 16, lat: 14.696799256445125, lng: 121.09146632924985},
    {id: 18, lat: 14.697253218018657, lng: 121.09107655960314},
    {id: 19, lat: 14.696920103702594, lng: 121.08853342764404},
    {id: 20, lat: 14.697237842943151, lng: 121.08875595153903},
    {id: 21, lat: 14.69659146737734, lng: 121.09185894526271},
    {id: 22, lat: 14.697120735826479, lng: 121.0916896679806},
    {id: 23, lat: 14.696666564027558, lng: 121.09005911247087},
    {id: 24, lat: 14.69713292516586, lng: 121.09023395291379},
    {id: 25, lat: 14.697277544307225, lng: 121.08814922275646},
];
patientLocations.sort((a,b) => b.id - a.id);
var counter = patientLocations[0].id

function initMap() {
    geocoder = new google.maps.Geocoder();

    if(myLatLng.length===0){ myLatLng[0] = {id:1, lat: 14.576368776100365, lng: 121.02620400481982, zoom:11};}

    map = new google.maps.Map(document.getElementById("map"), {
        center: myLatLng[0],
        zoom: myLatLng[0].zoom,
        clickableIcons: false
    });

    var i;
    for(i = 0; i < patientLocations.length; i++){
        createMarker(patientLocations[i], patientLocations[i].id);
    }

    cluster(patientLocations);

    createAreaDropdown();
}

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

function displayAddress(marker){
    const infowindow = new google.maps.InfoWindow({

    });

    geocoder.geocode({
        latLng: marker.getPosition()
    }, function(responses) {
        if (responses && responses.length > 0) {
          infowindow.setContent(responses[0].formatted_address);
        } else {
          infowindow.setContent('Cannot determine address at this location.');
        }
    });

    infowindow.open(marker.get("map"), marker);
}

function createMarker(position, id){
    const marker = new google.maps.Marker({
        position: position,
        draggable: true,
        map,
    });

    marker.addListener("click", () => {
        if(removeMode){
            const position = patientLocations.findIndex(x => x.id == id);
            patientLocations.splice(position, 1);
            marker.setMap(null);
            removePolygons();
            cluster(patientLocations);
        } else {
            displayAddress(marker);
        }
        
    });
    google.maps.event.addListener(marker, 'dragend', function() {
        const position = patientLocations.findIndex(x => x.id == id);
        patientLocations[position].lat = marker.getPosition().lat();
        patientLocations[position].lng = marker.getPosition().lng(); 
        removePolygons();
        cluster(patientLocations);
    });
}

function createHullPolygon(points) {
    var polygon = new google.maps.Polygon({
        paths: points,
        strokeColor: "#FF0000",
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: "#FF0000",
        fillOpacity: 0.35,
        clickable: false,
    });
    const area = google.maps.geometry.spherical.computeArea(polygon.getPath()); // pang compute ng area ng hull
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

function isLeft(a, b, c){
    return result = ((b.lng - a.lng) * (c.lat - a.lat) - (b.lat - a.lat) * (c.lng - a.lng)) > 0;
}

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
        counter++;
        createMarker(mapsMouseEvent.latLng, counter);
        patientLocations.push({id: counter, lat: mapsMouseEvent.latLng.lat(), lng: mapsMouseEvent.latLng.lng()});
        removePolygons();
        cluster(patientLocations);
    });
}

function removeMarker(){
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
