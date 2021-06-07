var map;
var removeMode = false;
var addMode = false;
var counter = 0; //will serve as id for newly created markers
var addMarkerEvent;

// dapat itong mga variable na ito ay kunin from some storage:
var myLatLng = { lat: 14.697580, lng: 121.089948};
var myZoom = 18;
var patientLocations = [];

function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
        center: myLatLng,
        zoom: myZoom,
        clickableIcons: false
    });

    const hullLocations = convexHull(patientLocations);
    drawHull(hullLocations);

    var i;
    for(i = 0; i < patientLocations.length; i++){
        const marker = new google.maps.Marker({
            position: patientLocations[i],
            draggable: true,
            map,
        });
        addMarkerEvents(marker, patientLocations[i].id);
        counter++;
    }
    console.log(patientLocations);
}

function addMarkerEvents(marker, id){
    marker.addListener("click", () => {
        if(removeMode){
            const position = patientLocations.findIndex(x => x.id == id);
            patientLocations.splice(position, 1);
            marker.setMap(null);
            const newHull = convexHull(patientLocations);
            polygon.setPath(newHull);
        }
    });

    google.maps.event.addListener(marker, 'dragend', function() {
        const position = patientLocations.findIndex(x => x.id == id);
        patientLocations[position].lat = marker.getPosition().lat();
        patientLocations[position].lng = marker.getPosition().lng(); 
        const newHull = convexHull(patientLocations);
        polygon.setPath(newHull);
    });
}

function drawHull(points) {
    window.polygon = new google.maps.Polygon({
        paths: points,
        strokeColor: "#FF0000",
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: "#FF0000",
        fillOpacity: 0.35,
        clickable: false,
    });
    const area = google.maps.geometry.spherical.computeArea(polygon.getPath()); // pang compute ng area ng hull
    console.log(area);
    polygon.setMap(map);
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
    myLatLng = map.getCenter(); 
    myZoom = map.getZoom();
    alert("area succesfully changed");

    //add code to save  mylatlng to a storage
    //para pag niload ni user ang map ay maipapakita ang nakasave na location imbes na kung saan lang
}

function goToArea(){
    map.panTo(myLatLng);
    map.setZoom(myZoom);
}

function addMarker(){
    if(addMode){
        addMode = false;
        document.getElementById("message").innerHTML = "";
        google.maps.event.removeListener(addMarkerEvent);
        return;
    }
    addMode = true;
    removeMode = false;
    document.getElementById("message").innerHTML = "You are in Add Mode. Click 'add' to exit";

    addMarkerEvent = map.addListener("click", (mapsMouseEvent) =>{
        const marker = new google.maps.Marker({
            position: mapsMouseEvent.latLng,
            draggable: true,
            map,
        });
        counter++
        patientLocations.push({
            id: counter, 
            lat: mapsMouseEvent.latLng.lat(),
            lng: mapsMouseEvent.latLng.lng()
        });
        addMarkerEvents(marker,counter);
        const newHull = convexHull(patientLocations);
        polygon.setPath(newHull);
    });
}

function removeMarker(){
    if(removeMode){
        removeMode = false;
        document.getElementById("message").innerHTML = "";
        return;
    }
    removeMode = true;
    google.maps.event.removeListener(addMarkerEvent);
    document.getElementById("message").innerHTML = "You are in Remove Mode. Click 'remove' to exit";
}
