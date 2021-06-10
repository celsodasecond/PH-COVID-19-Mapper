var map;
var removeMode = false;
var addMode = false;
var addMarkerEvent;
var messageStyle = document.getElementById("message");
var polygonArray = [];

// dapat itong mga variable na ito ay kunin from some storage:
var myLatLng = { lat: 14.697580, lng: 121.089948};
var myZoom = 18;
var patientLocations = [
    {id: 16, lat: 14.697481373217192, lng: 121.08910015702914},
    {id: 14, lat: 14.697629993932933, lng: 121.09001939429272},
    {id: 12, lat: 14.699274119599599, lng: 121.08432489798015},
    {id: 11, lat: 14.69663596066175, lng: 121.07586517833766},
    {id: 10, lat: 14.69765868666433, lng: 121.08811872932452},
    {id: 9, lat: 14.697401350036053, lng: 121.08852380117014},
    {id: 8, lat: 14.696965329720458, lng: 121.08780352986638},
    {id: 3, lat: 14.697056014378106, lng: 121.08988188790549},
    {id: 2, lat: 14.698063477134651, lng: 121.08976548165285},
    {id: 1, lat: 14.696756466040048, lng: 121.08862116119414},
];
patientLocations.sort((a,b) => b.id - a.id);
var counter = patientLocations[0].id;

function cluster(points){
    var i;
    var result = [];

    for(i = 0; i < points.length; i++){
        var cluster = newCluster(points[i], i);
        result.push(cluster);
    }

    for(i = 0; i < result.length; i++){
        var j;
        for(j = 0; j < result.length; j++){
            var length = Math.sqrt(Math.pow((result[j].lng - result[i].lng), 2) + Math.pow((result[j].lat - result[i].lat), 2));
            if(length < 0.00065){
                console.log("from: " + result[i].id + " to: " + result[j].id);
                union(result[i], result[j]);
            }
        }
    }
    console.log(result);

    const clusterId = [... new Set(result.map(x => x.parent.rank))];
    console.log(clusterId);
    
    for(i = 0; i <clusterId.length; i++){
        var clusterPoints = result.filter(function(point){
            return point.parent.rank == clusterId[i];
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
            root2.parent = root1.parent;
            console.log(root2.id + " is put into " + root1.parent.id);
        } else {
            root1.parent = root1.parent;
            console.log(root1.id + " is put into " + root2.parent.id);
        }
    }
}

function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
        center: myLatLng,
        zoom: myZoom,
        clickableIcons: false
    });

    var i;
    for(i = 0; i < patientLocations.length; i++){
        createMarker(patientLocations[i], patientLocations[i].id);
    }

    cluster(patientLocations);
}

function createMarker(position, id){
    const marker = new google.maps.Marker({
        position: position,
        draggable: true,
        map,
    });
    const markerLat = marker.getPosition().lat();
    const markerLng = marker.getPosition().lng();
    //insert code here to get full adress from lat lng
    const address = "address";

    const infowindow = new google.maps.InfoWindow({
        content: "id:" + String(id)
        //we can add more information here such as full address
    });
    marker.addListener("click", () => {
        if(removeMode){
            const position = patientLocations.findIndex(x => x.id == id);
            patientLocations.splice(position, 1);
            marker.setMap(null);
            removePolygons();
            cluster(patientLocations);
        }
        infowindow.open(marker.get("map"), marker);
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
    myLatLng = map.getCenter(); 
    myZoom = map.getZoom();
    alert("Area Succesfully Changed");

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
